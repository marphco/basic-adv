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
//  - è ripetibile: ciò che è già stato copiato viene saltato.
//
// La copia comprime anche i media dei piani editoriali, in un passaggio solo:
// comprimere prima e copiare dopo vorrebbe dire fare il lavoro due volte. La
// compressione avviene su una copia temporanea fuori dal volume — l'originale
// resta esattamente com'è, e finché esiste è lui a essere servito.
const fs = require("fs");
const os = require("os");
const path = require("path");
const mime = require("mime-types");
const storage = require("./storage");
const mediaCompress = require("./mediaCompress");

// Tipo di file dal nome: serve a distinguere ciò che si comprime in fretta
// (immagini) da ciò che costa CPU (video) e da ciò che non va toccato
// (documenti, loghi: sono file dei clienti).
const kindOf = (name) => {
  const ext = path.extname(name).toLowerCase();
  if (/^\.(jpe?g|png|webp|gif|heic|heif|tiff?|avif)$/.test(ext)) return "image";
  if (/^\.(mp4|mov|m4v|webm|avi|mkv)$/.test(ext)) return "video";
  return "other";
};

const BASE = () =>
  process.env.UPLOAD_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data/uploads";

// Le due cartelle pubbliche, col prefisso che avranno nel bucket: coincide con
// l'URL, così il file resta raggiungibile allo stesso indirizzo.
//
// `compress` è acceso solo sui media dei piani editoriali. Gli allegati del
// form sono file dei CLIENTI — loghi, esecutivi, documenti — e vengono
// riscaricati tali e quali: ridimensionare un logo che magari serve per la
// stampa sarebbe un danno, non un risparmio.
const folders = () => [
  { prefix: "uploads", dir: BASE(), compress: false },
  { prefix: "uploads-ped", dir: path.join(BASE(), "editorial"), compress: true },
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
  const byKind = {
    image: { files: 0, bytes: 0 },
    video: { files: 0, bytes: 0 },
    other: { files: 0, bytes: 0 },
  };
  let diskFiles = 0;
  let diskBytes = 0;
  for (const f of folders()) {
    const files = filesIn(f.dir);
    const bytes = files.reduce((n, x) => n + x.size, 0);
    disk[f.prefix] = { files: files.length, bytes };
    diskFiles += files.length;
    diskBytes += bytes;
    // La composizione conta solo per i media dei piani: gli allegati del form
    // sono file dei clienti e non vanno compressi comunque.
    if (f.prefix === "uploads-ped")
      files.forEach((x) => {
        const k = byKind[kindOf(x.name)];
        k.files += 1;
        k.bytes += x.size;
      });
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
    byKind,
    bucket,
  };
}

/* ===================== COMPRESSIONE IN TRANSITO ===================== */

// Cartella di lavoro FUORI dal volume: qui nascono le copie compresse, che
// vengono cancellate subito dopo il caricamento. Sul volume non si scrive mai.
const tmpDir = () => {
  const d = path.join(os.tmpdir(), "basic-migrazione");
  fs.mkdirSync(d, { recursive: true });
  return d;
};

// Prepara il file da caricare. Se la compressione non serve, non riesce o non
// guadagna nulla, si carica l'originale: meglio un file grande che un file
// mancante.
// Restituisce { localPath, size, temp } — `temp` va cancellato dal chiamante.
async function prepareUpload(file, folder) {
  const fallback = { localPath: file.full, size: file.size, temp: null };
  if (!folder.compress) return fallback;

  const kind = kindOf(file.name);
  if (kind !== "image" && kind !== "video") return fallback;

  // Stessa estensione dell'originale: il nome del file è già dentro ai piani
  // editoriali, cambiarlo significherebbe rompere i link.
  const dest = path.join(tmpDir(), `${Date.now()}-${file.name}`);
  try {
    const size =
      kind === "image"
        ? await mediaCompress.compressImageTo(file.full, dest)
        : // In migrazione uso un preset più rapido: sono decine di file in
          // fila su un server che nel frattempo serve il sito.
          await mediaCompress.transcodeVideoTo(file.full, dest, {
            preset: process.env.MEDIA_MIGRATION_PRESET || "fast",
            timeoutMs: 15 * 60 * 1000,
          });
    if (!size) return fallback; // nessun guadagno: vince l'originale
    return { localPath: dest, size, temp: dest };
  } catch (e) {
    console.error("[migrazione] compressione non riuscita:", file.name, e?.message);
    try {
      fs.unlinkSync(dest);
    } catch {
      /* non creato */
    }
    return fallback;
  }
}

