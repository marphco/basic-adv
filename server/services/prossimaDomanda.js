// La domanda successiva del form dinamico, preparata IN ANTICIPO.
//
// Il cliente impiega qualche secondo a leggere una domanda e a rispondere;
// l'AI ne impiega uno o due a scrivere la successiva. Invece di aspettare la
// risposta, il server comincia a preparare la domanda successiva appena ha
// mostrato quella corrente: quando il cliente preme avanti, di solito è già
// pronta e l'attesa è quasi zero.
//
// Cosa si perde: la domanda preparata conosce tutte le domande fatte e tutte
// le risposte tranne l'ultima (non c'è ancora). Il resto non cambia: stessa
// scelta del servizio, stesse regole del Logo, stessa rete di sicurezza.
//
// Se la domanda preparata non c'è (server ripartito, sessione vecchia, più
// copie del server) si genera come prima: nessun caso nuovo di errore.
const { domandaSuccessiva } = require("./generaDomanda");
const { domandaSicura } = require("./reteSicurezza");

// Cosa farà /api/nextQuestion alla prossima risposta. Non dipende dalla
// risposta: solo da quante domande sono state fatte e per quale servizio.
//   { fine: true }  le domande sono finite
//   { nextService, cambiaServizio, askedQuestionsForNextService, hasFontQuestion }
function pianoProssimaDomanda(logEntry) {
  if (logEntry.questionCount >= logEntry.totalQuestions) return { fine: true };

  let indice = logEntry.currentServiceIndex;
  const attuale = logEntry.servicesQueue[indice];
  const fatte = logEntry.serviceQuestionCount.get(attuale) || 0;
  const cambiaServizio = fatte >= logEntry.maxQuestionsPerService;
  if (cambiaServizio) {
    indice += 1;
    if (indice >= logEntry.servicesQueue.length) return { fine: true };
  }

  const nextService = logEntry.servicesQueue[indice];
  return {
    nextService,
    cambiaServizio,
    askedQuestionsForNextService: logEntry.askedQuestions.get(nextService) || [],
    hasFontQuestion: (logEntry.questions || []).some((q) => q && q.type === "font_selection"),
  };
}

// Genera la domanda del piano, passando dalla rete di sicurezza.
// Lavora su una copia della sessione: la preparazione in anticipo gira
// mentre la rotta modifica la sessione vera.
function generaDaPiano(logEntry, piano) {
  const copia = {
    formData: logEntry.formData,
    answers: new Map(logEntry.answers),
    questions: [...(logEntry.questions || [])],
  };
  return domandaSicura({
    servizio: piano.nextService,
    lingua: copia.formData?.lang === "en" ? "en" : "it",
    giaChieste: copia.questions.map((q) => q?.question).filter(Boolean),
    genera: () =>
      domandaSuccessiva({
        nextService: piano.nextService,
        logEntry: copia,
        askedQuestionsForNextService: [...piano.askedQuestionsForNextService],
        hasFontQuestion: piano.hasFontQuestion,
      }),
  });
}

/* ---------- le domande preparate, in memoria ---------- */

const pronte = new Map();
const DURATA_MS = 30 * 60 * 1000; // una sessione abbandonata non resta per sempre
const MASSIMO = 1000;

const chiave = (sessionId, questionCount) => `${sessionId}:${questionCount}`;

function pulisci() {
  const adesso = Date.now();
  for (const [k, v] of pronte) if (adesso - v.creata > DURATA_MS) pronte.delete(k);
  while (pronte.size > MASSIMO) pronte.delete(pronte.keys().next().value);
}

// Da chiamare subito dopo aver mostrato una domanda (e salvato la sessione).
function preparaInAnticipo(sessionId, logEntry) {
  const piano = pianoProssimaDomanda(logEntry);
  if (piano.fine) return;
  pulisci();
  const promessa = generaDaPiano(logEntry, piano).catch((e) => {
    console.warn("[anticipo] preparazione non riuscita:", e?.message || e);
    return undefined; // undefined = da rifare; null = domande finite
  });
  pronte.set(chiave(sessionId, logEntry.questionCount), {
    promessa,
    nextService: piano.nextService,
    creata: Date.now(),
  });
}

// La domanda preparata per questo punto della sessione, se c'è ed è ancora
// valida. Aspetta che sia pronta se la preparazione è ancora in corso.
async function ritira(sessionId, logEntry, piano) {
  const k = chiave(sessionId, logEntry.questionCount);
  const v = pronte.get(k);
  pronte.delete(k);
  if (!v || v.nextService !== piano.nextService) return undefined;
  return v.promessa;
}

// Il cuore di /api/nextQuestion dopo aver salvato la risposta: la domanda
// preparata se c'è, altrimenti la si genera adesso.
async function prossimaDomanda(sessionId, logEntry, piano) {
  const preparata = await ritira(sessionId, logEntry, piano);
  if (preparata !== undefined) return preparata;
  return generaDaPiano(logEntry, piano);
}

module.exports = {
  pianoProssimaDomanda,
  generaDaPiano,
  preparaInAnticipo,
  prossimaDomanda,
  _pronte: pronte, // per le prove
};
