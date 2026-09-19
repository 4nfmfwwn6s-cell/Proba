# English Coach — spoken English practice for Hungarian speakers

A voice-based English conversation coach: press the mic once and just talk — through pauses, multiple
sentences, hesitations, and switches between English and Hungarian — press it again when you're done, and the
app transcribes your speech, Claude replies naturally and (separately) corrects your grammar/vocabulary/word
order with a one-sentence Hungarian explanation, and reads both the correction and the reply back to you. Ask
"Angolul hogy kell mondani...?" mid-conversation and it'll teach you the phrase instead of grading it as a
mistake; ask "mit jelent ez?" and it'll answer briefly in Hungarian and steer you back to English.

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

1. On the first screen, type your name and press **Profil létrehozása és folytatás** to create your profile
   (e.g. "Efraim"). Anyone else using the app on the same machine or network does the same with their own name —
   each profile gets its own session history, mistakes, and voice/speed preferences. You can switch profiles
   anytime by tapping your name in the top bar.
2. Click the ⚙️ (settings) icon and paste your Anthropic API key, then **Mentés** (Save).
   The key is written to `backend/data/config.json` on your machine — it is never sent to the browser bundle.
   (API keys are shared across all profiles; each profile only keeps its own voice/speed/language preferences.)
3. Go back, pick a conversation mode, a difficulty (A2/B1/B2), and who should speak first — you or the app.
   This choice is remembered as your profile's default for next time.
4. Tap the big 🎤 button to start listening — a red pulsing dot and a running timer show it's recording, with a
   live preview of what it's picking up. Talk normally: pauses, multiple sentences, "umm"s are all fine, the app
   keeps listening. **Tap the 🎤 button again when you're done** — only then is what you said sent to Claude and
   answered; it never responds while the mic is still on.

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

## Using it from other devices on your Wi-Fi

The backend listens on all network interfaces (`0.0.0.0`), not just `localhost`. When you start it
(`npm run dev` in `backend/`, or `npm start` after a production build), the console prints the exact URL to use
from your phone, tablet, or another PC on the same Wi-Fi network, for example:

```
English coach backend listening on:
  Local:   http://localhost:3001
  Network: http://192.168.1.23:3001  <- open this on other devices on your Wi-Fi
```

Open that `Network:` address in a browser on the other device. (In dev mode, the Vite frontend at port 5173 is
also reachable on your LAN — Vite prints its own `Network:` URL when you run `npm run dev` in `frontend/`.)

### Windows Firewall

The first time the server binds to `0.0.0.0`, Windows Defender Firewall may show an **"Windows Defender Firewall
has blocked some features of this app"** popup for Node.js — click **Allow access** (at least for **Private**
networks) so other devices can reach it.

If you don't see that prompt, or you accidentally clicked "Cancel"/"Block", add a firewall rule manually. Open
**PowerShell as Administrator** and run (adjust `-LocalPort` if you changed `PORT`):

```powershell
New-NetFirewallRule -DisplayName "English Coach Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Private
```

If you're also using the two-terminal dev setup (not the single production build), add a second rule for the
Vite dev server:

```powershell
New-NetFirewallRule -DisplayName "English Coach Frontend (dev)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
```

Use `-Profile Private` (not `Public`) since a home Wi-Fi network is normally classified as Private in Windows —
this keeps the port closed to untrusted networks like coffee-shop Wi-Fi. You only need these rules once; Windows
remembers them across reboots and app restarts.

> Profiles have no passwords (by design, per the settings above), so anyone who can reach the app on your Wi-Fi
> can open any existing profile or create a new one, and every profile uses the same shared Anthropic/OpenAI/
> ElevenLabs API keys (and therefore the same billing). That's fine for a trusted home network; don't expose
> this port beyond your LAN.

## How the mic, corrections, and conversation start work

- **Toggle mic, not push-to-talk.** One tap starts listening (continuous, with live interim transcription);
  the mic stays on through pauses and multiple sentences. If the browser's own recognizer silently times out
  after a long pause, the app transparently restarts it behind the scenes and keeps appending to the same
  utterance, so you never notice a gap. A second tap stops listening — that's the only moment your message is
  sent to Claude and answered. Nothing is ever sent, and the app never replies, while the mic is on.
- **Corrections are spoken, not just written.** When your turn had a mistake, before the conversational reply
  the app says the corrected English sentence slowly and clearly, then (if enabled) the short Hungarian
  explanation in a Hungarian voice, then continues with the normal English reply in the English voice — always
  in that order, never overlapping. Control this in Settings → **Javítások felolvasása**, with three levels:
  off / corrected sentence only / corrected sentence + Hungarian explanation (the last one is the default). Set
  separate English and Hungarian voices there too.
- **Either side can start.** On the start screen, choose whether you or the app speaks first. If the app
  starts, it greets you and/or asks an opening question that fits the chosen mode/scenario/level as soon as the
  session begins, out loud, then waits for you to turn the mic on. Your choice is saved as that profile's
  default for next time. In question-practice mode, the app always continues by asking the next question right
  after correcting your answer — you never have to prompt it.
