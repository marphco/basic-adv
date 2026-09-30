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
// Come il sito: rete di sicurezza e domanda preparata in anticipo mentre il
// cliente risponde (--pensa MS, quanto ci mette il cliente: 2000 di base;
// --senza-anticipo per generarla solo dopo la risposta).
// r domanda di riserva, - riserva finita (il sito passa ai contatti).
// Legenda per ogni domanda: ✓ va bene, x viola un requisito, ! il cliente
// ha visto un errore ma riprovando è arrivata, X entrambe, E tre errori di
// fila (sessione abbandonata).
//
// Il backend RL si cerca accanto a basic-adv (../rl-question-generator) o
// dove dice BANCO_RL_DIR; le sue dipendenze: `npm ci` nella sua backend/.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const net = require("net");
const { spawn } = require("child_process");
const contatore = require("./contatoreSpesa");
const { verifica, verificaSessione, OBBLIGATORIE } = require("../../services/requisitiDomande");

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
    anticipo: !a.includes("--senza-anticipo"),
    pensa: Number(val("--pensa") ?? 2000),
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

// Il form non riprova da solo: se il server risponde con un errore, il
// cliente vede un messaggio e deve premere di nuovo. Il banco fa come un
// cliente paziente: riprova fino a 3 volte, e conta OGNI errore visto.
const TENTATIVI_CLIENTE = 3;

const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

// Riproduce /api/generate e poi /api/nextQuestion con gli stessi moduli
// delle rotte (rete di sicurezza, preparazione in anticipo), senza database:
// la sessione vive in memoria, con gli stessi campi di ProjectLog.
//   pensa: quanto ci mette il cliente a leggere e rispondere (ms). Intanto
//          il server prepara la domanda successiva, come sul sito.
async function giocaScenario(s, quante, moduli, chiamate, { pensa = 2000, anticipo = true } = {}) {
  const { gd, rete, pd } = moduli;
  const formData = { ...s.formData };
  formData.brandName = formData.brandName || "";
  formData.projectType = formData.projectType || "non specificato";
  formData.businessField = formData.businessField || "non specificato";
  formData.otherBusinessField = formData.otherBusinessField || "";
  formData.contactInfo = {};
  const lingua = s.lingua;
  const sessionId = crypto.randomUUID();

  // Come ProjectLog con un solo servizio scelto.
  const logEntry = {
    formData,
    questions: [],
    answers: new Map(),
    questionCount: 0,
    servicesQueue: [s.servizio],
    currentServiceIndex: 0,
    serviceQuestionCount: new Map(),
    maxQuestionsPerService: 10,
    totalQuestions: 10,
    askedQuestions: new Map(),
  };
  const passi = [];

  for (let i = 0; i < quante; i++) {
    const passo = { n: i + 1, errori: [] };
    const prima = chiamate();
    if (i > 0) {
      // Il cliente legge e risponde; intanto il server prepara la prossima.
      if (anticipo) pd.preparaInAnticipo(sessionId, logEntry);
      await pausa(pensa);
      const precedente = logEntry.questions[i - 1];
      logEntry.answers.set(gd.sanitizeKey(precedente.question), rispostaA(precedente, lingua));
    }
    const inizio = Date.now(); // da qui aspetta il cliente
    let q;
    let piano;
    for (let t = 0; t < TENTATIVI_CLIENTE && q === undefined; t++) {
      try {
        if (i === 0) {
          q = await rete.domandaSicura({
            servizio: s.servizio,
            lingua,
            genera: () => gd.generateQuestionForService(s.servizio, formData, {}, []),
          });
        } else {
          piano = pd.pianoProssimaDomanda(logEntry);
          if (piano.fine) q = null;
          else q = await pd.prossimaDomanda(sessionId, logEntry, piano);
        }
      } catch (e) {
        // In produzione qui il cliente vede un errore (500).
        passo.errori.push({ messaggio: e.message, stato: e.stato || 500 });
      }
    }
    passo.chiamateLlm = chiamate() - prima;
    passo.ms = Date.now() - inizio;
    passi.push(passo);
    if (q === null) {
      passo.riservaEsaurita = true; // il sito passa ai contatti
      break;
    }
    if (q === undefined) {
      passo.abbandonato = true; // tre errori di fila: il cliente se ne va
      break;
    }
    passo.domanda = q;
    passo.violazioni = verifica(q, {
      lingua,
      servizio: s.servizio,
      giaChieste: logEntry.questions.map((x) => x.question),
    });

    // Aggiorna la sessione come le rotte.
    const servizio = piano ? piano.nextService : s.servizio;
    if (piano?.cambiaServizio) logEntry.currentServiceIndex += 1;
    logEntry.questions.push(q);
    logEntry.questionCount += 1;
    logEntry.serviceQuestionCount.set(servizio, (logEntry.serviceQuestionCount.get(servizio) || 0) + 1);
    const asked = logEntry.askedQuestions.get(servizio) || [];
    const chiaveQ = gd.sanitizeKey(q.question);
    if (!asked.includes(chiaveQ) && !asked.map(gd.normKey).includes(gd.normKey(q.question))) asked.push(chiaveQ);
    logEntry.askedQuestions.set(servizio, asked);
  }

  const completa = logEntry.questions.length === quante;
  return {
    passi,
    completa,
    // I requisiti di sessione hanno senso solo sulla sessione intera.
    sessione: completa ? verificaSessione(logEntry.questions, { servizio: s.servizio }) : null,
  };
}

