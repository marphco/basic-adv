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

const PIEDE_EDITORIALE =
  "Basic Adv · Piani editoriali. Ricevi questa email perché coinvolto in un piano editoriale.";

// Scocca comune: header brand + corpo + footer.
function wrap({ title, preheader = "", bodyHtml, footer = PIEDE_EDITORIALE, lang = "it" }) {
  return `<!doctype html>
<html lang="${lang === "en" ? "en" : "it"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(
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
          ${esc(footer)}
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
function shareEditorialPlan({ clientName, contactName, monthLabel, planUrl, message }) {
  const msg = (message || "").trim();
  const body =
    banner("Da Basic Adv · piano editoriale", BRAND) +
    h("Il piano editoriale è pronto") +
    p(`Ciao ${esc(contactName || clientName)},`) +
    p(
      `Ecco il piano editoriale di <strong>${esc(
        monthLabel
      )}</strong> per <strong>${esc(clientName)}</strong>.`
    ) +
    (msg ? quote(msg) : "") +
    p(
      "Apri il link per vedere tutti i post del mese e lasciare le tue note direttamente sui singoli contenuti."
    ) +
    button("Vedi il piano editoriale", planUrl);
  return {
    subject: `Piano editoriale di ${monthLabel} — ${clientName}`,
    text: `Ciao ${contactName || clientName},\nEcco il piano editoriale di ${monthLabel} per ${clientName}.${
      msg ? `\n\n${msg}\n` : ""
    }\nVedi il piano e lascia le tue note: ${planUrl}`,
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
function shareAdminReview({ clientName, monthLabel, dashUrl, message }) {
  const msg = (message || "").trim();
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
    (msg ? p("Messaggio dell'operatore:") + quote(msg) : "") +
    p(
      "Aprilo in dashboard per modificare i post e lasciare note interne (visibili solo al team Basic, mai al cliente)."
    ) +
    button("Apri in dashboard", dashUrl);
  return {
    subject: `🔍 Interno — da revisionare · ${monthLabel} (${clientName})`,
    text: `[INTERNO · DA REVISIONARE]\nIl piano editoriale di ${monthLabel} per ${clientName} è pronto per la revisione.${
      msg ? `\nMessaggio dell'operatore: ${msg}` : ""
    }\nAprilo in dashboard per modificarlo e lasciare note interne: ${dashUrl}`,
    html: wrap({
      title: "Revisione piano editoriale",
      preheader: `Da revisionare: piano di ${monthLabel} — ${clientName}`,
      bodyHtml: body,
    }),
  };
}

// → agli OPERATORI assegnati: notifica interna di team su un piano. La manda un
// admin (es. "ho fatto le modifiche, puoi lavorarci") o un altro operatore
// (comunicazione cross-team). Generica: il mittente + l'eventuale messaggio
// danno il contesto. Link alla dashboard (gli operatori lavorano lì).
function notifyOperators({ senderName, senderRoles, clientName, monthLabel, dashUrl, message }) {
  const msg = (message || "").trim();
  const who = String(senderName || "").trim() || "Un membro del team";
  const roles = Array.isArray(senderRoles) ? senderRoles.filter(Boolean) : [];
  const whoLine = roles.length ? `${who} (${roles.join(", ")})` : who;
  const body =
    banner("Interno · notifica team", BLUE) +
    h("Notifica sul piano", BLUE) +
    p(
      `<strong>${esc(
        whoLine
      )}</strong> ti ha inviato una notifica sul piano editoriale di <strong>${esc(
        monthLabel
      )}</strong> per <strong>${esc(clientName)}</strong>.`
    ) +
    (msg ? p("Messaggio:") + quote(msg) : "") +
    p("Aprilo in dashboard per vedere gli aggiornamenti e procedere.") +
    button("Apri in dashboard", dashUrl);
  return {
    subject: `🔔 Interno — notifica team · ${monthLabel} (${clientName})`,
    text: `[INTERNO · NOTIFICA TEAM]\n${whoLine} ti ha inviato una notifica sul piano di ${monthLabel} per ${clientName}.${
      msg ? `\nMessaggio: ${msg}` : ""
    }\nAprilo in dashboard: ${dashUrl}`,
    html: wrap({
      title: "Notifica piano editoriale",
      preheader: `Notifica sul piano di ${monthLabel} — ${clientName}`,
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

/* ==================== FORM DEL SITO ==================== */

// Riga "etichetta: valore" per il riepilogo di una richiesta.
function riga(etichetta, valore) {
  if (!valore) return "";
  return `
      <tr>
        <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};width:120px;vertical-align:top;">${esc(etichetta)}</td>
        <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${INK};">${valore}</td>
      </tr>`;
}

const TIPO_PROGETTO = { new: "Nuovo progetto", restyling: "Restyling" };
const BUDGET = {
  unknown: "Non lo sa ancora",
  "0-1000": "Fino a 1.000 €",
  "1000-5000": "1.000 – 5.000 €",
  "5000-10000": "5.000 – 10.000 €",
  "10000+": "Oltre 10.000 €",
};

// → a NOI: un cliente ha completato il form. Il pulsante apre la richiesta
//   nella dashboard (se non si è loggati, passa dal login e poi ci torna).
function nuovaRichiesta({ name, email, phone, brandName, servizi = [], projectType, businessField, budget, lingua, requestUrl }) {
  const telefono = phone ? `<a href="tel:${esc(phone)}" style="color:${INK};text-decoration:none;">${esc(phone)}</a>` : "";
  const posta = `<a href="mailto:${esc(email)}" style="color:${BRAND};text-decoration:none;">${esc(email)}</a>`;
  const box = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;border:1px solid ${BORDER};border-radius:8px;">
      <tr><td style="padding:10px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${riga("Nome", esc(name))}
          ${riga("Email", posta)}
          ${riga("Telefono", telefono)}
          ${riga("Brand", esc(brandName || ""))}
          ${riga("Servizi", esc(servizi.join(", ")))}
          ${riga("Progetto", esc(TIPO_PROGETTO[projectType] || ""))}
          ${riga("Settore", esc(businessField && businessField !== "non specificato" ? businessField : ""))}
          ${riga("Budget", esc(BUDGET[budget] || budget || ""))}
          ${riga("Lingua", lingua === "en" ? "Inglese" : lingua === "it" ? "Italiano" : "")}
        </table>
      </td></tr>
    </table>`;
  const cosa = servizi.length ? servizi.join(", ") : "un progetto";
  const body =
    banner("Sito · nuova richiesta", BRAND) +
    h("Nuova richiesta dal sito") +
    p(`<strong>${esc(name)}</strong> ha completato il form per <strong>${esc(cosa)}</strong>.`) +
    box +
    p("Rispondendo a questa email scrivi direttamente al cliente.") +
    button("Apri la richiesta", requestUrl);
  return {
    subject: `Nuova richiesta dal sito · ${name}${servizi.length ? ` (${servizi.join(", ")})` : ""}`,
    text:
      `Nuova richiesta dal sito\n` +
      `- Nome: ${name}\n- Email: ${email}\n- Telefono: ${phone || "non indicato"}\n` +
      (servizi.length ? `- Servizi: ${servizi.join(", ")}\n` : "") +
      `Apri la richiesta: ${requestUrl}`,
    html: wrap({
      title: "Nuova richiesta dal sito",
      preheader: `${name} · ${cosa}`,
      bodyHtml: body,
      footer: "Basic Adv · Notifica interna del form del sito.",
    }),
  };
}

