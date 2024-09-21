const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Use CORS middleware properly, allowing requests from your frontend origin
app.use(cors({
  origin: 'http://localhost:5173', // Allow your frontend to access the server
  methods: ['GET', 'POST'],        // Allow the methods you are using
  allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));

app.use(express.json());

const PORT = process.env.PORT || 5001;

app.post('/api/generate', async (req, res) => {
  const { servicesSelected, formData } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Sei un assistente che genera domande per raccogliere informazioni di progetto.' },
          { 
            role: 'user', 
            content: `L'utente ha selezionato: ${servicesSelected.join(', ')}. Fai delle domande per raccogliere le seguenti informazioni: nome del brand o azienda, nuovo o restyling, settore aziendale, ecc...`
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
    res.json({ question });
  } catch (error) {
    console.error('Error generating AI question:', error);
    res.status(500).json({ error: 'Error generating AI question' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
