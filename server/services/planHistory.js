// Storico delle notifiche del piano editoriale.
//
// Due tracce complementari:
//  1) PlanNotification → gli INVII fatti dall'agenzia (quando, da chi, a chi,
//     con quale esito per ogni indirizzo);
//  2) PlanAccess → le APERTURE del piano dalla vista pubblica (il link si
//     sblocca solo con un'email del cliente: è la prova che il piano è
//     arrivato).
//
// La registrazione non deve MAI far fallire un invio o l'apertura di un piano:
// ogni funzione di scrittura inghiotte i propri errori e si limita a loggarli.
const Client = require("../models/Client");
const Post = require("../models/Post");
const User = require("../models/User");
const PlanApproval = require("../models/PlanApproval");
const PlanNotification = require("../models/PlanNotification");
const PlanAccess = require("../models/PlanAccess");

const norm = (e) => String(e || "").trim().toLowerCase();
const clientEmailsOf = (c) =>
  [...(c?.emails || []), c?.email].map(norm).filter(Boolean);

const fmtIt = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Registra un invio. `deliveries` è l'array restituito da sendMailTracked,
// parallelo a `recipients` (stesso ordine): per ogni indirizzo si salvano
// esito, orari esatti e risposta del relay.
async function recordNotification({
  clientId,
  year,
  month,
  kind = "client",
  sentBy,
  sentByName = "",
  recipients = [],
  deliveries = [],
  message = "",
  planUrl = "",
}) {
  try {
    return await PlanNotification.create({
      clientId,
      year: Number(year),
      month: Number(month),
      kind,
      at: new Date(),
      sentBy,
      sentByName,
      recipients: recipients.map((email, i) => {
        const d = deliveries[i];
        const ok = d ? !!d.ok : true;
        return {
          email,
          ok,
          error: ok ? "" : String(d?.error || "invio non riuscito").slice(0, 300),
          sentAt: d?.sentAt || null,
          ackAt: d?.ackAt || null,
          providerId: String(d?.id || "").slice(0, 120),
          providerResponse: String(d?.raw || "").slice(0, 1000),
        };
      }),
      message: String(message || "").slice(0, 2000),
      planUrl,
      source: "app",
    });
  } catch (e) {
    console.error("[planHistory] registrazione notifica fallita:", e?.message);
    return null;
  }
}

