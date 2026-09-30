// Il giudice della qualità: un modello più forte di quello del sito (deciso
// con Marco) vota le domande di un giro del banco.
//
// I requisiti bloccanti (lingua, opzioni, doppioni…) li controlla già il
// codice; il giudice valuta quello che un'espressione regolare non vede. Per
// ogni domanda, da 1 a 5 con il motivo:
//   chiarezza  la capisce chi non fa il mestiere
//   utilita    serve a fare il preventivo
//   opzioni    coprono le possibilità senza sovrapporsi
//   profilo    adatta al cliente (settore, budget, tipo di progetto)
//   brevita    si legge bene su un telefono
//   tono       dà del tu, cordiale e professionale
//   uscita     la via d'uscita ("Non saprei…") c'è quando serve e non di più
//   lingua     naturale nella lingua del sito
// più i due voti della dashboard di Marco (-1, 0, +1), per domanda e opzioni:
// sono quelli che finiscono nella raccolta del training, marcati "ai".
//
// Il giudice vede la sessione intera, in ordine, con le risposte date: così
// può dire se una domanda tiene conto di quelle prima.
//
//   npm run eval:giudice -- giro-anticipo-2026-09-30-04-14
//
// Le chiamate passano dal contatore di spesa (tetto 4 $ in tutto).
const fs = require("fs");
const path = require("path");
const contatore = require("./banco/contatoreSpesa");

const RISULTATI = path.join(__dirname, "risultati");
const MODELLO = "gpt-4.1";
const CRITERI = ["chiarezza", "utilita", "opzioni", "profilo", "brevita", "tono", "uscita", "lingua"];

const ISTRUZIONI = `Sei il giudice della qualità delle domande di un form per preventivi di un'agenzia creativa (basicadv.com).
Il cliente sceglie un servizio (logo, sito, video, foto, social…) e risponde a domande generate da un'AI, una alla volta, sul telefono.
Le domande servono all'agenzia per capire il progetto e fare un preventivo.

Per OGNI domanda della sessione dai un voto da 1 (pessimo) a 5 (ottimo) a questi criteri:
- chiarezza: la capisce al volo chi non fa questo mestiere
- utilita: la risposta aiuta davvero a fare il preventivo o a capire il progetto
- opzioni: le opzioni coprono le risposte probabili senza sovrapporsi (null se è una domanda aperta)
- profilo: è adatta a questo cliente (servizio, settore, budget, tipo di progetto) e tiene conto delle risposte già date
- brevita: si legge bene su un telefono, domanda e opzioni brevi
- tono: dà del tu, cordiale e professionale (in inglese: diretto e cordiale)
- uscita: una via d'uscita ("Non saprei, consigliatemi voi") c'è quando il cliente potrebbe non sapere, e non c'è quando non serve (null se è aperta)
- lingua: naturale e corretta nella lingua del sito

Poi, come farebbe il titolare dell'agenzia nella sua dashboard:
- votoDomanda: +1 la domanda va nella direzione giusta, 0 neutra, -1 da evitare
- votoOpzioni: +1 opzioni buone, 0 neutre, -1 da evitare (0 se è aperta)
- motivo: una frase, in italiano, sul punto più importante

Chi risponde NON è del mestiere: spesso non sa niente né di comunicazione né di grafica (parole del titolare dell'agenzia). Vota come lui:
- +1 alle domande utili per il preventivo che un profano capisce e sa rispondere, anche se sono migliorabili. Parole comuni (stile, tono, video, foto, grafiche, 2D/3D, minimal) vanno bene, anche in inglese sul sito inglese.
- 0 alle domande generiche che aggiungono poco al preventivo, o con UN termine da addetti ai lavori ("hero image", "landing page", "user research", "UX").
- -1 solo alle domande a cui il cliente non saprebbe proprio cosa rispondere: astratte ("che forma deve avere il simbolo", "stile stilizzato o realistico", "che livello di complessità") o piene di gergo.
- Opzioni: -1 se vaghe o incomprensibili per un profano ("organica") o quasi uguali tra loro; 0 se limitate; +1 se chiare e distinte.
Il sito aggiunge da solo a ogni domanda a scelta multipla la voce "Altro" con un campo per scrivere: non contarla tra le quattro opzioni.

Sii severo e coerente: 5 solo se non c'è niente da migliorare.
Rispondi SOLO con JSON: {"domande": [{"n": 1, "chiarezza": 4, "utilita": 5, "opzioni": 4, "profilo": 3, "brevita": 5, "tono": 5, "uscita": 4, "lingua": 5, "votoDomanda": 1, "votoOpzioni": 1, "motivo": "..."}]}`;

