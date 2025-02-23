const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const ProjectLog = require("./models/ProjectLog");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

console.log("Chiave OpenAI:", process.env.OPEN_AI_KEY ? "PRESENTE" : "NON TROVATA");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://basic-adv.vercel.app"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Configura multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo di file non supportato"), false);
    }
  },
});

const PORT = process.env.PORT || 8080;

if (!global.serverRunning) {
  global.serverRunning = true;
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Porta ${PORT} già in uso. Uscita forzata.`);
      process.exit(1);
    } else {
      console.error("❌ Errore sconosciuto:", err);
    }
  });

  let isClosing = false;
  process.on('SIGINT', async () => {
    if (isClosing) return;
    isClosing = true;

    console.log('🔴 Ricevuto SIGINT. Chiusura server...');
    server.close(() => {
      console.log('✅ Server chiuso correttamente');
    });
    await mongoose.connection.close();
    console.log('✅ Connessione MongoDB chiusa');
    process.exit(0);
  });
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connesso al database MongoDB"))
  .catch((err) => console.error("Errore di connessione al database:", err));

const sanitizeKey = (key) => key.replace(/\./g, "_");

const generateQuestionForService = async (service, formData, answers, askedQuestions) => {
  console.log("generateQuestionForService called with:", {
    service,
    formData,
    answers,
    askedQuestions,
  });

  const brandName = formData.brandName || "non specificato";
  const projectType = formData.projectType || "non specificato";
  const businessField = formData.businessField || "non specificato";

  const askedQuestionsList = askedQuestions.join("\n");

  let imageInfo = "";
  if (formData.currentLogoDescription) {
    imageInfo = `\nIl cliente ha fornito una descrizione del logo attuale: ${formData.currentLogoDescription}`;
  }

  const promptBase = `Sei un assistente che aiuta a raccogliere dettagli per un progetto ${
    brandName !== "non specificato" ? `per il brand "${brandName}"` : "senza un brand specifico"
  }. Le seguenti informazioni sono già state raccolte:

- Nome del Brand: ${brandName}
- Tipo di Progetto: ${projectType}
- Settore Aziendale: ${businessField}
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
  "type": "tipo_di_domanda",
  "requiresInput": true o false
}

- Se "requiresInput" è true, significa che la domanda richiede una risposta aperta e **non devi fornire opzioni**.
- Se "requiresInput" è false, fornisci le opzioni come specificato.

Assicurati che il JSON sia valido e non includa altro testo o caratteri.

