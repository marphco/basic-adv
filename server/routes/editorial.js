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
const { sendMail } = require("../services/mailer");
const emailTemplates = require("../services/emailTemplates");
const { mediaUpload, handleUpload, toMedia } = require("../services/mediaStore");

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

// Lista di ObjectId admin validi e deduplicati (dai dati grezzi del client).
function cleanAdmins(ids) {
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
    res.json(clients);
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero dei clienti" });
  }
});

// Crea cliente (solo admin).
router.post("/clients", requireAdmin, async (req, res) => {
  try {
    const { name, pages, email, contactName, emails, admins } = req.body || {};
    if (!name || !name.trim())
      return res.status(400).json({ error: "Nome cliente obbligatorio" });
    const cleaned = cleanEmails(emails, email);
    const client = await Client.create({
      name: name.trim(),
      contactName: contactName || "",
      emails: cleaned,
      email: cleaned[0] || "", // primario allineato per compatibilità
      pages: Array.isArray(pages) ? pages : [],
      admins: cleanAdmins(admins),
      createdBy: req.dbUser._id,
    });
    res.status(201).json(client);
  } catch (e) {
    res.status(500).json({ error: "Errore nella creazione del cliente" });
  }
});

// Aggiorna cliente / pagine (solo admin).
router.put("/clients/:id", requireAdmin, async (req, res) => {
  try {
    const { name, pages, email, contactName, emails, admins } = req.body || {};
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (contactName !== undefined) update.contactName = contactName;
    if (admins !== undefined) update.admins = cleanAdmins(admins);
    if (emails !== undefined || email !== undefined) {
      const cleaned = cleanEmails(
        emails !== undefined ? emails : [],
        email !== undefined ? email : ""
      );
      update.emails = cleaned;
      update.email = cleaned[0] || "";
    }
    if (pages !== undefined) update.pages = pages;
    const client = await Client.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!client) return res.status(404).json({ error: "Cliente non trovato" });
    res.json(client);
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
    const { clientId, year, month } = req.body || {};
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
    });

    // Invio individuale (ognuno riceve la propria copia, niente indirizzi esposti).
    const results = await Promise.allSettled(
      recipients.map((to) =>
        sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html })
      )
    );
    const sent = [];
    const failed = [];
    results.forEach((r, i) =>
      (r.status === "fulfilled" ? sent : failed).push(recipients[i])
    );
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
    const { clientId, year, month } = req.body || {};
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
    });
    const results = await Promise.allSettled(
      recipients.map((to) =>
        sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html })
      )
    );
    const sent = [];
    const failed = [];
    results.forEach((r, i) =>
      (r.status === "fulfilled" ? sent : failed).push(recipients[i])
    );
    if (!sent.length)
      return res.status(502).json({ error: "Invio email non riuscito", failed });

    res.json({ sent, failed });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio agli admin" });
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

/* ===================== MEDIA ===================== */

// Upload media dei post (foto/video) — agenzia loggata. Ritorna URL assoluti
// serviti da /uploads-ped. (Storage interim su volume Railway; → R2 in futuro.)
router.post(
  "/media",
  handleUpload(mediaUpload.array("files", 10)),
  async (req, res) => {
    try {
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
      order: b.order || 0,
      // note già presenti alla creazione (es. nota dell'agenzia su un post nuovo)
      clientNotes: Array.isArray(b.clientNotes) ? b.clientNotes : [],
      createdBy: req.dbUser._id,
    });
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

    const b = req.body || {};
    ["pageId", "caption", "category", "media", "status"].forEach((k) => {
      if (b[k] !== undefined) post[k] = b[k];
    });
    ["year", "month", "day", "order"].forEach((k) => {
      if (b[k] !== undefined) post[k] = Number(b[k]);
    });
    if (b.sponsored !== undefined) post.sponsored = !!b.sponsored;
    // Il client invia isDuplicate=false quando il contenuto è stato modificato.
    if (b.isDuplicate !== undefined) post.isDuplicate = !!b.isDuplicate;
    // Note del cliente (es. operatore che le marca "risolte").
    if (b.clientNotes !== undefined) post.clientNotes = b.clientNotes;
    post.updatedAt = new Date();
    await post.save();
    res.json(post);
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
    await post.deleteOne();
    res.json({ message: "Post eliminato" });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'eliminazione del post" });
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
