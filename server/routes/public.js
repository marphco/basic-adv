const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Client = require("../models/Client");
const Post = require("../models/Post");
const User = require("../models/User");
const PlanApproval = require("../models/PlanApproval");
const { sendMail } = require("../services/mailer");
const emailTemplates = require("../services/emailTemplates");

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
      approval: ap ? { by: ap.name || ap.email, at: ap.createdAt } : null,
    });
  } catch (e) {
    res.status(500).json({ error: "Errore nel caricamento del piano." });
  }
});

// Crea una nota (NESSUNA email qui — solo salvataggio).
router.post("/plan/note", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, postId, text } = req.body || {};
    if (!text || !text.trim())
      return res.status(400).json({ error: "La nota è vuota." });
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });
    const post = await findPost(clientId, year, month, postId);
    if (!post) return res.status(404).json({ error: "Post non trovato." });

    post.clientNotes.push({
      text: text.trim(),
      author: client.contactName || norm(email),
      authorEmail: norm(email),
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

    // Destinatari: admin + operatori assegnati a questo cliente.
    const ops = await User.find({
      $or: [
        { role: "admin" },
        { role: "member", assignedClients: clientId },
      ],
    })
      .select("email")
      .lean();
    const to = [
      ...new Set(ops.map((o) => String(o.email || "").trim()).filter(Boolean)),
    ];

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
    const ap = await PlanApproval.findOneAndUpdate(
      { clientId, year: y, month: m },
      {
        clientId,
        year: y,
        month: m,
        email: norm(email),
        name: client.contactName || "",
        createdAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // Avvisa l'agenzia (admin + operatori assegnati): 1 email.
    const ops = await User.find({
      $or: [{ role: "admin" }, { role: "member", assignedClients: clientId }],
    })
      .select("email")
      .lean();
    const to = [
      ...new Set(ops.map((o) => String(o.email || "").trim()).filter(Boolean)),
    ];
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

    res.json({ approval: { by: ap.name || ap.email, at: ap.createdAt } });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'approvazione del piano." });
  }
});

module.exports = router;
