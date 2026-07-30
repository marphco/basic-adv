// Log di consegna del SERVER DI POSTA (DirectAdmin → E-mail → Tracking).
//
// Serve a recuperare la data e l'ora REALI di un invio anche quando non sono
// state registrate da noi (mesi precedenti al registro interno), e come
// controprova indipendente per quelli registrati.
//
// Autenticazione: Basic auth con una LOGIN KEY di DirectAdmin — mai la
// password dell'account. La chiave va limitata al solo comando dei log.
// Config (variabili d'ambiente, tutte obbligatorie per attivare la funzione):
//   DA_HOST  es. webda7.keliweb.com:2222
//   DA_USER  utente DirectAdmin
//   DA_KEY   login key (permesso: solo `email-logs`)
//   DA_MAIL_LOG_CMD  (opzionale) comando; default `email-logs`
const axios = require("axios");

const cfg = () => ({
  host: String(process.env.DA_HOST || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
  user: process.env.DA_USER || "",
  key: process.env.DA_KEY || "",
  cmd: (process.env.DA_MAIL_LOG_CMD || "email-logs").replace(/^\//, ""),
});

// DirectAdmin ha due generazioni di API e i nomi dei permessi le distinguono:
// i comandi storici sono `CMD_...` (pagine skin, JSON con `?json=yes`), quelli
// moderni sono in minuscolo (`email-logs`) e vivono sotto /api/, già in JSON.
const isLegacyCmd = (cmd) => /^CMD_/i.test(cmd);
const endpointFor = (c) =>
  isLegacyCmd(c.cmd)
    ? `https://${c.host}/${c.cmd}`
    : `https://${c.host}/api/${c.cmd}`;

const isConfigured = () => {
  const c = cfg();
  return !!(c.host && c.user && c.key);
};

// Chiamata grezza al pannello. `json=yes` fa restituire a DirectAdmin gli
// stessi dati che userebbe per disegnare la pagina.
// Corpo della risposta in forma leggibile: quando il pannello rifiuta, il
// motivo sta lì dentro ("permission denied", "command not allowed"…) ed è
// l'unica cosa che dice davvero cosa correggere.
function bodyText(data) {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
  try {
    return JSON.stringify(data).slice(0, 400);
  } catch {
    return String(data).slice(0, 400);
  }
}

async function callCommand(cmd, params = {}) {
  const c = { ...cfg(), cmd };
  const { data } = await axios.get(endpointFor(c), {
    // `json=yes` serve solo ai comandi storici: /api/ risponde già in JSON.
    params: isLegacyCmd(cmd) ? { json: "yes", ...params } : params,
    auth: { username: c.user, password: c.key },
    headers: { Accept: "application/json" },
    timeout: 25000,
    // La verifica TLS resta attiva: il pannello ha un certificato valido.
  });
  return data;
}

async function rawQuery(params = {}) {
  const c = cfg();
  if (!isConfigured())
    throw new Error(
      "Log del server di posta non configurato (DA_HOST / DA_USER / DA_KEY mancanti)."
    );
  try {
    return await callCommand(c.cmd, params);
  } catch (e) {
    // Riporto anche stato e corpo: senza, l'errore dice solo "403" e non si
    // capisce se è la chiave, il permesso o il comando sbagliato.
    const status = e?.response?.status;
    const body = bodyText(e?.response?.data);
    throw new Error(
      `${status || "errore"} da ${endpointFor(c)}${body ? ` — ${body}` : ""}`
    );
  }
}

// DirectAdmin restituisce strutture diverse a seconda di versione e comando:
// a volte un array, a volte {records:[…]}, a volte un oggetto con chiavi
// numeriche. Cerco il primo array di oggetti presente nel payload invece di
// dipendere da un nome preciso.
// I comandi storici non rispondono sempre in JSON: possono restituire il
// formato urlencoded di DirectAdmin (`a=1&b=2`) o direttamente la pagina HTML.
// Provo a ricondurre una stringa a dati strutturati prima di arrendermi.
function parseStringPayload(text) {
  const s = String(text).trim();
  if (!s) return null;
  if (/^\s*[[{]/.test(s)) {
    try {
      return JSON.parse(s);
    } catch {
      /* non era JSON */
    }
  }
  if (/^\s*</.test(s)) return null; // HTML: nessun dato da estrarre
  if (s.includes("=")) {
    const out = {};
    for (const [k, v] of new URLSearchParams(s)) {
      // le liste arrivano come chiavi ripetute o `nome[]`
      const key = k.replace(/\[\]$/, "");
      if (out[key] === undefined) out[key] = v;
      else if (Array.isArray(out[key])) out[key].push(v);
      else out[key] = [out[key], v];
    }
    return Object.keys(out).length ? out : null;
  }
  return null;
}

function extractRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter((x) => x && typeof x === "object");
  if (typeof payload === "string") {
    const parsed = parseStringPayload(payload);
    return parsed ? extractRecords(parsed) : [];
  }
  if (typeof payload !== "object") return [];

  const direct = ["records", "rows", "results", "entries", "list", "data"];
  for (const k of direct) {
    const v = payload[k];
    if (Array.isArray(v) && v.every((x) => x && typeof x === "object")) return v;
  }
  // oggetto con chiavi numeriche ({"0":{…},"1":{…}})
  const values = Object.values(payload);
  if (values.length && values.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
    const numeric = Object.keys(payload).every((k) => /^\d+$/.test(k));
    if (numeric) return values;
  }
  // ricerca in profondità (un livello): il primo array di oggetti che trovo
  for (const v of values) {
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object")) return v;
    if (v && typeof v === "object") {
      const nested = extractRecords(v);
      if (nested.length) return nested;
    }
  }
  return [];
}

const first = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

// Timestamp da un record: accetta unix in secondi o millisecondi, oppure una
// data testuale.
function toDate(value) {
  if (value === undefined) return null;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const n = Number(value);
    const ms = n > 1e12 ? n : n * 1000; // secondi → millisecondi
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  const d = new Date(String(value));
  return isNaN(d) ? null : d;
}

// Record del pannello → forma comune. I nomi dei campi variano tra versioni,
// quindi provo gli alias più diffusi e conservo il record originale.
function normalizeRecord(r) {
  return {
    at: toDate(
      first(r, ["sendunixtime", "unixtime", "time", "timestamp", "date", "sent", "created"])
    ),
    to: String(
      first(r, ["email", "recipient", "to", "address", "deliveredto", "rcpt"]) || ""
    ).toLowerCase(),
    from: String(first(r, ["sender", "from", "envelope_from"]) || "").toLowerCase(),
    subject: String(first(r, ["subject", "msgsubject", "title"]) || ""),
    status: String(first(r, ["status", "state", "type", "result", "delivery"]) || ""),
    size: first(r, ["size", "bytes"]) || "",
    messageId: String(first(r, ["msgid", "message_id", "id"]) || ""),
    raw: r,
  };
}

const norm = (s) => String(s || "").trim().toLowerCase();

// Cerca nel log le consegne verso `recipients` con l'oggetto `subject`
// (confronto per contenuto, non esatto: alcuni pannelli troncano).
// `from`/`until` sono Date: delimitano la finestra di ricerca.
async function searchDeliveries({ recipients = [], subject = "", from, until }) {
  const params = {};
  if (from) params.startdate = Math.floor(from.getTime() / 1000);
  if (until) params.enddate = Math.floor(until.getTime() / 1000);
  if (recipients.length === 1) params.address = recipients[0];

  const records = extractRecords(await rawQuery(params)).map(normalizeRecord);

  const wantedTo = recipients.map(norm).filter(Boolean);
  const wantedSubject = norm(subject);
  return records
    .filter((r) => {
      if (!r.at) return false;
      if (from && r.at < from) return false;
      if (until && r.at > until) return false;
      if (wantedTo.length && !wantedTo.includes(norm(r.to))) return false;
      if (wantedSubject && !norm(r.subject).includes(wantedSubject.slice(0, 40)))
        return false;
      return true;
    })
    .sort((a, b) => a.at - b.at);
}

// Diagnostica. Prova i nomi plausibili del comando e riporta, per ognuno,
// stato e risposta del pannello: così un rifiuto dice quale correzione serve
// invece di limitarsi a "403". Il primo che funziona vince.
const CANDIDATES = [
  "email-logs", // API moderna: /api/email-logs
  "CMD_EMAIL_LOGS", // comandi storici, se il pannello è più vecchio
  "CMD_EMAIL_TRACKING",
];

async function probe() {
  const c = cfg();
  const tries = [...new Set([c.cmd, ...CANDIDATES])];
  const attempts = [];

  for (const cmd of tries) {
    const endpoint = endpointFor({ ...c, cmd });
    try {
      const payload = await callCommand(cmd);
      const records = extractRecords(payload);
      const rawText =
        typeof payload === "string" ? payload : JSON.stringify(payload || {});
      return {
        ok: true,
        command: cmd,
        endpoint,
        usingConfigured: cmd === c.cmd,
        recordsFound: records.length,
        // Solo i primi nomi: se la risposta non è nel formato atteso l'elenco
        // può contenere migliaia di voci inutili da leggere.
        sampleKeys: records.length ? Object.keys(records[0]).slice(0, 30) : [],
        sampleNormalized: records.length ? normalizeRecord(records[0]) : null,
        // Quando non si riesce a estrarre nulla, l'inizio della risposta è
        // l'unico modo per capire in che formato risponde il pannello.
        rawPreview: records.length ? "" : rawText.slice(0, 600),
        rawLength: rawText.length,
        rawLooksHtml: /^\s*</.test(rawText),
        attempts,
      };
    } catch (e) {
      attempts.push({
        command: cmd,
        endpoint,
        status: e?.response?.status || null,
        response: bodyText(e?.response?.data) || e?.message || "",
      });
    }
  }

  const err = new Error(
    "Nessun comando dei log accessibile con queste credenziali."
  );
  err.attempts = attempts;
  throw err;
}

module.exports = {
  isConfigured,
  rawQuery,
  extractRecords,
  normalizeRecord,
  searchDeliveries,
  probe,
};