const segno = (p) => (p.abbandonato ? "E" : p.riservaEsaurita ? "-" : p.domanda.__provider === "riserva" ? "r" : p.violazioni.length ? (p.errori.length ? "X" : "x") : p.errori.length ? "!" : "✓");

function riassunto(esiti) {
  const passi = esiti.flatMap((e) => e.passi);
  const domande = passi.filter((p) => p.domanda);
  const perCodice = {};
  for (const p of domande) for (const v of p.violazioni) perCodice[v.codice] = (perCodice[v.codice] || 0) + 1;

  // Quante volte il cliente vede un errore, servizio per servizio (e lingua).
  const perServizio = {};
  for (const e of esiti) {
    const k = `${e.servizio} (${e.lingua})`;
    const r = (perServizio[k] ||= { sessioni: 0, domandeMostrate: 0, erroriVisti: 0, abbandonate: 0, riserva: 0 });
    r.riserva += e.passi.filter((p) => p.domanda?.__provider === "riserva").length;
    r.sessioni++;
    r.domandeMostrate += e.passi.filter((p) => p.domanda).length;
    r.erroriVisti += e.passi.reduce((n, p) => n + p.errori.length, 0);
    if (e.passi.some((p) => p.abbandonato)) r.abbandonate++;
  }

  // Requisiti di sessione (oggi: il Logo deve avere colori e font).
  const conObblighi = esiti.filter((e) => OBBLIGATORIE[e.servizio.trim().toLowerCase()]);
  const quante = (codice, tema) =>
    conObblighi.filter((e) => e.sessione?.some((v) => v.codice === codice && v.messaggio.includes(`su: ${tema}`))).length;
  const sessione = {
    sessioni: conObblighi.length,
    complete: conObblighi.filter((e) => e.completa).length,
    senzaColori: quante("mancaObbligatoria", "colori"),
    senzaFont: quante("mancaObbligatoria", "font"),
    coloriRipetuti: quante("obbligatoriaRipetuta", "colori"),
    fontRipetuti: quante("obbligatoriaRipetuta", "font"),
  };

  return {
    sessioni: esiti.length,
    domande: domande.length,
    erroriVisti: passi.reduce((n, p) => n + p.errori.length, 0),
    sessioniAbbandonate: esiti.filter((e) => e.passi.some((p) => p.abbandonato)).length,
    domandeConViolazioni: domande.filter((p) => p.violazioni.length).length,
    violazioniPerTipo: perCodice,
    senzaLlm: domande.filter((p) => p.chiamateLlm === 0).length,
    riserva: domande.filter((p) => p.domanda.__provider === "riserva").length,
    // Quanto aspetta il cliente per una domanda (millisecondi).
    attesa: (() => {
      const ms = passi.map((p) => p.ms).sort((a, b) => a - b);
      return { mediana: ms[Math.floor(ms.length / 2)] || 0, p90: ms[Math.floor(ms.length * 0.9)] || 0, massimo: ms.at(-1) || 0 };
    })(),
    riservaEsaurita: passi.filter((p) => p.riservaEsaurita).length,
    motiviRiserva: domande
      .filter((p) => p.domanda.__provider === "riserva")
      .reduce((m, p) => {
        const k = String(p.domanda.__motivoRiserva).replace(/"[^"]*"/g, "…").slice(0, 70);
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {}),
    perServizio,
    sessione,
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
  console.log(`Giro ${arg.giro}: ${scelti.length} scenari, modello ${arg.modello}, riciclo ${arg.exploit ?? "0.35 (come in produzione)"}, anticipo ${arg.anticipo ? `sì, il cliente risponde in ${arg.pensa / 1000} s` : "no"}`);
  console.log(`Spesa finora ${spesa.totale().toFixed(4)} $ su un tetto di ${spesa.tetto} $`);

  let rl;
  try {
    rl = await avviaBackendRl({ urlOpenAi: spesa.url, modello: arg.modello, exploit: arg.exploit, log });
    // Da qui in poi basic-adv parla SOLO con il backend locale.
    process.env.RL_API_BASE = rl.base;
    process.env.RL_API_KEY = rl.chiave;
    const moduli = {
      gd: require("../../services/generaDomanda"),
      rete: require("../../services/reteSicurezza"),
      pd: require("../../services/prossimaDomanda"),
    };

    const esiti = [];
    for (const s of scelti) {
      const quante = s.domande || domandePerScenario;
      const volte = s.ripetizioni || 1;
      for (let v = 1; v <= volte && !spesa.stato.fermo; v++) {
        const g = await giocaScenario(s, quante, moduli, () => spesa.stato.chiamate, arg);
        esiti.push({ id: s.id, ripetizione: v, lingua: s.lingua, servizio: s.servizio, formData: s.formData, ...g });
        const nota = g.sessione?.length ? "  " + g.sessione.map((x) => x.messaggio).join("; ") : "";
        console.log(`  ${(s.id + (volte > 1 ? "#" + v : "")).padEnd(8)} ${s.servizio.padEnd(26)} ${g.passi.map(segno).join("")}${nota}`);
      }
      if (spesa.stato.fermo) break;
    }
    const r = riassunto(esiti);
    const attese = scelti.reduce((n, s) => n + (s.ripetizioni || 1), 0);
    const completo = !spesa.stato.fermo && esiti.length === attese;
    fs.writeFileSync(
      path.join(RISULTATI, `${nome}.json`),
      JSON.stringify({ giro: arg.giro, modello: arg.modello, exploit: arg.exploit ?? null, anticipo: arg.anticipo, pensa: arg.pensa, completo, riassunto: r, spesa: spesa.stato.voce, esiti }, null, 2)
    );
    console.log(`\n${completo ? "Giro completo" : "GIRO INTERROTTO dal tetto di spesa"}.`);
    console.log(`Sessioni ${r.sessioni}, domande mostrate ${r.domande}, errori visti dal cliente ${r.erroriVisti}, sessioni abbandonate ${r.sessioniAbbandonate}`);
    console.log(`Domande con violazioni ${r.domandeConViolazioni}, fatte dal codice senza AI (font, colori) ${r.senzaLlm}`);
    console.log("Violazioni per tipo:", r.violazioniPerTipo);
    console.log(`Attesa del cliente per domanda: mediana ${(r.attesa.mediana / 1000).toFixed(1)} s, 9 su 10 entro ${(r.attesa.p90 / 1000).toFixed(1)} s, massimo ${(r.attesa.massimo / 1000).toFixed(1)} s`);
    {
      console.log(`\nDomande di riserva ${r.riserva} su ${r.domande} (${((100 * r.riserva) / (r.domande || 1)).toFixed(1)}%), riserva esaurita ${r.riservaEsaurita}`);
      console.log("Perché è scattata la riserva:", r.motiviRiserva);
      for (const [k, v] of Object.entries(r.perServizio)) if (v.riserva) console.log(`  ${k.padEnd(34)} ${v.riserva} su ${v.domandeMostrate}`);
    }
    console.log("\nErrori visti dal cliente, per servizio:");
    if (!r.erroriVisti) console.log("  nessuno");
    for (const [k, v] of Object.entries(r.perServizio))
      if (v.erroriVisti) console.log(`  ${k.padEnd(34)} ${v.erroriVisti} errori su ${v.domandeMostrate + v.abbandonate} domande, ${v.abbandonate} sessioni abbandonate su ${v.sessioni}`);
    const o = r.sessione;
    if (o.sessioni)
      console.log(`\nLogo, sessioni complete ${o.complete} su ${o.sessioni}: senza colori ${o.senzaColori}, senza font ${o.senzaFont}, colori due volte ${o.coloriRipetuti}, font due volte ${o.fontRipetuti}`);
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

module.exports = { giocaScenario, riassunto, rispostaA, segno };
