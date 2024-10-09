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

// Connessione a MongoDB
mongoose.connect("mongodb://localhost:27017/basic", {
  // Rimuovi le opzioni deprecated
});
const db = mongoose.connection;
db.on(
  "error",
  console.error.bind(console, "Errore di connessione al database:")
);
db.once("open", () => {
  console.log("Connesso al database MongoDB");
});

// Esempio di domande statiche (puoi estenderle fino a 10)
const questions = [
  // Definisci le tue domande qui se necessario
];

// Endpoint per generare la prima domanda
app.post("/api/generate", async (req, res) => {
  const { servicesSelected, formData, sessionId } = req.body;

  try {
    if (!servicesSelected || !formData || !sessionId) {
      return res.status(400).json({ error: "Campi richiesti mancanti." });
    }

    // Inizializza la sessione
    const newLogEntry = new ProjectLog({
      sessionId,
      formData,
      questions: [],
      answers: {}, // Assicurati che sia inizializzato
      questionCount: 0,
      servicesQueue: servicesSelected,
      currentServiceIndex: 0,
      serviceQuestionCount: {},
    });

    // Inizializza il conteggio delle domande per servizio
    servicesSelected.forEach((service) => {
      newLogEntry.serviceQuestionCount.set(service, 0);
    });

    // Aggiorna formData con i servizi selezionati
    newLogEntry.formData.servicesSelected = servicesSelected;

    // Invia richiesta a OpenAI per la prima domanda
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Sei un assistente che aiuta a raccogliere dettagli per un progetto per il brand "${
              formData.brandName
            }". Le seguenti informazioni sono già state raccolte:

- Nome del Brand: ${formData.brandName}
- Tipo di Progetto: ${formData.projectType}
- Settore Aziendale: ${formData.businessField}

Non fare nuovamente domande su queste informazioni.

Ora, fai una domanda pertinente ai servizi selezionati (${servicesSelected.join(
              ", "
            )}).

Per ogni domanda:

- Se stai per chiedere "Hai preferenze di colori per il tuo logo?" o una domanda sulle preferenze di colore, **non** generare opzioni e imposta "requiresInput": true.

- Se la domanda riguarda la **selezione del font**, includi il campo "type": "font_selection" nella tua risposta JSON e fornisci una lista di almeno 6 categorie di font comuni (ad esempio, "Serif", "Sans-serif", "Script", "Monospaced", "Manoscritto", "Decorativo"). Imposta "requiresInput": false.

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

Utilizza un linguaggio semplice e chiaro, adatto a utenti senza conoscenze tecniche. Mantieni le domande e le opzioni concise e facili da comprendere.`,
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
          return res
            .status(500)
            .json({ error: "Errore nel parsing della risposta AI" });
        }
      } else {
        console.error("No JSON found in AI response");
        return res
          .status(500)
          .json({ error: "Errore nel parsing della risposta AI" });
      }
    }

    // Verifica che 'question' sia presente
    if (!aiQuestion.question) {
      console.error("La risposta dell'AI non contiene una domanda valida.");
      return res.status(500).json({
        error: "La risposta dell'AI non contiene una domanda valida.",
      });
    }

    // Imposta 'requiresInput' su false se non è presente
    if (typeof aiQuestion.requiresInput === "undefined") {
      aiQuestion.requiresInput = false;
    }

    // Se 'options' non è un array, impostalo su array vuoto
    if (!Array.isArray(aiQuestion.options)) {
      aiQuestion.options = [];
    }

    // Aggiungi la domanda al log
    newLogEntry.questions.push(aiQuestion);
    newLogEntry.questionCount += 1;

    // Incrementa il conteggio delle domande per il servizio corrente
    const currentService = newLogEntry.servicesQueue[newLogEntry.currentServiceIndex];
    const currentServiceQuestionCount =
      newLogEntry.serviceQuestionCount.get(currentService) || 0;
    newLogEntry.serviceQuestionCount.set(
      currentService,
      currentServiceQuestionCount + 1
    );

    // Salva nel database
    await newLogEntry.save();

    res.json({ question: aiQuestion });
  } catch (error) {
    console.error("Error generating AI question:", error);
    res
      .status(500)
      .json({ error: "Errore nella generazione delle domande AI" });
  }
});

// Generate the next question
app.post("/api/nextQuestion", async (req, res) => {
  const { currentAnswer, sessionId } = req.body;

  const maxQuestionsPerService = 7;

  try {
    // Trova il log entry corrispondente al sessionId
    const logEntry = await ProjectLog.findOne({ sessionId });

    if (!logEntry) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }

    // Salva la risposta
    const questionText = Object.keys(currentAnswer)[0];
    const answerData = currentAnswer[questionText];
    logEntry.answers[questionText] = answerData;

    // Incrementa il contatore delle domande
    logEntry.questionCount += 1;

    // Ottieni il servizio corrente
    const currentService = logEntry.servicesQueue[logEntry.currentServiceIndex];

    // Incrementa il conteggio delle domande per il servizio corrente
    const currentServiceQuestionCount =
      logEntry.serviceQuestionCount.get(currentService) || 0;
    logEntry.serviceQuestionCount.set(
      currentService,
      currentServiceQuestionCount + 1
    );

    // Controlla se abbiamo raggiunto il numero massimo di domande per questo servizio
    if (currentServiceQuestionCount >= maxQuestionsPerService) {
      logEntry.currentServiceIndex += 1;

      // Se non ci sono più servizi, termina il questionario
      if (logEntry.currentServiceIndex >= logEntry.servicesQueue.length) {
        await logEntry.save();
        return res.json({ question: null });
      }
    }

    // Controlla se ha raggiunto il massimo di 10 domande
    if (logEntry.questionCount > 10) {
      await logEntry.save();
      return res.json({ question: null }); // Indica al frontend che non ci sono più domande
    }

    // Aggiorna il prompt per focalizzarsi sul servizio corrente
    const currentServiceForPrompt =
      logEntry.servicesQueue[logEntry.currentServiceIndex];

    // Genera la prossima domanda
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Sei un assistente che genera domande pertinenti per raccogliere ulteriori dettagli sul progetto del brand "${
              logEntry.formData.brandName
            }". 

Le seguenti informazioni sono già state raccolte:
- Risposte precedenti: ${JSON.stringify(logEntry.answers)}.

Non includere le risposte precedenti nel testo della nuova domanda. Genera una nuova domanda pertinente ai servizi selezionati (${logEntry.formData.servicesSelected.join(
              ", "
            )}), senza menzionare direttamente le risposte dell'utente.

Per ogni domanda:
- Se la domanda riguarda le preferenze di colore o se stai per chiedere "Hai preferenze di colori per il tuo logo?" o simili, non generare opzioni e imposta "requiresInput": true.
- Altrimenti, genera esattamente 4 opzioni pertinenti.

**Importante**: Fornisci SOLO il seguente formato JSON valido, senza testo aggiuntivo o spiegazioni:

{
  "question": "La tua domanda qui",
  "options": ["Opzione1", "Opzione2", "Opzione3", "Opzione4"],
  "requiresInput": true o false
}

- Se "requiresInput" è true, significa che la domanda richiede una risposta aperta e non devi fornire opzioni.
- Se "requiresInput" è false, fornisci le opzioni come specificato.

Assicurati che il JSON sia valido e non includa altro testo o caratteri.`,
          },
          {
            role: "user",
            content: `L'utente ha risposto: ${JSON.stringify(
              currentAnswer
            )}. Genera la prossima domanda pertinente.`,
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

    console.log("AI Response:", aiResponseText);

    // Parse the response as JSON
    let nextQuestion;

    try {
      nextQuestion = JSON.parse(aiResponseText);
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
          nextQuestion = JSON.parse(jsonString);
        } catch (error) {
          console.error("Error parsing extracted JSON:", error);
          return res
            .status(500)
            .json({ error: "Errore nel parsing della risposta AI" });
        }
      } else {
        console.error("No JSON found in AI response");
        return res
          .status(500)
          .json({ error: "Errore nel parsing della risposta AI" });
      }
    }

    // Verifica che 'question' sia presente
    if (!nextQuestion.question) {
      console.error("La risposta dell'AI non contiene una domanda valida.");
      return res.status(500).json({
        error: "La risposta dell'AI non contiene una domanda valida.",
      });
    }

    // Imposta 'requiresInput' su false se non è presente
    if (typeof nextQuestion.requiresInput === "undefined") {
      nextQuestion.requiresInput = false;
    }

    // Se 'options' non è un array, impostalo su array vuoto
    if (!Array.isArray(nextQuestion.options)) {
      nextQuestion.options = [];
    }

    // Aggiungi la nuova domanda al log
    logEntry.questions.push(nextQuestion);
    await logEntry.save();

    res.json({ question: nextQuestion });
  } catch (error) {
    console.error("Error generating next question:", error);
    res.status(500).json({ error: "Errore nella generazione della domanda" });
  }
});

