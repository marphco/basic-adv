// Rete di sicurezza del form dinamico: il cliente non vede mai un errore.
//
// L'AI non è mai affidabile al 100%: a volte non risponde, a volte propone
// una domanda che non rispetta i requisiti (lingua sbagliata, "Opzione 3",
// doppioni…). Qui ogni domanda passa dal controllo dei requisiti bloccanti
// (requisitiDomande.js) PRIMA di arrivare al cliente. Se l'AI fallisce, ci
// mette troppo o sbaglia, il cliente riceve una domanda di riserva scritta a
// mano (domandeRiserva.js) per il suo servizio e la sua lingua.
//
// Lo zero errori è così una garanzia del codice, non una speranza sull'AI.
// Quanto spesso scatta la riserva lo misura il banco di prova: meno scatta,
// meglio lavora l'AI.
const { verifica } = require("./requisitiDomande");
const { RISERVA } = require("./domandeRiserva");
const { sanitizeKey } = require("./generaDomanda");
const { rlDomandeRipetute } = require("./rlClient");

// Oltre questo tempo il cliente aspetta troppo: si passa alla riserva. Sul
// banco una domanda richiede di solito 2-6 secondi, al massimo una decina.
const TEMPO_MASSIMO_MS = 20000;

function entroIlTempo(promessa, ms) {
  let timer;
  const scaduto = new Promise((_, ko) => {
    timer = setTimeout(() => ko(new Error(`nessuna risposta in ${ms / 1000} secondi`)), ms);
  });
  return Promise.race([promessa, scaduto]).finally(() => clearTimeout(timer));
}

// Le domande di riserva del servizio che rispettano i requisiti in questa
// sessione (cioè che non ripetono le parole di una domanda già fatta).
function riserveValide({ servizio, lingua, giaChieste = [] }) {
  const out = [];
  for (const r of RISERVA[servizio]?.[lingua] || []) {
    const q = {
      question: sanitizeKey(r.question),
      options: [...r.options],
      type: "multiple",
      requiresInput: false,
      __provider: "riserva",
    };
    if (!verifica(q, { lingua, servizio, giaChieste }).length) out.push(q);
  }
  return out;
}

const domandaDiRiserva = (ctx) => riserveValide(ctx)[0] || null;

// Come sopra, ma scarta anche quelle che chiedono la stessa cosa di una già
// fatta con parole diverse (controllo del modello; se non risponde, vale la
// prima valida).
async function domandaDiRiservaNuova(ctx) {
  const valide = riserveValide(ctx).slice(0, 4);
  if (valide.length < 2 || !ctx.giaChieste?.length) return valide[0] || null;
  const ripetute = await rlDomandeRipetute(valide.map((q) => q.question), ctx.giaChieste);
  return valide.find((_, i) => !ripetute.has(i)) || valide[0];
}

// `genera` è la solita generazione con l'AI. Restituisce la domanda da
// mostrare, oppure null se non c'è più niente di sensato da chiedere (il
// form allora passa ai contatti, come quando le domande sono finite).
async function domandaSicura({ servizio, lingua, giaChieste = [], genera, tempoMassimo = TEMPO_MASSIMO_MS }) {
  let motivo;
  try {
    const q = await entroIlTempo(Promise.resolve().then(genera), tempoMassimo);
    // Le domande fisse del codice (font e colori del Logo) sono obbligatorie:
    // non si sostituiscono per un doppione. Se somigliano a una domanda
    // dell'AI già fatta, il doppione è quella dell'AI.
    const violazioni = verifica(q, { lingua, servizio, giaChieste }).filter(
      (v) => !(q?.__provider === "rule" && v.codice === "doppione")
    );
    if (!violazioni.length) return q;
    motivo = "requisiti: " + violazioni.map((v) => v.messaggio).join("; ");
  } catch (e) {
    motivo = "errore: " + (e?.message || e);
  }

  const riserva = await domandaDiRiservaNuova({ servizio, lingua, giaChieste });
  console.warn(`[rete] ${servizio} (${lingua}): ${riserva ? "domanda di riserva" : "riserva esaurita"} — ${motivo}`);
  if (riserva) riserva.__motivoRiserva = motivo;
  return riserva;
}

module.exports = { domandaSicura, domandaDiRiserva, TEMPO_MASSIMO_MS };
