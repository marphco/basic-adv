// Controllo del serbatoio del riciclo: quante domande votate sono
// etichettate con la lingua sbagliata.
//
// Il backend RL, una volta su tre, non genera niente: ripesca le domande
// votate bene e le mostra così come sono. Per l'italiano pesca anche tra
// quelle SENZA lingua, e i voti dalla dashboard senza lingua sono sempre
// finiti archiviati come italiani. Se lì dentro ci sono domande inglesi,
// escono sul sito italiano. Questo script misura quanto è grande il
// problema PRIMA di toccare qualsiasi cosa.
//
// SOLO LETTURA, e non per buona volontà: dal database legge con
// MONGO_URI_READONLY (mai con MONGO_URI, le credenziali di produzione) e usa
// solo find(); dal backend RL fa solo GET. I dati scaricati vengono
// congelati in risultati/fotografia-serbatoio.json e riusati.
//
//   npm run eval:serbatoio            (dalla cartella server/)
const fs = require("fs");
const path = require("path");
const { rilevaLingua } = require("../services/requisitiDomande");

// Stessa normalizzazione del backend RL (backend/server.js): serve a
// raggruppare le domande esattamente come fa lui.
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/[?.!,;:]+$/g, "")
    .trim();

const testoDi = (r) =>
  [r.question, ...(Array.isArray(r.options) ? r.options : [])].filter(Boolean).join(". ");

// Riproduce la scelta del backend RL per un servizio e una lingua: righe del
// servizio nella lingua (per l'italiano anche quelle senza lingua), le ultime
// 1000, punteggio sommato per domanda, le positive migliori. Le prime sei sono
// gli "esempi" messi nel prompt; se sono almeno sei, possono anche essere
// riciclate tali e quali.
function semiPer(righe, servizio, lingua) {
  const della = righe
    .filter((r) => (r.state?.service || "").trim() === servizio)
    .filter((r) =>
      lingua === "it"
        ? r.state?.language === undefined || r.state?.language === "it"
        : r.state?.language === lingua
    )
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 1000);

  const perDomanda = new Map();
  for (const r of della) {
    const k = norm(r.question);
    const voto =
      (Number.isFinite(r.questionReward) ? r.questionReward : 0) +
      (Number.isFinite(r.optionsReward) ? r.optionsReward : 0);
    const prima = perDomanda.get(k) || { ...r, voto: 0 };
    prima.voto += voto;
    perDomanda.set(k, prima);
  }
  return [...perDomanda.values()]
    .filter((x) => x.voto > 0)
    .sort((a, b) => b.voto - a.voto)
    .slice(0, 6);
}

// Il cuore del controllo, separato dalla connessione: si prova senza
// database.
function analizza(righe) {
  const perEtichetta = {};
  const sbagliate = [];
  for (const r of righe) {
    const etichetta = r.state?.language ?? "(nessuna)";
    perEtichetta[etichetta] = (perEtichetta[etichetta] || 0) + 1;
    const rilevata = rilevaLingua(testoDi(r));
    // Senza etichetta il backend la tratta da italiana: è così che va giudicata.
    const comeLaUsa = r.state?.language || "it";
    if (rilevata !== "?" && rilevata !== comeLaUsa)
      sbagliate.push({
        servizio: r.state?.service || "?",
        etichetta,
        rilevata,
        voto: (r.questionReward || 0) + (r.optionsReward || 0),
        domanda: r.question,
      });
  }

  // Cosa arriva davvero al cliente: gli esempi di ogni servizio/lingua.
  const servizi = [...new Set(righe.map((r) => (r.state?.service || "").trim()).filter(Boolean))];
  const esempi = [];
  for (const servizio of servizi)
    for (const lingua of ["it", "en"]) {
      const semi = semiPer(righe, servizio, lingua);
      if (!semi.length) continue;
      const fuori = semi.filter((s) => {
        const l = rilevaLingua(testoDi(s));
        return l !== "?" && l !== lingua;
      });
      esempi.push({
        servizio,
        lingua,
        semi: semi.length,
        nellaLinguaSbagliata: fuori.length,
        riciclabili: semi.length >= 6, // il backend ricicla solo se ne ha almeno 6
        domandeSbagliate: fuori.map((s) => s.question),
      });
    }

  return { totale: righe.length, perEtichetta, sbagliate, esempi };
}

