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
//   DA_KEY   login key
//   DA_MAIL_LOG_CMD  (opzionale) comando della pagina log; default CMD_EMAIL_TRACKING
const axios = require("axios");

const cfg = () => ({
  host: String(process.env.DA_HOST || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
  user: process.env.DA_USER || "",
  key: process.env.DA_KEY || "",
  cmd: (process.env.DA_MAIL_LOG_CMD || "CMD_EMAIL_TRACKING").replace(/^\//, ""),
});

const isConfigured = () => {
  const c = cfg();
  return !!(c.host && c.user && c.key);
};

// Chiamata grezza al pannello. `json=yes` fa restituire a DirectAdmin gli
// stessi dati che userebbe per disegnare la pagina.
async function rawQuery(params = {}) {
  const c = cfg();
  if (!isConfigured())
    throw new Error(
      "Log del server di posta non configurato (DA_HOST / DA_USER / DA_KEY mancanti)."
    );
  const { data } = await axios.get(`https://${c.host}/${c.cmd}`, {
    params: { json: "yes", ...params },
    auth: { username: c.user, password: c.key },
    timeout: 25000,
    // La verifica TLS resta attiva: il pannello ha un certificato valido.
  });
  return data;
}

// DirectAdmin restituisce strutture diverse a seconda di versione e comando:
// a volte un array, a volte {records:[…]}, a volte un oggetto con chiavi
// numeriche. Cerco il primo array di oggetti presente nel payload invece di
// dipendere da un nome preciso.
function extractRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter((x) => x && typeof x === "object");
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

// Diagnostica: verifica credenziali e formato, e mostra un record di esempio.
// Serve a confermare il nome del comando e la mappatura dei campi contro il
// pannello vero, invece di darli per scontati.
async function probe() {
  const payload = await rawQuery({});
  const records = extractRecords(payload);
  return {
    ok: true,
    command: cfg().cmd,
    recordsFound: records.length,
    sampleKeys: records.length ? Object.keys(records[0]) : Object.keys(payload || {}),
    sampleNormalized: records.length ? normalizeRecord(records[0]) : null,
  };
}

module.exports = {
  isConfigured,
  rawQuery,
  extractRecords,
  normalizeRecord,
  searchDeliveries,
  probe,
};
