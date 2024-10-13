const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const ProjectLog = require("./models/ProjectLog");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // Modifica se il frontend è ospitato altrove
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Connessione a MongoDB senza opzioni deprecate
mongoose.connect("mongodb://localhost:27017/basic")
  .then(() => {
    console.log("Connesso al database MongoDB");
  })
  .catch((err) => {
    console.error("Errore di connessione al database:", err);
  });

// Funzione di sanitizzazione per le chiavi
const sanitizeKey = (key) => key.replace(/\./g, '_');

// Funzione per generare una domanda per un servizio specifico
const generateQuestionForService = async (service, formData, answers, askedQuestions) => {
  // Crea una stringa con le domande già poste
  const askedQuestionsList = askedQuestions.join('\n');

  const promptBase = `Sei un assistente che aiuta a raccogliere dettagli per un progetto per il brand "${formData.brandName}". Le seguenti informazioni sono già state raccolte:

- Nome del Brand: ${formData.brandName}
- Tipo di Progetto: ${formData.projectType}
- Settore Aziendale: ${formData.businessField}

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
        const jsonString = aiResponseText.substring(jsonStartIndex, jsonEndIndex);
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
    if (aiQuestion.question.endsWith('.')) {
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
      return await generateQuestionForService(service, formData, answers, askedQuestions);
    }

    return aiQuestion;
  } catch (error) {
    console.error("Error generating AI question:", error);
    throw new Error("Errore nella generazione della domanda AI");
  }
};

// Endpoint per generare la prima domanda
app.post("/api/generate", async (req, res) => {
  console.log("Received /api/generate request:", req.body); // Log per debugging

  const { servicesSelected, formData, sessionId } = req.body;

  // Validazione di base
  if (!servicesSelected || !formData || !sessionId) {
    return res.status(400).json({ error: "Campi richiesti mancanti" });
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
    const askedQuestionsForService = newLogEntry.askedQuestions.get(firstService) || [];
    const aiQuestion = await generateQuestionForService(firstService, formData, newLogEntry.answers, askedQuestionsForService);

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

    console.log(`Session ${sessionId} - Generated first question for service: ${firstService}`);
    console.log(`Service Question Count [${firstService}]: ${newLogEntry.serviceQuestionCount.get(firstService)}`);
    console.log(`Total Question Count: ${newLogEntry.questionCount}`);

    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Error generating AI question:", error);
    res.status(500).json({ error: "Errore nella generazione delle domande AI" });
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
    console.log(`Session ${sessionId} - Received answer for service: ${currentService}`);
    console.log(`Service Question Count [${currentService}]: ${logEntry.serviceQuestionCount.get(currentService)}`);
    console.log(`Total Question Count: ${logEntry.questionCount}`);
    console.log(`Answers: ${JSON.stringify(logEntry.answers)}`); // Log delle risposte

    // Controlla se abbiamo raggiunto il minimo di domande per questo servizio
    if (logEntry.serviceQuestionCount.get(currentService) >= 8) {
      if (logEntry.servicesQueue.length === 1) {
        if (logEntry.serviceQuestionCount.get(currentService) >= 10) {
          // Raggiunto il massimo di 10 domande per 1 servizio, termina il questionario
          await logEntry.save();
          console.log(`Session ${sessionId} - Reached max questions for service: ${currentService}. Ending questionnaire.`);
          return res.json({ question: null });
        }
      } else {
        // Per più servizi, passa al servizio successivo
        logEntry.currentServiceIndex += 1;
        console.log(`Session ${sessionId} - Switching to next service. Current Service Index: ${logEntry.currentServiceIndex}`);

        // Se non ci sono più servizi, termina il questionario
        if (logEntry.currentServiceIndex >= logEntry.servicesQueue.length) {
          await logEntry.save();
          console.log(`Session ${sessionId} - All services completed. Ending questionnaire.`);
          return res.json({ question: null });
        }
      }
    }

    // Controlla se ha raggiunto il massimo di domande totali
    if (logEntry.questionCount >= logEntry.totalQuestions) {
      await logEntry.save();
      console.log(`Session ${sessionId} - Reached total question limit. Ending questionnaire.`);
      return res.json({ question: null }); // Indica al frontend che non ci sono più domande
    }

    // Determina il servizio corrente per la prossima domanda
    const nextService = logEntry.servicesQueue[logEntry.currentServiceIndex];
    const askedQuestionsForNextService = logEntry.askedQuestions.get(nextService) || [];

    // Genera la prossima domanda per il servizio corrente
    const aiQuestion = await generateQuestionForService(nextService, logEntry.formData, logEntry.answers, askedQuestionsForNextService);

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

    console.log(`Session ${sessionId} - Generated new question for service: ${nextService}`);
    console.log(`Service Question Count [${nextService}]: ${logEntry.serviceQuestionCount.get(nextService)}`);
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

    // **Aggiorna le informazioni di contatto all'interno di formData**
    logEntry.formData.contactInfo = {
      name: contactInfo.name || logEntry.formData.contactInfo.name,
      email: contactInfo.email || logEntry.formData.contactInfo.email,
      phone: contactInfo.phone || logEntry.formData.contactInfo.phone,
    };
    await logEntry.save();

    // Rispondi immediatamente al client
    res.status(200).json({ message: "Log inviato e salvato" });

    // Genera il project plan in background
    try {
      // Verifica che tutte le risposte essenziali siano presenti
      if (!logEntry.formData.contactInfo.name || !logEntry.formData.contactInfo.email) {
        throw new Error("Nome ed email sono obbligatori per generare il project plan.");
      }

      // Struttura le risposte in modo leggibile
      const formattedAnswers = Array.from(logEntry.answers.entries()).map(([question, response]) => {
        if (response.input) {
          return `**${question}:** ${response.input}`;
        } else if (response.options) {
          return `**${question}:** ${response.options.join(', ')}`;
        } else {
          return `**${question}:** Nessuna risposta fornita`;
        }
      }).join('\n');

      const promptProjectPlan = `Sei un assistente creativo che aiuta a sviluppare idee e suggerimenti innovativi basati sulle risposte dell'utente. Ecco le risposte fornite dall'utente per ogni servizio selezionato:

${formattedAnswers}

Genera un project plan dettagliato e personalizzato che includa idee e suggerimenti specifici per ciascun servizio, basati sulle risposte dell'utente. Assicurati che ogni idea sia chiaramente collegata alle risposte fornite e rifletta le preferenze e le esigenze espresse dall'utente. Evita suggerimenti generici o non pertinenti.`;

      const aiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "Sei un assistente creativo che aiuta a sviluppare idee e suggerimenti innovativi basati sulle risposte dell'utente.",
            },
            {
              role: "user",
              content: promptProjectPlan,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
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
