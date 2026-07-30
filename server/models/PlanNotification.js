const mongoose = require("mongoose");

// Esito dell'invio per un singolo destinatario: serve a dimostrare CHI ha
// ricevuto la notifica e chi no (invio non riuscito).
// `sentAt`/`ackAt` + `providerId`/`providerResponse` sono i riferimenti tecnici
// per incrociare l'invio con i log del server di posta: orario al secondo,
// destinatario e — se il relay lo restituisce — identificativo del messaggio.
const RecipientSchema = new mongoose.Schema(
  {
    email: { type: String, default: "" },
    ok: { type: Boolean, default: true },
    error: { type: String, default: "" },
    sentAt: { type: Date, default: null }, // consegnato al relay
    ackAt: { type: Date, default: null }, // risposta del relay
    providerId: { type: String, default: "" },
    providerResponse: { type: String, default: "" },
  },
  { _id: false }
);

// STORICO delle notifiche del piano editoriale (speculare a PlanApproval, che
// tiene lo storico delle approvazioni). Un documento = un invio: quando, da chi,
// a quali indirizzi e con quale esito. Serve come prova quando un cliente dice
// di non aver ricevuto il piano.
//
// `source`:
//  - "app"      → registrata al momento dell'invio (prova diretta);
//  - "inferred" → RICOSTRUITA a posteriori dalle prove esistenti (approvazioni
//                 e note del cliente su quel mese). In questo caso `at` è il
//                 momento della prova, non dell'invio: l'invio è avvenuto
//                 ENTRO quella data (vedi `atUpperBound`).
const PlanNotificationSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
    index: true,
  },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  // A chi era destinata: cliente, admin di revisione, operatori.
  kind: {
    type: String,
    enum: ["client", "admin", "operators"],
    default: "client",
  },
  at: { type: Date, default: Date.now },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sentByName: { type: String, default: "" },
  recipients: { type: [RecipientSchema], default: [] },
  message: { type: String, default: "" },
  planUrl: { type: String, default: "" },
  // "app"     → registrata al momento del click (fonte primaria)
  // "maillog" → recuperata dal log del server di posta: data e ora reali,
  //             ma senza sapere chi ha premuto invia
  // "inferred" → vecchie voci dedotte, non più prodotte (vengono ripulite)
  source: { type: String, enum: ["app", "maillog", "inferred"], default: "app" },
  // `at` è un limite superiore (invio avvenuto "entro" quella data): vero solo
  // per le notifiche ricostruite.
  atUpperBound: { type: Boolean, default: false },
  // Da cosa è stata ricostruita (testo leggibile mostrato in dashboard).
  evidence: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// Query principale: storico di un cliente per un mese, dal più recente.
PlanNotificationSchema.index({ clientId: 1, year: 1, month: 1, at: -1 });

module.exports = mongoose.model("PlanNotification", PlanNotificationSchema);
