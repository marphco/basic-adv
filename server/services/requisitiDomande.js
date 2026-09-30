// Requisiti delle domande del form dinamico: l'unico posto dove sono scritti.
//
// Prima vivevano in quattro punti che si contraddicevano: il prompt chiedeva
// sei categorie di font e il backend RL le tagliava a quattro; il backend
// riempiva le opzioni mancanti con "Opzione 3", "Opzione 4"; una vecchia
// euristica penalizzava le domande con quattro opzioni mentre tutto il resto
// le imponeva; il controllo della lingua guardava la domanda e mai le opzioni.
//
// Qui ci sono solo i requisiti BLOCCANTI: quelli oggettivi, che si
// verificano senza giudizio e che una domanda deve rispettare tutti per
// arrivare al cliente. La qualità (chiarezza, utilità, tono) la valuta un
// giudice a parte: non è materia per un'espressione regolare.
//
// Scelte prese con Marco (settembre 2026):
//   - si dà del TU;
//   - tra le quattro opzioni può esserci AL MASSIMO UNA via d'uscita
//     ("Non saprei, consigliatemi voi");
//   - la scelta del font mostra SEI categorie;
//   - le domande aperte restano solo per i servizi di branding.
//
// Nessuna dipendenza esterna, apposta: il server gira su Node 18 e una
// libreria nuova è esattamente il tipo di cosa che a luglio l'ha fatto
// cadere.

// Stessa divisione del form (DynamicForm.jsx): Branding è una categoria di
// tre servizi. Il vecchio controllo cercava "logo|brand" nel nome e così il
// Packaging finiva tra i servizi non di branding, dove font e logo sono
// vietati.
const SERVIZI_BRANDING = ["logo", "brand identity", "packaging"];
const isBranding = (servizio = "") =>
  SERVIZI_BRANDING.includes(String(servizio).trim().toLowerCase());

/* ==================== LINGUA ==================== */

// Parole funzionali: articoli, preposizioni, pronomi, i verbi che le domande
// usano sempre. Distinguono due lingue meglio di qualunque parola di
// contenuto, perché ci sono in ogni frase. Tolte quelle che esistono in
// entrambe ("a", "per", "come", "i"): sarebbero indizi falsi.
const PAROLE_IT = new Set(
  (
    "il lo la gli le un una uno di del dello della dei degli delle da dal " +
    "dallo dalla dai dagli dalle nel nello nella nei negli nelle con su sul " +
    "sullo sulla sui sugli sulle tra fra che chi cosa quale quali quanto " +
    "quanta quanti quante quando dove perché perche e ed o oppure ma se non " +
    "più piu anche già gia molto poco tuo tua tuoi tue suo sua questo questa " +
    "questi queste quello quella è sono hai vuoi preferisci vorresti " +
    "desideri pensi ti ci si mi al allo alla ai agli alle dell nell all dall " +
    "sull l un nessuno nessuna altro altra tutti tutte entrambi"
  ).split(" ")
);
const PAROLE_EN = new Set(
  (
    "the an of to in on for with by from at is are do does did you your " +
    "yours what which who how when where why would should could like " +
    "prefer want wish this that these those and or but not more any have " +
    "has it its be will can about into than there their they we our don " +
    "none other both all"
  ).split(" ")
);

const ACCENTATE = /[àèéìòù]/i;

// Parole di una frase. L'apostrofo separa ("dell'azienda" → dell, azienda),
// il trattino no ("e-commerce" resta una parola sola, altrimenti la "e"
// conterebbe come congiunzione italiana).
const parole = (testo = "") =>
  String(testo)
    .toLowerCase()
    .match(/[\p{L}]+(?:-[\p{L}]+)*/gu) || [];

// "it", "en", oppure "?" quando il testo non dice abbastanza (una parola
// sola, un nome proprio, un misto). Il "?" è voluto: meglio non decidere che
// scartare una domanda buona per un falso allarme.
function rilevaLingua(testo = "") {
  let it = 0;
  let en = 0;
  for (const p of parole(testo)) {
    // In inglese le vocali accentate non esistono: "città", "sì", "novità"
    // sono italiano sicuro anche quando non sono parole funzionali.
    if (PAROLE_IT.has(p) || ACCENTATE.test(p)) it += 1;
    if (PAROLE_EN.has(p)) en += 1;
  }
  if (it >= 2 && it >= en * 2) return "it";
  if (en >= 2 && en >= it * 2) return "en";
  return "?";
}

/* ==================== OPZIONI ==================== */

const confronto = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// I riempitivi che il backend RL aggiungeva quando le opzioni erano meno di
// quattro. Per il cliente sono spazzatura: meglio scartare la domanda.
const SEGNAPOSTO = /^(opzione|option|scelta|choice|risposta|answer)\s*\d+$/i;