const profilo = (fd = {}) =>
  [
    `settore: ${fd.businessField || "non indicato"}`,
    `tipo di progetto: ${fd.projectType || "non indicato"}`,
    `budget: ${fd.budget || "non indicato"}`,
    `nome del brand: ${fd.brandName || "non indicato"}`,
  ].join(", ");

function descriviSessione(e) {
  const righe = [
    `Servizio: ${e.servizio}`,
    `Lingua del sito: ${e.lingua === "en" ? "inglese" : "italiano"}`,
    `Profilo del cliente: ${profilo(e.formData)}`,
    "",
    "Domande in ordine (con la risposta data dal cliente):",
  ];
  const domande = e.passi.filter((p) => p.domanda);
  domande.forEach((p, i) => {
    const q = p.domanda;
    righe.push(`${p.n}. ${q.question}`);
    righe.push(q.requiresInput ? "   (risposta aperta)" : `   opzioni: ${q.options.join(" | ")}`);
    const successiva = domande[i + 1];
    if (successiva)
      righe.push(`   risposta: ${q.requiresInput ? (e.lingua === "en" ? "No particular preference" : "Nessuna preferenza particolare") : q.options[0]}`);
  });
  return righe.join("\n");
}

async function giudica(e, url) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELLO,
      temperature: 0,
      max_tokens: 250 * e.passi.length + 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ISTRUZIONI },
        { role: "user", content: descriviSessione(e) },
      ],
    }),
  });
  if (!r.ok) throw new Error(`giudice: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const corpo = await r.json();
  const voti = JSON.parse(corpo.choices[0].message.content).domande || [];
  return new Map(voti.map((v) => [Number(v.n), v]));
}

// Da dove viene la domanda: l'AI, la riserva scritta a mano, o il codice
// (font e colori del Logo). Si confrontano solo quelle dell'AI.
const provenienza = (q) => (q.__provider === "riserva" ? "riserva" : q.__provider === "rule" ? "codice" : "ai");

function medie(voci) {
  const out = { domande: voci.length };
  for (const c of CRITERI) {
    const v = voci.map((x) => x.voto?.[c]).filter((x) => Number.isFinite(x));
    out[c] = v.length ? Math.round((100 * v.reduce((a, b) => a + b, 0)) / v.length) / 100 : null;
  }
  const d = voci.map((x) => x.voto?.votoDomanda).filter(Number.isFinite);
  out.promosse = d.filter((x) => x > 0).length;
  out.bocciate = d.filter((x) => x < 0).length;
  return out;
}

// Taratura: il giudice vota le stesse domande che ha votato Marco (ognuna
// con le domande che la precedevano nella sessione), e si conta su quante
// sono d'accordo. Marco non gli viene mostrato: non è un esempio, è l'esame.
async function taratura() {
  const raccolta = JSON.parse(fs.readFileSync(path.join(__dirname, "training", "raccolta.json"), "utf8"));
  const marco = raccolta.righe.filter((r) => r.fonte === "marco");
  const giri = {};
  const spesa = await contatore.avvia({ giro: "taratura del giudice", modello: MODELLO });
  const esito = [];
  try {
    for (const r of marco) {
      if (spesa.stato.fermo) break;
      const nomeGiro = r.origine.giro;
      if (!giri[nomeGiro]) {
        const file = fs.readdirSync(RISULTATI).find((f) => f.startsWith(`giro-${nomeGiro}-`) && f.endsWith(".json"));
        giri[nomeGiro] = JSON.parse(fs.readFileSync(path.join(RISULTATI, file), "utf8"));
      }
      const [id, rip] = r.origine.sessione.split("#");
      const e = giri[nomeGiro].esiti.find((x) => x.id === id && String(x.ripetizione || "") === String(rip || x.ripetizione || ""));
      const fino = { ...e, passi: e.passi.filter((p) => p.domanda && p.n <= r.origine.n) };
      const voti = await giudica(fino, spesa.url);
      const v = voti.get(r.origine.n) || {};
      esito.push({ id: r.id, domanda: r.question, marco: [r.questionReward, r.optionsReward], giudice: [v.votoDomanda, v.votoOpzioni], motivo: v.motivo });
      process.stdout.write(".");
    }
  } finally {
    spesa.chiudi();
  }
  const uguali = (i) => esito.filter((x) => x.marco[i] === x.giudice[i]).length;
  const piuBuono = esito.filter((x) => x.giudice[0] > x.marco[0]).length;
  console.log(`\n\nD'accordo con Marco: domanda ${uguali(0)} su ${esito.length}, opzioni ${uguali(1)} su ${esito.length}`);
  console.log(`Il giudice è più buono di Marco su ${piuBuono} domande, più severo su ${esito.filter((x) => x.giudice[0] < x.marco[0]).length}`);
  for (const x of esito.filter((x) => x.marco[0] !== x.giudice[0]))
    console.log(`  Marco ${x.marco[0]}, giudice ${x.giudice[0]}: ${x.domanda} — ${x.motivo}`);
  fs.writeFileSync(path.join(RISULTATI, "taratura-giudice.json"), JSON.stringify(esito, null, 2));
  console.log(`Spesa ${spesa.stato.voce.spesa.toFixed(4)} $ — totale ${spesa.totale().toFixed(4)} $ su ${spesa.tetto} $`);
}

