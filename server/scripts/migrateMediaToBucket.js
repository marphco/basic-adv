// Tappa 3: COPIA sul bucket i file che oggi stanno sul volume.
//
// Regole, in ordine di importanza:
//  1. NON cancella e NON modifica NIENTE sul disco. Solo lettura.
//  2. Il nome del file non cambia mai: la chiave nel bucket ricalca il
//     percorso pubblico (uploads/<file>, uploads-ped/<file>), quindi nessun
//     URL già inviato ai clienti può rompersi.
//  3. È ripetibile: un file già presente sul bucket con la stessa dimensione
//     viene saltato. Si può interrompere e riprendere quando si vuole.
//  4. Verifica ogni caricamento rileggendo la dimensione dal bucket.
//
// Uso (dalla cartella server/):
//   node scripts/migrateMediaToBucket.js --dry-run      → cosa farebbe
//   node scripts/migrateMediaToBucket.js                → copia tutto
//   node scripts/migrateMediaToBucket.js --limit=100    → un primo lotto
//   node scripts/migrateMediaToBucket.js --only=uploads-ped
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const storage = require("../services/storage");

dotenv.config();

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const has = (name) => process.argv.includes(`--${name}`);

const BASE =
  process.env.UPLOAD_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  "/data/uploads";

// Le due cartelle servite pubblicamente, con il prefisso che avranno nel
// bucket: coincide con l'URL, così il file resta raggiungibile allo stesso
// indirizzo di sempre.
const FOLDERS = [
  { prefix: "uploads", dir: BASE },
  { prefix: "uploads-ped", dir: path.join(BASE, "editorial") },
];

const MB = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

function filesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name !== "lost+found")
    .map((name) => ({ name, full: path.join(dir, name) }))
    .filter((f) => {
      try {
        return fs.statSync(f.full).isFile();
      } catch {
        return false; // sparito nel frattempo: non è un problema
      }
    });
}

async function migrateFolder({ prefix, dir }, { dryRun, limit }) {
  const out = { prefix, total: 0, copied: 0, skipped: 0, failed: 0, bytes: 0 };
  const files = filesIn(dir);
  out.total = files.length;

  for (const f of files) {
    if (limit && out.copied >= limit) break;
    const key = `${prefix}/${f.name}`;
    const size = fs.statSync(f.full).size;

    // Già sul bucket con la stessa dimensione: niente da fare.
    const existing = await storage.headObject(key);
    if (existing && existing.size === size) {
      out.skipped += 1;
      continue;
    }

    if (dryRun) {
      out.copied += 1;
      out.bytes += size;
      continue;
    }

    try {
      await storage.putFile({
        localPath: f.full,
        key,
        contentType: mime.lookup(f.name) || "application/octet-stream",
      });
      // Verifica: rileggo dal bucket e confronto la dimensione.
      const check = await storage.headObject(key);
      if (!check || check.size !== size)
        throw new Error(
          `verifica fallita (locale ${size} byte, bucket ${check?.size ?? "assente"})`
        );
      out.copied += 1;
      out.bytes += size;
      process.stdout.write(".");
    } catch (e) {
      out.failed += 1;
      console.error(`\n  ✗ ${key}: ${e?.message || e}`);
    }
  }
  return out;
}

(async () => {
  const dryRun = has("dry-run");
  const limit = Number(arg("limit")) || 0;
  const only = arg("only");

  if (!storage.isR2Configured()) {
    console.error(
      "Bucket non configurato: servono R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET."
    );
    process.exit(1);
  }

  const folders = FOLDERS.filter((f) => !only || f.prefix === only);
  console.log(
    `Copia sul bucket${dryRun ? " (SIMULAZIONE)" : ""}${limit ? ` — max ${limit} file per cartella` : ""}`
  );
  console.log(`Origine: ${BASE} — nessun file verrà modificato o cancellato.\n`);

  let failed = 0;
  for (const folder of folders) {
    const r = await migrateFolder(folder, { dryRun, limit });
    failed += r.failed;
    console.log(
      `\n${r.prefix}: ${r.total} file sul disco — ` +
        `${r.copied} ${dryRun ? "da copiare" : "copiati"} (${MB(r.bytes)}), ` +
        `${r.skipped} già presenti, ${r.failed} falliti`
    );
  }

  if (failed) {
    console.error(`\n${failed} file non copiati: rilancia per riprovare solo quelli.`);
    process.exit(1);
  }
  console.log(
    dryRun
      ? "\nSimulazione completata: nessuna scrittura effettuata."
      : "\nCopia completata e verificata. Il volume non è stato toccato."
  );
  process.exit(0);
})().catch((e) => {
  console.error("Migrazione interrotta:", e?.message || e);
  process.exit(1);
});
