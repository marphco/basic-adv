const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifica il JWT e popola req.user con il payload (userId, username, role).
// Stesso comportamento dell'auth già usata dalle rotte esistenti.
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Accesso negato" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token non valido" });
    req.user = user;
    next();
  });
}

// Carica l'utente dal DB (ruolo + clienti assegnati sempre aggiornati).
// I token "vecchi" (senza userId) vengono rifiutati: basta rifare il login.
async function loadUser(req, res, next) {
  try {
    if (!req.user?.userId) {
      return res
        .status(401)
        .json({ error: "Sessione non valida, effettua di nuovo il login" });
    }
    const dbUser = await User.findById(req.user.userId).lean();
    if (!dbUser) return res.status(401).json({ error: "Utente non trovato" });
    req.dbUser = dbUser;
    next();
  } catch (e) {
    res.status(500).json({ error: "Errore di autenticazione" });
  }
}

function requireAdmin(req, res, next) {
  if (req.dbUser?.role !== "admin") {
    return res.status(403).json({ error: "Riservato all'amministratore" });
  }
  next();
}

// Variante leggera: usa solo il ruolo presente nel token (req.user), senza
// caricare l'utente dal DB. Per le rotte legacy che hanno solo authenticateToken
// (gestione richieste/allegati) e devono restare riservate all'admin.
function requireAdminToken(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Riservato all'amministratore" });
  }
  next();
}

// L'admin accede a tutti i clienti; il membro solo a quelli assegnati.
function canAccessClient(dbUser, clientId) {
  if (!dbUser) return false;
  if (dbUser.role === "admin") return true;
  return (dbUser.assignedClients || []).some(
    (id) => String(id) === String(clientId)
  );
}

module.exports = {
  authenticateToken,
  loadUser,
  requireAdmin,
  requireAdminToken,
  canAccessClient,
};