Utilizza un linguaggio semplice e chiaro, adatto a utenti senza conoscenze tecniche. Mantieni le domande e le opzioni concise e facili da comprendere.`;

  try {
    console.log("Invio richiesta a OpenAI con prompt:", promptBase);
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
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
          Authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponseText = response.data.choices[0].message.content;
    console.log("Risposta da OpenAI:", aiResponseText);

    let aiQuestion;
    try {
      aiQuestion = JSON.parse(aiResponseText);
      console.log("Domanda AI parsata:", aiQuestion);
    } catch (error) {
      console.error("Errore nel parsing della risposta JSON da OpenAI:", error);
      const jsonStartIndex = aiResponseText.indexOf("{");
      const jsonEndIndex = aiResponseText.lastIndexOf("}") + 1;
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        const jsonString = aiResponseText.substring(jsonStartIndex, jsonEndIndex);
        try {
          aiQuestion = JSON.parse(jsonString);
          console.log("Domanda AI estratta con successo:", aiQuestion);
        } catch (error) {
          console.error("Errore nel parsing del JSON estratto:", error);
          throw new Error("Errore nel parsing della risposta AI");
        }
      } else {
        console.error("Nessun JSON valido trovato nella risposta AI");
        throw new Error("Errore nel parsing della risposta AI");
      }
    }

    if (aiQuestion.question && aiQuestion.question.endsWith(".")) {
      aiQuestion.question = aiQuestion.question.slice(0, -1);
    }

    if (!aiQuestion.question) {
      console.error("La risposta dell'AI non contiene una domanda valida:", aiResponseText);
      throw new Error("La risposta dell'AI non contiene una domanda valida");
    }

    if (typeof aiQuestion.requiresInput === "undefined") {
      aiQuestion.requiresInput = false;
    }

    if (!Array.isArray(aiQuestion.options)) {
      aiQuestion.options = [];
    }

    if (askedQuestions.includes(aiQuestion.question)) {
      console.log("Domanda duplicata rilevata, rigenerazione...");
      return await generateQuestionForService(service, formData, answers, askedQuestions);
    }

    return aiQuestion;
  } catch (error) {
    console.error("Errore in generateQuestionForService:", error.message, error.stack);
    throw error;
  }
};

app.post("/api/generate", upload.single("currentLogo"), async (req, res) => {
  console.log("Richiesta ricevuta per /api/generate:", req.body);

  try {
    let servicesSelected;
    try {
      servicesSelected = JSON.parse(req.body.servicesSelected || "[]");
    } catch (e) {
      console.error("Errore nel parsing di servicesSelected:", e);
      return res.status(400).json({ error: "Formato servicesSelected non valido" });
    }

    const formData = { ...req.body };
    const sessionId = req.body.sessionId || uuidv4();

    delete formData.servicesSelected;
    delete formData.sessionId;

    if (formData.contactInfo) {
      try {
        formData.contactInfo = JSON.parse(formData.contactInfo);
      } catch (e) {
        console.error("Errore nel parsing di contactInfo:", e);
        formData.contactInfo = {};
      }
    } else {
      formData.contactInfo = {};
    }

    if (req.file) {
      formData.currentLogo = req.file.path;
      console.log("Percorso del logo caricato:", formData.currentLogo);
    } else if (formData.projectType === "restyling") {
      return res.status(400).json({ error: "Immagine richiesta per il restyling non fornita" });
    }

    formData.brandName = formData.brandName || "";
    formData.projectType = formData.projectType || "non specificato";
    formData.businessField = formData.businessField || "non specificato";
    formData.otherBusinessField = formData.otherBusinessField || "";

    if (!servicesSelected.length) {
      console.error("Nessun servizio selezionato");
      return res.status(400).json({ error: "Nessun servizio selezionato" });
    }

    console.log("Dati preparati per ProjectLog:", { sessionId, formData, servicesSelected });

    const newLogEntry = new ProjectLog({
      sessionId,
      formData,
      questions: [],
      answers: new Map(),
      questionCount: 0,
      servicesQueue: servicesSelected,
      currentServiceIndex: 0,
      serviceQuestionCount: new Map(),
      maxQuestionsPerService: servicesSelected.length === 1 ? 10 : 8,
      totalQuestions: servicesSelected.length === 1 ? 10 : 8 * servicesSelected.length,
      askedQuestions: new Map(),
    });

    servicesSelected.forEach((service) => {
      newLogEntry.serviceQuestionCount.set(service, 0);
      newLogEntry.askedQuestions.set(service, []);
    });

    const firstService = servicesSelected[0];
    const askedQuestionsForService = newLogEntry.askedQuestions.get(firstService) || [];
    console.log("Chiamata a generateQuestionForService con:", {
      firstService,
      formData,
      answers: Object.fromEntries(newLogEntry.answers),
      askedQuestionsForService,
    });

    const aiQuestion = await generateQuestionForService(
      firstService,
      formData,
      Object.fromEntries(newLogEntry.answers),
      askedQuestionsForService
    );

    console.log("Domanda generata:", aiQuestion);

    newLogEntry.questions.push(aiQuestion);
    newLogEntry.questionCount += 1;
    newLogEntry.serviceQuestionCount.set(
      firstService,
      (newLogEntry.serviceQuestionCount.get(firstService) || 0) + 1
    );
    newLogEntry.askedQuestions.get(firstService).push(aiQuestion.question);

    console.log("Salvataggio del log entry su MongoDB...");
    await newLogEntry.save();
    console.log("Log entry salvato con successo");

    console.log(`Sessione ${sessionId} - Generata prima domanda per servizio: ${firstService}`);
    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Errore dettagliato in /api/generate:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      file: req.file ? { filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype } : "Nessun file",
    });
    res.status(500).json({ error: error.message || "Errore nella generazione della domanda. Riprova più tardi." });
  }
});

app.post("/api/nextQuestion", async (req, res) => {
  const { currentAnswer, sessionId } = req.body;

  if (!currentAnswer || !sessionId) {
    return res.status(400).json({ error: "Campi richiesti mancanti" });
  }

  try {
    const logEntry = await ProjectLog.findOne({ sessionId });

    if (!logEntry) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }

    const questionText = Object.keys(currentAnswer)[0];
    const sanitizedQuestionText = sanitizeKey(questionText);
    const answerData = currentAnswer[questionText];
    logEntry.answers.set(sanitizedQuestionText, answerData);

    const currentService = logEntry.servicesQueue[logEntry.currentServiceIndex];

    if (!logEntry.askedQuestions.has(currentService)) {
      logEntry.askedQuestions.set(currentService, []);
    }
    logEntry.askedQuestions.get(currentService).push(questionText);

    console.log(`Session ${sessionId} - Received answer for service: ${currentService}`);
    console.log(`Service Question Count [${currentService}]: ${logEntry.serviceQuestionCount.get(currentService) || 0}`);
    console.log(`Total Question Count: ${logEntry.questionCount}`);
    console.log(`Answers: ${JSON.stringify(Object.fromEntries(logEntry.answers))}`);

    // Controlla il limite totale di domande
    if (logEntry.questionCount >= logEntry.totalQuestions) {
      await logEntry.save();
      console.log(`Session ${sessionId} - Limite totale di domande (${logEntry.totalQuestions}) raggiunto. Fine questionario.`);
      return res.json({ question: null });
    }

    // Controlla il limite per il servizio corrente
    const serviceCount = logEntry.serviceQuestionCount.get(currentService) || 0;
    if (serviceCount >= logEntry.maxQuestionsPerService) {
      logEntry.currentServiceIndex += 1;
      console.log(`Session ${sessionId} - Limite domande per ${currentService} (${logEntry.maxQuestionsPerService}) raggiunto. Passaggio al servizio successivo: ${logEntry.currentServiceIndex}`);

      if (logEntry.currentServiceIndex >= logEntry.servicesQueue.length) {
        await logEntry.save();
        console.log(`Session ${sessionId} - Tutti i servizi completati. Fine questionario.`);
        return res.json({ question: null });
      }
    }

    const nextService = logEntry.servicesQueue[logEntry.currentServiceIndex];
    const askedQuestionsForNextService = logEntry.askedQuestions.get(nextService) || [];

    console.log(`Session ${sessionId} - Generazione nuova domanda per ${nextService}`);
    const aiQuestion = await generateQuestionForService(
      nextService,
      logEntry.formData,
      Object.fromEntries(logEntry.answers),
      askedQuestionsForNextService
    );

    logEntry.questions.push(aiQuestion);
    logEntry.questionCount += 1;
    logEntry.serviceQuestionCount.set(
      nextService,
      (logEntry.serviceQuestionCount.get(nextService) || 0) + 1
    );
    logEntry.askedQuestions.get(nextService).push(aiQuestion.question);

    await logEntry.save();

    console.log(`Session ${sessionId} - Generated new question for service: ${nextService}`);
    console.log(`Service Question Count [${nextService}]: ${logEntry.serviceQuestionCount.get(nextService)}`);
    console.log(`Total Question Count: ${logEntry.questionCount}`);

    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Error generating next question:", error);
    res.status(500).json({ error: "Errore nella generazione della domanda" });
  }
});

app.post("/api/submitLog", async (req, res) => {
  const { contactInfo, sessionId } = req.body;

  if (!contactInfo || !sessionId) {
    return res.status(400).json({ error: "Campi richiesti mancanti" });
  }

  try {
    const logEntry = await ProjectLog.findOne({ sessionId });

    if (!logEntry) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }

    if (!logEntry.formData.contactInfo) {
      logEntry.formData.contactInfo = {};
    }

    logEntry.formData.contactInfo = {
      name: contactInfo.name || logEntry.formData.contactInfo.name || "",
      email: contactInfo.email || logEntry.formData.contactInfo.email || "",
      phone: contactInfo.phone || logEntry.formData.contactInfo.phone || "",
    };

    await logEntry.save();

    res.status(200).json({ message: "Log inviato e salvato" });

    try {
      console.log(`Session ${sessionId} - Verifica contactInfo:`, logEntry.formData.contactInfo);
      if (!logEntry.formData.contactInfo.name || !logEntry.formData.contactInfo.email) {
        throw new Error("Nome ed email sono obbligatori per generare il project plan.");
      }

      const formattedAnswers = Array.from(logEntry.answers.entries())
        .map(([question, response]) => {
          let answerText = "";
          if (response.input && response.options) {
            answerText = `Opzioni selezionate: ${response.options.join(", ")}\nRisposta libera: ${response.input}`;
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
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: promptProjectPlan,
            },
          ],
          max_tokens: 2000,
          temperature: 0.8,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const projectPlan = aiResponse.data.choices[0].message.content.trim();

      logEntry.projectPlan = projectPlan;
      await logEntry.save();
      console.log(`Session ${sessionId} - Project plan generated and saved.`);
    } catch (error) {
      console.error(`Session ${sessionId} - Error generating project plan:`, error);
    }
  } catch (error) {
    console.error("Error submitting log:", error);
    res.status(500).json({ error: "Errore nell'invio del log" });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Errore interno del server" });
});