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
});
scarta(font(4), { lingua: "it", servizio: "Logo" }, "opzioni", "font tagliati a quattro");
ok(font(6), { lingua: "it", servizio: "Logo" }, "sei font");
console.log("✓ font: sei categorie, come deciso (il taglio a quattro viene scartato)");

const aperta = { question: "Hai già dei colori in mente?", options: [], type: "multiple", requiresInput: true };
ok(aperta, { lingua: "it", servizio: "Logo" }, "aperta sul branding");
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
  { lingua: "it", servizio: "Logo", giaChieste: ["Quale stile preferisci per il logo?"] },
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

console.log("\nREQUISITI OK");
