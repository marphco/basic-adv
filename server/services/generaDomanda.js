// Generazione di una domanda del form dinamico: la parte di server.js che
// parla con il backend RL e decide quale domanda mostrare.
//
// Spostata qui da server.js TALE E QUALE (settembre 2026), per poterla far
// girare nel banco di prova (eval/banco/) senza avviare il server, il
// database e il resto. Il comportamento non cambia: server.js la usa da qui.
// L'unico ritocco è in domandaSuccessiva: la risposta 502 della rotta ora è
// un errore con `stato: 502`, che la rotta trasforma nella stessa risposta.
const { rlGenerateQuestions } = require("./rlClient");
const { TEMI, temaFisso, verifica } = require("./requisitiDomande");

// Difetti delle opzioni per cui una proposta dell'AI si scarta subito, a
// favore della seconda proposta, invece di finire alla rete di sicurezza.
// (Il numero di opzioni no: la scelta del font la sistema hardNormalizeFont.)
const DIFETTI_OPZIONI = new Set(["uscite", "segnaposto", "lingua"]);

// Quante domande chiedere all'AI per volta. Erano 6, e se ne usava una:
// scriverle tutte costava circa 3 secondi di attesa al cliente. Con la rete
// di sicurezza non serve una scorta così grande.
const DOMANDE_PER_CHIAMATA = 2;

// Ogni chiamata al backend RL porta il servizio in `state.service`. Fino a
// settembre 2026 non lo portava, e il backend credeva che ogni servizio
// fosse "Logo": ai clienti di Content Creation, Siti web ecc. riciclava
// domande sul logo, la policy le scartava e il cliente vedeva un errore
// (sul banco: 16 servizi italiani su 17, tre errori di fila).

function normalizeFontOption(lang, v) {
  if (lang === "it") {
    if (/^monospac(ed|e|ato)/i.test(v)) return "Monospaziato";
    if (/^hand ?writ/i.test(v)) return "Manoscritto";
    return v.replace(/^decorative$/i, "Decorativo");
  } else {
    if (/^monospaziato$/i.test(v)) return "Monospaced";
    if (/^manoscritto$/i.test(v)) return "Handwritten";
    return v.replace(/^decorativo$/i, "Decorative");
  }
}

function ensureLanguage(q, lang) {
  if (!q || typeof q !== "object") return q;
  // normalizza Q tipografica
  if (q.type === "font_selection") {
    q.options = (q.options || []).map((o) => normalizeFontOption(lang, o));
    q.question =
      lang === "en"
        ? "Which typographic style do you prefer for the logo?"
        : "Quale stile tipografico preferisci per il logo?";
  }
  // piccola correzione colori aperti (evita opzioni se requiresInput)
  if (lang === "it" && /color/i.test(q.question) && q.requiresInput) {
    q.options = [];
  }
  return q;
}

// --- 2A: helper lingua + normalizzazione forte ---
function isEnglish(s = "") {
  // niente 'logo'; usa marker più univoci
  return /\b(which|what|do you|would you|color|colour|typograph\w*|prefer|choose|brand|text|symbol)\b/i.test(
    s
  );
}
function isItalian(s = "") {
  // includi forme italiane forti
  return /\b(quale|cosa|preferisci|vorresti|colore|tipograf\w*|scegli|marchio|testo|simbolo)\b/i.test(
    s
  );
}

// normalizza chiave in modo più robusto per deduplica
function normKey(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // senza accenti
    .replace(/[^\w]+/g, " ") // solo lettere/numeri/_
    .trim();
}

// Se una domanda parla di "font" la forzo nel formato corretto
function hardNormalizeFont(q, lang) {
  if (!q) return q;
  // Anche quando l'AI la marca "font_selection" senza nominare il font:
  // prima usciva con le sue quattro opzioni invece delle sei categorie.
  if (q.type === "font_selection" || /(font|tipograf|typograf)/i.test(q.question)) {
    q.type = "font_selection";
    q.requiresInput = false;
    q.options =
      lang === "en"
        ? [
            "Serif",
            "Sans-serif",
            "Script",
            "Monospaced",
            "Handwritten",
            "Decorative",
          ]
        : [
            "Serif",
            "Sans-serif",
            "Script",
            "Monospaziato",
            "Manoscritto",
            "Decorativo",
          ];
  }

  return ensureLanguage(q, lang);
}

