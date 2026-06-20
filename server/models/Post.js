const mongoose = require("mongoose");

// Un elemento media (foto/video). Riusato sia dai post sia dalle note cliente.
// L'array ordinato copre tutti i casi: foto singola, carosello (anche misto), video.
const MediaSchema = new mongoose.Schema({
  kind: { type: String, enum: ["image", "video"], default: "image" },
  url: { type: String, required: true }, // filename/URL del file
  thumbUrl: { type: String, default: "" }, // poster/anteprima (utile per i video)
});

// Nota lasciata dal cliente sulla vista pubblica (punto 5). Può includere
// allegati (foto/video) e viene marcata `resolved` dall'operatore quando il
// post è stato sistemato come richiesto.
const NoteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: String, default: "Cliente" },
  // email di chi ha scritto la nota: serve a far modificare/eliminare al
  // cliente SOLO le proprie note dalla vista pubblica.
  authorEmail: { type: String, default: "" },
  // true = nota lasciata dall'AGENZIA per il cliente (verso opposto).
  fromAgency: { type: Boolean, default: false },
  // nota dell'agenzia che richiede una risposta/azione del cliente (vs semplice
  // spiegazione). Le spiegazioni non hanno stato "da risolvere".
  needsReply: { type: Boolean, default: false },
  media: { type: [MediaSchema], default: [] },
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Un singolo post programmato in calendario.
// La data è tenuta come year/month(1-12)/day per query mensili semplici e
// senza problemi di fuso orario.
const PostSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
    index: true,
  },
  pageId: { type: mongoose.Schema.Types.ObjectId, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  day: { type: Number, required: true },
  caption: { type: String, default: "" },
  // Rubrica/pilastro di contenuto (es. "WE ARE GREEN", "BRAND IDENTITY").
  category: { type: String, default: "" },
  // Media del post (ordine = ordine del carosello). Lo storage reale dei file
  // (Railway → bucket in futuro) viene agganciato nella fase dedicata.
  media: { type: [MediaSchema], default: [] },
  sponsored: { type: Boolean, default: false },
  // Post copiato da un altro mese e non ancora rivisto (flag molto visibile).
  // ⚠️ SOLO USO INTERNO OPERATORE: non esporre MAI questo campo nella vista
  // pubblica/cliente — il serializzatore pubblico deve ometterlo a monte.
  isDuplicate: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["draft", "review", "approved"],
    default: "draft",
  },
  order: { type: Number, default: 0 },
  clientNotes: { type: [NoteSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Query principale: post di un cliente in un dato mese.
PostSchema.index({ clientId: 1, year: 1, month: 1 });

module.exports = mongoose.model("Post", PostSchema);
