const mongoose = require("mongoose");

// Una fotografia di un post, com'era a un certo momento.
//
// Sta in una raccolta SUA e non dentro il post per un motivo di peso: il
// calendario carica tutti i post di un mese in un colpo solo (63 documenti
// per un cliente attivo). Se la storia vivesse dentro al post, ogni apertura
// del calendario si trascinerebbe dietro tutte le versioni di tutti i post —
// dieci volte i dati per mostrare le stesse card.
//
// Qui invece la storia si carica solo quando qualcuno la apre davvero.
//
// Le foto NON vengono duplicate: la fotografia contiene gli indirizzi dei
// file, non i file. Una versione pesa qualche kilobyte.
const SnapshotSchema = new mongoose.Schema(
  {
    pageId: mongoose.Schema.Types.ObjectId,
    year: Number,
    month: Number,
    day: Number,
    caption: String,
    category: String,
    media: { type: Array, default: [] },
    sponsored: Boolean,
    status: String,
    publishStatus: String,
    clientNotes: { type: Array, default: [] },
  },
  { _id: false }
);

const PostVersionSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  // Serve a ritrovare le versioni di un cliente senza passare dai post: per
  // l'inventario dei file e per quando un post viene eliminato.
  clientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

  at: { type: Date, default: Date.now },
  byId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  byName: { type: String, default: "" },

  // Come è nata questa versione: il primo stato conosciuto, un salvataggio,
  // oppure il ripristino di una versione precedente.
  origine: {
    type: String,
    enum: ["iniziale", "salvataggio", "ripristino"],
    default: "salvataggio",
  },

  snapshot: { type: SnapshotSchema, required: true },
  // Impronta del contenuto: serve a non registrare due volte lo stesso stato
  // (capita a ogni "salvo per sicurezza" senza aver cambiato niente).
  hash: { type: String, required: true },
});

// La domanda che si fa sempre: "le versioni di questo post, dalla più
// recente". Senza indice, con qualche migliaio di versioni, diventa lenta.
PostVersionSchema.index({ postId: 1, at: -1 });

module.exports =
  mongoose.models.PostVersion || mongoose.model("PostVersion", PostVersionSchema);
