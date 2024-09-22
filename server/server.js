const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 5001;

let questionLog = [];

// AI question generation based on the initial form data
app.post('/api/generate', async (req, res) => {
  const { servicesSelected, formData } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Sei un assistente che aiuta a raccogliere dettagli per un progetto per il brand "${formData.brandName}".
                      Le seguenti informazioni sono già state raccolte:
                      - Nome del Brand: ${formData.brandName}
                      - Tipo di Progetto: ${formData.projectType}
                      - Settore Aziendale: ${formData.businessField}.
                      Non fare nuovamente domande su queste informazioni. 
                      Ora, fai domande relative ai servizi selezionati (${servicesSelected.join(', ')}).
                      Per ogni domanda, genera quattro risposte pertinenti e aggiungi sempre un'opzione per "Maggiori informazioni".
                      Le domande devono essere semplici, facili da comprendere e orientate a un utente che potrebbe non avere esperienza tecnica.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const question = response.data.choices[0].message.content;
    const aiQuestions = parseAiQuestionResponse(question); // Parse generated questions and options
    questionLog.push({ question, formData });
    res.json({ questions: aiQuestions });
  } catch (error) {
    console.error('Error generating AI question:', error);
    res.status(500).json({ error: 'Errore nella generazione delle domande AI' });
  }
});

// For handling next questions after user answers
app.post('/api/nextQuestion', async (req, res) => {
  const { currentAnswers } = req.body;

  questionLog.push({ answers: currentAnswers });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Continua a generare domande pertinenti in base alle risposte ricevute per raccogliere tutte le informazioni necessarie per il progetto.'
          },
          {
            role: 'user',
            content: `L'utente ha risposto: ${JSON.stringify(currentAnswers)}. Genera la prossima domanda rilevante.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const question = response.data.choices[0].message.content;
    const aiQuestions = parseAiQuestionResponse(question);
    res.json({ questions: aiQuestions });
  } catch (error) {
    console.error('Error generating next question:', error);
    res.status(500).json({ error: 'Errore nella generazione delle prossime domande' });
  }
});

// Submitting and logging the final answers and generating the project plan
app.post('/api/submitLog', async (req, res) => {
  const { answers, contactInfo } = req.body;
  questionLog.push({ contactInfo, answers });

  try {
    const aiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Crea un piano di progetto dettagliato e innovativo basato sulle risposte dell\'utente. Usa un linguaggio semplice e accessibile.'
          },
          {
            role: 'user',
            content: `Queste sono le risposte dell'utente: ${JSON.stringify(answers)}. Genera un piano di progetto dettagliato per soddisfare le aspettative del cliente.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const projectPlan = aiResponse.data.choices[0].message.content;
    questionLog.push({ projectPlan });

    // Write log to a file
    const logPath = path.join(__dirname, 'logs', 'project_log.txt');
    fs.writeFileSync(logPath, JSON.stringify(questionLog, null, 2), 'utf-8');

    res.status(200).json({ message: 'Log inviato e salvato', projectPlan });
  } catch (error) {
    console.error('Error generating project plan:', error);
    res.status(500).json({ error: 'Errore nella generazione del piano di progetto' });
  }
});

// Parsing the AI's response to format as questions with generated options
function parseAiQuestionResponse(text) {
  const questions = [];
  const lines = text.split('\n');

  lines.forEach((line) => {
    if (line.includes('?')) {
      const question = { text: line, options: [], moreDetails: true };

      const optionsMatch = line.match(/\(([^)]+)\)/); // Example: "(Moderno, Classico, Vintage)"
      if (optionsMatch && optionsMatch[1]) {
        question.type = 'checkbox'; // Allow multiple choices for style-like questions
        question.options = optionsMatch[1].split(',').map(opt => opt.trim());
      } else if (line.includes('colori')) {
        question.type = 'text'; // Open text input for colors
        question.moreDetails = false; // No need for "Maggiori dettagli" on colors
      } else {
        question.type = 'multiple-choice'; // Default to multiple-choice
        question.options = extractOptions(line); // Extract default options
      }

      questions.push(question);
    }
  });

  return questions;
}

function extractOptions(questionText) {
  // This function assumes options are generated dynamically for the given question
  // Fallback in case no options are extracted
  return ['Opzione 1', 'Opzione 2', 'Opzione 3', 'Opzione 4'];
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
