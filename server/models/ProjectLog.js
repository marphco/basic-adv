const mongoose = require('mongoose');

// Schema per il modello ProjectLog
const ProjectLogSchema = new mongoose.Schema({
  // ID univoco della sessione
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },

  // Dati del form compilato dall'utente
  formData: {
    // Nome del brand (opzionale)
    brandName: {
      type: String,
      required: false,
      default: "",
    },
    // Tipo di progetto (obbligatorio)
    projectType: {
      type: String,
      required: true,
    },
    // Settore aziendale (obbligatorio)
    businessField: {
      type: String,
      required: true,
    },
    // Altri dettagli sul settore (opzionale)
    otherBusinessField: {
      type: String,
      default: "",
    },
    // Obiettivi del progetto (opzionale)
    projectObjectives: {
      type: String,
      default: "",
    },
    // Informazioni di contatto
    contactInfo: {
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        default: "",
      },
    },
    // Path del logo attuale (opzionale)
    currentLogo: {
      type: String,
    },
    // Budget del progetto (obbligatorio, ma con default vuoto)
    budget: {
      type: String,
      required: true,
      default: "",
    },
  },

  // Array di domande generate per il progetto
  questions: {
    type: Array,
    required: true,
  },

  // Map per le risposte dell'utente (chiave: domanda, valore: risposta)
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed, // Permette tipi misti per le risposte
    default: {},
    required: true,
  },

  // Piano d'azione generato per il progetto (opzionale)
  projectPlan: {
    type: String,
  },

  // Contatore totale delle domande generate
  questionCount: {
    type: Number,
    default: 0,
  },

  // Data di creazione del log
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Coda dei servizi selezionati dall'utente
  servicesQueue: {
    type: [String],
    required: true,
  },

  // Indice del servizio corrente nella coda
  currentServiceIndex: {
    type: Number,
    default: 0,
  },

  // Map per il conteggio delle domande per ogni servizio
  serviceQuestionCount: {
    type: Map,
    of: Number,
    default: {},
  },

  // Numero massimo di domande per servizio
  maxQuestionsPerService: {
    type: Number,
    required: true,
  },

  // Numero totale di domande previste per il progetto
  totalQuestions: {
    type: Number,
    required: true,
  },

  // Map per le domande già poste per ogni servizio
  askedQuestions: {
    type: Map,
    of: [String], // Array di stringhe per ogni servizio
    default: {},
  },

  // Stato visualizzazione delle richieste ricevute
  feedback: {
    type: Boolean,
    default: false,
  },
  ratings: {
  // mappa: chiave = domanda (sanitizzata), valore = { q: -1|0|1, o: -1|0|1 }
  type: Map,
  of: new mongoose.Schema(
    { q: { type: Number, default: null }, o: { type: Number, default: null } },
    { _id: false }
  ),
  default: new Map(),
},
});

// Esporta il modello Mongoose
module.exports = mongoose.model('ProjectLog', ProjectLogSchema);