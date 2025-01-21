const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const ProjectLog = require("./models/ProjectLog");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

dotenv.config(); // Carica le variabili d'ambiente dal file .env

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Per sviluppo locale
      "https://basic-adv.vercel.app", // Il frontend in produzione
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Configura multer per gestire l'upload dei file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Assicurati che la cartella 'uploads' esista
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Aggiungi limitazioni e filtraggio dei file (opzionale)
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite di 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo di file non supportato"), false);
    }
  },
});

const PORT = process.env.PORT || 5001; // Usa la variabile d'ambiente se disponibile

// Controlla se il server è già in ascolto
if (!module.parent) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Porta ${PORT} già in uso. Il server non verrà riavviato.`);
    } else {
      console.error("❌ Errore sconosciuto:", err);
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const dbUri = process.env.MONGO_URI;

// Connessione a MongoDB
mongoose.connect(dbUri)
  .then(() => console.log('Connesso al database MongoDB'))
  .catch(err => console.error('Errore di connessione al database:', err));

// Funzione di sanitizzazione per le chiavi
const sanitizeKey = (key) => key.replace(/\./g, "_");

// Funzione per generare una domanda per un servizio specifico
const generateQuestionForService = async (
  service,
  formData,
  answers,
  askedQuestions
) => {
  // Crea una stringa con le domande già poste
  const askedQuestionsList = askedQuestions.join("\n");

  // Includi la descrizione dell'immagine se disponibile
  let imageInfo = "";
  if (formData.currentLogoDescription) {
    imageInfo = `\nIl cliente ha fornito una descrizione del logo attuale: ${formData.currentLogoDescription}`;
  }

  const promptBase = `Sei un assistente che aiuta a raccogliere dettagli per un progetto per il brand "${
    formData.brandName
  }". Le seguenti informazioni sono già state raccolte:

- Nome del Brand: ${formData.brandName}
- Tipo di Progetto: ${formData.projectType}
- Settore Aziendale: ${formData.businessField}
${imageInfo}

Servizio Attuale: ${service}

Non fare nuovamente domande su queste informazioni.

Risposte precedenti: ${JSON.stringify(answers || {})}

Domande già poste per questo servizio:
${askedQuestionsList}

Ora, fai una nuova domanda pertinente al servizio selezionato (${service}), assicurandoti che non sia simile a nessuna delle domande già poste.

Per ogni domanda:

- Se stai per chiedere "Hai preferenze di colori per il tuo logo?" o una domanda sulle preferenze di colore, **non** generare opzioni e imposta "requiresInput": true.
- Se la domanda riguarda la **selezione del font**, includi il campo "type": "font_selection" nella tua risposta JSON e fornisci una lista di almeno 6 categorie di font comuni (es. "Serif", "Sans-serif", "Script", "Monospaced", "Manoscritto", "Decorativo"). Imposta "requiresInput": false.
- Altrimenti, genera **esattamente 4 opzioni** pertinenti e imposta "requiresInput": false.

**Importante:** Fornisci **SOLO** il seguente formato JSON valido, senza testo aggiuntivo o spiegazioni:

{
  "question": "La tua domanda qui",
  "options": ["Opzione1", "Opzione2", "Opzione3", "Opzione4"],
  "type": "tipo_di_domanda", // Questo campo è opzionale e presente solo per domande speciali come la selezione dei font
  "requiresInput": true o false
}

- Se "requiresInput" è true, significa che la domanda richiede una risposta aperta e **non devi fornire opzioni**.
- Se "requiresInput" è false, fornisci le opzioni come specificato.

Assicurati che il JSON sia valido e non includa altro testo o caratteri.