// ===== SERVICE POLICY (no domande fuori contesto, no open) =====
function isBrandingServiceName(svc = "") {
  return /(^|\b)(logo|brand)(\b|$)/i.test(svc);
}

function violatesPolicy(q, service, lang) {
  if (!q || typeof q !== "object") return "empty";
  const isBrand = isBrandingServiceName(service);

  // lingua
  if (lang === "it" && isEnglish(q.question || "")) return "lang";
  if (lang === "en" && isItalian(q.question || "")) return "lang";

  // branding fuori contesto
  if (!isBrand) {
    if (/logo|font|tipograf|marchio/i.test(q.question || "")) return "branding";
    if (q.type === "font_selection") return "branding";
  }

  // schema per servizi non-branding: niente open, 4 opzioni
  if (!isBrand) {
    if (q.requiresInput === true) return "open";
    if (
      q.requiresInput === false &&
      q.type !== "font_selection" &&
      (!Array.isArray(q.options) || q.options.length !== 4)
    ) {
      return "options";
    }
  }

  return null; // ok
}

async function regenerateWithPolicy({
  promptBase,
  askedSanitized,
  language,
  service,
  baseUrl,
  extraExclude = [],
  extraAskCount = DOMANDE_PER_CHIAMATA,
  maxTries = 3,
}) {
  let lastCandidate = null;
  for (let t = 0; t < maxTries; t++) {
    const retry = await rlGenerateQuestions(
      `${promptBase}
- NON fare domande su logo, font e identità visiva quando il servizio non è di branding.
- Se il servizio NON è branding, la domanda deve essere a scelta multipla con **esattamente 4 opzioni** (nessuna risposta aperta).
- Non usare "font_selection" se il servizio non è branding.
${
  extraExclude.length
    ? "- Evita anche queste formulazioni: " + extraExclude.join(" | ")
    : ""
}`,
      {
        state: { service, language },
        askedQuestions: askedSanitized,
        n: extraAskCount,
        language,
      },
      { base: baseUrl }
    );
    const reNorm = (retry || []).map(normalizeFromRl).filter(Boolean);
    const candidate =
      reNorm.find((qq) => !violatesPolicy(qq, service, language)) ||
      reNorm[0] ||
      null;
    if (candidate) {
      lastCandidate = ensureLanguage(candidate, language);
      if (!violatesPolicy(lastCandidate, service, language))
        return lastCandidate;
    }
  }
  return lastCandidate; // può ancora violare: il chiamante decide se accettare o alzare errore
}

const sanitizeKey = (key) => key.replace(/\./g, "_").replace(/\?$/, "");

// Normalizza una singola domanda "raw" prodotta dal RL in formato atteso dal frontend/DB
function normalizeFromRl(raw) {
  if (!raw || typeof raw !== "object") return null;

  // Possibili nomi di campo per la domanda
  let question = raw.question || raw.Question || raw.q || "";

  if (typeof question !== "string" || !question.trim()) return null;

  // requiresInput: supporta sia "requiresInput" sia "text-area"
  let requiresInput =
    raw.requiresInput === true ||
    raw["text-area"] === true ||
    raw.options === "text-area";

  // type: di default "multiple", ma lasciamo passare "font_selection" se arriva
  let type = raw.type || "multiple";

  // options: array oppure niente
  let options = Array.isArray(raw.options) ? raw.options : [];

  // Se risposta aperta, niente opzioni
  if (requiresInput) {
    options = [];
  } else if (type !== "font_selection" && options.length > 4) {
    // per le multiple riduci a 4
    options = options.slice(0, 4);
  }

  // togli il punto finale per coerenza con la tua logica
  question = question.trim();
  if (question.endsWith(".")) question = question.slice(0, -1);

  return {
    question: sanitizeKey(question),
    options,
    type,
    requiresInput,
    __provider: "RL",
  };
}

