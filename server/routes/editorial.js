const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Client = require("../models/Client");
const Post = require("../models/Post");
const User = require("../models/User");
const PlanApproval = require("../models/PlanApproval");
const {
  authenticateToken,
  loadUser,
  requireAdmin,
  canAccessClient,
} = require("../middleware/auth");
const { sendMailTracked } = require("../services/mailer");
const emailTemplates = require("../services/emailTemplates");
const { mediaUpload, handleUpload, toMedia } = require("../services/mediaStore");
const {
  recordNotification,
  historyView,
  notificationLog,
  importFromMailLog,
  backfillHistory,
} = require("../services/planHistory");
const mailLog = require("../services/mailLog");
const mediaIntake = require("../services/mediaIntake");
const mediaInventory = require("../services/mediaInventory");
const mediaPrune = require("../services/mediaPrune");
const mediaCleanup = require("../services/mediaCleanup");
const postVersions = require("../services/postVersions");
const storageAlert = require("../services/storageAlert");

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// Lista email pulita e deduplicata (case-insensitive) da `emails` + `email`.
function cleanEmails(emails, email) {
  const all = [...(Array.isArray(emails) ? emails : []), email]
    .map((e) => String(e || "").trim())
    .filter(Boolean);
  const seen = new Set();
  return all.filter((e) => {
    const k = e.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
const recipientsOf = (client) => cleanEmails(client.emails, client.email);

// Vista approvazione con STORICO (migra i vecchi doc senza `approvals`).
function approvalView(ap) {
  if (!ap) return null;
  let events =
    ap.approvals && ap.approvals.length
      ? ap.approvals
      : ap.createdAt
      ? [{ at: ap.createdAt, name: ap.name, email: ap.email }]
      : [];
  if (!events.length) return null;
  events = [...events].sort((a, b) => new Date(a.at) - new Date(b.at));
  const last = events[events.length - 1];
  return {
    at: last.at,
    by: last.name || last.email || "",
    count: events.length,
    history: events.map((e) => ({ at: e.at, by: e.name || e.email || "" })),
  };
}

// Lista di ObjectId validi e deduplicati (admin o utenti generici).
function cleanIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const x of ids) {
    const s = String(x || "");
    if (!mongoose.isValidObjectId(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
const cleanAdmins = cleanIds;

// OPERATORI del cliente = utenti (member o admin) con questo cliente in
// `assignedClients`. Fonte unica = User.assignedClients (così l'accesso resta
// invariato). Qui riconcilio: aggiungo il cliente agli operatori scelti e lo
// tolgo a chi non lo è più.
async function reconcileOperators(clientId, operatorIds) {
  const ids = cleanIds(operatorIds);
  await User.updateMany(
    { _id: { $in: ids } },
    { $addToSet: { assignedClients: clientId } }
  );
  await User.updateMany(
    { _id: { $nin: ids }, assignedClients: clientId },
    { $pull: { assignedClients: clientId } }
  );
  return ids;
}

// True se tra gli operatori scelti c'è almeno un admin (→ niente admin di
// revisione per quel cliente: l'admin-operatore copre entrambi).
async function operatorsIncludeAdmin(operatorIds) {
  const ids = cleanIds(operatorIds);
  if (!ids.length) return false;
  const n = await User.countDocuments({ _id: { $in: ids }, role: "admin" });
  return n > 0;
}

// Tutte le rotte dei piani editoriali richiedono login + utente caricato dal DB.
router.use(authenticateToken, loadUser);

/* ===================== CLIENTI ===================== */

// Lista clienti visibili all'utente (admin: tutti; membro: assegnati).
router.get("/clients", async (req, res) => {
  try {
    const filter =
      req.dbUser.role === "admin"
        ? {}
        : { _id: { $in: req.dbUser.assignedClients || [] } };
    const clients = await Client.find(filter).sort({ name: 1 }).lean();
    // Allego gli operatori (utenti con il cliente in assignedClients) a ciascun
    // cliente, così la scheda Cliente può pre-popolare il selettore.
    const ids = clients.map((c) => c._id);
    const ops = await User.find({ assignedClients: { $in: ids } })
      .select("_id name role jobRoles assignedClients")
      .lean();
    const opsByClient = {};
    ops.forEach((u) =>
      (u.assignedClients || []).forEach((cid) => {
        const k = String(cid);
        (opsByClient[k] ||= []).push({
          id: String(u._id),
          name: u.name || "",
          role: u.role,
          jobRoles: Array.isArray(u.jobRoles) ? u.jobRoles : [],
        });
      })
    );
    clients.forEach((c) => {
      const list = opsByClient[String(c._id)] || [];
      // `operators` resta la lista di soli ID (retro-compatibilità: scheda
      // Cliente, gating, ecc.); `operatorsInfo` aggiunge nome+ruoli per la UI
      // (es. notifica agli operatori), disponibile anche ai non-admin.
      c.operators = list.map((o) => o.id);
      c.operatorsInfo = list;
    });
    res.json(clients);
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero dei clienti" });
  }
});

// Crea cliente (solo admin).
router.post("/clients", requireAdmin, async (req, res) => {
  try {
    const { name, pages, email, contactName, emails, admins, operators } =
      req.body || {};
    if (!name || !name.trim())
      return res.status(400).json({ error: "Nome cliente obbligatorio" });
    const opIds = cleanIds(operators);
    if (!opIds.length)
      return res
        .status(400)
        .json({ error: "Assegna almeno un operatore al cliente." });
    const cleaned = cleanEmails(emails, email);
    // Se un operatore è admin, niente admin di revisione per questo cliente.
    const reviewAdmins = (await operatorsIncludeAdmin(opIds))
      ? []
      : cleanAdmins(admins);
    const client = await Client.create({
      name: name.trim(),
      contactName: contactName || "",
      emails: cleaned,
      email: cleaned[0] || "", // primario allineato per compatibilità
      pages: Array.isArray(pages) ? pages : [],
      admins: reviewAdmins,
      createdBy: req.dbUser._id,
    });
    await reconcileOperators(client._id, opIds);
    res.status(201).json({ ...client.toObject(), operators: opIds });
  } catch (e) {
    res.status(500).json({ error: "Errore nella creazione del cliente" });
  }
});

// Aggiorna cliente / pagine (solo admin).
router.put("/clients/:id", requireAdmin, async (req, res) => {
  try {
    const { name, pages, email, contactName, emails, admins, operators } =
      req.body || {};
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (contactName !== undefined) update.contactName = contactName;
    if (emails !== undefined || email !== undefined) {
      const cleaned = cleanEmails(
        emails !== undefined ? emails : [],
        email !== undefined ? email : ""
      );
      update.emails = cleaned;
      update.email = cleaned[0] || "";
    }
    if (pages !== undefined) update.pages = pages;

    let opIds = null;
    if (operators !== undefined) {
      opIds = cleanIds(operators);
      if (!opIds.length)
        return res
          .status(400)
          .json({ error: "Assegna almeno un operatore al cliente." });
      // se un operatore è admin → niente admin di revisione per questo cliente
      update.admins = (await operatorsIncludeAdmin(opIds))
        ? []
        : cleanAdmins(admins);
    } else if (admins !== undefined) {
      update.admins = cleanAdmins(admins);
    }

    const client = await Client.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!client) return res.status(404).json({ error: "Cliente non trovato" });
    if (opIds) await reconcileOperators(client._id, opIds);
    const ops = await User.find({ assignedClients: client._id })
      .select("_id")
      .lean();
    res.json({ ...client.toObject(), operators: ops.map((u) => String(u._id)) });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'aggiornamento del cliente" });
  }
});

// Elimina cliente + relativi post (solo admin).
router.delete("/clients/:id", requireAdmin, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ error: "Cliente non trovato" });
    await Post.deleteMany({ clientId: req.params.id });
    // Tolgo il cliente eliminato dagli assignedClients di chi lo seguiva.
    await User.updateMany(
      { assignedClients: req.params.id },
      { $pull: { assignedClients: req.params.id } }
    );
    res.json({ message: "Cliente e relativi post eliminati" });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'eliminazione del cliente" });
  }
});

