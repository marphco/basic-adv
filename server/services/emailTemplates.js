// Template HTML delle email dei piani editoriali, coerenti col brand
// (arancione #ff4003 su neutri, header scuro come la dashboard).
// HTML "email-safe": layout a tabelle + stili inline.

const BRAND = "#ff4003";
const INK = "#161616";
const MUTED = "#6b7280";
const BG = "#f4f4f5";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";

// Header come UNICA immagine (banda scura + logo + riga arancione dentro il PNG):
// i client di posta non alterano le immagini → resa identica in light e dark.
// Ospitata sul relay interno; cambiabile via EMAIL_LOGO_URL.
const LOGO_URL =
  process.env.EMAIL_LOGO_URL ||
  "https://mailer.basicadv.com/basic-email-header.png";

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function button(label, url) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr><td style="border-radius:8px;background:${BRAND};">
      <a href="${esc(url)}" target="_blank"
         style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${esc(label)}
      </a>
    </td></tr>
  </table>`;
}

const h = (t) =>
  `<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${INK};">${esc(
    t
  )}</h1>`;
const p = (html) =>
  `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">${html}</p>`;

// Scocca comune: header brand + corpo + footer.
function wrap({ title, preheader = "", bodyHtml }) {
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(
    title
  )}</title></head>
<body style="margin:0;padding:0;background:${BG};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:${CARD};border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:0;font-size:0;line-height:0;">
          <img src="${LOGO_URL}" alt="basic" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:32px 28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};">
          Basic Adv · Piani editoriali. Ricevi questa email perché coinvolto in un piano editoriale.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// → all'OPERATORE: il cliente ha lasciato delle note.
function clientNotesNotification({ operatorName, clientName, monthLabel, count, planUrl }) {
  const n = Number(count) || 0;
  const body =
    h("Nuove note dal cliente") +
    p(`Ciao ${esc(operatorName || "")},`) +
    p(
      `<strong>${esc(clientName)}</strong> ha lasciato <strong>${n} ${
        n === 1 ? "nota" : "note"
      }</strong> sul piano editoriale di <strong>${esc(monthLabel)}</strong>.`
    ) +
    p("Apri il piano per vederle e applicare le modifiche richieste.") +
    button("Apri il piano editoriale", planUrl);
  return {
    subject: `${clientName}: ${n} ${n === 1 ? "nuova nota" : "nuove note"} su ${monthLabel}`,
    text: `Ciao ${operatorName || ""},\n${clientName} ha lasciato ${n} ${
      n === 1 ? "nota" : "note"
    } sul piano editoriale di ${monthLabel}.\nApri il piano: ${planUrl}`,
    html: wrap({
      title: "Nuove note dal cliente",
      preheader: `${clientName} ha lasciato ${n} ${n === 1 ? "nota" : "note"}`,
      bodyHtml: body,
    }),
  };
}

// → al CLIENTE: abbiamo recepito le note e aggiornato il piano.
function revisionsDoneNotification({ contactName, clientName, monthLabel, planUrl }) {
  const body =
    h("Il tuo piano editoriale è aggiornato") +
    p(`Ciao ${esc(contactName || clientName)},`) +
    p(
      `Abbiamo recepito le tue note e aggiornato il piano editoriale di <strong>${esc(
        monthLabel
      )}</strong>.`
    ) +
    p("Dai un'occhiata e facci sapere se è tutto a posto.") +
    button("Vedi il piano editoriale", planUrl);
  return {
    subject: `Piano editoriale di ${monthLabel} aggiornato`,
    text: `Ciao ${contactName || clientName},\nAbbiamo recepito le tue note e aggiornato il piano editoriale di ${monthLabel}.\nVedi il piano: ${planUrl}`,
    html: wrap({
      title: "Piano aggiornato",
      preheader: "Abbiamo aggiornato il tuo piano editoriale",
      bodyHtml: body,
    }),
  };
}

// → al CLIENTE: condivisione del piano editoriale del mese (link di sola lettura
//   dove potrà vedere i post e lasciare le sue note).
function shareEditorialPlan({ clientName, contactName, monthLabel, planUrl }) {
  const body =
    h("Il piano editoriale è pronto") +
    p(`Ciao ${esc(contactName || clientName)},`) +
    p(
      `Ecco il piano editoriale di <strong>${esc(
        monthLabel
      )}</strong> per <strong>${esc(clientName)}</strong>.`
    ) +
    p(
      "Apri il link per vedere tutti i post del mese e lasciare le tue note direttamente sui singoli contenuti."
    ) +
    button("Vedi il piano editoriale", planUrl);
  return {
    subject: `Piano editoriale di ${monthLabel} — ${clientName}`,
    text: `Ciao ${contactName || clientName},\nEcco il piano editoriale di ${monthLabel} per ${clientName}.\nVedi il piano e lascia le tue note: ${planUrl}`,
    html: wrap({
      title: "Piano editoriale",
      preheader: `Piano editoriale di ${monthLabel}`,
      bodyHtml: body,
    }),
  };
}

// → al NUOVO UTENTE: account creato. Per sicurezza NON contiene la password.
function accountWelcome({ name, username, role, loginUrl }) {
  const roleLabel = role === "admin" ? "Amministratore" : "Operatore";
  const box = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 10px;border:1px solid ${BORDER};border-radius:8px;">
      <tr><td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;">
        <span style="font-size:12px;color:${MUTED};">Username</span><br>
        <span style="font-size:16px;font-weight:bold;color:${INK};">${esc(username)}</span>
        &nbsp;&nbsp;<span style="font-size:12px;color:${MUTED};">· Ruolo: ${esc(roleLabel)}</span>
      </td></tr>
    </table>`;
  const body =
    h("Il tuo account è pronto") +
    p(`Ciao ${esc(name || "")},`) +
    p(
      `È stato creato il tuo account su <strong>Basic Adv</strong> come <strong>${esc(
        roleLabel
      )}</strong>.`
    ) +
    box +
    p(
      `Per sicurezza la password <strong>non viene inviata via email</strong>: te la comunica direttamente il tuo amministratore.`
    ) +
    button("Accedi", loginUrl);
  return {
    subject: "Il tuo account Basic Adv è pronto",
    text: `Ciao ${name || ""},\nÈ stato creato il tuo account su Basic Adv come ${roleLabel}.\nUsername: ${username}\nLa password ti viene comunicata separatamente dall'amministratore (non viene inviata via email).\nAccedi: ${loginUrl}`,
    html: wrap({
      title: "Account creato",
      preheader: "Il tuo account Basic Adv è pronto",
      bodyHtml: body,
    }),
  };
}

module.exports = {
  clientNotesNotification,
  revisionsDoneNotification,
  shareEditorialPlan,
  accountWelcome,
  wrap,
};
