// Tappa 3: COPIA sul bucket i file che oggi stanno sul volume, comprimendo
// per strada i media dei piani editoriali.
//
// Regole, in ordine di importanza:
//  1. NON cancella e NON modifica NIENTE sul disco. Solo lettura: la
//     compressione lavora su copie temporanee fuori dal volume.
//  2. Il nome del file non cambia mai: la chiave nel bucket ricalca il
//     percorso pubblico (uploads/<file>, uploads-ped/<file>), quindi nessun
//     URL già inviato ai clienti può rompersi.
//  3. È ripetibile: ciò che è già stato copiato viene saltato. Si può
//     interrompere e riprendere quando si vuole.
//  4. Verifica ogni caricamento rileggendo la dimensione dal bucket.
//
// La logica vera sta in services/mediaMigration.js, la stessa che usa il
// pannello "Archivio" della dashboard: un solo comportamento, non due che col
// tempo divergono.
//
// Uso (dalla cartella server/):
//   node scripts/migrateMediaToBucket.js --dry-run      → cosa farebbe
//   node scripts/migrateMediaToBucket.js                → copia tutto
//   node scripts/migrateMediaToBucket.js --limit=100    → un primo lotto
//   node scripts/migrateMediaToBucket.js --only=uploads-ped
const dotenv = require("dotenv");
const storage = require("../services/storage");
const migration = require("../services/mediaMigration");

dotenv.config();

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const has = (name) => process.argv.includes(`--${name}`);

const MB = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

(async () => {
  const dryRun = has("dry-run");
  const limit = Number(arg("limit")) || 0;
  const only = arg("only") || "";

  if (!storage.isR2Configured()) {
    console.error(
      "Bucket non configurato: servono R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET."
    );
    process.exit(1);
  }

  const info = await migration.status();
  console.log(`Copia sul bucket${dryRun ? " (SIMULAZIONE)" : ""}`);
  console.log(`Origine: ${info.base} — nessun file verrà modificato o cancellato.\n`);

  const totals = { copied: 0, skipped: 0, failed: 0, bytes: 0, sourceBytes: 0 };
  let done = 0;

  // Un lotto dopo l'altro finché non resta nulla (o finché non si raggiunge
  // il limite chiesto): così i video, che sono lenti, non bloccano tutto.
  for (let round = 0; round < 1000; round++) {
    const r = await migration.migrateBatch({
      dryRun,
      limit: dryRun ? 5000 : 25,
      only,
    });
    totals.copied += r.copied;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
    totals.bytes += r.bytes;
    totals.sourceBytes += r.sourceBytes;
    done += r.copied;
    r.errors.forEach((e) => console.error(`  ✗ ${e}`));
    if (r.copied) process.stdout.write(`.`);
    if (!r.remaining || (limit && done >= limit) || (!r.copied && !r.failed)) break;
  }

  console.log(
    `\n\n${totals.copied} file ${dryRun ? "da copiare" : "copiati"} — ` +
      `${MB(totals.sourceBytes)} sul volume → ${MB(totals.bytes)} sul bucket, ` +
      `${totals.skipped} già presenti, ${totals.failed} falliti`
  );

  if (totals.failed) {
    console.error(`\n${totals.failed} file non copiati: rilancia per riprovare solo quelli.`);
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