// Invia per email il piano del mese a TUTTI i destinatari del cliente
// (clienti con più soci → più indirizzi). Accessibile a chi può gestire il
// cliente (admin o operatore assegnato).
router.post("/share", async (req, res) => {
  try {
    const { clientId, year, month, message } = req.body || {};
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });

    const client = await Client.findById(clientId).lean();
    if (!client) return res.status(404).json({ error: "Cliente non trovato" });

    const recipients = recipientsOf(client);
    if (!recipients.length)
      return res.status(400).json({
        error: "Il cliente non ha email. Aggiungine almeno una dalla scheda cliente.",
      });

    const m = Number(month);
    const yyyymm = `${year}${String(m).padStart(2, "0")}`;
    const base = (process.env.APP_URL || "https://basicadv.com").replace(/\/$/, "");
    const planUrl = `${base}/p/${clientId}-${yyyymm}`;
    const monthLabel = `${MONTHS_IT[m - 1] || ""} ${year}`.trim();

    const mail = emailTemplates.shareEditorialPlan({
      clientName: client.name,
      contactName: client.contactName,
      monthLabel,
      planUrl,
      message: String(message || "").trim().slice(0, 2000),
    });

    // Invio individuale (ognuno riceve la propria copia, niente indirizzi
    // esposti) e TRACCIATO: di ogni destinatario restano esito, orari esatti e
    // risposta del relay.
    const deliveries = await Promise.all(
      recipients.map((to) =>
        sendMailTracked({ to, subject: mail.subject, text: mail.text, html: mail.html })
      )
    );
    const sent = [];
    const failed = [];
    deliveries.forEach((d, i) => (d.ok ? sent : failed).push(recipients[i]));

    // STORICO: registro sempre il tentativo (anche se fallito) — è la prova di
    // cosa è stato inviato, a chi e da chi.
    await recordNotification({
      clientId,
      year,
      month: m,
      kind: "client",
      sentBy: req.dbUser._id,
      sentByName: req.dbUser.name || req.dbUser.username || "",
      recipients,
      deliveries,
      message,
      planUrl,
    });

    if (!sent.length)
      return res
        .status(502)
        .json({ error: "Invio email non riuscito", failed });

    res.json({ sent, failed, planUrl });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio del piano" });
  }
});

