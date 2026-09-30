// Prova dei requisiti bloccanti, con i casi VERI che ci hanno fatto scrivere
// questo modulo. Si lancia con: node server/eval/provaRequisiti.js
//
// Ogni caso cattivo dice anche se il VECCHIO controllo lo lasciava passare:
// è la misura di quanto era largo il buco.
const assert = require("assert");
const { verifica, rilevaLingua, isBranding } = require("../services/requisitiDomande");

const codici = (q, ctx) => verifica(q, ctx).map((v) => v.codice);
const ok = (q, ctx, perche) => assert.deepStrictEqual(verifica(q, ctx), [], perche);
const scarta = (q, ctx, codice, perche) =>
  assert.ok(codici(q, ctx).includes(codice), `${perche} → atteso "${codice}", trovato ${JSON.stringify(verifica(q, ctx))}`);

// Il vecchio rilevatore, copiato com'era in server.js, per il confronto.
const vecchioInglese = (s) =>
  /\b(which|what|do you|would you|color|colour|typograph\w*|prefer|choose|brand|text|symbol)\b/i.test(s);
const vecchioItaliano = (s) =>
  /\b(quale|cosa|preferisci|vorresti|colore|tipograf\w*|scegli|marchio|testo|simbolo)\b/i.test(s);

const multipla = (question, options) => ({ question, options, type: "multiple", requiresInput: false });
const IT = { lingua: "it", servizio: "Product Photography" };
const EN = { lingua: "en", servizio: "Product Photography" };

/* ---------- una domanda buona passa pulita, nelle due lingue ---------- */
ok(
  multipla("Che atmosfera vuoi trasmettere con le foto dei prodotti?", [
    "Calda e accogliente",
    "Pulita e minimale",
    "Lussuosa ed elegante",
    "Non saprei, consigliatemi voi",
  ]),
  IT,
  "domanda italiana buona"
);
ok(
  multipla("What mood should your product photos convey?", [
    "Warm and welcoming",
    "Clean and minimal",
    "Luxurious and elegant",
    "Not sure, please advise",
  ]),
  EN,
  "domanda inglese buona"
);
console.log("✓ una domanda buona passa senza violazioni, in italiano e in inglese");

/* ---------- lingua ---------- */
const inglese = "Describe the mood you want to convey";
assert.strictEqual(vecchioInglese(inglese), false, "premessa: il vecchio controllo non la vedeva");
scarta(multipla(inglese, ["Calda", "Fredda", "Neutra", "Vivace"]), IT, "lingua", "inglese sul sito italiano");
console.log("✓ inglese sul sito italiano: preso (il vecchio controllo lo lasciava passare)");

const italiana = "Che atmosfera vuoi trasmettere con le foto?";
assert.strictEqual(vecchioItaliano(italiana), false, "premessa: il vecchio controllo non la vedeva");
scarta(multipla(italiana, ["Warm", "Cold", "Neutral", "Vibrant"]), EN, "lingua", "italiano sul sito inglese");
console.log("✓ italiano sul sito inglese: preso (il vecchio controllo lo lasciava passare)");

scarta(
  multipla("Which style fits your brand?", [
    "Moderno e minimale",
    "Classico ed elegante",
    "Giocoso e colorato",
    "Audace e deciso",
  ]),
  { lingua: "en", servizio: "Logo" },
  "lingua",
  "domanda inglese con opzioni italiane"
);
console.log("✓ opzioni nella lingua sbagliata: prese (prima le opzioni non si guardavano mai)");

// Niente falsi allarmi: in italiano le parole inglesi del mestiere sono
// normali, e i nomi dei font non sono di nessuna lingua.
ok(multipla("Che stile preferisci per le foto?", ["Minimal", "Vintage", "Luxury", "Street"]), IT, "prestiti inglesi");
ok(
  {
    question: "Quale stile tipografico preferisci per il logo?",
    options: ["Serif", "Sans-serif", "Script", "Monospaziato", "Manoscritto", "Decorativo"],
    type: "font_selection",
    requiresInput: false,
    __provider: "rule",
  },
  { lingua: "it", servizio: "Logo" },
  "font in italiano"
);
assert.strictEqual(rilevaLingua("Hai già un e-commerce attivo?"), "it", "e-commerce non è una 'e'");
assert.strictEqual(rilevaLingua("Minimal"), "?", "una parola sola non dice la lingua");
console.log("✓ nessun falso allarme su prestiti inglesi, nomi dei font e parole singole");