async function main() {
  if (process.argv[2] === "--taratura") return taratura();
  const nome = process.argv[2];
  if (!nome) throw new Error("quale giro? es. npm run eval:giudice -- giro-anticipo-2026-09-30-04-14");
  const file = path.join(RISULTATI, nome.endsWith(".json") ? nome : `${nome}.json`);
  const giro = JSON.parse(fs.readFileSync(file, "utf8"));

  const spesa = await contatore.avvia({ giro: `giudice ${giro.giro}`, modello: MODELLO });
  console.log(`Giudice ${MODELLO} sul giro ${giro.giro}: ${giro.esiti.length} sessioni. Spesa finora ${spesa.totale().toFixed(4)} $ su ${spesa.tetto} $`);

  const voci = [];
  try {
    for (const e of giro.esiti) {
      if (spesa.stato.fermo) break;
      let voti;
      try {
        voti = await giudica(e, spesa.url);
      } catch (err) {
        console.log(`  ${e.id}: ${err.message}`);
        continue;
      }
      for (const p of e.passi.filter((x) => x.domanda))
        voci.push({
          id: e.id,
          ripetizione: e.ripetizione,
          servizio: e.servizio,
          lingua: e.lingua,
          n: p.n,
          provenienza: provenienza(p.domanda),
          domanda: p.domanda,
          voto: voti.get(p.n) || null,
        });
      process.stdout.write(".");
    }
  } finally {
    spesa.chiudi();
  }

  const ai = voci.filter((v) => v.provenienza === "ai");
  const riassunto = {
    tutte: medie(voci),
    ai: medie(ai),
    aiPrima: medie(ai.filter((v) => v.n === 1)),
    aiSuccessive: medie(ai.filter((v) => v.n > 1)),
    riserva: medie(voci.filter((v) => v.provenienza === "riserva")),
    codice: medie(voci.filter((v) => v.provenienza === "codice")),
  };
  const uscita = path.join(RISULTATI, `giudizio-${giro.giro}.json`);
  fs.writeFileSync(uscita, JSON.stringify({ giro: giro.giro, modello: MODELLO, anticipo: giro.anticipo, riassunto, voci }, null, 2));

  console.log(`\n\nMedie (1-5) delle domande dell'AI, ${riassunto.ai.domande} domande:`);
  for (const c of CRITERI) console.log(`  ${c.padEnd(10)} ${riassunto.ai[c]}`);
  console.log(`  promosse ${riassunto.ai.promosse}, bocciate ${riassunto.ai.bocciate}`);
  console.log(`Dalla seconda in poi (quelle preparate in anticipo, se c'è): profilo ${riassunto.aiSuccessive.profilo}, utilita ${riassunto.aiSuccessive.utilita}`);
  console.log(`Spesa del giudice ${spesa.stato.voce.spesa.toFixed(4)} $ — totale ${spesa.totale().toFixed(4)} $ su ${spesa.tetto} $`);
  console.log(`Dettaglio: eval/risultati/giudizio-${giro.giro}.json`);
}

if (require.main === module)
  main().catch((e) => {
    console.error("Giudice non riuscito:", e.message);
    process.exit(1);
  });

module.exports = { descriviSessione, medie, CRITERI, ISTRUZIONI, MODELLO };
