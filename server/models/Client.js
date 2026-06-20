const mongoose = require("mongoose");

// Una "pagina" social del cliente (un cliente può averne più d'una).
// _id automatico = pageId usato dai post.
const PageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Una pagina può pubblicare su più canali insieme (es. FB + IG).
  channels: {
    type: [
      {
        type: String,
        enum: ["instagram", "facebook", "tiktok", "linkedin", "other"],
      },
    ],
    default: ["instagram"],
  },
});

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Referente + email del cliente: servono per inviargli il link di revisione
  // e le notifiche quando le sue note vengono recepite.
  contactName: { type: String, default: "" },
  // `emails` = tutti i destinatari (clienti con più soci → più indirizzi).
  // `email` resta come "primario" per compatibilità: lo teniamo allineato a emails[0].
  email: { type: String, default: "" },
  emails: { type: [String], default: [] },
  pages: { type: [PageSchema], default: [] },
  // Admin responsabili del cliente: ricevono il piano "per revisione" (vista
  // dashboard con modifiche dirette + note interne). Almeno uno è richiesto
  // lato UI. Sono utenti con ruolo admin.
  admins: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Client", ClientSchema);
