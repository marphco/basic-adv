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

// La prima domanda di riserva del servizio che rispetta i requisiti in
// questa sessione (cioè che non ripete una domanda già fatta).
function domandaDiRiserva({ servizio, lingua, giaChieste = [] }) {
  for (const r of RISERVA[servizio]?.[lingua] || []) {
    const q = {
      question: sanitizeKey(r.question),
      options: [...r.options],
      type: "multiple",
      requiresInput: false,
      __provider: "riserva",
    };
    if (!verifica(q, { lingua, servizio, giaChieste }).length) return q;
  }
  return null;
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

  const riserva = domandaDiRiserva({ servizio, lingua, giaChieste });
  console.warn(`[rete] ${servizio} (${lingua}): ${riserva ? "domanda di riserva" : "riserva esaurita"} — ${motivo}`);
  if (riserva) riserva.__motivoRiserva = motivo;
  return riserva;
}

module.exports = { domandaSicura, domandaDiRiserva, TEMPO_MASSIMO_MS };