/* ---------- opzioni ---------- */
scarta(multipla("Dove vendi i tuoi prodotti?", ["Online", "Negozio fisico", "Opzione 3", "Opzione 4"]), IT, "segnaposto", "riempitivi del backend");
scarta(multipla("Dove vendi i tuoi prodotti?", ["Online", "Negozio fisico", "Entrambi"]), IT, "opzioni", "tre opzioni");
scarta(multipla("Ti serve anche il ritocco?", ["Sì", "si", "No", "Forse"]), IT, "opzioni", "opzioni uguali a meno di accenti");
scarta(multipla("Che stile preferisci?", ["Non saprei", "Decidete voi", "Moderno", "Classico"]), IT, "uscite", "due vie d'uscita");
console.log("✓ opzioni: riempitivi, numero sbagliato, doppioni e troppe vie d'uscita presi");

const font = (n) => ({
  question: "Quale stile tipografico preferisci per il logo?",
  options: ["Serif", "Sans-serif", "Script", "Monospaziato", "Manoscritto", "Decorativo"].slice(0, n),
  type: "font_selection",
  requiresInput: false,
  __provider: "rule", // come buildFontQuestion
});
scarta(font(4), { lingua: "it", servizio: "Logo" }, "opzioni", "font tagliati a quattro");
ok(font(6), { lingua: "it", servizio: "Logo" }, "sei font");
console.log("✓ font: sei categorie, come deciso (il taglio a quattro viene scartato)");

// Colori e font del Logo li fa il codice: se li propone l'AI, uscirebbero
// due volte.
const LOGO = { lingua: "it", servizio: "Logo" };
scarta({ ...font(6), __provider: "RL" }, LOGO, "temaFisso", "font proposto dall'AI");
scarta({ question: "Hai già dei colori in mente per il logo?", options: [], type: "multiple", requiresInput: true, __provider: "RL" }, LOGO, "temaFisso", "colori proposti dall'AI");
ok({ question: "Hai già dei colori in mente per il tuo logo?", options: [], type: "multiple", requiresInput: true, __provider: "rule" }, LOGO, "colori dal codice");
ok(multipla("Che colori preferisci per le foto dei prodotti?", ["Caldi", "Freddi", "Neutri", "Non saprei, consigliatemi voi"]), IT, "fuori dal Logo i colori sono una domanda come le altre");
console.log("✓ Logo: colori e font dall'AI scartati, li fa il codice");
// Il nome del servizio non conta per i doppioni: in una sessione del Logo
// "logo" c'è quasi sempre.
ok(
  multipla("Che tipo di logo preferisci?", ["Solo testo", "Solo simbolo", "Testo e simbolo", "Non saprei, consigliatemi voi"]),
  { lingua: "it", servizio: "Logo", giaChieste: ["Quale tipo di stile preferisci per il logo?"] },
  "tipo di logo e stile del logo sono domande diverse"
);
console.log("✓ doppioni: le parole del nome del servizio non contano");

// Due vie d'uscita dette in altro modo (dal sito vero, 30 settembre 2026).
scarta(
  multipla("Ti piacerebbe che il logo includa un simbolo?", ["Sì, con un simbolo", "No, solo testo", "Non ho preferenze, decidi tu", "Non saprei, mi puoi aiutare?"]),
  { lingua: "it", servizio: "Logo" },
  "uscite",
  "\"decidi tu\" e \"mi puoi aiutare\" sono due vie d'uscita"
);
scarta(
  multipla("Would you like a symbol in the logo?", ["Yes, with a symbol", "No, text only", "No preference, up to you", "Not sure, can you help me?"]),
  { lingua: "en", servizio: "Logo" },
  "uscite",
  "anche in inglese"
);
scarta(
  multipla("Preferisci un logo tradizionale o moderno?", ["Tradizionale", "Moderno", "Non sono sicuro/a", "Mi fido del tuo consiglio"]),
  { lingua: "it", servizio: "Logo" },
  "uscite",
  "\"non sono sicuro\" e \"mi fido\" sono due vie d'uscita"
);
console.log("✓ vie d'uscita riconosciute anche come \"decidi tu\", \"non ho preferenze\", \"up to you\"");

