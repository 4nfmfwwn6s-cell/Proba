# English Coach — spoken English practice for Hungarian speakers

A voice-based English conversation coach: you speak, it transcribes your speech,
Claude replies naturally and (separately) corrects your grammar/vocabulary/word
order with a one-sentence Hungarian explanation, and reads the reply back to you.

## Project structure

```
Proba/
├── backend/     Express + TypeScript API (proxies Claude/TTS/STT, stores config + SQLite sessions)
└── frontend/    React + Vite + TypeScript UI (mic button, chat bubbles, settings, summaries)
```

## Prerequisites

- **Node.js 18+** (Node 20/22 recommended) — https://nodejs.org
- **Google Chrome or Microsoft Edge** on Windows 11 (both are Chromium-based and support the Web Speech API used for live transcription)
- An **Anthropic API key** (https://console.anthropic.com) — you'll paste this into the app's Settings page, not a `.env` file
- Optional: an **OpenAI API key** (used only as a fallback speech-to-text engine, and optionally for OpenAI TTS)
- Optional: an **ElevenLabs API key** (only if you want ElevenLabs TTS instead of the free browser voice)

## Install (Windows 11, PowerShell)

Open **PowerShell** in the project folder and run:

```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ..\frontend
npm install
```

## Run it locally (development mode)

You need **two terminals** open at the same time.

**Terminal 1 — backend (API server, port 3001):**
```powershell
cd backend
npm run dev
```

**Terminal 2 — frontend (Vite dev server, port 5173):**
```powershell
cd frontend
npm run dev
```

Then open **http://localhost:5173** in Chrome or Edge.

1. Click the ⚙️ (settings) icon and paste your Anthropic API key, then **Mentés** (Save).
   The key is written to `backend/data/config.json` on your machine — it is never sent to the browser bundle.
2. Go back, pick a conversation mode and a difficulty (A2/B1/B2), and press **Beszélgetés indítása**.
3. Tap the big 🎤 button, speak in English, and tap it again (or wait) to send. The app replies out loud and shows the correction under your message.

> The Web Speech API requires a **secure context**; `http://localhost` counts as secure, so this works without HTTPS setup. The first time you use the mic, Chrome/Edge will ask for microphone permission — click **Allow**.

## Run it as a single production build

```powershell
# Build the frontend
cd frontend
npm run build

# Build and start the backend (it serves the built frontend automatically)
cd ..\backend
npm run build
npm start
```

Then open **http://localhost:3001** — the backend serves both the API and the built UI.

## Run the tests

The correction-parsing logic (`backend/src/lib/correctionParser.ts`) has a full unit-test suite:

```powershell
cd backend
npm test
```

## Settings reference

All of these are set from the in-app **⚙️ Settings** page (no `.env` editing required):

- **Anthropic API key** — required, powers the conversation + correction engine.
- **TTS provider** — `browser` (free, built-in Chrome/Edge voices), `elevenlabs`, or `openai`. ElevenLabs/OpenAI need their own API key below.
- **OpenAI API key** — used for the Whisper speech-to-text **fallback** (only invoked automatically if your browser doesn't support the Web Speech API) and for OpenAI TTS if selected.
- **Voice name / ElevenLabs voice ID** — optional override.
- **Speech speed** — 0.5x–1.5x, applied to whichever TTS engine is active.
- **Explanation language** — Hungarian (default) or English, for the one-line correction explanations.

## Notes on how corrections work

Every user turn is sent to Claude with a forced tool call (`respond_with_correction`), so the model always
returns strict JSON: `{ reply, correction }`. `correction` is `null` when your sentence was correct (shown as a
green ✅), or `{ original, corrected, explanationHu, errorType }` when there's a mistake. Corrections never leak
into the spoken reply — unless you explicitly type/say "explain" (or "magyarázd"), which lets the model explain
inline as part of that turn's reply.

## Troubleshooting

- **`npm install` fails building `better-sqlite3`** — it ships prebuilt binaries for common Node versions on Windows, so a plain `npm install` almost always works. If it still tries to compile from source, install the "Desktop development with C++" workload from [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and re-run `npm install`.
- **Mic button says "A böngésződ nem támogatja a hangfelismerést"** — your browser doesn't support the Web Speech API. Use Chrome or Edge. If an OpenAI key is set in Settings, the app automatically falls back to recording audio and transcribing it via Whisper instead.
- **"A mikrofon használatához engedélyt kell adnod"** — microphone permission was denied. Click the padlock/site-info icon in the address bar and allow microphone access for `localhost`, then reload.
- **Corrections never show up / chat errors out** — check that an Anthropic API key is saved in Settings; the app will show a banner if it's missing.

## Data storage

Session history and mistakes are stored locally in `backend/data/sessions.sqlite3` (SQLite via `better-sqlite3`).
Both `backend/data/sessions.sqlite3` and `backend/data/config.json` are gitignored — they live only on your machine.