// Invia il piano "per revisione" agli ADMIN assegnati al cliente. Gli admin
// revisionano in DASHBOARD (modifiche dirette + note interne), quindi il link
// punta alla dashboard, non alla vista pubblica del cliente. Accessibile a chi
// può gestire il cliente (admin o operatore assegnato).
router.post("/share-admin", async (req, res) => {
  try {
    const { clientId, year, month, message } = req.body || {};
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });

    const client = await Client.findById(clientId).lean();
    if (!client) return res.status(404).json({ error: "Cliente non trovato" });

    const adminIds = (client.admins || []).map(String);
    if (!adminIds.length)
      return res.status(400).json({
        error:
          "Nessun admin assegnato. Assegna almeno un admin dalla scheda cliente.",
      });

    const admins = await User.find({ _id: { $in: adminIds }, role: "admin" })
      .select("email name")
      .lean();
    const recipients = [
      ...new Set(admins.map((a) => String(a.email || "").trim()).filter(Boolean)),
    ];
    if (!recipients.length)
      return res.status(400).json({
        error:
          "Gli admin assegnati non hanno un'email. Aggiungila nella gestione Utenti.",
      });

    const m = Number(month);
    const base = (process.env.APP_URL || "https://basicadv.com").replace(/\/$/, "");
    const dashUrl = `${base}/dashboard`;
    const monthLabel = `${MONTHS_IT[m - 1] || ""} ${year}`.trim();

    const mail = emailTemplates.shareAdminReview({
      clientName: client.name,
      monthLabel,
      dashUrl,
      message: String(message || "").trim().slice(0, 2000),
    });
    const deliveries = await Promise.all(
      recipients.map((to) =>
        sendMailTracked({ to, subject: mail.subject, text: mail.text, html: mail.html })
      )
    );
    const sent = [];
    const failed = [];
    deliveries.forEach((d, i) => (d.ok ? sent : failed).push(recipients[i]));

    await recordNotification({
      clientId,
      year,
      month: m,
      kind: "admin",
      sentBy: req.dbUser._id,
      sentByName: req.dbUser.name || req.dbUser.username || "",
      recipients,
      deliveries,
      message,
      planUrl: dashUrl,
    });

    if (!sent.length)
      return res.status(502).json({ error: "Invio email non riuscito", failed });

    res.json({ sent, failed });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio agli admin" });
  }
});