Utilizza un linguaggio semplice e chiaro, adatto a utenti senza conoscenze tecniche. Mantieni le domande e le opzioni concise e facili da comprendere.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: promptBase,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponseText = response.data.choices[0].message.content;

    // Parse the response as JSON
    let aiQuestion;

    try {
      aiQuestion = JSON.parse(aiResponseText);
    } catch (error) {
      // Try to extract the JSON from the response
      const jsonStartIndex = aiResponseText.indexOf("{");
      const jsonEndIndex = aiResponseText.lastIndexOf("}") + 1;
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        const jsonString = aiResponseText.substring(
          jsonStartIndex,
          jsonEndIndex
        );
        try {
          aiQuestion = JSON.parse(jsonString);
        } catch (error) {
          console.error("Error parsing extracted JSON:", error);
          throw new Error("Errore nel parsing della risposta AI");
        }
      } else {
        console.error("No JSON found in AI response");
        throw new Error("Errore nel parsing della risposta AI");
      }
    }

    // Rimuovi il punto finale dalla domanda, se presente
    if (aiQuestion.question.endsWith(".")) {
      aiQuestion.question = aiQuestion.question.slice(0, -1);
    }

    // Verifica che 'question' sia presente
    if (!aiQuestion.question) {
      console.error("La risposta dell'AI non contiene una domanda valida.");
      throw new Error("La risposta dell'AI non contiene una domanda valida.");
    }

    // Imposta 'requiresInput' su false se non è presente
    if (typeof aiQuestion.requiresInput === "undefined") {
      aiQuestion.requiresInput = false;
    }

    // Se 'options' non è un array, impostalo su array vuoto
    if (!Array.isArray(aiQuestion.options)) {
      aiQuestion.options = [];
    }

    // Verifica che la domanda non sia duplicata
    if (askedQuestions.includes(aiQuestion.question)) {
      // Genera una nuova domanda se è già stata posta
      return await generateQuestionForService(
        service,
        formData,
        answers,
        askedQuestions
      );
    }

    return aiQuestion;
  } catch (error) {
    console.error("Error generating AI question:", error);
    throw new Error("Errore nella generazione della domanda AI");
  }
};

// Endpoint per generare la prima domanda
app.post("/api/generate", upload.single("currentLogo"), async (req, res) => {
  console.log("Received /api/generate request:", req.body); // Log per debugging

  // Estrai i campi dal corpo della richiesta
  const servicesSelected = JSON.parse(req.body.servicesSelected);
  const formData = { ...req.body };
  const sessionId = req.body.sessionId;

  // Rimuovi 'servicesSelected' e 'sessionId' da formData per evitare duplicati
  delete formData.servicesSelected;
  delete formData.sessionId;

  // Se 'contactInfo' è presente, parsalo
  if (formData.contactInfo) {
    formData.contactInfo = JSON.parse(formData.contactInfo);
  } else {
    formData.contactInfo = {}; // Inizializza come oggetto vuoto se non esiste
  }

// Se un file è stato caricato, aggiungi il percorso del file a 'formData'
if (req.file) {
    formData.currentLogo = req.file.path; // Salva il percorso del file
    console.log("Percorso del logo caricato:", formData.currentLogo);
  }

  try {
    // Determina il limite di domande per servizio
    const minQuestionsPerService = 8;
    let maxQuestionsPerService;
    let totalQuestions;

    if (servicesSelected.length === 1) {
      maxQuestionsPerService = 10;
      totalQuestions = 10;
    } else {
      maxQuestionsPerService = minQuestionsPerService;
      totalQuestions = minQuestionsPerService * servicesSelected.length;
    }

    // Inizializza la sessione
    const newLogEntry = new ProjectLog({
      sessionId,
      formData,
      questions: [],
      answers: {},
      questionCount: 0,
      servicesQueue: servicesSelected,
      currentServiceIndex: 0,
      serviceQuestionCount: {},
      maxQuestionsPerService,
      totalQuestions,
      askedQuestions: {},
    });

    // Inizializza il conteggio delle domande per servizio e l'elenco delle domande già poste
    servicesSelected.forEach((service) => {
      newLogEntry.serviceQuestionCount.set(service, 0);
      newLogEntry.askedQuestions.set(service, []);
    });

    // Genera la prima domanda per il primo servizio
    const firstService = servicesSelected[0];
    const askedQuestionsForService =
      newLogEntry.askedQuestions.get(firstService) || [];
    const aiQuestion = await generateQuestionForService(
      firstService,
      formData,
      newLogEntry.answers,
      askedQuestionsForService
    );

    // Aggiungi la domanda al log
    newLogEntry.questions.push(aiQuestion);
    newLogEntry.questionCount += 1; // Incremento solo per la domanda posta
    newLogEntry.serviceQuestionCount.set(
      firstService,
      (newLogEntry.serviceQuestionCount.get(firstService) || 0) + 1
    );

    // Aggiungi la domanda all'elenco delle domande già poste (con il testo originale)
    newLogEntry.askedQuestions.get(firstService).push(aiQuestion.question); // Conserva la domanda originale

    // Salva nel database
    await newLogEntry.save();

    console.log(
      `Session ${sessionId} - Generated first question for service: ${firstService}`
    );
    console.log(
      `Service Question Count [${firstService}]: ${newLogEntry.serviceQuestionCount.get(
        firstService
      )}`
    );
    console.log(`Total Question Count: ${newLogEntry.questionCount}`);

    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Error generating AI question:", error);
    res
      .status(500)
      .json({ error: "Errore nella generazione delle domande AI" });
  }
});

