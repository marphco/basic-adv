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
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

// ---- CORS CONFIG (SOSTITUISCE IL TUO) ----
const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://basicadv.com",
  "https://www.basicadv.com",
]);

// Aiuta cache/proxy a servire la risposta corretta per Origin diversi
app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});

app.use(
  cors({
    origin: (origin, cb) => {
      // consente anche richieste senza Origin (cron/server-to-server)
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // ok anche se usi solo Bearer
  })
);

// Preflight per tutte le route (deve stare PRIMA delle route)
app.options("*", cors());

app.use(express.json());
// app.use("/uploads", express.static("/app/uploads"));

// ========== MAILER (SMTP 587/2525 + fallback API) ==========
const SMTP_HOST = "smtp.mailersend.net";
const SMTP_PORTS = [587, 2525]; // niente 465 con MailerSend

const createTransporter = (port) =>
  nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: false, // STARTTLS
    requireTLS: true,
    auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { minVersion: "TLSv1.2", servername: SMTP_HOST },
  });

let smtpIndex = 0;
let transporter = createTransporter(SMTP_PORTS[smtpIndex]);

const sendViaSmtp = async (mailOptions) => {
  await transporter.verify();
  return transporter.sendMail(mailOptions);
};

const sendViaMailersendApi = async (mailOptions) => {
  if (!process.env.MAILERSEND_API_TOKEN) {
    throw new Error("MAILERSEND_API_TOKEN mancante per fallback API");
  }

  // mappa nodemailer -> MailerSend API
  const body = {
    from: {
      email: (mailOptions.envelope?.from) || (mailOptions.from?.address || mailOptions.from),
      name:  (mailOptions.from?.name) || "Basic Adv",
    },
    to: [{ email: Array.isArray(mailOptions.to) ? mailOptions.to[0] : mailOptions.to }],
    subject: mailOptions.subject,
    text: mailOptions.text,
  };
  if (mailOptions.html) body.html = mailOptions.html;

  if (mailOptions.replyTo) {
    const rt = typeof mailOptions.replyTo === "string"
      ? { email: mailOptions.replyTo }
      : { email: mailOptions.replyTo.address, name: mailOptions.replyTo.name };
    body.reply_to = rt; // <-- oggetto, NON array
  }

  try {
    return await axios.post("https://api.mailersend.com/v1/email", body, {
      headers: {
        Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });
  } catch (err) {
    if (err.response) {
      console.error("MailerSend API 4xx/5xx:", {
        status: err.response.status,
        data: err.response.data,   // <— qui vedrai l’errore preciso (campo sbagliato, from non verificato, ecc.)
      });
    }
    throw err;
  }
};


// wrapper unico che usi ovunque
const sendMail = async (mailOptions) => {
  try {
    // 1) prova SMTP su 587
    return await sendViaSmtp(mailOptions);
  } catch (e1) {
    // 2) se fallisce, prova SMTP su 2525
    if (
      ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EAUTH"].includes(e1?.code) &&
      smtpIndex < SMTP_PORTS.length - 1
    ) {
      smtpIndex++;
      transporter = createTransporter(SMTP_PORTS[smtpIndex]);
      try {
        return await sendViaSmtp(mailOptions);
      } catch (e2) {
        // 3) fallback API
        console.error(
          "SMTP fallito (2525). Fallback API:",
          e2?.code || e2?.message
        );
        return await sendViaMailersendApi(mailOptions);
      }
    }
    // errori logici (es. 5xx SMTP) -> prova comunque API
    console.error("SMTP fallito. Fallback API:", e1?.code || e1?.message);
    return await sendViaMailersendApi(mailOptions);
  }
};

// Endpoint per inviare email
app.post("/api/sendEmails", async (req, res) => {
  try {
    const { contactInfo, sessionId } = req.body || {};
    if (!contactInfo?.name || !contactInfo?.email) {
      return res.status(400).json({ error: "Missing name or email" });
    }
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const userEmail = contactInfo.email;

    const userMailOptions = {
      from: { name: "Basic Adv", address: process.env.SENDER_EMAIL }, // mittente verificato
      to: userEmail,
      replyTo: userEmail,
      subject: "Grazie per averci contattato!",
      text: `Ciao ${contactInfo.name},
grazie per aver compilato il form sul nostro sito. Ti contatteremo presto!

Team BasicAdv`,
      envelope: { from: process.env.SENDER_EMAIL, to: userEmail }, // MAIL FROM/RCPT TO espliciti
    };

    const adminMailOptions = {
      from: { name: "Basic Adv", address: process.env.SENDER_EMAIL },
      to: process.env.ADMIN_EMAIL,
      replyTo: userEmail,
      subject: "Nuova richiesta sul sito",
      text: `Nuova richiesta:
- Nome: ${contactInfo.name}
- Email: ${contactInfo.email}
- Telefono: ${contactInfo.phone || "Non fornito"}
- Session ID: ${sessionId}`,
      envelope: { from: process.env.SENDER_EMAIL, to: process.env.ADMIN_EMAIL },
    };

    await Promise.all([sendMail(userMailOptions), sendMail(adminMailOptions)]);

    return res.status(200).json({ message: "Email inviate con successo" });
  } catch (error) {
    console.error("SMTP error:", {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
    });
    return res.status(500).json({
      error: "SMTP_ERROR",
      details: error?.message || "Unknown SMTP error",
      code: error?.code || null,
    });
  }
});

// Middleware per autenticazione JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Accesso negato" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token non valido" });
    req.user = user;
    next();
  });
};

