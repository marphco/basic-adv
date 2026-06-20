const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Client = require("../models/Client");
const Post = require("../models/Post");

// Vista pubblica del piano editoriale (NESSUN login).
// Accesso "leggero": il link contiene il clientId (ObjectId, non indovinabile) e
// il cliente sblocca inserendo una sua email (deve combaciare con quelle del
// cliente). Sola lettura + possibilità di lasciare note sui post.
// ⚠️ I dati restituiti sono SANITIZZATI: mai esporre isDuplicate / status /
// createdBy o altri campi interni dell'operatore.

// Rate limit minimale in-memory per IP sul gate (anti brute-force email).
const hits = new Map();
function rateLimit(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.ip ||
    "?";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= 30)
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

function sanitizePost(p, pagesById) {
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
    notes: (p.clientNotes || []).map((n) => ({
      text: n.text,
      author: n.author,
      resolved: !!n.resolved,
      createdAt: n.createdAt,
    })),
    // ⚠️ MAI esporre: isDuplicate, status, createdBy, order
  };
}

// Carica il cliente SOLO se l'email combacia (gate). null altrimenti.
async function loadGated(clientId, email) {
  if (!mongoose.isValidObjectId(clientId)) return null;
  const client = await Client.findById(clientId).lean();
  if (!client) return null;
  if (!recipients(client).includes(norm(email))) return null;
  return client;
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

    res.json({
      client: { name: client.name, contactName: client.contactName || "" },
      pages: (client.pages || []).map((pg) => ({
        id: String(pg._id),
        name: pg.name,
        channels: pg.channels || [],
      })),
      year: Number(year),
      month: Number(month),
      posts: posts.map((p) => sanitizePost(p, pagesById)),
    });
  } catch (e) {
    res.status(500).json({ error: "Errore nel caricamento del piano." });
  }
});

// Lascia una nota su un post (il cliente deve essere "sbloccato" via email).
router.post("/plan/note", rateLimit, async (req, res) => {
  try {
    const { clientId, year, month, email, postId, text } = req.body || {};
    if (!text || !text.trim())
      return res.status(400).json({ error: "La nota è vuota." });
    const client = await loadGated(clientId, email);
    if (!client) return res.status(403).json({ error: "Accesso negato." });
    if (!mongoose.isValidObjectId(postId))
      return res.status(400).json({ error: "Post non valido." });

    const post = await Post.findOne({
      _id: postId,
      clientId,
      year: Number(year),
      month: Number(month),
    });
    if (!post) return res.status(404).json({ error: "Post non trovato." });

    post.clientNotes.push({
      text: text.trim(),
      author: client.contactName || norm(email),
    });
    post.updatedAt = new Date();
    await post.save();

    res.status(201).json({
      notes: post.clientNotes.map((n) => ({
        text: n.text,
        author: n.author,
        resolved: !!n.resolved,
        createdAt: n.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'invio della nota." });
  }
});

module.exports = router;
