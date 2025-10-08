// server/routes/ai.js  (CommonJS, semplice)
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { rlGenerateQuestions } = require("../services/rlClient");

const router = express.Router();
const upload = multer(); // per leggere i campi di form-data (senza file)

// In-memory session queue: sessionId -> { queue: [], idx: 0 }
const sessionQueues = new Map();

// ---------- helpers ----------
function buildPromptFromBasic(formData) {
  const actualIndustry =
    formData.businessField === "Altro"
      ? (formData.otherBusinessField || "Altro")
      : formData.businessField;

  const isRestyling = String(formData.projectType || "")
    .toLowerCase()
    .includes("restyling");

  return `
    Genera 16 domande per il servizio "${formData.servicesSelected?.[0] || formData.projectType || "Logo"}"
    nel formato JSON:
    [
      { "question": "Testo", "options": ["A","B","C","D"], "text-area": true },
      { "question": "Testo", "options": "text-area" }
    ]
    - Mix di multiple choice (sempre 4 opzioni) e risposte aperte ("text-area").
    - Per la domanda sui colori usa: { "question": "Quali sono le tue preferenze di colore?", "options": ["Non lo so"], "text-area": true }.
    - L'utente ${formData.brandName ? `sa il nome del brand: "${formData.brandName}"` : (formData.brandNameKnown ? "sa già il nome del brand" : "non ha un nome del brand")}.
    - È un ${isRestyling ? "restyling" : "progetto nuovo"}.
    - Ambito: ${actualIndustry}.
    - Non generare domande sul budget.
    - Solo JSON, nessun testo extra.
  `;
}

function normalizeForBasic(rawList, wantsFont) {
  const out = (rawList || []).map((q) => {
    const requiresInput = q && q["text-area"] === true;
    return {
      type: "multiple",
      question: q?.question || "",
      options: Array.isArray(q?.options) ? q.options : [],
      requiresInput,
    };
  });

  // Iniezioni per Logo
  if (wantsFont) {
    if (!out.some((q) => /preferenze di colore/i.test(q.question || ""))) {
      out.unshift({
        type: "multiple",
        question: "Quali sono le tue preferenze di colore?",
        options: ["Non lo so"],
        requiresInput: true,
      });
    }
    const fontQ = {
      type: "font_selection",
      question: "Quale tipo di font preferisci? (es. serif, sans-serif, ecc.)",
      options: ["Serif", "Sans-serif", "Script", "Monospaced", "Decorativo", "Manoscritto", "Non so"],
      requiresInput: true,
    };
    // non come prima domanda
    out.splice(1, 0, fontQ);
  }

  return out.slice(0, 16);
}

// ---------- routes ----------

// /api/generate  (accetta FORM-DATA o JSON)
router.post("/generate", upload.none(), async (req, res) => {
  try {
    // campi possono arrivare come stringhe (form-data)
    let { sessionId, servicesSelected } = req.body || {};

    if (!sessionId) sessionId = uuidv4();

    try {
      if (typeof servicesSelected === "string") {
        servicesSelected = JSON.parse(servicesSelected);
      }
    } catch {
      servicesSelected = [];
    }

    // ricostruisco il minimo necessario del formData
    const formData = {
      brandName: req.body.brandName || "",
      brandNameKnown:
        req.body.brandNameKnown === "true" ||
        req.body.brandNameKnown === true ||
        !!req.body.brandName,
      projectType: req.body.projectType || "",
      businessField: req.body.businessField || "Altro",
      otherBusinessField: req.body.otherBusinessField || "",
      servicesSelected,
    };

    const prompt = buildPromptFromBasic(formData);
    const jsonStr = await rlGenerateQuestions(prompt);

    let raw; try { raw = JSON.parse(jsonStr); } catch { raw = []; }

    const wantsFont = Array.isArray(servicesSelected) && servicesSelected.includes("Logo");
    const queue = normalizeForBasic(raw, wantsFont);

    // registra la coda per la sessione
    sessionQueues.set(sessionId, { queue, idx: 0 });

    // prima domanda: evita font_selection come prima
    let first = queue[0] || null;
    if (first?.type === "font_selection" && queue.length > 1) {
      first = queue[1];
      sessionQueues.get(sessionId).idx = 2;
    } else if (first) {
      sessionQueues.get(sessionId).idx = 1;
    }

    return res.json({ sessionId, question: first });
  } catch (e) {
    console.error("RL /generate error:", e.response?.data || e.message || e);
    return res.status(500).json({ error: "Errore generazione domanda" });
  }
});

// /api/nextQuestion  (accetta JSON o form-data)
router.post("/nextQuestion", upload.none(), async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.json({ question: null });

    const entry = sessionQueues.get(sessionId);
    if (!entry) return res.json({ question: null });

    const { queue, idx } = entry;
    if (idx >= queue.length) return res.json({ question: null });

    const q = queue[idx];
    entry.idx = idx + 1;

    return res.json({ question: q });
  } catch (e) {
    console.error("RL /nextQuestion error:", e.response?.data || e.message || e);
    return res.status(500).json({ error: "Errore recupero domanda" });
  }
});

module.exports = router;