// → al CLIENTE: grazie, ti ricontattiamo. Nella lingua in cui ha compilato.
function grazieRichiesta({ name, lingua = "it", servizi = [] }) {
  const en = lingua === "en";
  const cosa = servizi.length ? servizi.join(", ") : "";
  const body = en
    ? h("Thank you, we've got your request") +
      p(`Hi ${esc(name)},`) +
      p(`thanks for telling us about your project${cosa ? ` (<strong>${esc(cosa)}</strong>)` : ""}. We are reading your answers and will get back to you soon.`) +
      p("If you want to add something in the meantime, just reply to this email.")
    : h("Grazie, abbiamo ricevuto la tua richiesta") +
      p(`Ciao ${esc(name)},`) +
      p(`grazie per averci raccontato il tuo progetto${cosa ? ` (<strong>${esc(cosa)}</strong>)` : ""}. Stiamo leggendo le tue risposte e ti ricontatteremo presto.`) +
      p("Se nel frattempo vuoi aggiungere qualcosa, rispondi pure a questa email.");
  return {
    subject: en ? "Thank you for contacting us!" : "Grazie per averci contattato!",
    html: wrap({
      title: en ? "Thank you" : "Grazie",
      preheader: en ? "We'll get back to you soon." : "Ti ricontatteremo presto.",
      bodyHtml: body,
      footer: en
        ? "Basic Adv · You receive this email because you filled in the form on basicadv.com."
        : "Basic Adv · Ricevi questa email perché hai compilato il form su basicadv.com.",
      lang: lingua,
    }),
  };
}

module.exports = {
  nuovaRichiesta,
  grazieRichiesta,
  clientNotesNotification,
  revisionsDoneNotification,
  shareEditorialPlan,
  shareAdminReview,
  notifyOperators,
  planApprovedNotification,
  accountWelcome,
  wrap,
};