// Notifica gli OPERATORI del cliente che il piano è pronto perché ci lavorino
// (es. dopo che un admin ha revisionato/applicato le modifiche). Speculare a
// /share-admin: link alla dashboard. Accessibile a chi può gestire il cliente;
// il mittente non notifica sé stesso (caso admin-operatore).
router.post("/notify-operators", async (req, res) => {
  try {
    const { clientId, year, month, message, operatorIds } = req.body || {};
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });

    const client = await Client.findById(clientId).lean();
    if (!client) return res.status(404).json({ error: "Cliente non trovato" });

    // Operatori = utenti con questo cliente tra gli assignedClients.
    const operators = await User.find({ assignedClients: clientId })
      .select("email name")
      .lean();
    const senderId = String(req.dbUser?._id || "");
    // Mai me stesso (chi invia, anche se è operatore del cliente).
    let pool = operators.filter((o) => String(o._id) !== senderId);
    // Se il client indica quali operatori notificare, restringo a quelli (e li
    // valido: solo operatori reali del cliente, niente ID arbitrari).
    const wanted = Array.isArray(operatorIds)
      ? operatorIds.map(String).filter(Boolean)
      : null;
    if (wanted) pool = pool.filter((o) => wanted.includes(String(o._id)));
    const recipients = [
      ...new Set(
        pool.map((o) => String(o.email || "").trim()).filter(Boolean)
      ),
    ];
    if (!recipients.length)
      return res.status(400).json({
        error: "Nessun operatore valido da notificare per questo cliente.",
      });

    const m = Number(month);
    const base = (process.env.APP_URL || "https://basicadv.com").replace(/\/$/, "");
    const dashUrl = `${base}/dashboard`;
    const monthLabel = `${MONTHS_IT[m - 1] || ""} ${year}`.trim();
    const senderName = String(
      req.dbUser?.name || req.dbUser?.username || ""
    ).trim();
    const senderRoles = Array.isArray(req.dbUser?.jobRoles)
      ? req.dbUser.jobRoles
      : [];

    const mail = emailTemplates.notifyOperators({
      senderName,
      senderRoles,
      clientName: client.name,
      monthLabel,
      dashUrl,
      message: String(message || "").trim().slice(0, 2000),
    });
    const deliveries = await Promise.all(
      recipients.map((to) =>
        sendMailTracked({ to, subject: mail.subject, text: mail.text, html: mail.html })
      )
    );
    const sent = [];
    const failed = [];
    deliveries.forEach((d, i) => (d.ok ? sent : failed).push(recipients[i]));

    await recordNotification({
      clientId,
      year,
      month: m,
      kind: "operators",
      sentBy: req.dbUser._id,
      sentByName: senderName,
      recipients,
      deliveries,
      message,
      planUrl: dashUrl,
    });

    if (!sent.length)
      return res.status(502).json({ error: "Invio email non riuscito", failed });

    res.json({ sent, failed });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio agli operatori" });
  }
});

// Stato approvazione del piano (cliente) per un mese — per la dashboard.
router.get("/approval", async (req, res) => {
  try {
    const { clientId, year, month } = req.query;
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });
    const ap = await PlanApproval.findOne({
      clientId,
      year: Number(year),
      month: Number(month),
    }).lean();
    res.json(approvalView(ap));
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero dell'approvazione" });
  }
});

// STORICO delle notifiche del piano (invii + aperture della vista pubblica)
// per un cliente/mese — speculare a /approval. Serve a dimostrare quando e a
// chi il piano è stato mandato, e quando il cliente l'ha aperto.
router.get("/plan-history", async (req, res) => {
  try {
    const { clientId, year, month } = req.query;
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });
    res.json(await historyView(clientId, year, month));
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero dello storico" });
  }
});

// LOG di tutti gli invii in ordine di data (tutti i mesi, tutti i clienti
// visibili all'utente): la vista "Storico invii" della dashboard.
router.get("/notifications", async (req, res) => {
  try {
    const { clientId, limit } = req.query;
    if (clientId && !canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });
    res.json(
      await notificationLog({
        user: req.dbUser,
        clientId: clientId || null,
        limit,
      })
    );
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero degli invii" });
  }
});