const aperta = { question: "Hai già dei colori in mente?", options: [], type: "multiple", requiresInput: true };
ok(aperta, { lingua: "it", servizio: "Brand Identity" }, "aperta sul branding");
scarta(aperta, { lingua: "it", servizio: "Landing Page" }, "aperta", "aperta fuori dal branding");
console.log("✓ domande aperte solo per il branding");

/* ---------- doppioni ---------- */
scarta(
  multipla("Che stile vorresti per il logo?", ["Moderno", "Classico", "Giocoso", "Elegante"]),
  { lingua: "it", servizio: "Logo", giaChieste: ["Quale stile preferisci per il logo?"] },
  "doppione",
  "parafrasi della domanda precedente"
);
ok(
  multipla("Quali colori vuoi evitare?", ["Nessuno", "I colori accesi", "I toni scuri", "Non saprei, consigliatemi voi"]),
  { lingua: "it", servizio: "Brand Identity", giaChieste: ["Quale stile preferisci per il logo?"] },
  "domanda diversa"
);
console.log("✓ parafrasi di una domanda già fatta: presa, domande diverse: passano");

/* ---------- già chiesto nel form ---------- */
scarta(multipla("Come si chiama il tuo brand?", ["A", "B", "C", "D"]), { lingua: "it", servizio: "Logo" }, "giaChiesto", "nome del brand");
scarta(multipla("In quale settore operi?", ["Food", "Tech", "Moda", "Altro"]), IT, "giaChiesto", "settore");
scarta(multipla("Qual è il tuo budget?", ["Basso", "Medio", "Alto", "Non saprei"]), IT, "giaChiesto", "budget");
ok(multipla("In quale ambito userai le foto?", ["Sito web", "Social", "Catalogo stampato", "Tutti"]), IT, "ambito d'uso");
ok(
  multipla("Con questo budget, preferisci poche foto curate o molte foto?", ["Poche e curate", "Molte e semplici", "Una via di mezzo", "Non saprei, consigliatemi voi"]),
  IT,
  "budget citato ma non richiesto"
);
console.log("✓ dati già dati nel form: presi, senza scambiare 'ambito d'uso' per il settore");

/* ---------- pertinenza ---------- */
scarta(
  multipla("Vuoi il logo animato alla fine del video?", ["Sì", "No", "Solo all'inizio", "Non saprei"]),
  { lingua: "it", servizio: "Promo Video" },
  "pertinenza",
  "logo su un servizio video"
);
assert.ok(isBranding("Packaging"), "il Packaging è branding, come nel form");
ok(
  multipla("Che carattere preferisci per l'etichetta?", ["Elegante", "Moderno", "Artigianale", "Non saprei, consigliatemi voi"]),
  { lingua: "it", servizio: "Packaging" },
  "font sul packaging"
);
console.log("✓ logo e font fuori dal branding: presi. Il Packaging ora è branding, come nel form");

/* ---------- formato ---------- */
scarta(null, IT, "formato", "niente");
scarta({ question: "  ", options: [] }, IT, "formato", "testo vuoto");
scarta({ question: "Ciao?", options: "text-area" }, IT, "formato", "opzioni non in elenco");
console.log("✓ formato rotto: preso prima di tutto il resto");

/* ---------- requisiti di sessione: Logo = colori + font, in qualunque ordine ---------- */
const { verificaSessione } = require("../services/requisitiDomande");
const colori = { question: "Hai già dei colori in mente per il logo?", options: [], type: "multiple", requiresInput: true };
const fontLogo = font(6);
const altra = (t) => multipla(t, ["Uno", "Due", "Tre", "Non saprei, consigliatemi voi"]);
const sessione = (...qs) => qs;

