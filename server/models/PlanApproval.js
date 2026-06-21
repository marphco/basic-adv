const mongoose = require("mongoose");

// Un evento di approvazione (storico): quando e da chi.
const ApprovalEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
  },
  { _id: false }
);

// Approvazione del piano editoriale (cliente) per un dato mese.
// Una per (clientId, year, month). `approvals` tiene lo STORICO di tutte le
// approvazioni (1ª, 2ª, 3ª…): un piano può essere riapprovato dopo che sono
// state applicate delle modifiche. I campi top-level email/name restano come
// "ultima approvazione" per compatibilità; createdAt = prima approvazione.
const PlanApprovalSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  email: { type: String, default: "" }, // ultima: chi ha approvato
  name: { type: String, default: "" }, // ultima: referente/nome
  approvals: { type: [ApprovalEventSchema], default: [] }, // storico completo
  createdAt: { type: Date, default: Date.now }, // prima approvazione
});
PlanApprovalSchema.index({ clientId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("PlanApproval", PlanApprovalSchema);
