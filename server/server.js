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

// Generate initial questions based on service selection
app.post('/api/generate', async (req, res) => {
  const { servicesSelected, formData } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Sei un assistente che raccoglie informazioni per un piano di progetto.' },
          { 
            role: 'user', 
            content: `L'utente ha selezionato: ${servicesSelected.join(', ')}. Genera delle domande per raccogliere: nome del brand, tipo di progetto, settore aziendale, obiettivi del progetto, target del mercato, e ulteriori dettagli rilevanti per la creazione di un piano di progetto.` 
          }
        ],
        max_tokens: 250, // Increase the tokens to allow more detailed questions
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
    res.status(500).json({ error: 'Error generating AI question' });
  }
});

// Handle subsequent questions
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
    res.status(500).json({ error: 'Error generating next question' });
  }
});

// Submit final answers and generate project plan
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
          { role: 'system', content: 'Crea un piano di progetto dettagliato e innovativo basato sulle risposte dell\'utente.' },
          { 
            role: 'user', 
            content: `Queste sono le risposte dell'utente: ${JSON.stringify(answers)}. Genera un piano di progetto dettagliato.` 
          }
        ],
        max_tokens: 2000, // Increased to 2000 tokens for a longer project plan
        temperature: 0.6 // Lowered to make responses more focused
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
    res.status(500).json({ error: 'Error generating project plan' });
  }
});

// Helper function to parse AI questions
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
