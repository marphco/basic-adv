// Doppioni "di significato": domande della stessa sessione che chiedono la
// stessa cosa con parole diverse ("Dove userai il logo?" e "Come vuoi che il
// logo sia usato più spesso?"). Il controllo per parole non le vede. La
// chiave del sito non può usare gli embeddings, quindi lo chiede a
// gpt-4.1-mini, sessione per sessione.
//
//   npm run eval:doppioni -- giro-C-gpt41mini-2026-09-30-05-54
const fs = require("fs");
const path = require("path");
const contatore = require("./banco/contatoreSpesa");

const MODELLO = "gpt-4.1-mini";
const ISTRUZIONI = `Ti do le domande di un questionario per un preventivo, in ordine, numerate.
Trova le coppie che chiedono in sostanza LA STESSA COSA al cliente, anche con parole diverse
(es. "Dove userai il logo?" e "In che modo vuoi che il logo sia usato più spesso?"; oppure
"Com'è fatto il logo: solo testo, solo simbolo…?" e "Preferisci solo testo, solo simbolo o entrambi?").
NON sono doppioni due domande sullo stesso argomento che chiedono cose diverse
(es. "dove userai il logo" e "dove vuoi il logo sul biglietto da visita").
Rispondi SOLO con JSON: {"doppioni": [[i, j], ...]} con i numeri delle domande (vuoto se nessuna).`;

async function doppioni(qs, url) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELLO,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ISTRUZIONI },
        { role: "user", content: qs.map((q, i) => `${i + 1}. ${q}`).join("\n") },
      ],
    }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return JSON.parse((await r.json()).choices[0].message.content).doppioni || [];
}

async function main() {
  const nome = process.argv[2];
  const giro = JSON.parse(fs.readFileSync(path.join(__dirname, "risultati", `${nome}.json`), "utf8"));
  const spesa = await contatore.avvia({ giro: `doppioni ${giro.giro}`, modello: MODELLO });
  const trovati = [];
  let sessioni = 0;
  try {
    for (const e of giro.esiti) {
      const qs = e.passi.filter((p) => p.domanda).map((p) => p.domanda.question);
      if (qs.length < 2) continue;
      sessioni++;
      for (const [i, j] of await doppioni(qs, spesa.url))
        if (qs[i - 1] && qs[j - 1]) trovati.push({ sessione: `${e.id}#${e.ripetizione || 1}`, servizio: e.servizio, domande: qs.length, a: qs[i - 1], b: qs[j - 1] });
    }
  } finally {
    spesa.chiudi();
  }
  fs.writeFileSync(path.join(__dirname, "risultati", `doppioni-${giro.giro}.json`), JSON.stringify(trovati, null, 2));
  const conDoppioni = new Set(trovati.map((t) => t.sessione));
  console.log(`Sessioni con almeno un doppione di significato: ${conDoppioni.size} su ${sessioni}`);
  for (const t of trovati) console.log(`  [${t.sessione} ${t.servizio}, ${t.domande} domande] ${t.a}  ⟷  ${t.b}`);
  console.log(`Spesa ${spesa.stato.voce.spesa.toFixed(4)} $ — totale ${spesa.totale().toFixed(4)} $ su ${spesa.tetto} $`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
