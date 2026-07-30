// Ricostruisce RETROATTIVAMENTE lo storico delle notifiche del piano
// editoriale dai dati già in archivio (approvazioni e note del cliente).
//
// Uso (dalla cartella server/):
//   node scripts/backfillPlanHistory.js --dry-run          → simula, non scrive
//   node scripts/backfillPlanHistory.js                    → tutti i clienti
//   node scripts/backfillPlanHistory.js --client=<id>      → un solo cliente
//
// Lo stesso lavoro è disponibile anche dalla dashboard (pulsante "Ricostruisci
// storico" nello Storico notifiche, solo admin).
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { backfillHistory } = require("../services/planHistory");

dotenv.config();

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI mancante: imposta la variabile d'ambiente.");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const clientId = arg("client");

  await mongoose.connect(process.env.MONGO_URI);
  console.log(
    `Ricostruzione storico${dryRun ? " (SIMULAZIONE)" : ""}${
      clientId ? ` — cliente ${clientId}` : " — tutti i clienti"
    }…`
  );

  const r = await backfillHistory({ clientId, dryRun });
  r.details.forEach((d) => {
    console.log(`\n• ${d.client}`);
    if (!d.monthsScanned.length) {
      console.log(
        "   nessuna prova in archivio (nessuna approvazione, nessuna nota del cliente)"
      );
      return;
    }
    // Elenco tutti i mesi con prove, non solo quelli che producono qualcosa:
    // così si vede subito PERCHÉ un mese non genera nessuna voce.
    d.monthsScanned.forEach((m) =>
      console.log(
        `   ${String(m.month).padStart(2, "0")}/${m.year}: ` +
          `prove ${m.approvals} approvazioni + ${m.notes} note ` +
          `(${m.clientEvidence} dal cliente) → ` +
          `${m.notifications} notifiche, ${m.accesses} aperture`
      )
    );
  });
  console.log(
    `\nTotale: ${r.notifications} notifiche e ${r.accesses} aperture ` +
      `${dryRun ? "da ricostruire" : "ricostruite"} su ${r.clients} clienti.`
  );

  await mongoose.connection.close();
  process.exit(0);
})().catch(async (e) => {
  console.error("Ricostruzione fallita:", e);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
