// Migrazione dei file dal volume al bucket, a LOTTI.
//
// Sta qui e non solo nello script perché va eseguita dove il volume è
// montato: dentro il server in esecuzione. Il pannello admin la richiama un
// lotto alla volta, così non ci sono richieste lunghissime e il lavoro è
// riprendibile in qualsiasi momento.
//
// Garanzie (le stesse dello script da riga di comando):
//  - non cancella e non modifica NIENTE sul disco: solo lettura;
//  - il nome del file non cambia mai, quindi nessun URL si rompe;
//  - ogni file caricato viene verificato rileggendo la dimensione dal bucket;
//  - è ripetibile: ciò che è già sul bucket con la stessa dimensione si salta.
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const storage = require("./storage");

const BASE = () =>
  process.env.UPLOAD_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data/uploads";

// Le due cartelle pubbliche, col prefisso che avranno nel bucket: coincide con
// l'URL, così il file resta raggiungibile allo stesso indirizzo.
const folders = () => [
  { prefix: "uploads", dir: BASE() },
  { prefix: "uploads-ped", dir: path.join(BASE(), "editorial") },
];

function filesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === "lost+found") continue;
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      if (st.isFile()) out.push({ name, full, size: st.size });
    } catch {
      /* sparito nel frattempo: lo ignoro */
    }
  }
  return out;
}

// Fotografia della situazione: quanto c'è sul disco, quanto sul bucket.
async function status() {
  const disk = {};
  let diskFiles = 0;
  let diskBytes = 0;
  for (const f of folders()) {
    const files = filesIn(f.dir);
    const bytes = files.reduce((n, x) => n + x.size, 0);
    disk[f.prefix] = { files: files.length, bytes };
    diskFiles += files.length;
    diskBytes += bytes;
  }

  let bucket = null;
  if (storage.isR2Configured()) {
    try {
      bucket = await storage.usage();
    } catch (e) {
      bucket = { error: e?.message || "bucket non raggiungibile" };
    }
  }

  return {
    mode: storage.mode(),
    configured: storage.isR2Configured(),
    base: BASE(),
    disk: { ...disk, files: diskFiles, bytes: diskBytes },
    bucket,
  };
}

// Copia un lotto di file. Restituisce anche quanti ne restano, così il
// pannello può richiamarla finché non arriva a zero.
async function migrateBatch({ dryRun = false, limit = 25 } = {}) {
  if (!storage.isR2Configured())
    throw new Error(
      "Bucket non configurato: servono R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET."
    );

  const out = {
    dryRun: !!dryRun,
    copied: 0,
    skipped: 0,
    failed: 0,
    bytes: 0,
    remaining: 0,
    errors: [],
  };

  for (const folder of folders()) {
    for (const file of filesIn(folder.dir)) {
      const key = `${folder.prefix}/${file.name}`;

      // Già raggiunto il lotto: conto soltanto quanto resta da fare.
      if (out.copied >= limit) {
        const exists = await storage.headObject(key);
        if (!exists || exists.size !== file.size) out.remaining += 1;
        continue;
      }

      let exists = null;
      try {
        exists = await storage.headObject(key);
      } catch (e) {
        out.failed += 1;
        out.errors.push(`${key}: ${e?.message || e}`);
        continue;
      }
      if (exists && exists.size === file.size) {
        out.skipped += 1;
        continue;
      }

      if (dryRun) {
        out.copied += 1;
        out.bytes += file.size;
        continue;
      }

      try {
        await storage.putFile({
          localPath: file.full,
          key,
          contentType: mime.lookup(file.name) || "application/octet-stream",
        });
        const check = await storage.headObject(key);
        if (!check || check.size !== file.size)
          throw new Error(
            `verifica fallita (disco ${file.size} byte, bucket ${check?.size ?? "assente"})`
          );
        out.copied += 1;
        out.bytes += file.size;
      } catch (e) {
        out.failed += 1;
        out.errors.push(`${key}: ${e?.message || e}`);
      }
    }
  }

  out.errors = out.errors.slice(0, 10); // bastano i primi per capire il problema
  return out;
}

module.exports = { status, migrateBatch };