assert.deepStrictEqual(
  verificaSessione(sessione(altra("Che sensazione deve trasmettere?"), fontLogo, altra("Dove userai il logo?"), colori), { servizio: "Logo" }),
  [],
  "colori e font presenti"
);
assert.deepStrictEqual(
  verificaSessione(sessione(colori, altra("Che sensazione deve trasmettere?"), fontLogo), { servizio: "Logo" }),
  [],
  "l'ordine non conta"
);
const senzaColori = verificaSessione(sessione(altra("Che sensazione deve trasmettere?"), fontLogo), { servizio: "Logo" });
assert.deepStrictEqual(senzaColori.map((v) => v.codice), ["mancaObbligatoria"], "manca i colori");
assert.ok(senzaColori[0].messaggio.includes("colori"));
const dueColori = verificaSessione(sessione(colori, fontLogo, { ...colori, question: "Quale palette di colori preferisci?" }), { servizio: "Logo" });
assert.deepStrictEqual(dueColori.map((v) => v.codice), ["obbligatoriaRipetuta"], "colori chiesti due volte");
assert.deepStrictEqual(
  verificaSessione(sessione(colori), { servizio: "Logo" }).map((v) => v.codice),
  ["mancaObbligatoria"],
  "manca il font"
);
const coloriEn = { question: "Do you already have any colors in mind for the logo?", options: [], type: "multiple", requiresInput: true };
assert.deepStrictEqual(verificaSessione(sessione(coloriEn, { ...fontLogo, question: "Which typographic style do you prefer for the logo?" }), { servizio: "Logo" }), [], "anche in inglese");
assert.deepStrictEqual(verificaSessione(sessione(altra("Qual è l'obiettivo della pagina?")), { servizio: "Landing Page" }), [], "gli altri servizi non hanno obblighi");
console.log("✓ sessione Logo: colori e font obbligatori, una volta sola, in qualunque ordine (anche in inglese)");

/* ---------- domande di riserva e rete di sicurezza ---------- */
const { RISERVA } = require("../services/domandeRiserva");
const { domandaSicura, domandaDiRiserva } = require("../services/reteSicurezza");
// Gli stessi servizi del form (client/.../DynamicForm.jsx).
const SERVIZI_DEL_FORM = [
  "Logo", "Brand Identity", "Packaging",
  "Content Creation", "Social Media Management", "Advertising",
  "Product Photography", "Fashion Photography", "Event Photography",
  "Promo Video", "Corporate Video", "Motion Graphics",
  "Website Design", "E-commerce", "Landing Page",
  "Mobile App", "Web App", "UI/UX Design",
];
const TEMI_OBBLIGATORI = /\b(colou?rs?|colori|colore|palette|font|tipograf\w*|typograph\w*)\b/i;
for (const servizio of SERVIZI_DEL_FORM)
  for (const lingua of ["it", "en"]) {
    const elenco = RISERVA[servizio]?.[lingua] || [];
    assert.ok(elenco.length >= 10, `${servizio} (${lingua}): servono almeno 10 domande di riserva`);
    for (const r of elenco) {
      assert.strictEqual(rilevaLingua(r.question), lingua, `${servizio}: "${r.question}" non è riconosciuta come ${lingua}`);
      assert.ok(!r.question.includes("."), `${servizio}: "${r.question}" ha un punto`);
      if (servizio === "Logo") assert.ok(!TEMI_OBBLIGATORI.test(r.question), `Logo: colori e font hanno la loro domanda fissa`);
    }
    // Una sessione intera servita solo dalla riserva: dieci domande, tutte
    // valide e nessuna ripetuta.
    const giaChieste = [];
    for (let i = 0; i < 10; i++) {
      const q = domandaDiRiserva({ servizio, lingua, giaChieste });
      assert.ok(q, `${servizio} (${lingua}): riserva finita alla domanda ${i + 1}`);
      assert.deepStrictEqual(verifica(q, { lingua, servizio, giaChieste }), [], `${servizio} (${lingua}): "${q.question}"`);
      giaChieste.push(q.question);
    }
  }
console.log("✓ riserva: dieci domande valide per ogni servizio e lingua, abbastanza per una sessione intera");

