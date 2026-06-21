const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Client = require("../models/Client");
const Post = require("../models/Post");
const User = require("../models/User");
const PlanApproval = require("../models/PlanApproval");
const { sendMail } = require("../services/mailer");
const emailTemplates = require("../services/emailTemplates");
const {
  mediaUpload,
  handleUpload,
  toMedia,
  removeFiles,
  isOwnMediaUrl,
} = require("../services/mediaStore");

// Vista pubblica del piano editoriale (NESSUN login).
// Accesso "leggero": il link contiene il clientId (ObjectId, non indovinabile) e
// il cliente sblocca con una sua email (deve combaciare con quelle del cliente).
// Sola lettura + note sui post (create/modifica/elimina solo le PROPRIE).
// Le email all'agenzia NON partono per ogni nota: il cliente invia il feedback
// quando vuole con un'unica azione (/plan/notify) → 1 email digest.
// ⚠️ Dati SANITIZZATI: mai esporre isDuplicate / status / createdBy.

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// Rate limit minimale in-memory per IP.
const hits = new Map();
function rateLimit(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "?";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 40)
    return res
      .status(429)
      .json({ error: "Troppi tentativi, riprova tra un minuto." });
  recent.push(now);
  hits.set(ip, recent);
  next();
}

const norm = (e) => String(e || "").trim().toLowerCase();
const recipients = (c) =>
  [...(c.emails || []), c.email].map(norm).filter(Boolean);

const uniqEmails = (arr) => [
  ...new Set((arr || []).map((o) => String(o.email || "").trim()).filter(Boolean)),
];

// Destinatari dei FEEDBACK / approvazioni del cliente = gli OPERATORI del
// cliente (utenti, member o admin, con il cliente in assignedClients).
// L'admin di revisione NON riceve i feedback (solo le revisioni via /share-admin).
// Fallback difensivo per dati storici senza operatore (admin di revisione →
// tutti gli admin) così non si perde mai un feedback; con l'assegnazione
// obbligatoria dell'operatore non scatta.
async function feedbackRecipients(clientId, client) {
  let to = uniqEmails(
    await User.find({ assignedClients: clientId }).select("email").lean()
  );
  if (!to.length && client?.admins?.length)
    to = uniqEmails(
      await User.find({ _id: { $in: client.admins }, role: "admin" })
        .select("email")
        .lean()
    );
  if (!to.length)
    to = uniqEmails(await User.find({ role: "admin" }).select("email").lean());
  return to;
}

// Normalizza un doc PlanApproval in una vista con STORICO + ultima approvazione.
// Migra al volo i vecchi doc (senza `approvals`) usando createdAt come 1ª.
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

// Note sanitizzate: includono id (per modifica/elimina) e `mine` (se la nota è
// dell'email richiedente), MAI l'email altrui.
// ⚠️ Le note INTERNE (admin → operatore) vengono SCARTATE qui in modo
// incondizionato: non devono MAI raggiungere il cliente.
const sanitizeNotes = (notesArr, reqEmail) =>
  (notesArr || [])
    .filter((n) => !n.internal)
    .map((n) => ({
    id: String(n._id),
    text: n.text,
    author: n.author,
    resolved: !!n.resolved,
    fromAgency: !!n.fromAgency,
    needsReply: !!n.needsReply,
    media: (n.media || []).map((m) => ({
      kind: m.kind,
      url: m.url,
      thumbUrl: m.thumbUrl || "",
    })),
    createdAt: n.createdAt,
    // modificabile/eliminabile dal cliente solo se è una SUA nota (mai le agenzia)
    mine: !n.fromAgency && norm(n.authorEmail) === norm(reqEmail),
  }));

function sanitizePost(p, pagesById, reqEmail) {
  return {
    id: String(p._id),
    pageId: String(p.pageId),
    pageName: pagesById[String(p.pageId)] || "",
    year: p.year,
    month: p.month,
    day: p.day,
    caption: p.caption || "",
    category: p.category || "",
    media: (p.media || []).map((m) => ({
      kind: m.kind,
      url: m.url,
      thumbUrl: m.thumbUrl || "",
    })),
    sponsored: !!p.sponsored,
    notes: sanitizeNotes(p.clientNotes, reqEmail),
    // ⚠️ MAI: isDuplicate, status, createdBy, order
  };
}

