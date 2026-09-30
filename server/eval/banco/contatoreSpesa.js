// Il tetto di spesa del banco di prova.
//
// Le prove usano la chiave OpenAI di produzione (circa 9 $ di credito): se
// le prove li finissero, il form del sito smetterebbe di fare domande. Per
// questo TUTTE le chiamate a OpenAI del banco passano da qui, un piccolo
// server locale che:
//   - prima di ogni chiamata prenota il costo peggiore (tutti i max_tokens)
//     e la rifiuta se sforerebbe il tetto;
//   - dopo, conta il costo vero dai token che OpenAI dichiara (`usage`);
//   - tiene il totale in eval/spesa.json, versionato: il tetto vale per
//     TUTTE le prove insieme, anche tra una sessione e l'altra.
//
// Il tetto è 4 $ e non si alza da fuori: BANCO_TETTO può solo abbassarlo.
// La chiave resta in questo processo: il backend RL del banco non la vede.
const http = require("http");
const fs = require("fs");
const path = require("path");

const TETTO_MASSIMO = 4;
const REGISTRO = path.join(__dirname, "..", "spesa.json");

// Dollari per milione di token (ingresso, uscita). Un modello che non è qui
// non parte: prima si scrive il suo prezzo, controllato sul listino.
const PREZZI = {
  "gpt-3.5-turbo": { ingresso: 0.5, uscita: 1.5 },
};

function prezzoDi(modello) {
  const nome = Object.keys(PREZZI)
    .sort((a, b) => b.length - a.length)
    .find((k) => String(modello || "").startsWith(k));
  return nome ? PREZZI[nome] : null;
}

const costo = (p, ingresso, uscita) => (ingresso * p.ingresso + uscita * p.uscita) / 1e6;

function leggiRegistro() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRO, "utf8"));
  } catch {
    return { nota: "Spesa OpenAI di tutte le prove del banco. Il tetto è 4 $ in tutto.", totale: 0, giri: [] };
  }
}

function avvia({ giro, modello }) {
  const url = process.env.OPENAI_API_URL;
  const chiave = process.env.OPENAI_API_KEY;
  if (!url || !chiave) throw new Error("mancano OPENAI_API_URL o OPENAI_API_KEY");
  const prezzo = prezzoDi(modello);
  if (!prezzo) throw new Error(`prezzo di "${modello}" sconosciuto: aggiungilo a PREZZI in contatoreSpesa.js`);

  const tetto = Math.min(TETTO_MASSIMO, Number(process.env.BANCO_TETTO) || TETTO_MASSIMO);
  const registro = leggiRegistro();
  const voce = { giro, modello, inizio: new Date().toISOString(), chiamate: 0, rifiutate: 0, tokenIngresso: 0, tokenUscita: 0, spesa: 0 };
  registro.giri.push(voce);

  const stato = { fermo: false, chiamate: 0, voce };
  const salva = () => fs.writeFileSync(REGISTRO, JSON.stringify(registro, null, 2) + "\n");
  const arrotonda = (x) => Math.round(x * 1e6) / 1e6;

  const server = http.createServer(async (req, res) => {
    const pezzi = [];
    for await (const p of req) pezzi.push(p);
    const corpo = Buffer.concat(pezzi).toString("utf8");
    let richiesta = {};
    try {
      richiesta = JSON.parse(corpo);
    } catch {}

    // Prenotazione del caso peggiore: circa un token ogni 3 caratteri
    // (largo), più tutti i token di uscita concessi.
    const riserva = costo(prezzo, Math.ceil(corpo.length / 3), Number(richiesta.max_tokens) || 4096);
    if (richiesta.model !== modello || registro.totale + riserva > tetto) {
      stato.fermo = true;
      voce.rifiutate++;
      salva();
      res.writeHead(429, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: richiesta.model !== modello ? "modello diverso da quello del giro" : "tetto di spesa del banco raggiunto" } }));
    }

    stato.chiamate++;
    voce.chiamate++;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${chiave}` },
        body: corpo,
      });
      const testo = await r.text();
      let usata = riserva; // se OpenAI non dice quanto ha consumato, si conta il caso peggiore
      try {
        const u = JSON.parse(testo).usage;
        if (u && Number.isFinite(u.prompt_tokens)) {
          voce.tokenIngresso += u.prompt_tokens;
          voce.tokenUscita += u.completion_tokens || 0;
          usata = costo(prezzo, u.prompt_tokens, u.completion_tokens || 0);
        }
      } catch {}
      if (!r.ok) usata = 0; // le chiamate rifiutate da OpenAI non si pagano
      voce.spesa = arrotonda(voce.spesa + usata);
      registro.totale = arrotonda(registro.totale + usata);
      salva();
      res.writeHead(r.status, { "Content-Type": "application/json" });
      res.end(testo);
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "OpenAI non raggiungibile: " + e.message } }));
    }
  });

  return new Promise((ok) =>
    server.listen(0, "127.0.0.1", () => {
      salva();
      ok({
        url: `http://127.0.0.1:${server.address().port}/v1/chat/completions`,
        stato,
        tetto,
        totale: () => registro.totale,
        chiudi: () => {
          voce.fine = new Date().toISOString();
          salva();
          server.close();
        },
      });
    })
  );
}

module.exports = { avvia, prezzoDi, costo, TETTO_MASSIMO };