- **You can mix English and Hungarian in the same session.** The mic doesn't require you to pick a language
  upfront — Claude reads your turn and classifies it every time:
  - Spoke English? Handled exactly as above: a natural reply plus a correction if you made a mistake.
  - Asked in Hungarian how to say something in English (e.g. *"Angolul hogy kell mondani: sajnos nem tudok
    időben ott lenni?"*)? That's **not** graded as a mistake. Instead the app speaks the English sentence
    slowly and clearly, adds a short Hungarian note on register or an alternative phrasing, and invites you to
    say it back. These show up in the session summary as **"Kért kifejezések"** (phrases you asked for), and
    feed into the vocabulary review list — never counted as errors.
  - Said something else in Hungarian mid-conversation (e.g. *"mit jelent ez?"*, *"nem értem"*, *"mondd
    lassabban"*)? The app answers briefly in Hungarian, then steers the conversation back to English (e.g. by
    re-asking its previous question).

  Speech recognition itself still only understands one language per browser recognizer session, so the app
  hints the recognizer's language per (re)started segment from what it's heard so far (accented characters or
  recognizable Hungarian words switch it to `hu-HU`); the real classification — which of the three cases above
  applies — is always done by Claude on the finished transcript, not by that hint.

## Run the tests

The correction-parsing logic (`backend/src/lib/correctionParser.ts`, including the bilingual turnType/translation/
meta-question gating) has a full backend unit-test suite, and the pure frontend logic (transcript-segment merging
for the continuous mic, the Hungarian-language heuristic, the turnType-aware spoken-sequence builder, the
assistant-history composer, and elapsed-time formatting) has its own frontend suite:

```powershell
cd backend
npm test
```

```powershell
cd frontend
npm test
```

## Settings reference

All of these are set from the in-app **⚙️ Settings** page (no `.env` editing required). Settings come in two
scopes:

**Shared across every profile** (stored server-side in `backend/data/config.json`):
- **Anthropic API key** — required, powers the conversation + correction engine.
- **OpenAI API key** — used for the Whisper speech-to-text **fallback** (only invoked automatically if a browser doesn't support the Web Speech API) and for OpenAI TTS if selected.
- **ElevenLabs API key** — only needed if a profile selects ElevenLabs TTS.

**Per-profile** (stored in SQLite, one row per profile — each person can set their own):
- **TTS provider** — `browser` (free, built-in Chrome/Edge voices), `elevenlabs`, or `openai`.
- **English voice name / ElevenLabs voice ID** — optional override, used for replies and corrected sentences.
- **Hungarian voice name / voice ID** — optional override, used when speaking the Hungarian correction explanation.
- **Correction speech level** — off / corrected sentence only / corrected sentence + Hungarian explanation (default: the last one). Controls what gets spoken aloud before the reply on a turn with a mistake.
- **Speech speed** — 0.5x–1.5x, applied to whichever TTS engine is active (the corrected sentence is always read back a bit slower than this for emphasis).
- **Explanation language** — Hungarian (default) or English, for the one-line correction explanations.
- **Who starts** — you or the app; chosen on the start screen and remembered as the default for next time.

## Notes on how corrections and bilingual turns work

Every user turn is sent to Claude with a forced tool call (`respond_with_correction`), so the model always
returns strict JSON:

```
{
  reply: string,
  correction: { original, corrected, explanationHu, errorType } | null,
  inputLanguage: "en" | "hu",
  turnType: "conversation" | "translation_request" | "meta_question",
  translation: { englishSentence, hungarianNote } | null,
  metaReplyHu: string | null
}
```

`inputLanguage` and `turnType` are Claude's classification of your turn (not a client-side heuristic).
`correction` is only ever populated for `turnType: "conversation"` — `null` there means your sentence was
correct (shown as a green ✅). `translation` is only populated for `"translation_request"`, `metaReplyHu` only
for `"meta_question"`; the server normalizes/drops mismatched fields regardless of what the model sends, so a
confused response can never mislabel a translation request as a graded mistake. Corrections never leak into the
spoken reply — unless you explicitly type/say "explain" (or "magyarázd"), which lets the model explain inline
as part of that turn's reply.

## Troubleshooting

- **`npm install` fails building `better-sqlite3`** — it ships prebuilt binaries for common Node versions on Windows, so a plain `npm install` almost always works. If it still tries to compile from source, install the "Desktop development with C++" workload from [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and re-run `npm install`.
- **Mic button says "A böngésződ nem támogatja a hangfelismerést"** — your browser doesn't support the Web Speech API. Use Chrome or Edge. If an OpenAI key is set in Settings, the app automatically falls back to recording audio and transcribing it via Whisper instead.
- **"A mikrofon használatához engedélyt kell adnod"** — microphone permission was denied. Click the padlock/site-info icon in the address bar and allow microphone access for `localhost`, then reload.
- **Corrections never show up / chat errors out** — check that an Anthropic API key is saved in Settings; the app will show a banner if it's missing.
- **No Hungarian voice / the Hungarian explanation sounds wrong** — this depends on voices installed in your OS/browser. Windows usually ships at least one `hu-HU` voice (check *Settings → Time & Language → Speech* on Windows, or your browser's voice list); if none is found, the browser falls back to its default voice for that text. Using ElevenLabs or OpenAI TTS instead avoids this, since those support Hungarian regardless of installed system voices.
- **The app never answers, even though I stopped talking** — remember the mic is a toggle now: tap it again to stop listening and send. It intentionally never replies while the mic is still on.

## Data storage

Profiles, session history, and mistakes are stored locally in `backend/data/sessions.sqlite3` (SQLite via
`better-sqlite3`) — each profile only ever sees its own sessions and summaries. Shared API keys live in
`backend/data/config.json`. Both files are gitignored — they live only on your machine. Profiles have no
passwords; anyone who can open the app on your network can pick any existing profile or create a new one.
