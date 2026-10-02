# J.A.R.V.I.S. — KI Voice Assistant

Voice-only KI-Assistent mit Arc-Reactor-UI, powered by Google Gemini (kostenlos).

## Setup

1. **Gemini API Key holen** (kostenlos): https://aistudio.google.com/apikey
2. `.env` Datei erstellen:
   ```
   cp .env.example .env
   ```
   Key eintragen.

3. **Starten:**
   ```bash
   npm install
   npm start
   ```

4. Öffne `http://localhost:3000`

## Deploy auf Render.com (kostenlos)

1. Repo mit GitHub verbinden auf https://render.com
2. New → Web Service → dieses Repo wählen
3. Build: `npm install` / Start: `npm start`
4. Environment Variable `GEMINI_API_KEY` setzen
5. Deploy — URL auf dem iPhone öffnen

## iPhone

1. URL in Safari öffnen
2. Teilen → "Zum Home-Bildschirm"

## Features

- Sprachsteuerung (Tippe den Reaktor)
- Echte KI via Google Gemini 2.0 Flash (kostenlos)
- Groq/Llama als Fallback
- Sprachausgabe auf Deutsch
- Multi-Key-Rotation (bis zu 20 Keys pro Provider)
- Konversations-Gedächtnis
- Arc-Reactor HUD mit Waveform-Visualizer
