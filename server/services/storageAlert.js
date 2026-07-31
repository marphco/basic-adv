// Avviso quando lo spazio sul bucket si avvicina al limite.
//
// Il piano gratuito di R2 arriva a 10 GB. Accorgersene quando è pieno
// significa accorgersene quando gli operatori non riescono più a caricare:
// meglio una email qualche GB prima, con scritto cosa fare.
//
// Due accortezze perché l'avviso resti utile e non diventi rumore da
// ignorare: si manda al massimo una volta ogni sette giorni, e si smette
// quando lo spazio torna sotto soglia (così il prossimo avviso è di nuovo
// una notizia).
const mongoose = require("mongoose");
const storage = require("./storage");
const { sendMailTracked } = require("./mailer");

const GB = 1024 * 1024 * 1024;
const SOGLIA = () => Number(process.env.R2_ALERT_GB || 8) * GB;
const LIMITE = () => Number(process.env.R2_LIMIT_GB || 10) * GB;
const A = () => process.env.STORAGE_ALERT_TO || "amministrazione@basicadv.com";
const OGNI_GIORNI = 7;

// Un solo documento: quando è partito l'ultimo avviso. Serve a non ripeterlo
// a ogni controllo — e a ricordarselo anche dopo un riavvio.
const Stato =
  mongoose.models.StorageAlert ||
  mongoose.model(
    "StorageAlert",
    new mongoose.Schema(
      {
        key: { type: String, unique: true },
        lastSentAt: Date,
        lastBytes: Number,
      },
      { collection: "storagealerts" }
    )
  );

const MB = (n) => `${(n / 1024 / 1024).toFixed(0)} MB`;
const inGB = (n) => `${(n / GB).toFixed(2)} GB`;

// Controlla lo spazio e, se serve, avvisa. Non solleva mai: è un guardiano,
// non deve poter disturbare il funzionamento del sito.
async function check({ force = false } = {}) {
  try {
    if (!storage.isR2Configured()) return { skipped: "bucket non configurato" };
    if (mongoose.connection.readyState !== 1)
      return { skipped: "database non pronto" };

    const { files, bytes } = await storage.usage();
    const soglia = SOGLIA();
    const limite = LIMITE();

    const stato = await Stato.findOne({ key: "bucket" });

    if (bytes < soglia) {
      // Rientrati: azzero, così il prossimo superamento avvisa subito.
      if (stato?.lastSentAt) await Stato.updateOne({ key: "bucket" }, { lastSentAt: null });
      return { bytes, files, soglia, sotto: true };
    }

    const giorni = stato?.lastSentAt
      ? (Date.now() - new Date(stato.lastSentAt).getTime()) / 86400000
      : Infinity;
    if (!force && giorni < OGNI_GIORNI)
      return { bytes, files, soglia, giaAvvisato: true };

    const restano = Math.max(0, limite - bytes);
    const esito = await sendMailTracked({
      to: A(),
      subject: `Spazio archivio quasi esaurito — ${inGB(bytes)} di ${inGB(limite)}`,
      text:
        `L'archivio dei media ha superato la soglia di ${inGB(soglia)}.\n\n` +
        `Spazio occupato: ${inGB(bytes)} su ${inGB(limite)} (${files} file).\n` +
        `Spazio rimasto: ${inGB(restano)}.\n\n` +
        `Quando lo spazio finisce gli operatori non riescono più a caricare ` +
        `foto e video nei piani editoriali.\n\n` +
        `Per liberare spazio: dashboard → Piani editoriali → Archivio → ` +
        `scheda Contenuti.\n` +
        `Lì si vede cosa occupa di più, diviso per cliente e mese, e si ` +
        `possono cancellare i file non più usati e i mesi vecchi.\n\n` +
        `Questo avviso viene ripetuto al massimo una volta a settimana ` +
        `finché lo spazio resta sopra la soglia.`,
    });

    await Stato.updateOne(
      { key: "bucket" },
      { key: "bucket", lastSentAt: new Date(), lastBytes: bytes },
      { upsert: true }
    );

    console.log(
      `[spazio] avviso inviato a ${A()}: ${inGB(bytes)} occupati (${MB(restano)} liberi)`
    );
    return { bytes, files, soglia, inviato: true, ok: esito.ok, errore: esito.error };
  } catch (e) {
    console.error("[spazio] controllo non riuscito:", e?.message);
    return { errore: e?.message };
  }
}

// Controllo periodico. Il primo parte a un minuto dall'avvio: il tempo che il
// database sia pronto, e senza appesantire la partenza del server.
function schedule() {
  const ogni = Number(process.env.R2_ALERT_HOURS || 6) * 3600 * 1000;
  setTimeout(() => {
    check();
    setInterval(check, ogni);
  }, 60 * 1000).unref?.();
}

module.exports = { check, schedule, SOGLIA, LIMITE };
