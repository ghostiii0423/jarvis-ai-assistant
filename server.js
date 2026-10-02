const express = require('express');
const Groq = require('groq-sdk');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_KEYS = [];
for (let i = 1; i <= 20; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key) API_KEYS.push(key);
}
if (process.env.GROQ_API_KEY) API_KEYS.push(process.env.GROQ_API_KEY);

let currentKeyIndex = 0;

function getGroqClient() {
  if (API_KEYS.length === 0) return null;
  return new Groq({ apiKey: API_KEYS[currentKeyIndex % API_KEYS.length] });
}

function rotateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
}

const SYSTEM_PROMPT = `Du bist J.A.R.V.I.S. (Just A Rather Very Intelligent System), ein hochintelligenter KI-Assistent inspiriert von Tony Starks KI aus Iron Man.

Dein Charakter:
- Du sprichst den Nutzer mit "Sir" an
- Du bist höflich, professionell, aber mit trockenem britischem Humor
- Du gibst kurze, präzise Antworten (maximal 2-3 Sätze, außer es wird mehr verlangt)
- Du bist hilfsbereit bei allem: Wissen, Berechnungen, Ratschläge, Motivation, Witze
- Du sprichst Deutsch, kannst aber alle Sprachen
- Du vermeidest Markdown-Formatierung, Aufzählungszeichen und Sonderzeichen
- Deine Antworten sollen sich natürlich anhören wenn sie vorgelesen werden
- Du bist loyal, intelligent und immer einsatzbereit
- Halte dich kurz. Antworte wie ein echter Assistent, nicht wie ein Chatbot.`;

const conversationHistory = new Map();

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Keine Nachricht erhalten' });
  }

  if (API_KEYS.length === 0) {
    return res.status(500).json({ error: 'Kein API-Key konfiguriert. Bitte .env Datei prüfen.' });
  }

  let history = conversationHistory.get(sessionId) || [];
  history.push({ role: 'user', content: message });

  if (history.length > 20) {
    history = history.slice(-20);
  }

  let lastError = null;
  for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
    try {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const reply = completion.choices[0]?.message?.content || 'Entschuldigung, ich konnte keine Antwort generieren.';
      history.push({ role: 'assistant', content: reply });
      conversationHistory.set(sessionId, history);

      return res.json({ reply });
    } catch (err) {
      lastError = err;
      if (err.status === 429 || err.status === 401) {
        rotateKey();
        continue;
      }
      break;
    }
  }

  console.error('Alle Keys fehlgeschlagen:', lastError?.message);
  res.status(500).json({ error: 'KI nicht erreichbar. Bitte kurz warten und erneut versuchen.' });
});

app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  conversationHistory.delete(sessionId);
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', keys: API_KEYS.length });
});

app.listen(PORT, () => {
  console.log(`\n  J.A.R.V.I.S. — Systems Online`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  API Keys: ${API_KEYS.length} geladen\n`);
});