// Recupera dal LOG DEL SERVER DI POSTA la data e l'ora reali degli invii di un
// mese e le scrive nello storico. Serve per i mesi precedenti al registro
// interno e come controprova indipendente. Solo admin: usa le credenziali del
// pannello. `dryRun: true` → mostra cosa troverebbe senza scrivere.
router.post("/plan-history/mail-log", requireAdmin, async (req, res) => {
  try {
    const { clientId, year, month, dryRun } = req.body || {};
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!mailLog.isConfigured())
      return res.status(400).json({
        error:
          "Log del server di posta non configurato: mancano DA_HOST, DA_USER o DA_KEY.",
      });
    res.json(
      await importFromMailLog({ clientId, year, month, dryRun: !!dryRun })
    );
  } catch (e) {
    res.status(502).json({
      error: `Lettura del log del server di posta non riuscita: ${e?.message || "errore"}`,
    });
  }
});

// Diagnostica della connessione al pannello: conferma credenziali, comando e
// nomi dei campi restituiti. Da usare la prima volta per allineare la
// mappatura al formato reale del pannello.
router.get("/mail-log/probe", requireAdmin, async (req, res) => {
  try {
    if (!mailLog.isConfigured())
      return res.status(400).json({
        error:
          "Log del server di posta non configurato: mancano DA_HOST, DA_USER o DA_KEY.",
      });
    res.json(await mailLog.probe());
  } catch (e) {
    // `attempts` elenca cosa ha risposto il pannello a ogni indirizzo provato:
    // è l'informazione che serve per capire se manca il permesso o è il
    // comando a essere diverso.
    res.status(502).json({
      error: e?.message || "Connessione non riuscita",
      attempts: e?.attempts || [],
    });
  }
});

/* ===================== ARCHIVIO FILE (BUCKET) ===================== */

