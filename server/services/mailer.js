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

module.exports = { sendMail };
