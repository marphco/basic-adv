// Template HTML delle email dei piani editoriali, coerenti col brand
// (arancione #ff4003 su neutri, header scuro come la dashboard).
// HTML "email-safe": layout a tabelle + stili inline.

const BRAND = "#ff4003";
const INK = "#161616";
const MUTED = "#6b7280";
const BG = "#f4f4f5";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
// Accenti per tipo di notifica (testo colorato + bordo: affidabili anche in dark
// mode, dove gli sfondi pieni vengono alterati dai client di posta).
const GREEN = "#16a34a"; // approvazione
const AMBER = "#d97706"; // modifiche richieste dal cliente
const BLUE = "#2563eb"; // revisione interna (operatore → admin)

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

const h = (t, color = INK) =>
  `<h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${color};">${esc(
    t
  )}</h1>`;
const p = (html) =>
  `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">${html}</p>`;

// Banner che identifica TIPO + MITTENTE della notifica a colpo d'occhio: testo
// colorato + bordo sinistro (niente sfondo pieno → resa affidabile in dark mode).
function banner(label, accent) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
    <tr><td style="border-left:4px solid ${accent};background:${BG};border-radius:0 8px 8px 0;padding:9px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;color:${accent};">
      ${esc(label)}
    </td></tr>
  </table>`;
}

// Citazione del messaggio personalizzato scritto dal cliente.
function quote(text) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;">
    <tr><td style="border-left:4px solid ${BRAND};background:${BG};border-radius:0 8px 8px 0;padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
      ${esc(text).replace(/\n/g, "<br>")}
    </td></tr>
  </table>`;
}

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

// → all'OPERATORE: il cliente ha lasciato delle note (chiede modifiche), con
//   eventuale messaggio personalizzato.
function clientNotesNotification({ operatorName, clientName, monthLabel, count, planUrl, message }) {
  const n = Number(count) || 0;
  const msg = (message || "").trim();
  const body =
    banner("Cliente · modifiche richieste", AMBER) +
    h("Il cliente chiede modifiche", AMBER) +
    p(`Ciao ${esc(operatorName || "")},`) +
    p(
      `<strong>${esc(clientName)}</strong> ha lasciato <strong>${n} ${
        n === 1 ? "nota" : "note"
      }</strong> sul piano editoriale di <strong>${esc(monthLabel)}</strong>.`
    ) +
    (msg ? p("Messaggio del cliente:") + quote(msg) : "") +
    p("Apri il piano per vederle e applicare le modifiche richieste.") +
    button("Apri il piano editoriale", planUrl);
  return {
    subject: `✏️ Cliente — modifiche richieste · ${monthLabel} (${clientName})`,
    text: `[CLIENTE · MODIFICHE RICHIESTE]\nCiao ${operatorName || ""},\n${clientName} ha lasciato ${n} ${
      n === 1 ? "nota" : "note"
    } sul piano editoriale di ${monthLabel}.${msg ? `\nMessaggio del cliente: ${msg}` : ""}\nApri il piano: ${planUrl}`,
    html: wrap({
      title: "Modifiche richieste dal cliente",
      preheader: `${clientName}: ${n} ${n === 1 ? "nota" : "note"}${msg ? " + messaggio" : ""}`,
      bodyHtml: body,
    }),
  };
}

// → al CLIENTE: abbiamo recepito le note e aggiornato il piano.
function revisionsDoneNotification({ contactName, clientName, monthLabel, planUrl }) {
  const body =
    banner("Da Basic Adv · piano aggiornato", BRAND) +
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
    banner("Da Basic Adv · piano editoriale", BRAND) +
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

// → all'AGENZIA: il cliente ha APPROVATO il piano del mese (con eventuale
//   messaggio personalizzato).
function planApprovedNotification({ clientName, monthLabel, by, planUrl, message }) {
  const msg = (message || "").trim();
  const body =
    banner("Cliente · piano approvato", GREEN) +
    h("Piano approvato dal cliente 🎉", GREEN) +
    p(
      `<strong>${esc(clientName)}</strong> ha <strong>approvato</strong> il piano editoriale di <strong>${esc(
        monthLabel
      )}</strong>.`
    ) +
    (by ? p(`Approvato da: <strong>${esc(by)}</strong>.`) : "") +
    (msg ? p("Messaggio del cliente:") + quote(msg) : "") +
    button("Apri il piano editoriale", planUrl);
  return {
    subject: `✅ Cliente — piano APPROVATO · ${monthLabel} (${clientName})`,
    text: `[CLIENTE · PIANO APPROVATO]\n${clientName} ha approvato il piano editoriale di ${monthLabel}.${
      by ? ` Approvato da: ${by}.` : ""
    }${msg ? `\nMessaggio del cliente: ${msg}` : ""}\nApri il piano: ${planUrl}`,
    html: wrap({
      title: "Piano approvato",
      preheader: `${clientName} ha approvato il piano di ${monthLabel}${msg ? " + messaggio" : ""}`,
      bodyHtml: body,
    }),
  };
}

// → agli ADMIN assegnati: il piano è pronto per la REVISIONE interna. Gli admin
// revisionano in dashboard (modifiche dirette + note interne), quindi il link
// punta alla dashboard, NON alla vista cliente.
function shareAdminReview({ clientName, monthLabel, dashUrl }) {
  const body =
    banner("Interno · operatore → admin", BLUE) +
    h("Piano da revisionare", BLUE) +
    p(
      `Il piano editoriale di <strong>${esc(
        monthLabel
      )}</strong> per <strong>${esc(
        clientName
      )}</strong> è pronto per la tua revisione.`
    ) +
    p(
      "Aprilo in dashboard per modificare i post e lasciare note interne (visibili solo all'agenzia, mai al cliente)."
    ) +
    button("Apri in dashboard", dashUrl);
  return {
    subject: `🔍 Interno — da revisionare · ${monthLabel} (${clientName})`,
    text: `[INTERNO · DA REVISIONARE]\nIl piano editoriale di ${monthLabel} per ${clientName} è pronto per la revisione.\nAprilo in dashboard per modificarlo e lasciare note interne: ${dashUrl}`,
    html: wrap({
      title: "Revisione piano editoriale",
      preheader: `Da revisionare: piano di ${monthLabel} — ${clientName}`,
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
  shareAdminReview,
  planApprovedNotification,
  accountWelcome,
  wrap,
};