// Quanto spazio occupiamo e come è diviso. Il volume Railway non esiste più:
// resta solo il bucket, e l'unica divisione che conta è tra i media dei piani
// (si possono alleggerire e cancellare) e gli allegati arrivati dalle
// richieste del sito (file dei clienti, non si toccano).
router.get("/storage/status", requireAdmin, async (req, res) => {
  try {
    const configured = require("../services/storage").isR2Configured();
    const bucket = configured
      ? await require("../services/storage").usageByFolder()
      : null;
    res.json({
      configured,
      mode: require("../services/storage").mode(),
      bucket,
      compressione: require("../services/mediaCompress").probe(),
      avviso: {
        sogliaBytes: storageAlert.SOGLIA(),
        limiteBytes: storageAlert.LIMITE(),
        destinatario:
          process.env.STORAGE_ALERT_TO || "amministrazione@basicadv.com",
      },
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Stato non disponibile" });
  }
});

// Inventario: per ogni media citato nei piani, dove si trova davvero e a chi
// appartiene. Serve sia a capire perché un'immagine non si vede, sia a
// decidere cosa cancellare quando lo spazio finisce. Solo admin.
router.get("/storage/inventory", requireAdmin, async (req, res) => {
  try {
    const { clientId, year, month, ordina } = req.query || {};
    const inv = await mediaInventory.build({ clientId, year, month });

    // Due viste degli stessi dati: per mese (predefinita, dal più vecchio) e
    // per peso (per trovare in fretta ciò che occupa davvero).
    const mesi = mediaInventory.byMonth(inv.files);
    mesi.sort((a, b) =>
      ordina === "peso" ? b.bytes - a.bytes : a.year - b.year || a.month - b.month
    );

    const pesanti = [...inv.files].sort((a, b) => b.bytes - a.bytes).slice(0, 100);
    const mancanti = inv.files.filter((f) => f.stato === "mancante");
    const soloDisco = inv.files.filter((f) => f.stato === "soloDisco");

    // I totali stanno in un oggetto a parte: tenerli allo stesso livello degli
    // elenchi faceva sì che `soloDisco` numero venisse sovrascritto da
    // `soloDisco` elenco, e nel pannello il numero spariva.
    res.json({
      totali: inv.totali,
      bucketLetto: inv.bucketLetto,
      mesi,
      pesanti,
      mancanti: mancanti.slice(0, 200),
      soloDisco: soloDisco.slice(0, 200),
      orfani: inv.orfani.sort((a, b) => b.bytes - a.bytes).slice(0, 200),
      // Nessun post li mostra più, ma una versione sì: si possono cancellare,
      // sapendo che quel ripristino perderà la foto.
      trattenuti: (inv.trattenuti || [])
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 200),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Inventario non riuscito" });
  }
});

// Cancellazione in blocco per liberare spazio. Solo admin: è l'unica
// operazione di tutto il pannello che distrugge qualcosa.
// `dryRun: true` dice cosa succederebbe senza cancellare niente.
router.post("/storage/cleanup", requireAdmin, async (req, res) => {
  try {
    const { scope, mesi, keys, dryRun } = req.body || {};
    const opt = { dryRun: !!dryRun };
    let r;
    if (scope === "orfani") r = await mediaCleanup.svuotaOrfani(opt);
    else if (scope === "mesi") r = await mediaCleanup.svuotaMesi(mesi, opt);
    else if (scope === "file") r = await mediaCleanup.svuotaFile(keys, opt);
    else return res.status(400).json({ error: "Cosa devo cancellare?" });
    res.json(r);
  } catch (e) {
    res.status(400).json({ error: e?.message || "Cancellazione non riuscita" });
  }
});

// Ricostruzione RETROATTIVA dello storico (solo admin): per i mesi precedenti
// all'introduzione del log, deduce invii e aperture dalle prove già in archivio
// (approvazioni del piano e note lasciate dal cliente). Idempotente: non
// sovrascrive i record reali e non duplica quelli ricostruiti.
// `dryRun: true` → mostra solo cosa verrebbe creato.
router.post("/plan-history/backfill", requireAdmin, async (req, res) => {
  try {
    const { clientId, dryRun } = req.body || {};
    if (clientId && !mongoose.isValidObjectId(clientId))
      return res.status(400).json({ error: "clientId non valido" });
    res.json(await backfillHistory({ clientId: clientId || null, dryRun: !!dryRun }));
  } catch (e) {
    res.status(500).json({ error: "Errore nella ricostruzione dello storico" });
  }
});

/* ===================== MEDIA ===================== */

// Upload media dei post (foto/video) — agenzia loggata. Ritorna URL assoluti
// serviti da /uploads-ped. (Storage interim su volume Railway; → R2 in futuro.)
router.post(
  "/media",
  handleUpload(mediaUpload.array("files", 10)),
  async (req, res) => {
    try {
      // Presa in carico: messa in salvo sul bucket (se attivo) e compressione
      // in coda, dopo la risposta. L'URL è già valido: il file viene
      // sostituito con la versione leggera mantenendo lo stesso nome.
      await mediaIntake.receive(req.files, "uploads-ped");
      res.json({ media: toMedia(req, req.files) });
    } catch (e) {
      res.status(500).json({ error: "Errore nel caricamento dei media" });
    }
  }
);

/* ===================== POST ===================== */

// Post di un cliente in un mese (opzionale: filtro per pagina).
router.get("/posts", async (req, res) => {
  try {
    const { clientId, year, month, pageId } = req.query;
    if (!clientId || !year || !month)
      return res
        .status(400)
        .json({ error: "clientId, year e month sono obbligatori" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });

    const filter = { clientId, year: Number(year), month: Number(month) };
    if (pageId) filter.pageId = pageId;
    const posts = await Post.find(filter).sort({ day: 1, order: 1 }).lean();
    res.json(posts);
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero dei post" });
  }
});

// Crea post.
router.post("/posts", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.clientId || !b.pageId || !b.year || !b.month || !b.day)
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    if (!canAccessClient(req.dbUser, b.clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });

    const post = await Post.create({
      clientId: b.clientId,
      pageId: b.pageId,
      year: Number(b.year),
      month: Number(b.month),
      day: Number(b.day),
      caption: b.caption || "",
      category: b.category || "",
      media: Array.isArray(b.media) ? b.media : [],
      sponsored: !!b.sponsored,
      status: b.status || "draft",
      publishStatus: ["schedulato", "pubblicato"].includes(b.publishStatus)
        ? b.publishStatus
        : "none",
      order: b.order || 0,
      // note già presenti alla creazione (es. nota dell'agenzia su un post nuovo)
      clientNotes: Array.isArray(b.clientNotes) ? b.clientNotes : [],
      createdBy: req.dbUser._id,
    });
    // Prima riga della storia: com'era il post appena nato.
    await postVersions.registra(post, { user: req.dbUser, origine: "iniziale" });
    res.status(201).json(post);
  } catch (e) {
    res.status(500).json({ error: "Errore nella creazione del post" });
  }
});

