const mongoose = require("mongoose");

// Utenti della dashboard. Marco = admin (vede tutto); i membri vedono solo i
// clienti in assignedClients.
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "member"], default: "member" },
  name: { type: String, default: "" },
  // Email per le notifiche (es. avviso quando un cliente lascia delle note).
  email: { type: String, default: "" },
  // Mansioni dell'operatore (es. "Social Media Manager", "Graphic Designer").
  // Più ruoli possibili; valori liberi (lista suggerita lato UI + "Altro").
  jobRoles: { type: [String], default: [] },
  assignedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Client" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