// Endpoint login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Credenziali non valide" });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Endpoint dashboard
app.get("/api/getRequests", authenticateToken, async (req, res) => {
  try {
    const logs = await ProjectLog.find()
      .select(
        "sessionId formData questions answers projectPlan createdAt servicesQueue feedback"
      )
      .lean();
    console.log("Dati inviati al frontend:", logs);
    res.json(logs);
  } catch (error) {
    console.error("Errore:", error);
    res.status(500).json({ error: "Errore nel recupero delle richieste" });
  }
});

// Endpoint per scaricare i file allegati
app.get("/api/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } else {
    console.error("File non trovato:", filePath);
    res.status(404).json({ error: "File non trovato" });
  }
});

// Endpoint per elencare i file
app.get("/api/uploads/list", authenticateToken, async (req, res) => {
  try {
    const uploadDir = UPLOAD_DIR;
    const files = await fs.promises.readdir(uploadDir);
    const fileDetails = await Promise.all(
      files
        .filter((file) => file !== "lost+found")
        .map(async (file) => {
          const filePath = path.join(uploadDir, file);
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            return {
              name: file,
              size: stats.size,
              lastModified: stats.mtime,
            };
          }
          return null;
        })
    );
    res.json({ files: fileDetails.filter((file) => file !== null) });
  } catch (error) {
    console.error("Errore nel recupero dei file:", error);
    res.status(500).json({ error: "Errore nel recupero dei file" });
  }
});

// Endpoint per cancellare un file
app.delete(
  "/api/uploads/delete/:filename",
  authenticateToken,
  async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(UPLOAD_DIR, filename);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        res
          .status(200)
          .json({ message: `File ${filename} cancellato con successo` });
      } else {
        res.status(404).json({ error: "File non trovato" });
      }
    } catch (error) {
      console.error("Errore nella cancellazione del file:", error);
      res.status(500).json({ error: "Errore nella cancellazione del file" });
    }
  }
);

// Endpoint per aggiornare il feedback di una richiesta
app.put(
  "/api/requests/:sessionId/feedback",
  authenticateToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { feedback } = req.body;

      console.log(
        `Tentativo di aggiornamento feedback per sessionId: ${sessionId}, nuovo valore: ${feedback}`
      );

      if (typeof feedback !== "boolean") {
        console.log("Errore: Il campo feedback non è un booleano");
        return res
          .status(400)
          .json({ error: "Il campo feedback deve essere un booleano" });
      }

      const projectLog = await ProjectLog.findOne({ sessionId });
      if (!projectLog) {
        console.log(
          `Errore: Nessun documento trovato con sessionId: ${sessionId}`
        );
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      console.log("Documento prima dell'aggiornamento:", projectLog);

      projectLog.feedback = feedback;

      await projectLog.save();

      const updatedLog = await ProjectLog.findOne({ sessionId });
      console.log(
        `Feedback aggiornato con successo per sessionId: ${sessionId}, valore salvato: ${updatedLog.feedback}`
      );

      res.status(200).json({
        message: "Feedback aggiornato con successo",
        feedback: updatedLog.feedback,
      });
    } catch (error) {
      console.error(
        "Errore dettagliato nell'aggiornamento del feedback:",
        error
      );
      res.status(500).json({
        error: "Errore nell'aggiornamento del feedback",
        details: error.message,
        stack: error.stack,
      });
    }
  }
);