// Le vie d'uscita: "non so", "decidete voi". Una è utile (chi non sa non
// sceglie a caso, e "consigliatemi voi" è un'informazione commerciale), due
// sono quattro opzioni di cui solo due dicono qualcosa.
const USCITA =
  /\b(non (lo )?so|non saprei|consigliatemi|consigliateci|decidete voi|nessuna preferenza|indifferente|not sure|don'?t know|no preference|you decide|recommend|advise)\b/i;

const FONT_ATTESI = 6;
const OPZIONI_ATTESE = 4;

/* ==================== DOPPIONI ==================== */

// Il confronto si fa sulle parole di contenuto: "Quale stile preferisci per
// il logo?" e "Che stile vorresti per il logo?" dicono la stessa cosa, e
// tolte le parole funzionali restano identiche.
const contenuto = (testo) =>
  new Set(
    parole(testo).filter((p) => !PAROLE_IT.has(p) && !PAROLE_EN.has(p) && p.length > 2)
  );

// `ignora`: parole da non contare, di solito quelle del nome del servizio.
// In una sessione del Logo "logo" c'è in quasi ogni domanda: contarla faceva
// sembrare doppioni "Che tipo di logo preferisci?" e "Quale tipo di stile
// preferisci per il logo?".
function somiglianza(a, b, ignora = new Set()) {
  const togli = (x) => new Set([...x].filter((p) => !ignora.has(p)));
  const A = togli(contenuto(a));
  const B = togli(contenuto(b));
  if (A.size < 2 || B.size < 2) return 0; // troppo poco per dire
  let comuni = 0;
  for (const x of A) if (B.has(x)) comuni += 1;
  return comuni / (A.size + B.size - comuni);
}

const SOGLIA_DOPPIONE = 0.6;

/* ==================== GIÀ CHIESTO NEL FORM ==================== */

// Nome del brand, settore, tipo di progetto e budget il cliente li ha già
// scritti nel primo passaggio. Richiederli è la domanda che fa pensare "ma
// non me l'avete già chiesto?". Le espressioni cercano la RICHIESTA
// dell'informazione, non la parola: "con questo budget, preferisci…" è
// una domanda legittima.
// "In quale ambito userai le foto?" è una domanda buona: per il settore si
// cerca la domanda sull'attività, non la parola "ambito".
const GIA_CHIESTO = [
  /\b(come si chiama|qual è il nome|qual e il nome|nome (del (tuo )?(brand|marchio|progetto)|dell['’]azienda|della (tua )?azienda))\b/i,
  /\b(what('s| is) (the |your )?(brand|company|business|project) name|what is (it|your brand) called)\b/i,
  /\b(in )?(quale|che) (settore|ambito) (operi|lavori|opera|lavora)\b/i,
  /\b(di cosa (si occupa|ti occupi))\b/i,
  /\b(which|what) (industry|sector) (are you in|do you (work|operate) in)\b/i,
  /\bwhat does your (company|business) do\b/i,
  /\b(qual è il (tuo )?budget|quanto (vuoi|intendi|pensi di|puoi) spendere)\b/i,
  /\b(what('s| is) your budget|how much (do you|would you|can you) (want to )?spend)\b/i,
  /\b(nuovo progetto o (un )?restyling|si tratta di un restyling|new project or (a )?(restyling|redesign))\b/i,
];

/* ==================== PERTINENZA ==================== */

const TEMI_BRANDING = /\b(logo|loghi|font|tipograf\w*|typograph\w*|marchio)\b/i;

/* ==================== REQUISITI DI SESSIONE ==================== */

// Alcune domande devono esserci SEMPRE per certi servizi, in qualunque
// punto della sessione. Un modello non garantisce mai il "sempre": il 100%
// lo dà solo il codice, come fa già buildFontQuestion per il font del Logo.
// Qui si verifica che la sessione intera le contenga, una volta sola.
const TEMI = {
  colori: (q) =>
    /\b(colou?rs?|colori|colore|palette|tint[ae])\b/i.test(q?.question || ""),
  font: (q) =>
    q?.type === "font_selection" ||
    /\b(font|tipograf\w*|typograph\w*)\b/i.test(q?.question || ""),
};

// Deciso con Marco: scegliendo Logo, la sessione deve avere una domanda sui
// colori e una sullo stile del font, in qualunque ordine.
const OBBLIGATORIE = {
  logo: ["colori", "font"],
};

// Le domande obbligatorie le fa il codice (buildFontQuestion,
// buildColorQuestion, __provider "rule"): se le proponesse anche l'AI,
// uscirebbero due volte. Restituisce il tema, o null.
function temaFisso(q, servizio = "") {
  if (q?.__provider === "rule") return null;
  const temi = OBBLIGATORIE[String(servizio).trim().toLowerCase()] || [];
  return temi.find((t) => TEMI[t](q)) || null;
}


/* ==================== VERIFICA ==================== */

// Controlla una domanda contro tutti i requisiti bloccanti.
//   q        { question, options, type, requiresInput }
//   ctx      { lingua: "it"|"en", servizio, giaChieste: [testi] }
// Restituisce l'elenco delle violazioni: vuoto = la domanda può andare.
function verifica(q, { lingua = "it", servizio = "", giaChieste = [] } = {}) {
  const out = [];
  const viola = (codice, messaggio) => out.push({ codice, messaggio });

  // 6. Formato: se manca la struttura, il resto non ha senso controllarlo.
  if (!q || typeof q !== "object" || typeof q.question !== "string" || !q.question.trim()) {
    viola("formato", "manca il testo della domanda");
    return out;
  }
  if (!Array.isArray(q.options) || q.options.some((o) => typeof o !== "string")) {
    viola("formato", "le opzioni non sono un elenco di testi");
    return out;
  }

  const testo = q.question.trim();
  const opzioni = q.options.map((o) => o.trim());
  const branding = isBranding(servizio);
  const font = q.type === "font_selection";
  const aperta = q.requiresInput === true;

  // 1. Lingua: la domanda E le opzioni. Le opzioni si guardano tutte
  // insieme: una per una sono spesso parole singole che non dicono niente.
  const altra = lingua === "it" ? "en" : "it";
  if (rilevaLingua(testo) === altra)
    viola("lingua", `la domanda è in ${altra === "en" ? "inglese" : "italiano"}`);
  if (opzioni.length && rilevaLingua(opzioni.join(", ")) === altra)
    viola("lingua", `le opzioni sono in ${altra === "en" ? "inglese" : "italiano"}`);

  // 2. Opzioni: quante, diverse, vere.
  if (aperta) {
    if (!branding) viola("aperta", "domanda aperta su un servizio che non è di branding");
    if (opzioni.length) viola("opzioni", "domanda aperta con opzioni");
  } else {
    const attese = font ? FONT_ATTESI : OPZIONI_ATTESE;
    if (opzioni.length !== attese)
      viola("opzioni", `${opzioni.length} opzioni invece di ${attese}`);
    if (opzioni.some((o) => !o)) viola("opzioni", "un'opzione è vuota");
    if (new Set(opzioni.map(confronto)).size !== opzioni.length)
      viola("opzioni", "due opzioni sono uguali");
    const finte = opzioni.filter((o) => SEGNAPOSTO.test(o));
    if (finte.length) viola("segnaposto", `opzioni riempitive: ${finte.join(", ")}`);
    const uscite = opzioni.filter((o) => USCITA.test(o));
    if (uscite.length > 1)
      viola("uscite", `${uscite.length} vie d'uscita, al massimo una`);
  }

  // 3. Doppioni nella stessa sessione. Le parole del nome del servizio non
  // contano: ci sono quasi sempre (logo, loghi, video, app…).
  const paroleServizio = new Set(parole(servizio));
  if (paroleServizio.has("logo")) paroleServizio.add("loghi");
  for (const prima of giaChieste) {
    if (confronto(prima) === confronto(testo) || somiglianza(prima, testo, paroleServizio) >= SOGLIA_DOPPIONE) {
      viola("doppione", `ripete "${prima}"`);
      break;
    }
  }

  // 4. Informazioni che il form ha già raccolto.
  if (GIA_CHIESTO.some((re) => re.test(testo)))
    viola("giaChiesto", "chiede un dato già inserito nel form");

  // 5b. Colori e font del Logo li chiede il codice, non l'AI.
  const fisso = temaFisso(q, servizio);
  if (fisso) viola("temaFisso", `la domanda su ${fisso} del ${servizio} la fa già il codice`);

  // 5. Pertinenza: logo e font solo per i servizi di branding.
  if (!branding && (font || TEMI_BRANDING.test(testo)))
    viola("pertinenza", "parla di logo o font su un servizio che non è di branding");

  return out;
}

function verificaSessione(domande = [], { servizio = "" } = {}) {
  const out = [];
  const temi = OBBLIGATORIE[String(servizio).trim().toLowerCase()] || [];
  for (const tema of temi) {
    const quante = domande.filter(TEMI[tema]).length;
    if (quante === 0)
      out.push({ codice: "mancaObbligatoria", messaggio: `manca la domanda su: ${tema}` });
    if (quante > 1)
      out.push({ codice: "obbligatoriaRipetuta", messaggio: `${quante} domande su: ${tema}, ne basta una` });
  }
  return out;
}

module.exports = {
  verifica,
  verificaSessione,
  OBBLIGATORIE,
  TEMI,
  temaFisso,
  rilevaLingua,
  somiglianza,
  isBranding,
  SERVIZI_BRANDING,
};
