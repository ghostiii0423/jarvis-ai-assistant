const express = require('express');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Support both Gemini and Groq keys
const GEMINI_KEYS = [];
for (let i = 1; i <= 20; i++) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  if (key) GEMINI_KEYS.push(key);
}
if (process.env.GEMINI_API_KEY) GEMINI_KEYS.push(process.env.GEMINI_API_KEY);

const GROQ_KEYS = [];
for (let i = 1; i <= 20; i++) {
  const key = process.env[`GROQ_API_KEY_${i}`];
  if (key) GROQ_KEYS.push(key);
}
if (process.env.GROQ_API_KEY) GROQ_KEYS.push(process.env.GROQ_API_KEY);

let geminiIdx = 0;
let groqIdx = 0;

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

async function callGemini(history, keyIndex) {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Verstanden, Sir. J.A.R.V.I.S. ist online und bereit.' }] },
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error?.message || `Gemini ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callGroq(history, keyIndex) {
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history
      ],
      temperature: 0.7,
      max_tokens: 300
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error?.message || `Groq ${res.status}`);
    e.status = res.status;
    throw e;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Keine Nachricht erhalten' });
  }

  if (GEMINI_KEYS.length === 0 && GROQ_KEYS.length === 0) {
    return res.status(500).json({ error: 'Kein API-Key konfiguriert.' });
  }

  let history = conversationHistory.get(sessionId) || [];
  history.push({ role: 'user', content: message });
  if (history.length > 20) history = history.slice(-20);

  // Try Gemini first, then Groq as fallback
  for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
    try {
      const reply = await callGemini(history, geminiIdx);
      if (reply) {
        history.push({ role: 'assistant', content: reply });
        conversationHistory.set(sessionId, history);
        return res.json({ reply });
      }
    } catch (err) {
      console.error(`Gemini Key ${geminiIdx + 1} fehler:`, err.message);
      geminiIdx = (geminiIdx + 1) % GEMINI_KEYS.length;
    }
  }

  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    try {
      const reply = await callGroq(history, groqIdx);
      if (reply) {
        history.push({ role: 'assistant', content: reply });
        conversationHistory.set(sessionId, history);
        return res.json({ reply });
      }
    } catch (err) {
      console.error(`Groq Key ${groqIdx + 1} fehler:`, err.message);
      groqIdx = (groqIdx + 1) % GROQ_KEYS.length;
    }
  }

  const detail = lastError ? lastError.message : 'Kein Provider verfügbar';
  console.error('Fehler:', detail);
  res.status(500).json({ error: `KI-Fehler: ${detail}` });
});

app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  conversationHistory.delete(sessionId);
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', gemini: GEMINI_KEYS.length, groq: GROQ_KEYS.length });
});

// Debug endpoint to test API connection
app.get('/api/test', async (req, res) => {
  const results = [];

  for (let i = 0; i < GEMINI_KEYS.length; i++) {
    try {
      const key = GEMINI_KEYS[i];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Sag nur Hallo' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      const data = await r.json();
      if (r.ok) {
        results.push({ provider: `gemini_${i+1}`, status: 'OK', reply: data.candidates?.[0]?.content?.parts?.[0]?.text });
      } else {
        results.push({ provider: `gemini_${i+1}`, status: 'FEHLER', code: r.status, error: data.error?.message });
      }
    } catch (e) {
      results.push({ provider: `gemini_${i+1}`, status: 'FEHLER', error: e.message });
    }
  }

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const key = GROQ_KEYS[i];
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Sag nur Hallo' }],
          max_tokens: 10
        })
      });
      const data = await r.json();
      if (r.ok) {
        results.push({ provider: `groq_${i+1}`, status: 'OK', reply: data.choices?.[0]?.message?.content });
      } else {
        results.push({ provider: `groq_${i+1}`, status: 'FEHLER', code: r.status, error: data.error?.message });
      }
    } catch (e) {
      results.push({ provider: `groq_${i+1}`, status: 'FEHLER', error: e.message });
    }
  }

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`\n  J.A.R.V.I.S. — Systems Online`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Gemini Keys: ${GEMINI_KEYS.length} | Groq Keys: ${GROQ_KEYS.length}\n`);
});