// Media validi per una nota: solo {kind,url,thumbUrl} con URL servito da NOI
// (whitelist /uploads-ped → niente link esterni nelle note), max 6.
function cleanNoteMedia(media) {
  if (!Array.isArray(media)) return [];
  return media
    .filter((m) => m && isOwnMediaUrl(m.url))
    .slice(0, 6)
    .map((m) => ({
      kind: m.kind === "video" ? "video" : "image",
      url: String(m.url),
      thumbUrl: isOwnMediaUrl(m.thumbUrl) ? String(m.thumbUrl) : "",
    }));
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Carica il cliente se l'email è autorizzata. Autorizzati:
//  1) i destinatari del cliente (clienti veri);
//  2) gli utenti agenzia: admin → qualsiasi piano; operatore → solo i clienti
//     assegnati (così un admin può aprire il link di revisione di chiunque).
async function loadGated(clientId, email) {
  if (!mongoose.isValidObjectId(clientId)) return null;
  const client = await Client.findById(clientId).lean();
  if (!client) return null;
  const e = norm(email);
  if (!e) return null;
  if (recipients(client).includes(e)) return client;

  // Utenti agenzia: possono accedere con la propria email OPPURE username.
  const ident = new RegExp(`^${escapeRe(e)}$`, "i");
  const user = await User.findOne({
    $or: [{ email: ident }, { username: ident }],
  }).lean();
  if (
    user &&
    (user.role === "admin" ||
      (user.assignedClients || []).some(
        (id) => String(id) === String(clientId)
      ))
  )
    return client;

  return null;
}

// Trova il post del mese giusto (gated già verificato).
async function findPost(clientId, year, month, postId) {
  if (!mongoose.isValidObjectId(postId)) return null;
  return Post.findOne({
    _id: postId,
    clientId,
    year: Number(year),
    month: Number(month),
  });
}

// Sblocca + restituisce il piano del mese (sola lettura, sanitizzato).
router.post("/plan/access", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email } = req.body || {};
    const client = await loadGated(clientId, email);
    if (!client)
      return res
        .status(403)
        .json({ error: "Email non riconosciuta per questo piano." });

    const pagesById = {};
    (client.pages || []).forEach((pg) => {
      pagesById[String(pg._id)] = pg.name;
    });
    const posts = await Post.find({
      clientId,
      year: Number(year),
      month: Number(month),
    })
      .sort({ day: 1, order: 1 })
      .lean();
    const ap = await PlanApproval.findOne({
      clientId,
      year: Number(year),
      month: Number(month),
    }).lean();
    const view = approvalView(ap);
    // Il piano è stato MODIFICATO dopo l'ultima approvazione? (così si può
    // riapprovare). Confronto l'ultima approvazione con l'ultima modifica post.
    let changedSince = false;
    if (view) {
      const lastAt = new Date(view.at).getTime();
      const lastChange = posts.reduce((mx, p) => {
        const t = new Date(p.updatedAt || p.createdAt || 0).getTime();
        return t > mx ? t : mx;
      }, 0);
      changedSince = lastChange > lastAt;
    }

    res.json({
      client: { name: client.name, contactName: client.contactName || "" },
      pages: (client.pages || []).map((pg) => ({
        id: String(pg._id),
        name: pg.name,
        channels: pg.channels || [],
      })),
      year: Number(year),
      month: Number(month),
      posts: posts.map((p) => sanitizePost(p, pagesById, email)),
      approval: view ? { ...view, changedSince } : null,
    });
  } catch (e) {
    res.status(500).json({ error: "Errore nel caricamento del piano." });
  }
});

// Upload allegati per le note del cliente (foto/video). Gated: solo chi può
// accedere al piano. rateLimit PRIMA del multer (blocca abusi prima di scrivere
// su disco); se non autorizzato, i file caricati vengono cancellati.
router.post(
  "/plan/media",
  rateLimit,
  handleUpload(mediaUpload.array("files", 6)),
  async (req, res) => {
    try {
      const { clientId, email } = req.body || {};
      const client = await loadGated(clientId, email);
      if (!client) {
        await removeFiles(req.files);
        return res.status(403).json({ error: "Accesso negato." });
      }
      res.json({ media: toMedia(req, req.files) });
    } catch (e) {
      await removeFiles(req.files);
      res.status(500).json({ error: "Errore nel caricamento degli allegati." });
    }
  }
);

// Crea una nota (NESSUNA email qui — solo salvataggio). Può avere testo e/o
// allegati (foto/video già caricati via /plan/media).
router.post("/plan/note", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, postId, text, media } = req.body || {};
    const t = String(text || "").trim();
    const cleanMedia = cleanNoteMedia(media);
    if (!t && !cleanMedia.length)
      return res.status(400).json({ error: "La nota è vuota." });
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });
    const post = await findPost(clientId, year, month, postId);
    if (!post) return res.status(404).json({ error: "Post non trovato." });

    post.clientNotes.push({
      text: t,
      author: client.contactName || norm(email),
      authorEmail: norm(email),
      media: cleanMedia,
    });
    post.updatedAt = new Date();
    await post.save();
    res.status(201).json({ notes: sanitizeNotes(post.clientNotes, email) });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio della nota." });
  }
});