const generateQuestionForService = async (
  service,
  formData,
  answers,
  askedQuestions
) => {
  const brandName = formData.brandName || "non specificato";
  const projectType = formData.projectType || "non specificato";
  const businessField = formData.businessField || "non specificato";
  const language = (formData && formData.lang) === "en" ? "en" : "it";
  const isBranding = /logo|brand/i.test(service);

  // askedQuestions può contenere oggetti o stringhe: portiamolo a chiavi "sanitized"
  const askedSanitized = (askedQuestions || [])
    .map((q) => (typeof q === "string" ? q : q?.question || ""))
    .filter(Boolean)
    .map(sanitizeKey);

  const askedSet = new Set(askedSanitized);

  const askedListForPrompt = askedSanitized.join("\n");
  let imageInfo = "";
  if (formData.currentLogoDescription) {
    imageInfo = `\nIl cliente ha fornito una descrizione del logo attuale: ${formData.currentLogoDescription}`;
  }

  const promptBase = `Sei un assistente che aiuta a raccogliere dettagli per un progetto ${
    brandName !== "non specificato"
      ? `per il brand "${brandName}"`
      : "senza un brand specifico"
  }. Le seguenti informazioni sono già state raccolte:

- Nome del Brand: ${brandName}
- Tipo di Progetto: ${projectType}
- Settore Aziendale: ${businessField}
${imageInfo}

Servizio Attuale: ${service}

Non fare nuovamente domande su queste informazioni.

Risposte precedenti: ${JSON.stringify(answers || {})}

Domande già poste per questo servizio:
${askedListForPrompt}

Ora, fai una nuova domanda pertinente al servizio selezionato (${service}), assicurandoti che non sia simile a nessuna delle domande già poste.

Per ogni domanda:

- Se stai per chiedere "Hai preferenze di colori per il tuo logo?" o una domanda sulle preferenze di colore, **non** generare opzioni e imposta "requiresInput": true.
- Se la domanda riguarda la **selezione del font**, includi il campo "type": "font_selection" nella tua risposta JSON e fornisci una lista di almeno 6 categorie di font comuni (es. "Serif", "Sans-serif", "Script", "Monospaced", "Manoscritto", "Decorativo"). Imposta "requiresInput": false.
- Altrimenti, genera **esattamente 4 opzioni** pertinenti e imposta "requiresInput": false.

**Importante:** Fornisci **SOLO** il seguente formato JSON valido, senza testo aggiuntivo o spiegazioni:

{
  "question": "La tua domanda qui",
  "options": ["Opzione1", "Opzione2", "Opzione3", "Opzione4"],
  "type": "tipo_di_domanda",
  "requiresInput": true o false
}

- Se "requiresInput" è true, significa che la domanda richiede una risposta aperta e **non devi fornire opzioni**.
- Se "requiresInput" è false, fornisci le opzioni come specificato.
`;

  if (!process.env.RL_API_BASE) {
    throw new Error(
      "RL_API_BASE mancante: Basic non può generare domande senza RL"
    );
  }

  // Filtro lingua: accetta solo item nella lingua voluta
  const inRightLang = (qText) => {
    const t = qText || "";
    return language === "it" ? !isEnglish(t) : !isItalian(t);
  };

  // Tentiamo fino a 3 volte a ottenere almeno 1 domanda valida, nella lingua giusta e non già chiesta
  const MAX_TRIES = 3;
  let exclusionBag = []; // elenco extra di domande da evitare nei retry

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    try {
      const rawList = await rlGenerateQuestions(
        promptBase,
        {
          state: { service, language },
          askedQuestions: askedSanitized.concat(exclusionBag),
          n: DOMANDE_PER_CHIAMATA,
          language,
        },
        { base: process.env.RL_API_BASE }
      );

      // Normalizza tutto
      const normalized = (rawList || []).map(normalizeFromRl).filter(Boolean);

      // 1) lingua corretta
      let candidates = normalized.filter((q) => inRightLang(q.question));

      // Colori e font del Logo li chiede il codice: se li propone anche
      // l'AI si scartano, altrimenti uscirebbero due volte.
      candidates = candidates.filter((q) => !temaFisso(q, service));

      // Due vie d'uscita, "Opzione 3", opzioni nell'altra lingua: si passa
      // alla proposta successiva.
      candidates = candidates.filter(
        (q) =>
          !verifica(q, { lingua: language, servizio: service }).some((v) =>
            DIFETTI_OPZIONI.has(v.codice)
          )
      );

      // 2) dedup contro askedSet (usiamo chiave sanitizzata)
      candidates = candidates.filter(
        (q) => !askedSet.has(sanitizeKey(q.question))
      );

      // 3) prendi il primo valido
      if (candidates.length) {
        let pick = candidates[0];
        pick.__provider = "RL";
        let ensured = isBranding
          ? hardNormalizeFont(pick, language)
          : ensureLanguage(pick, language);

        // Micro retry locale se (nonostante tutto) la lingua è errata
        for (let i = 0; i < 2 && ensured; i++) {
          const wrongIt = language === "it" && isEnglish(ensured.question);
          const wrongEn = language === "en" && isItalian(ensured.question);
          if (!wrongIt && !wrongEn) break;

          const retry = await rlGenerateQuestions(
            promptBase,
            {
              state: { service, language },
              askedQuestions: askedSanitized,
              n: DOMANDE_PER_CHIAMATA,
              language,
            },
            { base: process.env.RL_API_BASE }
          );
          const reNorm = (retry || []).map(normalizeFromRl).filter(Boolean);

          pick =
            reNorm.find(
              (q) =>
                q &&
                (language === "it"
                  ? !isEnglish(q.question)
                  : !isItalian(q.question))
            ) || reNorm[0];

          ensured = isBranding
            ? hardNormalizeFont(pick, language)
            : ensureLanguage(pick, language);
        }
        // ---------- VALIDAZIONE UNICA BASATA SU POLICY ----------
        let reason = violatesPolicy(ensured, service, language);

        if (reason) {
          const repaired = await regenerateWithPolicy({
            promptBase,
            askedSanitized: askedSanitized.concat([
              sanitizeKey(ensured.question || "__bad__"),
            ]),
            language,
            service,
            baseUrl: process.env.RL_API_BASE,
            extraExclude: [
              "Which typographic style do you prefer for the logo",
              "Quale stile tipografico preferisci per il logo",
              "What typographic style do you prefer for the logo",
            ],
          });

          if (repaired && !violatesPolicy(repaired, service, language)) {
            ensured = repaired;
          } else {
            // ultimo tentativo: scegli dalla prima lista qualcosa che non violi la policy
            const fallbackFromBatch = (normalized || []).find(
              (qq) => !violatesPolicy(qq, service, language)
            );
            if (fallbackFromBatch)
              ensured = ensureLanguage(fallbackFromBatch, language);
          }
        }

        // se ancora viola, solleva errore per farci rigenerare dal chiamante
        if (violatesPolicy(ensured, service, language)) {
          throw new Error("RL policy violation for service: " + service);
        }

        return ensured;
      }

      // Nessun candidato: amplia l’exclusion bag con tutte le proposte viste per evitare ripetizioni al prossimo giro
      exclusionBag.push(...normalized.map((q) => q.question).filter(Boolean));
    } catch (e) {
      console.warn(
        "[RL] errore tentativo generateQuestionForService:",
        e?.response?.status || e.code || e.message
      );
      // prova con il prossimo tentativo
    }
  }

  // Se esauriti i tentativi senza domanda valida:
  throw new Error("RL non ha prodotto domande valide nella lingua richiesta");
};

