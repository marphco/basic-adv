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

let questionLog = []; // To store questions and answers

// AI question generation based on the initial form data
app.post('/api/generate', async (req, res) => {
  const { servicesSelected, formData } = req.body;

  try {
    // Pass the collected information to OpenAI, informing it not to ask for already provided info
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `Sei un assistente che raccoglie informazioni per creare un piano di progetto per il brand "${formData.brandName}". Le seguenti informazioni sono già state raccolte: 
            - Nome del Brand: ${formData.brandName}
            - Tipo di Progetto: ${formData.projectType}
            - Settore Aziendale: ${formData.businessField}.
            Non fare nuovamente domande su queste informazioni. Concentrati sul raccogliere ulteriori dettagli necessari per i servizi selezionati: ${servicesSelected.join(', ')}. Fai domande semplici che un non esperto potrebbe comprendere facilmente. Evita termini tecnici e concentrati sulle esigenze di base per ogni servizio selezionato.`
          }
        ],
        max_tokens: 150,
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
    questionLog.push({ question, formData }); // Store question in log
    res.json({ questions: aiQuestions });
  } catch (error) {
    console.error('Error generating AI question:', error);
    res.status(500).json({ error: 'Errore nella generazione delle domande AI' });
  }
});

// For handling next questions after user answers
app.post('/api/nextQuestion', async (req, res) => {
  const { currentAnswers } = req.body;

  // Add answers to log
  questionLog.push({ answers: currentAnswers });

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Continua a generare domande per raccogliere informazioni dettagliate per il progetto.' },
          { 
            role: 'user', 
            content: `L'utente ha risposto: ${JSON.stringify(currentAnswers)}. Qual è la prossima domanda rilevante?`
          }
        ],
        max_tokens: 150,
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

  // AI Project Plan Generation
  try {
    const aiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Crea un piano di progetto basato sulle risposte dell\'utente.' },
          { 
            role: 'user', 
            content: `Queste sono le risposte dell'utente: ${JSON.stringify(answers)}. Genera un piano di progetto dettagliato e innovativo per soddisfare le aspettative del cliente.` 
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

    res.status(200).json({ message: 'Log submitted and saved', projectPlan });
  } catch (error) {
    console.error('Error generating project plan:', error);
    res.status(500).json({ error: 'Errore nella generazione del piano di progetto' });
  }
});

// Parsing the AI's response to format as questions
function parseAiQuestionResponse(text) {
  const questions = [];
  const lines = text.split('\n');
  lines.forEach((line) => {
    if (line.includes('?')) {
      // Logic for assigning the type of answer based on question content
      if (line.includes('Hai già un logo')) {
        questions.push({ text: line, type: 'multiple-choice', options: ['Sì', 'No'] });
      } else if (line.includes('target principale')) {
        questions.push({
          text: line,
          type: 'checkbox',
          options: ['Teenager', 'Giovani', 'Adulti', 'Uomini', 'Donne']
        });
      } else {
        questions.push({ text: line, type: 'text' });
      }
    }
  });
  return questions;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