// Modifica una PROPRIA nota.
router.put("/plan/note", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, postId, noteId, text } = req.body || {};
    if (!text || !text.trim())
      return res.status(400).json({ error: "La nota è vuota." });
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });
    const post = await findPost(clientId, year, month, postId);
    if (!post) return res.status(404).json({ error: "Post non trovato." });
    const note = post.clientNotes.id(noteId);
    // Le note interne non esistono per il cliente (404, non le riconosciamo).
    if (!note || note.internal)
      return res.status(404).json({ error: "Nota non trovata." });
    if (norm(note.authorEmail) !== norm(email))
      return res
        .status(403)
        .json({ error: "Puoi modificare solo le tue note." });

    note.text = text.trim();
    post.updatedAt = new Date();
    await post.save();
    res.json({ notes: sanitizeNotes(post.clientNotes, email) });
  } catch (e) {
    res.status(500).json({ error: "Errore nella modifica della nota." });
  }
});

// Elimina una PROPRIA nota.
router.delete("/plan/note", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, postId, noteId } = req.body || {};
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });
    const post = await findPost(clientId, year, month, postId);
    if (!post) return res.status(404).json({ error: "Post non trovato." });
    const note = post.clientNotes.id(noteId);
    // Le note interne non esistono per il cliente (404, non le riconosciamo).
    if (!note || note.internal)
      return res.status(404).json({ error: "Nota non trovata." });
    if (norm(note.authorEmail) !== norm(email))
      return res
        .status(403)
        .json({ error: "Puoi eliminare solo le tue note." });

    note.deleteOne();
    post.updatedAt = new Date();
    await post.save();
    res.json({ notes: sanitizeNotes(post.clientNotes, email) });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'eliminazione della nota." });
  }
});

// Invia il feedback all'agenzia: UNA sola email digest (non una per nota).
router.post("/plan/notify", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, message } = req.body || {};
    const msg = String(message || "").trim().slice(0, 2000);
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });

    const posts = await Post.find({
      clientId,
      year: Number(year),
      month: Number(month),
    }).lean();
    // Conta SOLO le note visibili al cliente (mai le interne).
    const count = posts.reduce(
      (n, p) => n + (p.clientNotes || []).filter((x) => !x.internal).length,
      0
    );
    if (!count)
      return res.status(400).json({ error: "Non ci sono note da inviare." });

    // Destinatari: gli OPERATORI del cliente (non l'admin di revisione).
    const to = await feedbackRecipients(clientId, client);

    const base = (process.env.APP_URL || "https://basicadv.com").replace(/\/$/, "");
    const monthLabel = `${MONTHS_IT[Number(month) - 1] || ""} ${year}`.trim();
    if (to.length) {
      const mail = emailTemplates.clientNotesNotification({
        operatorName: "",
        clientName: client.name,
        monthLabel,
        count,
        message: msg,
        planUrl: `${base}/dashboard`,
      });
      await Promise.allSettled(
        to.map((dest) =>
          sendMail({
            to: dest,
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
          })
        )
      );
    }
    res.json({ ok: true, count, notified: to.length });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio del feedback." });
  }
});

// Il cliente APPROVA il piano del mese (con conferma lato UI). Registra
// l'approvazione (upsert) e avvisa l'agenzia con 1 email.
router.post("/plan/approve", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, message } = req.body || {};
    const msg = String(message || "").trim().slice(0, 2000);
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });

    const y = Number(year);
    const m = Number(month);
    // Registra una NUOVA approvazione nello storico (non sovrascrive le
    // precedenti): così si tiene traccia di 1ª, 2ª, 3ª… approvazione.
    const event = {
      at: new Date(),
      name: client.contactName || "",
      email: norm(email),
    };
    let ap = await PlanApproval.findOne({ clientId, year: y, month: m });
    if (ap) {
      // migra i vecchi doc: la 1ª approvazione era solo in createdAt
      if (!ap.approvals || !ap.approvals.length)
        ap.approvals = ap.createdAt
          ? [{ at: ap.createdAt, name: ap.name || "", email: ap.email || "" }]
          : [];
      ap.approvals.push(event);
      ap.name = event.name;
      ap.email = event.email;
      await ap.save();
    } else {
      ap = await PlanApproval.create({
        clientId,
        year: y,
        month: m,
        email: event.email,
        name: event.name,
        approvals: [event],
      });
    }

    // Avvisa gli OPERATORI del cliente (non l'admin di revisione): 1 email.
    const to = await feedbackRecipients(clientId, client);
    if (to.length) {
      const base = (process.env.APP_URL || "https://basicadv.com").replace(/\/$/, "");
      const monthLabel = `${MONTHS_IT[m - 1] || ""} ${year}`.trim();
      const mail = emailTemplates.planApprovedNotification({
        clientName: client.name,
        monthLabel,
        by: client.contactName || norm(email),
        message: msg,
        planUrl: `${base}/dashboard`,
      });
      await Promise.allSettled(
        to.map((dest) =>
          sendMail({
            to: dest,
            subject: mail.subject,
            text: mail.text,
            html: mail.html,
          })
        )
      );
    }

    res.json({ approval: approvalView(ap) });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'approvazione del piano." });
  }
});

module.exports = router;