// Aggiorna post.
router.put("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trovato" });
    if (!canAccessClient(req.dbUser, post.clientId))
      return res.status(403).json({ error: "Accesso negato" });

    // Fotografia di com'era prima: serve a capire quali file l'utente ha tolto.
    // Copio i valori invece di tenere i riferimenti: il documento sta per
    // essere modificato e i riferimenti cambierebbero sotto i piedi.
    const copia = (arr) =>
      (arr || []).map((m) => ({ url: m.url, thumbUrl: m.thumbUrl }));
    const prima = {
      media: copia(post.media),
      clientNotes: (post.clientNotes || []).map((n) => ({ media: copia(n.media) })),
    };

    // Com'era PRIMA di questa modifica. Per i post più vecchi dello storico è
    // l'unico momento in cui si può ancora fotografare il loro stato di
    // partenza: dopo il salvataggio sarebbe perso per sempre. Se la storia è
    // già aggiornata questa chiamata non scrive niente (stesso contenuto,
    // stessa impronta).
    await postVersions.registra(post);

    const b = req.body || {};
    ["pageId", "caption", "category", "media", "status"].forEach((k) => {
      if (b[k] !== undefined) post[k] = b[k];
    });
    ["year", "month", "day", "order"].forEach((k) => {
      if (b[k] !== undefined) post[k] = Number(b[k]);
    });
    if (b.sponsored !== undefined) post.sponsored = !!b.sponsored;
    if (b.publishStatus !== undefined)
      post.publishStatus = ["schedulato", "pubblicato"].includes(
        b.publishStatus
      )
        ? b.publishStatus
        : "none";
    // Il client invia isDuplicate=false quando il contenuto è stato modificato.
    if (b.isDuplicate !== undefined) post.isDuplicate = !!b.isDuplicate;
    // Note del cliente (es. operatore che le marca "risolte").
    if (b.clientNotes !== undefined) post.clientNotes = b.clientNotes;
    post.updatedAt = new Date();
    await post.save();
    // E com'è adesso: è questa la voce che porta il nome di chi ha salvato.
    await postVersions.registra(post, { user: req.dbUser });
    res.json(post);

    // Dopo aver risposto: i file tolti dal post, se non li usa più nessun
    // altro post, vanno via anche dal bucket. Non deve far aspettare chi
    // salva, e un problema qui non deve poter rovinare un salvataggio andato
    // a buon fine.
    const tolti = mediaPrune.removedUrls(prima, post);
    if (tolti.length)
      mediaPrune
        .prune(tolti, { esclusoPostId: post._id })
        .catch((e) => console.error("[pulizia] non riuscita:", e?.message));
  } catch (e) {
    res.status(500).json({ error: "Errore nell'aggiornamento del post" });
  }
});

// Elimina post.
router.delete("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trovato" });
    if (!canAccessClient(req.dbUser, post.clientId))
      return res.status(403).json({ error: "Accesso negato" });
    const urls = mediaPrune.urlsOf(post);
    await post.deleteOne();
    // Senza il post la sua storia non si potrebbe nemmeno aprire: via anche
    // quella. E deve andarsene PRIMA della pulizia, altrimenti sarebbe lei a
    // trattenere i file di un post che non esiste più.
    await postVersions
      .dimenticaPost(post._id)
      .catch((e) => console.error("[versioni] non rimosse:", e?.message));
    res.json({ message: "Post eliminato" });

    // Stessa regola: si cancellano solo i file che non mostra più nessuno.
    if (urls.length)
      mediaPrune
        .prune(urls)
        .catch((e) => console.error("[pulizia] non riuscita:", e?.message));
  } catch (e) {
    res.status(500).json({ error: "Errore nell'eliminazione del post" });
  }
});

/* ===================== VERSIONI DEL POST ===================== */
//
// Non sono riservate agli admin: chi può modificare un post deve poter anche
// rimediare a una modifica sbagliata, altrimenti l'errore resta lì fino a
// quando non passa qualcuno con più permessi.

// Elenco delle versioni, dalla più recente.
router.get("/posts/:id/versions", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select("clientId").lean();
    if (!post) return res.status(404).json({ error: "Post non trovato" });
    if (!canAccessClient(req.dbUser, post.clientId))
      return res.status(403).json({ error: "Accesso negato" });
    res.json(await postVersions.elenco(post._id));
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero delle versioni" });
  }
});

