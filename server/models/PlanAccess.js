const mongoose = require("mongoose");

// APERTURE del piano dalla vista pubblica: la prova più forte che il piano è
// arrivato a destinazione (il link si sblocca solo con un'email del cliente).
// Un documento per (cliente, mese, email): prima apertura, ultima apertura e
// numero di aperture — così lo storico resta compatto anche con molti accessi.
//
// `source`: "app" = apertura registrata davvero; "inferred" = ricostruita a
// posteriori (es. da un'approvazione o da una nota lasciata dal cliente, che
// presuppongono l'apertura del piano).
const PlanAccessSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
    index: true,
  },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  email: { type: String, required: true }, // sempre normalizzata (lowercase)
  // true = chi ha aperto è un utente agenzia (admin/operatore), non il cliente.
  isAgency: { type: Boolean, default: false },
  firstAt: { type: Date, default: Date.now },
  lastAt: { type: Date, default: Date.now },
  count: { type: Number, default: 1 },
  lastIp: { type: String, default: "" },
  lastUserAgent: { type: String, default: "" },
  source: { type: String, enum: ["app", "inferred"], default: "app" },
  evidence: { type: String, default: "" },
});

PlanAccessSchema.index(
  { clientId: 1, year: 1, month: 1, email: 1 },
  { unique: true }
);

module.exports = mongoose.model("PlanAccess", PlanAccessSchema);