// Endpoint per recuperare la prossima domanda
app.post("/api/nextQuestion", async (req, res) => {
  const { currentAnswer, sessionId } = req.body;

  // Validazione di base
  if (!currentAnswer || !sessionId) {
    return res.status(400).json({ error: "Campi richiesti mancanti" });
  }

  try {
    // Trova il log entry corrispondente al sessionId
    const logEntry = await ProjectLog.findOne({ sessionId });

    if (!logEntry) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }

    // Salva la risposta usando .set() per il Map (sanitized)
    const questionText = Object.keys(currentAnswer)[0];
    const sanitizedQuestionText = sanitizeKey(questionText);
    const answerData = currentAnswer[questionText];
    logEntry.answers.set(sanitizedQuestionText, answerData);

    // Ottieni il servizio corrente
    const currentService = logEntry.servicesQueue[logEntry.currentServiceIndex];

    // Aggiungi la domanda all'elenco delle domande già poste
    if (!logEntry.askedQuestions.has(currentService)) {
      logEntry.askedQuestions.set(currentService, []);
    }
    logEntry.askedQuestions.get(currentService).push(questionText); // Conserva la domanda originale

    // Log per debugging
    console.log(
      `Session ${sessionId} - Received answer for service: ${currentService}`
    );
    console.log(
      `Service Question Count [${currentService}]: ${logEntry.serviceQuestionCount.get(
        currentService
      )}`
    );
    console.log(`Total Question Count: ${logEntry.questionCount}`);
    console.log(`Answers: ${JSON.stringify(logEntry.answers)}`); // Log delle risposte

    // Controlla se abbiamo raggiunto il minimo di domande per questo servizio
    if (logEntry.serviceQuestionCount.get(currentService) >= 8) {
      if (logEntry.servicesQueue.length === 1) {
        if (logEntry.serviceQuestionCount.get(currentService) >= 10) {
          // Raggiunto il massimo di 10 domande per 1 servizio, termina il questionario
          await logEntry.save();
          console.log(
            `Session ${sessionId} - Reached max questions for service: ${currentService}. Ending questionnaire.`
          );
          return res.json({ question: null });
        }
      } else {
        // Per più servizi, passa al servizio successivo
        logEntry.currentServiceIndex += 1;
        console.log(
          `Session ${sessionId} - Switching to next service. Current Service Index: ${logEntry.currentServiceIndex}`
        );

        // Se non ci sono più servizi, termina il questionario
        if (logEntry.currentServiceIndex >= logEntry.servicesQueue.length) {
          await logEntry.save();
          console.log(
            `Session ${sessionId} - All services completed. Ending questionnaire.`
          );
          return res.json({ question: null });
        }
      }
    }

    // Controlla se ha raggiunto il massimo di domande totali
    if (logEntry.questionCount >= logEntry.totalQuestions) {
      await logEntry.save();
      console.log(
        `Session ${sessionId} - Reached total question limit. Ending questionnaire.`
      );
      return res.json({ question: null }); // Indica al frontend che non ci sono più domande
    }

    // Determina il servizio corrente per la prossima domanda
    const nextService = logEntry.servicesQueue[logEntry.currentServiceIndex];
    const askedQuestionsForNextService =
      logEntry.askedQuestions.get(nextService) || [];

    // Genera la prossima domanda per il servizio corrente
    const aiQuestion = await generateQuestionForService(
      nextService,
      logEntry.formData,
      logEntry.answers,
      askedQuestionsForNextService
    );

    // Aggiungi la nuova domanda al log
    logEntry.questions.push(aiQuestion);
    logEntry.questionCount += 1; // Incremento solo qui
    logEntry.serviceQuestionCount.set(
      nextService,
      (logEntry.serviceQuestionCount.get(nextService) || 0) + 1
    );

    // Aggiungi la domanda all'elenco delle domande già poste
    logEntry.askedQuestions.get(nextService).push(aiQuestion.question); // Conserva la domanda originale

    // Salva nel database
    await logEntry.save();

    console.log(
      `Session ${sessionId} - Generated new question for service: ${nextService}`
    );
    console.log(
      `Service Question Count [${nextService}]: ${logEntry.serviceQuestionCount.get(
        nextService
      )}`
    );
    console.log(`Total Question Count: ${logEntry.questionCount}`);

    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Error generating next question:", error);
    res.status(500).json({ error: "Errore nella generazione della domanda" });
  }
});