const buildFontQuestion = (formData = {}) => {
  const isEn = formData?.lang === "en";
  return {
    question: sanitizeKey(
      isEn
        ? "Which typographic style do you prefer for the logo?"
        : "Quale stile tipografico preferisci per il logo?"
    ),
    options: isEn
      ? [
          "Serif",
          "Sans-serif",
          "Script",
          "Monospaced",
          "Handwritten",
          "Decorative",
        ]
      : [
          "Serif",
          "Sans-serif",
          "Script",
          "Monospaziato",
          "Manoscritto",
          "Decorativo",
        ],
    type: "font_selection",
    requiresInput: false,
    __provider: "rule",
  };
};

// Deciso con Marco: scegliendo Logo la sessione ha sempre una domanda sui
// colori, come quella sul font. Il 100% lo dà solo il codice: l'AI la
// faceva quando capitava (sul banco mancava in 4 sessioni su 10, in altre 4
// era ripetuta). Domanda aperta, come prevedeva il prompt.
const buildColorQuestion = (formData = {}) => {
  const isEn = formData?.lang === "en";
  return {
    question: sanitizeKey(
      isEn
        ? "Do you already have any colors in mind for your logo?"
        : "Hai già dei colori in mente per il tuo logo?"
    ),
    options: [],
    type: "multiple",
    requiresInput: true,
    __provider: "rule",
  };
};