// Registra l'apertura del piano dalla vista pubblica (upsert per email).
async function recordAccess({
  clientId,
  year,
  month,
  email,
  isAgency = false,
  ip = "",
  userAgent = "",
}) {
  try {
    const e = norm(email);
    if (!e) return null;
    const at = new Date();
    return await PlanAccess.findOneAndUpdate(
      { clientId, year: Number(year), month: Number(month), email: e },
      {
        // Un'apertura vera "conferma" anche un record ricostruito.
        $set: {
          lastAt: at,
          isAgency: !!isAgency,
          lastIp: String(ip || "").slice(0, 60),
          lastUserAgent: String(userAgent || "").slice(0, 300),
          source: "app",
        },
        $setOnInsert: { firstAt: at },
        $inc: { count: 1 },
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("[planHistory] registrazione apertura fallita:", e?.message);
    return null;
  }
}

// Storico completo di un cliente per un mese (dashboard).
async function historyView(clientId, year, month) {
  const y = Number(year);
  const m = Number(month);
  const [notifications, accesses] = await Promise.all([
    PlanNotification.find({ clientId, year: y, month: m })
      .sort({ at: -1 })
      .lean(),
    PlanAccess.find({ clientId, year: y, month: m }).sort({ firstAt: 1 }).lean(),
  ]);

  const notif = notifications.map((n) => ({
    id: String(n._id),
    at: n.at,
    kind: n.kind,
    by: n.sentByName || "",
    message: n.message || "",
    planUrl: n.planUrl || "",
    source: n.source,
    atUpperBound: !!n.atUpperBound,
    evidence: n.evidence || "",
    recipients: (n.recipients || []).map((r) => ({
      email: r.email,
      ok: !!r.ok,
      error: r.error || "",
      // riferimenti tecnici per i log del mail server
      sentAt: r.sentAt || null,
      ackAt: r.ackAt || null,
      providerId: r.providerId || "",
      providerResponse: r.providerResponse || "",
    })),
    sent: (n.recipients || []).filter((r) => r.ok).length,
    failed: (n.recipients || []).filter((r) => !r.ok).length,
  }));

  const toClient = notif.filter((n) => n.kind === "client");
  // Un invio in cui NESSUN destinatario è stato raggiunto non è una prova di
  // consegna: resta nello storico (col motivo dell'errore) ma non alimenta il
  // conteggio "piano inviato".
  const delivered = toClient.filter((n) => n.sent > 0);
  return {
    notifications: notif,
    accesses: accesses.map((a) => ({
      email: a.email,
      isAgency: !!a.isAgency,
      firstAt: a.firstAt,
      lastAt: a.lastAt,
      count: a.count || 1,
      source: a.source,
      evidence: a.evidence || "",
    })),
    // Riepilogo per il banner in dashboard (solo invii al cliente).
    summary: {
      clientCount: delivered.length,
      lastClientAt: delivered[0]?.at || null,
      lastClientBy: delivered[0]?.by || "",
      lastClientInferred: delivered[0]?.source === "inferred",
      clientOpens: accesses.filter((a) => !a.isAgency).length,
      // tentativi in cui nessun indirizzo è stato raggiunto
      failedAttempts: toClient.length - delivered.length,
    },
  };
}

/* ===================== RICOSTRUZIONE RETROATTIVA ===================== */
//
// Per i mesi precedenti all'introduzione dello storico non esiste il log
// dell'invio, ma esistono PROVE che il piano è arrivato al cliente:
//  - le APPROVAZIONI del piano (PlanApproval): per approvare bisogna aprire il
//    link ricevuto e sbloccarlo con la propria email;
//  - le NOTE lasciate dal cliente sui post (Post.clientNotes): idem.
// Da queste ricostruiamo: un'apertura (PlanAccess) per ogni email che le ha
// prodotte e una notifica "ricostruita" (PlanNotification source="inferred")
// datata alla PRIMA prova — cioè l'invio è avvenuto entro quella data.
//
// Idempotente: non tocca mai i record reali e non duplica i ricostruiti.

// Chiave mese usata per raggruppare le prove.
const mk = (y, m) => `${y}-${m}`;

async function collectEvidence(client, agencyEmails) {
  const emails = new Set(clientEmailsOf(client));
  // Un'email è "del cliente" se è tra le sue (anche storiche → non le sappiamo)
  // oppure semplicemente se NON appartiene a un utente dell'agenzia.
  const isClientEmail = (e) => emails.has(e) || !agencyEmails.has(e);

  const byMonth = new Map();
  const push = (year, month, ev) => {
    if (!year || !month || !ev.at) return;
    const k = mk(year, month);
    if (!byMonth.has(k)) byMonth.set(k, { year, month, events: [] });
    byMonth.get(k).events.push(ev);
  };

  const approvals = await PlanApproval.find({ clientId: client._id }).lean();
  approvals.forEach((ap) => {
    const events =
      ap.approvals && ap.approvals.length
        ? ap.approvals
        : ap.createdAt
        ? [{ at: ap.createdAt, email: ap.email, name: ap.name }]
        : [];
    events.forEach((e) => {
      const em = norm(e.email);
      push(ap.year, ap.month, {
        at: e.at,
        email: em,
        kind: "approval",
        fromClient: !em || isClientEmail(em),
      });
    });
  });

  const posts = await Post.find({
    clientId: client._id,
    "clientNotes.0": { $exists: true },
  })
    .select("year month clientNotes")
    .lean();
  posts.forEach((p) =>
    (p.clientNotes || []).forEach((n) => {
      if (n.fromAgency || n.internal) return; // note dell'agenzia: non provano nulla
      const em = norm(n.authorEmail);
      if (!em) return;
      push(p.year, p.month, {
        at: n.createdAt,
        email: em,
        kind: "note",
        fromClient: isClientEmail(em),
      });
    })
  );

  return byMonth;
}

// Testo leggibile che spiega da cosa è stata ricostruita la voce.
function evidenceText(events) {
  const approvals = events.filter((e) => e.kind === "approval").length;
  const notes = events.filter((e) => e.kind === "note").length;
  const parts = [];
  if (approvals)
    parts.push(`${approvals} ${approvals === 1 ? "approvazione" : "approvazioni"} del piano`);
  if (notes) parts.push(`${notes} ${notes === 1 ? "nota" : "note"} del cliente`);
  const first = events.reduce(
    (min, e) => (!min || new Date(e.at) < new Date(min) ? e.at : min),
    null
  );
  return (
    `Ricostruita dalle prove in archivio (${parts.join(" e ")}). ` +
    `Il cliente ha aperto il piano il ${fmtIt(first)}: la notifica è quindi ` +
    `stata inviata entro quella data.`
  );
}

async function backfillClient(client, { dryRun }, agencyEmails) {
  const byMonth = await collectEvidence(client, agencyEmails);
  // `monthsScanned` elenca TUTTI i mesi in cui esiste almeno una prova, anche
  // quando non c'è nulla di nuovo da creare: serve a spiegare all'utente
  // perché un mese non produce nessuna voce (di solito: prove = zero).
  const out = {
    client: client.name,
    months: [],
    monthsScanned: [],
    notifications: 0,
    accesses: 0,
  };

  for (const { year, month, events } of byMonth.values()) {
    const clientEvents = events.filter((e) => e.fromClient);

    // 1) Aperture ricostruite (una per email, anche agenzia: resta tracciata
    //    ma marcata come tale).
    const byEmail = new Map();
    events.forEach((e) => {
      if (!e.email) return;
      const cur = byEmail.get(e.email) || {
        firstAt: e.at,
        lastAt: e.at,
        count: 0,
        fromClient: e.fromClient,
        events: [],
      };
      if (new Date(e.at) < new Date(cur.firstAt)) cur.firstAt = e.at;
      if (new Date(e.at) > new Date(cur.lastAt)) cur.lastAt = e.at;
      cur.count += 1;
      cur.events.push(e);
      byEmail.set(e.email, cur);
    });

    let accesses = 0;
    for (const [email, info] of byEmail) {
      const exists = await PlanAccess.findOne({
        clientId: client._id,
        year,
        month,
        email,
      }).lean();
      if (exists) continue;
      accesses += 1;
      if (dryRun) continue;
      await PlanAccess.create({
        clientId: client._id,
        year,
        month,
        email,
        isAgency: !info.fromClient,
        firstAt: info.firstAt,
        lastAt: info.lastAt,
        count: info.count,
        source: "inferred",
        evidence: evidenceText(info.events),
      });
    }

    // 2) Notifica al cliente ricostruita: solo se per quel mese non ne esiste
    //    già una (reale o ricostruita) e solo se le prove vengono dal cliente.
    let notifications = 0;
    if (clientEvents.length) {
      const exists = await PlanNotification.findOne({
        clientId: client._id,
        year,
        month,
        kind: "client",
      }).lean();
      if (!exists) {
        notifications = 1;
        if (!dryRun) {
          const firstAt = clientEvents.reduce(
            (min, e) => (new Date(e.at) < new Date(min) ? e.at : min),
            clientEvents[0].at
          );
          const proved = [
            ...new Set(clientEvents.map((e) => e.email).filter(Boolean)),
          ];
          await PlanNotification.create({
            clientId: client._id,
            year,
            month,
            kind: "client",
            at: firstAt,
            sentByName: "",
            // Indirizzi che hanno DIMOSTRATO di aver ricevuto il piano; se le
            // prove non portano un'email, ripiego sui destinatari attuali.
            recipients: (proved.length ? proved : clientEmailsOf(client)).map(
              (email) => ({ email, ok: true })
            ),
            source: "inferred",
            atUpperBound: true,
            evidence: evidenceText(clientEvents),
          });
        }
      }
    }

    out.monthsScanned.push({
      year,
      month,
      approvals: events.filter((e) => e.kind === "approval").length,
      notes: events.filter((e) => e.kind === "note").length,
      // prove riconducibili al CLIENTE (le sole che provano l'invio)
      clientEvidence: clientEvents.length,
      notifications,
      accesses,
    });

    if (accesses || notifications) {
      out.months.push({ year, month, accesses, notifications });
      out.accesses += accesses;
      out.notifications += notifications;
    }
  }

  return out;
}

// Ricostruisce lo storico per un cliente (clientId) o per tutti.
// `dryRun` = calcola e basta, senza scrivere.
async function backfillHistory({ clientId = null, dryRun = false } = {}) {
  const clients = clientId
    ? [await Client.findById(clientId).lean()].filter(Boolean)
    : await Client.find().lean();
  const agencyEmails = new Set(
    (await User.find().select("email").lean()).map((u) => norm(u.email)).filter(Boolean)
  );

  const details = [];
  let notifications = 0;
  let accesses = 0;
  for (const c of clients) {
    const r = await backfillClient(c, { dryRun }, agencyEmails);
    notifications += r.notifications;
    accesses += r.accesses;
    // Su un singolo cliente riporto sempre l'esito (anche vuoto): serve alla
    // dashboard per dire PERCHÉ non è stato ricostruito nulla.
    if (r.months.length || r.monthsScanned.length || clientId) details.push(r);
  }
  return { dryRun: !!dryRun, clients: clients.length, notifications, accesses, details };
}

module.exports = {
  recordNotification,
  recordAccess,
  historyView,
  backfillHistory,
};