// Endpoint per inviare e salvare il log finale, generare il project plan
app.post("/api/submitLog", async (req, res) => {
  const { contactInfo, sessionId } = req.body;

  // Validazione di base
  if (!contactInfo || !sessionId) {
    return res.status(400).json({ error: "Campi richiesti mancanti" });
  }

  try {
    // Trova il log entry corrispondente al sessionId
    const logEntry = await ProjectLog.findOne({ sessionId });

    if (!logEntry) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }

    // Assicurati che 'logEntry.formData.contactInfo' sia un oggetto
    if (!logEntry.formData.contactInfo) {
      logEntry.formData.contactInfo = {};
    }

    // **Aggiorna le informazioni di contatto all'interno di formData**
    logEntry.formData.contactInfo = {
      name: contactInfo.name || logEntry.formData.contactInfo.name || "",
      email: contactInfo.email || logEntry.formData.contactInfo.email || "",
      phone: contactInfo.phone || logEntry.formData.contactInfo.phone || "",
    };

    await logEntry.save();

    // Rispondi immediatamente al client
    res.status(200).json({ message: "Log inviato e salvato" });

    // Genera il project plan in background
    // Genera il project plan in background
    try {
      // Verifica che tutte le risposte essenziali siano presenti
      if (
        !logEntry.formData.contactInfo.name ||
        !logEntry.formData.contactInfo.email
      ) {
        throw new Error(
          "Nome ed email sono obbligatori per generare il project plan."
        );
      }

      // Struttura le risposte in modo leggibile
      const formattedAnswers = Array.from(logEntry.answers.entries())
        .map(([question, response]) => {
          let answerText = "";
          if (response.input && response.options) {
            answerText = `Opzioni selezionate: ${response.options.join(
              ", "
            )}\nRisposta libera: ${response.input}`;
          } else if (response.input) {
            answerText = `Risposta libera: ${response.input}`;
          } else if (response.options) {
            answerText = `Opzioni selezionate: ${response.options.join(", ")}`;
          } else {
            answerText = "Nessuna risposta fornita";
          }
          return `**${question}**\n${answerText}`;
        })
        .join("\n\n");

      const promptProjectPlan = `Sei un esperto creativo nel campo del branding e del design. Il tuo compito è creare un piano d'azione dettagliato e innovativo per un progetto di ${
        logEntry.formData.projectType
      } del logo per il brand "${
        logEntry.formData.brandName
      }", che opera nel settore ${logEntry.formData.businessField} ${
        logEntry.formData.otherBusinessField
      }.

Il cliente ha fornito le seguenti informazioni sul logo attuale: ${
        logEntry.formData.currentLogoDescription || "Non disponibile"
      }

Obiettivi del progetto: ${
        logEntry.formData.projectObjectives || "Non specificati"
      }

**Risposte del cliente:**

${formattedAnswers}

**Il tuo compito:**

- Analizza attentamente le risposte del cliente e identifica i punti chiave.
- Proponi idee creative e concetti unici per il nuovo logo, tenendo conto delle preferenze espresse.
- Suggerisci elementi di design specifici, come forme, colori, tipografie, e come possono combinarsi per rappresentare al meglio il brand.
- Offri spunti innovativi che possano superare le aspettative del cliente.
- Presenta il piano d'azione in modo strutturato e professionale, suddividendo il processo in fasi chiare.

**Nota:** Il tuo obiettivo è creare un project plan che non solo soddisfi le esigenze del cliente, ma che porti anche valore aggiunto attraverso idee innovative e una visione creativa.`;

      const aiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: promptProjectPlan,
            },
          ],
          max_tokens: 2000,
          temperature: 0.8, // Aumentiamo la temperatura per maggiore creatività
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const projectPlan = aiResponse.data.choices[0].message.content.trim();

      // Aggiorna il project plan nel database
      logEntry.projectPlan = projectPlan;

      await logEntry.save();

      console.log(`Session ${sessionId} - Project plan generated and saved.`);
    } catch (error) {
      console.error("Error generating project plan:", error);
      // Non inviare errori al client, poiché la risposta è già stata inviata
    }
  } catch (error) {
    console.error("Error submitting log:", error);
    res.status(500).json({ error: "Errore nell'invio del log" });
  }
});

// Middleware per la gestione degli errori
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Errore interno del server" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