// Il cuore di /api/nextQuestion: sceglie la domanda successiva per il
// servizio (per il Logo: la prima dall'RL, la seconda è sempre quella del
// font, la terza quella dei colori) e la fa passare dall'ultimo controllo
// della policy.
async function domandaSuccessiva({
  nextService,
  logEntry,
  askedQuestionsForNextService,
  hasFontQuestion,
}) {
  let aiQuestion;
  if (nextService === "Logo") {
    if (askedQuestionsForNextService.length === 0) {
      aiQuestion = await generateQuestionForService(
        nextService,
        logEntry.formData,
        Object.fromEntries(logEntry.answers),
        askedQuestionsForNextService
      );
    } else if (!hasFontQuestion) {
      aiQuestion = buildFontQuestion(logEntry.formData);
    } else if (!(logEntry.questions || []).some(TEMI.colori)) {
      aiQuestion = buildColorQuestion(logEntry.formData);
    } else {
      aiQuestion = await generateQuestionForService(
        nextService,
        logEntry.formData,
        Object.fromEntries(logEntry.answers),
        askedQuestionsForNextService
      );
    }
  } else {
    aiQuestion = await generateQuestionForService(
      nextService,
      logEntry.formData,
      Object.fromEntries(logEntry.answers),
      askedQuestionsForNextService
    );
  }

  // --- 2D: last gate policy senza fallback hard-coded ---
  let lastReason = violatesPolicy(
    aiQuestion,
    nextService,
    logEntry.formData?.lang === "en" ? "en" : "it"
  );
  if (lastReason) {
    const askedQuestionsForNextServiceSan =
      askedQuestionsForNextService.concat([
        sanitizeKey(aiQuestion.question || "__invalid__"),
      ]);
    try {
      const regenerated = await regenerateWithPolicy({
        promptBase: `Sei un assistente che aiuta a raccogliere dettagli per un progetto.`,
        askedSanitized: askedQuestionsForNextServiceSan,
        language: logEntry.formData?.lang === "en" ? "en" : "it",
        service: nextService,
        baseUrl: process.env.RL_API_BASE,
        extraExclude: [
          "Which typographic style do you prefer for the logo",
          "Quale stile tipografico preferisci per il logo",
          "What typographic style do you prefer for the logo",
        ],
        extraAskCount: DOMANDE_PER_CHIAMATA,
        maxTries: 3,
      });
      if (
        regenerated &&
        !violatesPolicy(
          regenerated,
          nextService,
          logEntry.formData?.lang === "en" ? "en" : "it"
        )
      ) {
        aiQuestion = regenerated;
      } else {
        throw new Error(
          "Unable to get a valid question for service " + nextService
        );
      }
    } catch (e) {
      // Propaga errore: il client riproverà /nextQuestion (niente domande fasulle)
      const err = new Error(e?.message || "Rigenerazione fallita");
      err.stato = 502;
      throw err;
    }
  }

  return aiQuestion;
}

module.exports = {
  sanitizeKey,
  normKey,
  normalizeFromRl,
  violatesPolicy,
  regenerateWithPolicy,
  generateQuestionForService,
  buildFontQuestion,
  buildColorQuestion,
  domandaSuccessiva,
  // usate solo dal banco di prova
  isEnglish,
  isItalian,
  ensureLanguage,
  hardNormalizeFont,
};