(async () => {
  const buona = multipla("Quale formato preferisci per le foto del catalogo?", ["Verticale", "Orizzontale", "Quadrato", "Non saprei, consigliatemi voi"]);
  const ctx = { servizio: "Product Photography", lingua: "it" };
  const zitto = console.warn;
  console.warn = () => {};
  try {
    assert.strictEqual(await domandaSicura({ ...ctx, genera: async () => buona }), buona, "se l'AI va bene, passa la sua");
    const dopoErrore = await domandaSicura({ ...ctx, genera: async () => { throw new Error("500"); } });
    assert.strictEqual(dopoErrore.__provider, "riserva", "errore dell'AI: riserva, non errore");
    const dopoSegnaposto = await domandaSicura({ ...ctx, genera: async () => multipla(buona.question, ["Verticale", "Orizzontale", "Opzione 3", "Opzione 4"]) });
    assert.strictEqual(dopoSegnaposto.__provider, "riserva", "requisiti violati: riserva");
    const inglese = await domandaSicura({ ...ctx, genera: async () => multipla("Which format do you prefer for the catalog photos?", ["Portrait", "Landscape", "Square", "Not sure"]) });
    assert.strictEqual(inglese.__provider, "riserva", "lingua sbagliata: riserva");
    const lenta = await domandaSicura({ ...ctx, tempoMassimo: 50, genera: () => new Promise((ok) => setTimeout(() => ok(buona), 500)) });
    assert.strictEqual(lenta.__provider, "riserva", "troppo lenta: riserva");
    const nonRipete = await domandaSicura({ ...ctx, giaChieste: [dopoErrore.question], genera: async () => { throw new Error("x"); } });
    assert.notStrictEqual(nonRipete.question, dopoErrore.question, "la riserva non ripete una domanda già fatta");
  } finally {
    console.warn = zitto;
  }
    const fontFisso = { question: "Quale stile tipografico preferisci per il logo", options: ["Serif", "Sans-serif", "Script", "Monospaziato", "Manoscritto", "Decorativo"], type: "font_selection", requiresInput: false, __provider: "rule" };
    const fontPassa = await domandaSicura({ servizio: "Logo", lingua: "it", giaChieste: ["Quale stile preferisci per il logo"], genera: async () => fontFisso });
    assert.strictEqual(fontPassa, fontFisso, "la domanda fissa sul font non si sostituisce per un doppione");
  console.log("✓ rete di sicurezza: errore, requisiti violati, lingua sbagliata o lentezza → domanda di riserva");

  // Domanda preparata in anticipo: stesso piano della rotta, e si usa solo
  // se è per lo stesso punto della sessione.
  const pd = require("../services/prossimaDomanda");
  const sessione = (n, servizi = ["Web App"]) => ({
    formData: { lang: "it" },
    questions: Array.from({ length: n }, (_, i) => ({ question: `Domanda ${i}` })),
    answers: new Map(),
    questionCount: n,
    servicesQueue: servizi,
    currentServiceIndex: 0,
    serviceQuestionCount: new Map([[servizi[0], n]]),
    maxQuestionsPerService: servizi.length === 1 ? 10 : 8,
    totalQuestions: servizi.length === 1 ? 10 : 8 * servizi.length,
    askedQuestions: new Map(),
  });
  assert.deepStrictEqual(pd.pianoProssimaDomanda(sessione(10)), { fine: true }, "dieci domande: fine");
  assert.strictEqual(pd.pianoProssimaDomanda(sessione(3)).nextService, "Web App");
  const cambio = pd.pianoProssimaDomanda(sessione(8, ["Web App", "Landing Page"]));
  assert.ok(cambio.cambiaServizio && cambio.nextService === "Landing Page", "finite le 8 del primo servizio si passa al secondo");
  const piano = pd.pianoProssimaDomanda(sessione(3));
  pd._pronte.set("s1:3", { promessa: Promise.resolve(buona), nextService: "Web App", creata: Date.now() });
  assert.strictEqual(await pd.prossimaDomanda("s1", sessione(3), piano), buona, "usa la domanda preparata");
  assert.strictEqual(pd._pronte.size, 0, "e la toglie");
  console.log("✓ domanda preparata in anticipo: stesso piano della rotta, usata una volta sola");
  console.log("\nREQUISITI OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
