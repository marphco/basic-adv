const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.post('/api/generate', async (req, res) => {
  const { servicesSelected } = req.body;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an assistant generating questions to gather project details.' },
          { role: 'user', content: `The user selected: ${servicesSelected.join(', ')}. What should be the first question to gather more information for these services?` }
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
