// Banco di prova del form dinamico: fa girare la catena VERA fuori dalla
// produzione, sugli scenari congelati.
//
//   scenario → generaDomanda.js (lo stesso codice di server.js)
//            → backend RL della repo marphco/rl-question-generator, avviato
//              qui in locale, con i dati della fotografia al posto di Mongo
//            → contatore di spesa (tetto 4 $) → OpenAI
//
// Niente tocca la produzione: il backend RL è una copia locale, il database
// è la fotografia (in sola lettura per costruzione), la chiave OpenAI resta
// nel contatore.
//
//   npm run eval:banco -- --giro A                 tutti gli scenari
//   npm run eval:banco -- --giro prova --solo it-01,en-01
//   npm run eval:banco -- --giro A-llm --exploit 0     solo il ramo con l'LLM
//   npm run eval:banco -- --giro A-riciclo --exploit 1 solo il ramo del riciclo
//
// Il backend RL si cerca accanto a basic-adv (../rl-question-generator) o
// dove dice BANCO_RL_DIR; le sue dipendenze: `npm ci` nella sua backend/.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const net = require("net");
const { spawn } = require("child_process");
const contatore = require("./contatoreSpesa");
const { verifica } = require("../../services/requisitiDomande");

const EVAL = path.join(__dirname, "..");
const RISULTATI = path.join(EVAL, "risultati");
const FOTOGRAFIA = path.join(RISULTATI, "fotografia-serbatoio.json");
const RL_DIR = path.resolve(process.env.BANCO_RL_DIR || path.join(EVAL, "..", "..", "..", "rl-question-generator"));

function argomenti() {
  const a = process.argv.slice(2);
  const val = (nome) => {
    const i = a.indexOf(nome);
    return i === -1 ? undefined : a[i + 1];
  };
  return {
    giro: val("--giro") || "prova",
    solo: val("--solo") ? val("--solo").split(",") : null,
    exploit: val("--exploit"), // se manca, resta quello del backend (0.35)
    modello: val("--modello") || process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  };
}

const portaLibera = () =>
  new Promise((ok, ko) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
    s.on("error", ko);
  });

// Avvia il backend RL della repo così com'è. L'ambiente è costruito da zero:
// niente MONGO_URI vera, niente chiave OpenAI, niente chiave di produzione.
async function avviaBackendRl({ urlOpenAi, modello, exploit, log }) {
  const server = path.join(RL_DIR, "backend", "server.js");
  if (!fs.existsSync(server)) throw new Error(`backend RL non trovato in ${RL_DIR} (BANCO_RL_DIR)`);
  const porta = await portaLibera();
  const chiave = crypto.randomBytes(24).toString("hex");
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NO_PROXY: "127.0.0.1,localhost",
    PORT: String(porta),
    MONGO_URI: "fotografia://solo-lettura",
    BANCO_FOTOGRAFIA: FOTOGRAFIA,
    RL_API_KEY: chiave,
    OPENAI_API_URL: urlOpenAi,
    OPENAI_API_KEY: "la-mette-il-contatore",
    OPENAI_MODEL: modello,
    NODE_ENV: "development",
    ...(exploit !== undefined ? { RL_EXPLOIT_P: String(exploit) } : {}),
  };
  const figlio = spawn(process.execPath, ["--import", path.join(__dirname, "aggancio.mjs"), server], {
    cwd: path.dirname(server),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  figlio.stdout.pipe(log);
  figlio.stderr.pipe(log);

  await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("il backend RL non è partito in 20 secondi")), 20000);
    figlio.stdout.on("data", (d) => {
      if (String(d).includes("Server avviato")) {
        clearTimeout(t);
        ok();
      }
    });
    figlio.on("exit", (c) => ko(new Error(`il backend RL si è chiuso (codice ${c})`)));
  });
  return { base: `http://127.0.0.1:${porta}`, chiave, figlio };
}

// Una risposta finta ma plausibile: la prima opzione, come dice lo scenario.
function rispostaA(q, lingua) {
  if (q.requiresInput || !q.options?.length)
    return { input: lingua === "en" ? "No particular preference" : "Nessuna preferenza particolare" };
  return { options: [q.options[0]] };
}

