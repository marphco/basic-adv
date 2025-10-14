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
 * RL espone: POST /api/generate-questions → { content: "<json string>", meta: {...} }
 * Ritorna SEMPRE un array di item "raw".
 */
async function rlGenerateQuestions(
  prompt,
  {
    state,
    askedQuestions,
    n,
    language,
    max_tokens = 600,
    temperature = 0.7,
  } = {},
  { base, token } = {}
) {
  const RL_BASE = trim(base || process.env.RL_API_BASE || "");
  if (!RL_BASE) throw new Error("RL_API_BASE missing");

  // lingua robusta: preferisci il parametro esplicito, poi state.language/ state.lang
  const lang = language || state.language || state.lang || "it";

  const url = `${RL_BASE}/api/generate-questions`;
  const headers = {
    "Content-Type": "application/json",
    // hint non vincolante ma utile ai log/server RL
    "X-Lang": lang,
    "Accept-Language": lang === "en" ? "en-US,en;q=0.9" : "it-IT,it;q=0.9",
  };
  const key = token || process.env.RL_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;

  // inoltra metadata utili a RL (fallback sicuro se mancano)
  const payload = {
    prompt,
    state,
    askedQuestions,
    n,
    language,
    max_tokens,
    temperature,
  };

  const { data } = await axios.post(url, payload, { headers, timeout: 20000 });

  let content = data?.content;
  if (typeof content !== "string") return [];

  // Parse robusto: array o oggetto singolo
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const pickBetween = (txt, open, close) => {
      const i = txt.indexOf(open);
      const j = txt.lastIndexOf(close);
      return i !== -1 && j !== -1 && j > i ? txt.slice(i, j + 1) : null;
    };
    const arr = pickBetween(content, "[", "]");
    const obj = pickBetween(content, "{", "}");
    const jsonStr = arr || obj;
    if (jsonStr) {
      try {
        parsed = JSON.parse(jsonStr);
      } catch {}
    }
  }

  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") return [parsed];
  return [];
}

module.exports = { rlSaveTraining, rlGenerateQuestions };