// Endpoint per eliminare una richiesta
app.delete("/api/requests/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const projectLog = await ProjectLog.findOne({ sessionId });
    if (!projectLog) {
      return res.status(404).json({ error: "Richiesta non trovata" });
    }

    if (projectLog.formData.currentLogo) {
      const filePath = path.join(
        "/app/uploads",
        projectLog.formData.currentLogo
      );
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }

    await ProjectLog.deleteOne({ sessionId });

    res.status(200).json({ message: "Richiesta eliminata con successo" });
  } catch (error) {
    console.error("Errore nella cancellazione della richiesta:", error);
    res
      .status(500)
      .json({ error: "Errore nella cancellazione della richiesta" });
  }
});

// Altre route esistenti
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Crea la cartella uploads se non esiste
const UPLOAD_DIR = path.join(__dirname, "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
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

const PORT = process.env.PORT || 8080;

if (!global.serverRunning) {
  global.serverRunning = true;
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Porta ${PORT} già in uso`);
      process.exit(1);
    } else {
      console.error("❌ Errore server:", err);
    }
  });

  let isClosing = false;
  process.on("SIGINT", async () => {
    if (isClosing) return;
    isClosing = true;

    console.log("🔴 Chiusura server...");
    server.close(() => {
      console.log("✅ Server chiuso");
    });
    await mongoose.connection.close();
    console.log("✅ Connessione MongoDB chiusa");
    process.exit(0);
  });
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connesso al database MongoDB"))
  .catch((err) => console.error("Errore di connessione al database:", err));

const sanitizeKey = (key) => key.replace(/\./g, "_").replace(/\?$/, "");

const generateQuestionForService = async (
  service,
  formData,
  answers,
  askedQuestions
) => {
  const brandName = formData.brandName || "non specificato";
  const projectType = formData.projectType || "non specificato";
  const businessField = formData.businessField || "non specificato";

  const askedQuestionsList = askedQuestions.join("\n");

  let imageInfo = "";
  if (formData.currentLogoDescription) {
    imageInfo = `\nIl cliente ha fornito una descrizione del logo attuale: ${formData.currentLogoDescription}`;
  }

  const promptBase = `Sei un assistente che aiuta a raccogliere dettagli per un progetto ${
    brandName !== "non specificato"
      ? `per il brand "${brandName}"`
      : "senza un brand specifico"
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

    let aiQuestion;
    try {
      aiQuestion = JSON.parse(aiResponseText);
    } catch (error) {
      const jsonStartIndex = aiResponseText.indexOf("{");
      const jsonEndIndex = aiResponseText.lastIndexOf("}") + 1;
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        const jsonString = aiResponseText.substring(
          jsonStartIndex,
          jsonEndIndex
        );
        aiQuestion = JSON.parse(jsonString);
      } else {
        throw new Error("Errore nel parsing della risposta AI");
      }
    }

    if (aiQuestion.question && aiQuestion.question.endsWith(".")) {
      aiQuestion.question = aiQuestion.question.slice(0, -1);
    }

    if (!aiQuestion.question) {
      throw new Error("La risposta dell'AI non contiene una domanda valida");
    }

    if (typeof aiQuestion.requiresInput === "undefined") {
      aiQuestion.requiresInput = false;
    }

    if (!Array.isArray(aiQuestion.options)) {
      aiQuestion.options = [];
    }

    if (askedQuestions.includes(aiQuestion.question)) {
      return await generateQuestionForService(
        service,
        formData,
        answers,
        askedQuestions
      );
    }

    // Sanitizza la domanda prima di salvarla
    aiQuestion.question = sanitizeKey(aiQuestion.question);

    return aiQuestion;
  } catch (error) {
    throw error;
  }
};