// Riproduce /api/generate e poi /api/nextQuestion, senza database: la
// sessione vive in memoria, con gli stessi campi di ProjectLog.
async function giocaScenario(s, quante, gd, chiamate) {
  const formData = { ...s.formData };
  formData.brandName = formData.brandName || "";
  formData.projectType = formData.projectType || "non specificato";
  formData.businessField = formData.businessField || "non specificato";
  formData.otherBusinessField = formData.otherBusinessField || "";
  formData.contactInfo = {};

  const logEntry = { formData, answers: new Map(), questions: [] };
  let asked = [];
  const passi = [];

  for (let i = 0; i < quante; i++) {
    const prima = chiamate();
    const inizio = Date.now();
    let q;
    try {
      if (i === 0) {
        q = await gd.generateQuestionForService(s.servizio, formData, {}, []);
      } else {
        const precedente = logEntry.questions[i - 1];
        logEntry.answers.set(gd.sanitizeKey(precedente.question), rispostaA(precedente, s.lingua));
        q = await gd.domandaSuccessiva({
          nextService: s.servizio,
          logEntry,
          askedQuestionsForNextService: asked,
          hasFontQuestion: logEntry.questions.some((x) => x && x.type === "font_selection"),
        });
      }
    } catch (e) {
      // In produzione qui il cliente vede un errore (500 o 502).
      passi.push({ n: i + 1, errore: e.message, stato: e.stato || 500, chiamateLlm: chiamate() - prima, ms: Date.now() - inizio });
      break;
    }
    const violazioni = verifica(q, {
      lingua: s.lingua,
      servizio: s.servizio,
      giaChieste: logEntry.questions.map((x) => x.question),
    });
    passi.push({ n: i + 1, domanda: q, violazioni, chiamateLlm: chiamate() - prima, ms: Date.now() - inizio });
    logEntry.questions.push(q);
    const chiaveQ = gd.sanitizeKey(q.question);
    if (!asked.includes(chiaveQ) && !asked.map(gd.normKey).includes(gd.normKey(q.question))) asked = asked.concat([chiaveQ]);
  }
  return passi;
}

function riassunto(esiti) {
  const passi = esiti.flatMap((e) => e.passi);
  const domande = passi.filter((p) => p.domanda);
  const perCodice = {};
  for (const p of domande) for (const v of p.violazioni) perCodice[v.codice] = (perCodice[v.codice] || 0) + 1;
  return {
    scenari: esiti.length,
    domande: domande.length,
    errori: passi.filter((p) => p.errore).length,
    domandeConViolazioni: domande.filter((p) => p.violazioni.length).length,
    violazioniPerTipo: perCodice,
    senzaLlm: domande.filter((p) => p.chiamateLlm === 0).length,
  };
}

async function main() {
  const arg = argomenti();
  if (!fs.existsSync(FOTOGRAFIA)) throw new Error("manca la fotografia: prima `npm run eval:serbatoio`");
  const { domandePerScenario, scenari } = JSON.parse(fs.readFileSync(path.join(EVAL, "scenari.json"), "utf8"));
  const scelti = arg.solo ? scenari.filter((s) => arg.solo.includes(s.id)) : scenari;
  if (!scelti.length) throw new Error("nessuno scenario scelto");

  fs.mkdirSync(RISULTATI, { recursive: true });
  const timbro = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const nome = `giro-${arg.giro}-${timbro}`;
  const log = fs.createWriteStream(path.join(RISULTATI, `${nome}.log`));

  const spesa = await contatore.avvia({ giro: arg.giro, modello: arg.modello });
  console.log(`Giro ${arg.giro}: ${scelti.length} scenari, modello ${arg.modello}, riciclo ${arg.exploit ?? "0.35 (come in produzione)"}`);
  console.log(`Spesa finora ${spesa.totale().toFixed(4)} $ su un tetto di ${spesa.tetto} $`);

  let rl;
  try {
    rl = await avviaBackendRl({ urlOpenAi: spesa.url, modello: arg.modello, exploit: arg.exploit, log });
    // Da qui in poi basic-adv parla SOLO con il backend locale.
    process.env.RL_API_BASE = rl.base;
    process.env.RL_API_KEY = rl.chiave;
    const gd = require("../../services/generaDomanda");

    const esiti = [];
    for (const s of scelti) {
      if (spesa.stato.fermo) break;
      const passi = await giocaScenario(s, domandePerScenario, gd, () => spesa.stato.chiamate);
      esiti.push({ id: s.id, lingua: s.lingua, servizio: s.servizio, formData: s.formData, passi });
      const segni = passi.map((p) => (p.errore ? "E" : p.violazioni.length ? "x" : "✓")).join("");
      console.log(`  ${s.id.padEnd(6)} ${s.servizio.padEnd(26)} ${segni}`);
    }

    const r = riassunto(esiti);
    const completo = !spesa.stato.fermo && esiti.length === scelti.length;
    fs.writeFileSync(
      path.join(RISULTATI, `${nome}.json`),
      JSON.stringify({ giro: arg.giro, modello: arg.modello, exploit: arg.exploit ?? null, completo, riassunto: r, spesa: spesa.stato.voce, esiti }, null, 2)
    );
    console.log(`\n${completo ? "Giro completo" : "GIRO INTERROTTO dal tetto di spesa"}.`);
    console.log(`Domande ${r.domande}, errori ${r.errori}, domande con violazioni ${r.domandeConViolazioni}, senza LLM (riciclate) ${r.senzaLlm}`);
    console.log("Violazioni per tipo:", r.violazioniPerTipo);
    console.log(`Spesa del giro ${spesa.stato.voce.spesa.toFixed(4)} $ — totale ${spesa.totale().toFixed(4)} $ su ${spesa.tetto} $`);
    console.log(`Dettaglio: eval/risultati/${nome}.json`);
  } finally {
    spesa.chiudi();
    if (rl) rl.figlio.kill();
  }
}

if (require.main === module)
  main().catch((e) => {
    console.error("Banco non riuscito:", e.message);
    process.exit(1);
  });

module.exports = { giocaScenario, riassunto, rispostaA };
