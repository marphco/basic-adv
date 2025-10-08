// services/rlClient.js
const axios = require("axios");

const trim = (s) => (s || "").replace(/\/+$/, "");

/** Salvataggio rating (compatibile con il tuo RL: /api/update-training-data) */
async function rlSaveTraining(body, { base, token } = {}) {
  const RL_BASE = trim(base || process.env.RL_API_BASE || "");
  if (!RL_BASE) throw new Error("RL_API_BASE missing");

  const url = `${RL_BASE}/api/update-training-data`;
  const headers = { "Content-Type": "application/json" };
  const key = token || process.env.RL_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await axios.put(url, body, { headers, timeout: 15000 });
  return res.status >= 200 && res.status < 300;
}

/**
 * Richiesta generazione domande.
 * Il tuo RL espone: POST /api/generate-questions  → { content: "<json string>" }
 * Ritorna SEMPRE un array di item "raw" (anche se il JSON contiene un singolo oggetto).
 */
async function rlGenerateQuestions(
  prompt,
  { /* state, askedQuestions, n non usati dal RL attuale */ } = {},
  { base, token } = {}
) {
  const RL_BASE = trim(base || process.env.RL_API_BASE || "");
  if (!RL_BASE) throw new Error("RL_API_BASE missing");

  const url = `${RL_BASE}/api/generate-questions`;
  const headers = { "Content-Type": "application/json" };
  const key = token || process.env.RL_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  // tieni i default coerenti con il tuo server RL
  const payload = { prompt, max_tokens: 300, temperature: 0.7 };

  const { data } = await axios.post(url, payload, { headers, timeout: 20000 });

  let content = data?.content;
  if (typeof content !== "string") {
    return []; // innesca fallback OpenAI
  }

  // Prova a fare il parse diretto…
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // …oppure ritaglia la porzione JSON se ci sono testi/righe extra
    const pickBetween = (txt, open, close) => {
      const i = txt.indexOf(open);
      const j = txt.lastIndexOf(close);
      return i !== -1 && j !== -1 && j > i ? txt.slice(i, j + 1) : null;
    };
    const arr = pickBetween(content, "[", "]");
    const obj = pickBetween(content, "{", "}");
    const jsonStr = arr || obj;
    if (jsonStr) {
      try { parsed = JSON.parse(jsonStr); } catch {}
    }
  }

  if (!parsed) return [];                 // fallback OpenAI
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") return [parsed];
  return [];                               // fallback OpenAI
}

module.exports = { rlSaveTraining, rlGenerateQuestions };