// Submitting and logging the final answers and generating the project plan
app.post("/api/submitLog", async (req, res) => {
  const { contactInfo, sessionId } = req.body;

  try {
    // Trova il log entry corrispondente al sessionId
    const logEntry = await ProjectLog.findOne({ sessionId });

    if (!logEntry) {
      return res.status(404).json({ error: "Sessione non trovata" });
    }

    // Aggiorna le informazioni di contatto
    logEntry.contactInfo = {
      name: contactInfo.name || "",
      email: contactInfo.email || "",
      phone: contactInfo.phone || "",
    };
    await logEntry.save();

    // Rispondi immediatamente al client
    res.status(200).json({ message: "Log inviato e salvato" });

    // Genera il piano di progetto in background
    try {
      const aiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "Crea un piano di progetto dettagliato e innovativo basato sulle risposte dell'utente. Usa un linguaggio semplice e accessibile.",
            },
            {
              role: "user",
              content: `Queste sono le risposte dell'utente: ${JSON.stringify(
                logEntry.answers
              )}. Genera un piano di progetto dettagliato per soddisfare le aspettative del cliente.`,
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

      const projectPlan = aiResponse.data.choices[0].message.content;

      // Aggiorna il piano di progetto nel database
      logEntry.projectPlan = projectPlan;

      await logEntry.save();
    } catch (error) {
      console.error("Error generating project plan:", error);
      // Non inviare errori al client, poiché la risposta è già stata inviata
    }
  } catch (error) {
    console.error("Error submitting log:", error);
    res.status(500).json({ error: "Errore nell'invio del log" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
