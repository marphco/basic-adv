const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  authenticateToken,
  loadUser,
  requireAdmin,
} = require("../middleware/auth");
const { sendMail } = require("../services/mailer");
const emailTemplates = require("../services/emailTemplates");

// Gestione utenti: riservata all'admin.
router.use(authenticateToken, loadUser, requireAdmin);

const safe = (userDoc) => {
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  delete obj.passwordHash;
  return obj;
};

// Lista utenti (mai la password)
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-passwordHash")
      .sort({ createdAt: 1 })
      .lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Errore nel recupero degli utenti" });
  }
});

// Crea utente (operatore = "member", oppure "admin")
router.post("/", async (req, res) => {
  try {
    const { username, password, name, email, role, assignedClients } =
      req.body || {};
    if (!username || !username.trim() || !password)
      return res.status(400).json({ error: "Username e password obbligatori" });
    if (!["admin", "member"].includes(role))
      return res.status(400).json({ error: "Ruolo non valido" });

    // controllo duplicati insensibile a maiuscole/spazi
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exists = await User.findOne({
      username: new RegExp(`^${escapeRe(username.trim())}$`, "i"),
    });
    if (exists)
      return res.status(409).json({ error: "Username già esistente" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      passwordHash,
      name: name || "",
      email: email || "",
      role,
      // i clienti assegnati hanno senso solo per gli operatori
      assignedClients: role === "member" ? assignedClients || [] : [],
    });

    // Email di benvenuto (senza password) — fire-and-forget: se fallisce,
    // l'utente resta comunque creato.
    if (user.email) {
      const mail = emailTemplates.accountWelcome({
        name: user.name,
        username: user.username,
        role: user.role,
        loginUrl:
          (process.env.APP_URL || "https://basicadv.com").replace(/\/$/, "") +
          "/login",
      });
      sendMail({
        to: user.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }).catch((e) => console.error("Email benvenuto fallita:", e?.message || e));
    }

    res.status(201).json(safe(user));
  } catch (e) {
    res.status(500).json({ error: "Errore nella creazione dell'utente" });
  }
});

// Aggiorna utente (nome, ruolo, clienti assegnati, password opzionale)
router.put("/:id", async (req, res) => {
  try {
    const { name, email, role, assignedClients, password } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) {
      if (!["admin", "member"].includes(role))
        return res.status(400).json({ error: "Ruolo non valido" });
      user.role = role;
    }
    if (assignedClients !== undefined)
      user.assignedClients = user.role === "member" ? assignedClients : [];
    if (password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();
    res.json(safe(user));
  } catch (e) {
    res.status(500).json({ error: "Errore nell'aggiornamento dell'utente" });
  }
});

// Elimina utente (non sé stesso, e deve restare almeno un admin)
router.delete("/:id", async (req, res) => {
  try {
    if (String(req.dbUser._id) === String(req.params.id))
      return res.status(400).json({ error: "Non puoi eliminare te stesso" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1)
        return res.status(400).json({ error: "Deve restare almeno un admin" });
    }
    await user.deleteOne();
    res.json({ message: "Utente eliminato" });
  } catch (e) {
    res.status(500).json({ error: "Errore nell'eliminazione dell'utente" });
  }
});

module.exports = router;