app.post("/api/generate", upload.single("currentLogo"), async (req, res) => {
  try {
    let servicesSelected;
    try {
      servicesSelected = JSON.parse(req.body.servicesSelected || "[]");
    } catch (e) {
      return res
        .status(400)
        .json({ error: "Formato servicesSelected non valido" });
    }

    const formData = { ...req.body };
    const sessionId = req.body.sessionId || uuidv4();

    delete formData.servicesSelected;
    delete formData.sessionId;

    if (formData.contactInfo) {
      try {
        formData.contactInfo = JSON.parse(formData.contactInfo);
      } catch (e) {
        formData.contactInfo = {};
      }
    } else {
      formData.contactInfo = {};
    }

    if (req.file) {
      formData.currentLogo = req.file.filename;
      console.log("File salvato in:", req.file.path);
    } else if (formData.projectType === "restyling") {
      return res
        .status(400)
        .json({ error: "Immagine richiesta per il restyling non fornita" });
    }

    formData.brandName = formData.brandName || "";
    formData.projectType = formData.projectType || "non specificato";
    formData.businessField = formData.businessField || "non specificato";
    formData.otherBusinessField = formData.otherBusinessField || "";

    if (!servicesSelected.length) {
      return res.status(400).json({ error: "Nessun servizio selezionato" });
    }

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
      totalQuestions:
        servicesSelected.length === 1 ? 10 : 8 * servicesSelected.length,
      askedQuestions: new Map(),
    });

    servicesSelected.forEach((service) => {
      newLogEntry.serviceQuestionCount.set(service, 0);
      newLogEntry.askedQuestions.set(service, []);
    });

    const firstService = servicesSelected[0];
    const askedQuestionsForService =
      newLogEntry.askedQuestions.get(firstService) || [];

    const aiQuestion = await generateQuestionForService(
      firstService,
      formData,
      Object.fromEntries(newLogEntry.answers),
      askedQuestionsForService
    );

    newLogEntry.questions.push(aiQuestion);
    newLogEntry.questionCount += 1;
    newLogEntry.serviceQuestionCount.set(
      firstService,
      (newLogEntry.serviceQuestionCount.get(firstService) || 0) + 1
    );
    newLogEntry.askedQuestions.get(firstService).push(aiQuestion.question);

    await newLogEntry.save();

    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Errore in /api/generate:", error);
    res.status(500).json({
      error:
        error.message ||
        "Errore nella generazione della domanda. Riprova più tardi.",
    });
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
    logEntry.askedQuestions.get(currentService).push(sanitizedQuestionText); // Usa la chiave sanitizzata

    if (logEntry.questionCount >= logEntry.totalQuestions) {
      await logEntry.save();
      return res.json({ question: null });
    }

    const serviceCount = logEntry.serviceQuestionCount.get(currentService) || 0;
    if (serviceCount >= logEntry.maxQuestionsPerService) {
      logEntry.currentServiceIndex += 1;

      if (logEntry.currentServiceIndex >= logEntry.servicesQueue.length) {
        await logEntry.save();
        return res.json({ question: null });
      }
    }

    const nextService = logEntry.servicesQueue[logEntry.currentServiceIndex];
    const askedQuestionsForNextService =
      logEntry.askedQuestions.get(nextService) || [];

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

    res.json({ question: aiQuestion });
  } catch (error) {
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
      if (
        !logEntry.formData.contactInfo.name ||
        !logEntry.formData.contactInfo.email
      ) {
        throw new Error(
          "Nome ed email sono obbligatori per generare il project plan."
        );
      }

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
    } catch (error) {
      // Errore nella generazione del project plan, ma il log è già salvato
    }
  } catch (error) {
    res.status(500).json({ error: "Errore nell'invio del log" });
  }
});

app.use((err, req, res, next) => {
  console.error("UNCAUGHT ERROR:", err);
  res
    .status(500)
    .json({ error: "Errore interno del server", details: err?.message });
});

// Facoltativo: cattura errori non gestiti a livello process
process.on("unhandledRejection", (r) =>
  console.error("UNHANDLED REJECTION:", r)
);
process.on("uncaughtException", (e) => console.error("UNCAUGHT EXCEPTION:", e));
