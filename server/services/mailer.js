// Mailer condiviso: invia tramite il relay HTTPS interno (mailer.basicadv.com /
// send.php), firmato HMAC. Stesso meccanismo già usato per le email del form.
// Niente SMTP (così funziona anche dove le porte SMTP sono bloccate, es. Railway)
// e niente servizi esterni.
const crypto = require("crypto");
const axios = require("axios");

// Fallback testo minimale se un template non fornisce `text` (send.php lo richiede).
function htmlToText(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendMail({ to, subject, html, text, replyTo }) {
  if (!to) return null;
  const url = process.env.KELI_WEBHOOK_URL;
  const secret = process.env.KELI_WEBHOOK_SECRET;
  if (!url || !secret) throw new Error("KELI_WEBHOOK_URL/SECRET mancanti");

  const payload = {
    to,
    subject,
    text: text || htmlToText(html) || subject,
    html: html || "",
    replyTo,
  };
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${raw}`)
    .digest("base64");

  const { data } = await axios.post(url, raw, {
    headers: {
      "Content-Type": "application/json",
      "X-Timestamp": ts,
      "X-Signature": sig,
    },
    timeout: 15000,
  });
  return data;
}

// Il relay può rispondere in modi diversi (oggetto JSON o testo semplice):
// provo a estrarne un identificativo del messaggio, se c'è. Quando non c'è,
// resta comunque la risposta grezza (vedi `raw`).
const ID_KEYS = [
  "id",
  "messageId",
  "message_id",
  "messageID",
  "msgId",
  "msg_id",
  "queueId",
  "queue_id",
  "mailId",
];
function pickProviderId(data) {
  if (!data || typeof data !== "object") return "";
  // alcuni relay annidano il payload utile sotto `data`
  const flat =
    data.data && typeof data.data === "object" ? { ...data, ...data.data } : data;
  const key = ID_KEYS.find((k) => flat[k]);
  return key ? String(flat[key]).slice(0, 120) : "";
}

// Risposta (o errore) in forma di stringa breve e leggibile, da conservare
// nello storico: è ciò che permette di incrociare un invio con i log del
// server di posta.
function stringifyPayload(payload) {
  if (payload === undefined || payload === null) return "";
  if (typeof payload === "string") return payload.slice(0, 1000);
  try {
    return JSON.stringify(payload).slice(0, 1000);
  } catch {
    return "[risposta non serializzabile]";
  }
}

// Variante TRACCIATA di sendMail: non solleva mai e restituisce sempre
//   { ok, sentAt, ackAt, id, raw, error }
// dove `sentAt`/`ackAt` sono l'istante in cui il messaggio è stato passato al
// relay e quello della sua risposta. Con questi dati (orario al secondo,
// destinatario ed eventuale id) un invio è rintracciabile nei log del mail
// server anche a distanza di tempo.
async function sendMailTracked(opts) {
  const sentAt = new Date();
  try {
    const data = await sendMail(opts);
    return {
      ok: true,
      sentAt,
      ackAt: new Date(),
      id: pickProviderId(data),
      raw: stringifyPayload(data),
      error: "",
    };
  } catch (e) {
    const status = e?.response?.status;
    const body = stringifyPayload(e?.response?.data);
    return {
      ok: false,
      sentAt,
      ackAt: new Date(),
      id: "",
      raw: body,
      error: [status ? `HTTP ${status}` : "", body || e?.message || "invio non riuscito"]
        .filter(Boolean)
        .join(": "),
    };
  }
}

module.exports = { sendMail, sendMailTracked };