// Una singola versione: cosa conteneva, cosa cambierebbe ripristinandola e
// quali dei suoi file non ci sono più.
router.get("/posts/:id/versions/:vid", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trovato" });
    if (!canAccessClient(req.dbUser, post.clientId))
      return res.status(403).json({ error: "Accesso negato" });

    const v = await postVersions.leggi(req.params.vid);
    if (!v || String(v.postId) !== String(post._id))
      return res.status(404).json({ error: "Versione non trovata" });

    res.json({
      id: String(v._id),
      at: v.at,
      by: v.byName || "—",
      origine: v.origine,
      snapshot: v.snapshot,
      differenze: postVersions.differenze(v.snapshot, post),
      mancanti: await postVersions.filesMancanti(v.snapshot),
    });
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero della versione" });
  }
});

// Ripristino. Lo stato attuale viene registrato prima di essere sostituito:
// anche un ripristino sbagliato si annulla.
router.post("/posts/:id/versions/:vid/restore", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post non trovato" });
    if (!canAccessClient(req.dbUser, post.clientId))
      return res.status(403).json({ error: "Accesso negato" });

    const v = await postVersions.leggi(req.params.vid);
    if (!v || String(v.postId) !== String(post._id))
      return res.status(404).json({ error: "Versione non trovata" });

    await postVersions.ripristina(post, v, { user: req.dbUser });
    res.json(post);
  } catch (e) {
    res.status(500).json({ error: "Errore nel ripristino della versione" });
  }
});

// Duplica i post di un mese in un altro (scheletro del nuovo piano editoriale).
// Le copie nascono come bozze con flag isDuplicate e senza note del cliente.
router.post("/duplicate-month", async (req, res) => {
  try {
    const { clientId, fromYear, fromMonth, toYear, toMonth } = req.body || {};
    if (!clientId || !fromYear || !fromMonth || !toYear || !toMonth)
      return res.status(400).json({ error: "Parametri mancanti" });
    if (!canAccessClient(req.dbUser, clientId))
      return res.status(403).json({ error: "Accesso negato a questo cliente" });

    const source = await Post.find({
      clientId,
      year: Number(fromYear),
      month: Number(fromMonth),
    }).lean();
    if (!source.length)
      return res
        .status(404)
        .json({ error: "Nessun post da duplicare nel mese di origine" });

    const copies = source.map((p) => ({
      clientId: p.clientId,
      pageId: p.pageId,
      year: Number(toYear),
      month: Number(toMonth),
      day: p.day,
      caption: p.caption,
      category: p.category,
      media: p.media,
      sponsored: p.sponsored,
      status: p.status, // eredita lo stato; il flag isDuplicate segnala "da rivedere"
      order: p.order,
      isDuplicate: true,
      clientNotes: [],
      createdBy: req.dbUser._id,
    }));
    const created = await Post.insertMany(copies);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: "Errore nella duplicazione del mese" });
  }
});

// Rimuove i post DUPLICATI di un mese (stessa pagina/giorno/caption/categoria/
// sponsor): tiene la copia più vecchia ed elimina le altre. NON tocca i post che
// hanno note del cliente (protezione). Solo admin.
router.post("/dedupe-month", requireAdmin, async (req, res) => {
  try {
    const { clientId, year, month } = req.body || {};
    if (!clientId || !year || !month)
      return res.status(400).json({ error: "Parametri mancanti" });
    const posts = await Post.find({
      clientId,
      year: Number(year),
      month: Number(month),
    })
      .sort({ createdAt: 1, _id: 1 })
      .lean();
    const seen = new Set();
    const toDelete = [];
    for (const p of posts) {
      const key = [
        String(p.pageId),
        p.day,
        (p.caption || "").trim(),
        (p.category || "").trim(),
        !!p.sponsored,
      ].join("|");
      if (seen.has(key)) {
        if (!(p.clientNotes && p.clientNotes.length)) toDelete.push(p._id);
      } else {
        seen.add(key);
      }
    }
    if (toDelete.length) await Post.deleteMany({ _id: { $in: toDelete } });
    res.json({ removed: toDelete.length });
  } catch (e) {
    res.status(500).json({ error: "Errore nella rimozione dei duplicati" });
  }
});

module.exports = router;
