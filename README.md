# J.A.R.V.I.S. — KI Voice Assistant

Voice-only KI-Assistent mit Arc-Reactor-UI, powered by Groq (Llama 3.3 70B).

## Setup

1. **Groq API Key holen** (kostenlos): https://console.groq.com
2. `.env` Datei erstellen:
   ```
   cp .env.example .env
   ```
   Keys eintragen.

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
4. Environment Variable `GROQ_API_KEY_1` setzen
5. Deploy — URL auf dem iPhone öffnen

## iPhone

1. URL in Safari öffnen
2. Teilen → "Zum Home-Bildschirm"

## Features

- Sprachsteuerung (Tippe den Reaktor)
- Echte KI-Antworten via Groq/Llama 3.3 70B
- Sprachausgabe auf Deutsch
- Multi-Key-Rotation (bis zu 20 Keys)
- Konversations-Gedächtnis
- Arc-Reactor HUD mit Waveform-Visualizer