const cleanup = (p) => {
  if (!p) return;
  try {
    fs.unlinkSync(p);
  } catch {
    /* già sparito */
  }
};

/* ===================== COPIA A LOTTI ===================== */

// Copia un lotto di file. Restituisce anche quanti ne restano, così il
// pannello può richiamarla finché non arriva a zero.
//
// `maxVideos` limita i video per lotto: ricodificarne uno costa minuti di CPU
// e una richiesta HTTP non può restare aperta all'infinito. I video oltre il
// limite finiscono in `remaining` e toccheranno al lotto successivo.
async function migrateBatch({
  dryRun = false,
  limit = 25,
  maxVideos = 2,
  only = "",
} = {}) {
  if (!storage.isR2Configured())
    throw new Error(
      "Bucket non configurato: servono R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET."
    );

  const out = {
    dryRun: !!dryRun,
    copied: 0,
    skipped: 0,
    failed: 0,
    bytes: 0, // quanto è finito sul bucket (dopo compressione)
    sourceBytes: 0, // quanto pesavano gli stessi file sul volume
    compressed: 0,
    remaining: 0,
    errors: [],
  };
  let videos = 0;

  for (const folder of folders().filter((f) => !only || f.prefix === only)) {
    for (const file of filesIn(folder.dir)) {
      const key = `${folder.prefix}/${file.name}`;

      let exists = null;
      try {
        exists = await storage.headObject(key);
      } catch (e) {
        out.failed += 1;
        out.errors.push(`${key}: ${e?.message || e}`);
        continue;
      }
      // Già copiato: lo riconosco dall'etichetta con la dimensione
      // dell'originale, perché quella del file sul bucket ora è più piccola.
      if (exists && exists.metadata?.srcsize === String(file.size)) {
        out.skipped += 1;
        continue;
      }

      const isVideo = folder.compress && kindOf(file.name) === "video";

      // Lotto pieno (o troppi video): lo lascio al giro successivo.
      if (out.copied >= limit || (isVideo && videos >= maxVideos)) {
        out.remaining += 1;
        continue;
      }

      if (dryRun) {
        out.copied += 1;
        out.bytes += file.size;
        out.sourceBytes += file.size;
        continue;
      }

      if (isVideo) videos += 1;

      let prepared = null;
      try {
        prepared = await prepareUpload(file, folder);
        await storage.putFile({
          localPath: prepared.localPath,
          key,
          contentType: mime.lookup(file.name) || "application/octet-stream",
          // L'etichetta dice a quale file del volume corrisponde: è ciò che
          // rende la copia ripetibile senza rifare tutto da capo.
          metadata: { srcsize: String(file.size) },
        });
        const check = await storage.headObject(key);
        if (!check || check.size !== prepared.size)
          throw new Error(
            `verifica fallita (attesi ${prepared.size} byte, sul bucket ${
              check?.size ?? "assente"
            })`
          );
        out.copied += 1;
        out.bytes += prepared.size;
        out.sourceBytes += file.size;
        if (prepared.temp) out.compressed += 1;
      } catch (e) {
        out.failed += 1;
        out.errors.push(`${key}: ${e?.message || e}`);
      } finally {
        cleanup(prepared?.temp);
      }
    }
  }

  out.errors = out.errors.slice(0, 10); // bastano i primi per capire il problema
  return out;
}

module.exports = { status, migrateBatch, kindOf };
