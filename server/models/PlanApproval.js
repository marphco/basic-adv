const mongoose = require("mongoose");

// Approvazione del piano editoriale (cliente) per un dato mese.
// Una per (clientId, year, month): l'ultima approvazione "vince" (upsert).
const PlanApprovalSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  email: { type: String, default: "" }, // chi ha approvato
  name: { type: String, default: "" }, // referente/nome
  createdAt: { type: Date, default: Date.now },
});
PlanApprovalSchema.index({ clientId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("PlanApproval", PlanApprovalSchema);