function stampa(r) {
  console.log(`\nDomande votate nel serbatoio: ${r.totale}`);
  console.log("Per lingua dichiarata:");
  for (const [k, n] of Object.entries(r.perEtichetta)) console.log(`  ${k.padEnd(10)} ${n}`);

  console.log(`\nEtichettate con la lingua sbagliata: ${r.sbagliate.length}`);
  for (const s of r.sbagliate.slice(0, 15))
    console.log(`  [${s.servizio}] dichiarata ${s.etichetta}, è ${s.rilevata}, voto ${s.voto}: ${s.domanda}`);
  if (r.sbagliate.length > 15) console.log(`  … e altre ${r.sbagliate.length - 15}`);

  const colpiti = r.esempi.filter((e) => e.nellaLinguaSbagliata);
  console.log(`\nServizi dove gli esempi del prompt contengono la lingua sbagliata: ${colpiti.length}`);
  for (const e of colpiti)
    console.log(
      `  ${e.servizio} (${e.lingua}): ${e.nellaLinguaSbagliata} su ${e.semi}` +
        (e.riciclabili ? " — e possono uscire TALI E QUALI una volta su tre" : "")
    );
}

const DIR_RISULTATI = path.join(__dirname, "risultati");
// La fotografia dei dati: si scarica UNA volta e poi si riusa, così il giro
// di partenza e quelli dopo le correzioni lavorano sugli stessi identici
// dati. Per riscaricarla apposta: --aggiorna.
const FOTOGRAFIA = path.join(DIR_RISULTATI, "fotografia-serbatoio.json");

// Da dove leggere, in ordine. In nessun caso si scrive: dal database solo
// find(), dal backend RL solo GET.
async function scarica() {
  // 1. Il database, con un utente in sola lettura (non con MONGO_URI: sono
  //    le credenziali di produzione).
  if (process.env.MONGO_URI_READONLY) {
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGO_URI_READONLY, {
      dbName: process.env.RL_DB_NAME || "basic",
      serverSelectionTimeoutMS: 15000,
    });
    try {
      return await mongoose.connection.db
        .collection(process.env.RL_COLLECTION || "appuser")
        .find({}, { projection: { state: 1, question: 1, options: 1, questionReward: 1, optionsReward: 1, timestamp: 1 } })
        .toArray();
    } finally {
      await mongoose.disconnect();
    }
  }

  // 2. Il backend RL, con la sua chiave. Serve dove il database non si
  //    raggiunge (l'ambiente cloud delle prove ha la porta di MongoDB chiusa).
  const base = String(process.env.RL_API_BASE || "").replace(/\/+$/, "");
  const chiave = process.env.RL_API_KEY;
  if (base && chiave) {
    const r = await fetch(`${base}/api/get-training-data`, {
      method: "GET",
      headers: { Authorization: `Bearer ${chiave}` },
    });
    if (!r.ok) throw new Error(`il backend RL ha risposto ${r.status}`);
    const corpo = await r.json();
    return Array.isArray(corpo?.data) ? corpo.data : [];
  }

  throw new Error(
    "Non so da dove leggere i dati. Serve MONGO_URI_READONLY (utente Atlas in sola lettura) " +
      "oppure RL_API_BASE + RL_API_KEY. MONGO_URI non lo uso apposta: sono le credenziali di produzione."
  );
}

async function main() {
  fs.mkdirSync(DIR_RISULTATI, { recursive: true });

  let righe;
  if (fs.existsSync(FOTOGRAFIA) && !process.argv.includes("--aggiorna")) {
    const f = JSON.parse(fs.readFileSync(FOTOGRAFIA, "utf8"));
    righe = f.righe;
    console.log(`Uso la fotografia del ${f.scattata} (${righe.length} righe). Per riscaricarla: --aggiorna`);
  } else {
    righe = await scarica();
    fs.writeFileSync(FOTOGRAFIA, JSON.stringify({ scattata: new Date().toISOString(), righe }, null, 2));
    console.log(`Fotografia scattata: ${righe.length} righe → ${path.relative(process.cwd(), FOTOGRAFIA)}`);
  }

  const r = analizza(righe);
  stampa(r);
  const file = path.join(DIR_RISULTATI, `serbatoio-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(r, null, 2));
  console.log(`\nDettaglio completo: ${path.relative(process.cwd(), file)}`);
}

if (require.main === module)
  main().catch((e) => {
    console.error("Controllo non riuscito:", e.message);
    process.exit(1);
  });

module.exports = { analizza, semiPer, scarica };
