# English Coach — spoken English practice for Hungarian speakers

A voice-based English conversation coach: press the mic once and just talk — through pauses, multiple
sentences, hesitations, and switches between English and Hungarian — press it again when you're done, and the
app transcribes your speech, Claude replies naturally and (separately) corrects your grammar/vocabulary/word
order with a one-sentence Hungarian explanation, and reads the corrected sentence and the reply back to you —
always in English; the Hungarian explanation stays written-only, under your message. Ask "Angolul hogy kell
mondani...?" mid-conversation and it'll teach you the phrase instead of grading it as a mistake; ask "mit jelent
ez?" and it'll answer you in simple English (with a written Hungarian note if that helps) and keep going.

## Project structure

```
Proba/
├── backend/     Express + TypeScript API (proxies Claude/TTS/STT, stores config + SQLite sessions)
└── frontend/    React + Vite + TypeScript UI (mic button, chat bubbles, settings, summaries)
```

## Prerequisites

- **Node.js 18+** (Node 20/22 recommended) — https://nodejs.org
- **Google Chrome or Microsoft Edge** on Windows 11 (both are Chromium-based and support the Web Speech API used for live transcription)
- Optional: an **iPhone** on the same Wi-Fi network, if you want to use the app from your phone — requires the one-time HTTPS setup in "HTTPS for LAN / iOS mic access" below (iOS Safari falls back to the Whisper fallback for speech-to-text if needed, same as any browser without the Web Speech API)
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
4. If you're about to speak Hungarian (e.g. to ask how to say something), tap **HU** next to the mic button
   first (or press **Alt+L**) — it defaults to **EN** and switches back automatically after a Hungarian turn.
   Then tap the big 🎤 button to start listening — a red pulsing dot and a running timer show it's recording,
   with a live preview of what it's picking up. Talk normally: pauses, multiple sentences, "umm"s are all fine,
   the app keeps listening. **Tap the 🎤 button again when you're done** — only then is what you said sent to
   Claude and answered; it never responds while the mic is still on.

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

> **Using an iPhone?** Plain HTTP (as above) works fine for a laptop/desktop browser on the same network, but
> iOS blocks microphone access unless the connection is HTTPS. See **"HTTPS for LAN / iOS mic access"** below
> before trying it from a phone.

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

## HTTPS for LAN / iOS mic access

Plain HTTP is fine on the same PC (`localhost` always counts as a secure context), but **iOS Safari — and every
modern browser — refuses microphone access on any other address over plain HTTP.** To use the app from your
iPhone over Wi-Fi, generate a certificate once and both servers pick it up automatically.

### 1. Generate the certificate

```powershell
cd backend
npm run generate-cert
```

This creates `Proba\certs\cert.pem` and `Proba\certs\key.pem` (gitignored — they never leave your machine),
valid for `localhost`, `127.0.0.1`, and whichever LAN IP(s) it auto-detects on your PC right now, for 824 days.
It prints exactly what it covered:

```
Generated a self-signed HTTPS certificate:
  ...\Proba\certs\cert.pem
  ...\Proba\certs\key.pem

Valid for:
  - localhost
  - 127.0.0.1
  - ::1
  - 192.168.1.23

Expires: ...
```

If your PC's IP isn't in that list (multiple network adapters, or it changed later — Wi-Fi IPs are often
reassigned by your router over time), pass it explicitly and re-run:

```powershell
npm run generate-cert -- 192.168.1.23
```

**Whenever your PC's LAN IP changes, re-run `npm run generate-cert`** and re-trust the new certificate on each
device (below) — a cert for the old IP won't cover the new one.

### 2. Start the app

Restart whatever's running so it picks up the new certificate. The **single production build is the simplest
option for phone use** (one HTTPS origin, nothing else to configure):

```powershell
cd frontend
npm run build
cd ..\backend
npm run build
npm start
```

The console now prints `https://` URLs and a reminder about the certificate. (The two-terminal dev setup — `npm
run dev` in both `backend/` and `frontend/` — also switches to HTTPS automatically once the certificate exists,
if you'd rather use that instead.)

### 3. Trust the certificate on Windows (so Chrome/Edge stop warning you)

Open **PowerShell** (no Administrator needed) and run:

```powershell
Import-Certificate -FilePath "C:\path\to\Proba\certs\cert.pem" -CertStoreLocation Cert:\CurrentUser\Root
```

Click **Yes** on the security warning that pops up. Then **fully close and reopen Chrome/Edge** (not just the
tab). If you'd rather use the mouse: double-click `certs\cert.pem` in File Explorer → **Install Certificate...**
→ **Current User** → **Place all certificates in the following store** → **Browse...** → **Trusted Root
Certification Authorities** → **Finish** → **Yes**.

### 4. Trust the certificate on your iPhone

1. On your PC, note one of the `Network:` URLs the backend printed (e.g. `https://192.168.1.23:3001`).
2. On your **iPhone**, connect to the **same Wi-Fi network**, open **Safari**, and go to
   `https://192.168.1.23:3001/cert.pem` (same host/port, path `/cert.pem`).
3. Safari will first show a **"This Connection Is Not Private"** warning — this is expected, since the
   certificate isn't trusted yet. Tap **Show Details** → **visit this website** → **Visit Website** to continue.
4. Safari then shows **"This website is trying to download a configuration profile. Do you want to allow
   this?"** — tap **Allow**.
5. Go to **Settings → General → VPN & Device Management**, tap the downloaded profile (**"English Coach (local
   dev)"**), then tap **Install** (top right) — enter your passcode if asked, then **Install** again to confirm,
   then **Done**.
6. One more step — installing the profile isn't quite enough by itself: go to **Settings → General → About →
   Certificate Trust Settings**, and turn **on** the toggle next to the certificate you just installed.

After that, reload the page — the padlock should show a trusted connection, and tapping the 🎤 button will
prompt for microphone permission instead of silently failing.

### If you'd rather use mkcert

[mkcert](https://github.com/FiloSottile/mkcert) is a good alternative if you already have it (or Chocolatey/
Scoop) installed: `mkcert -install` sets up a local CA that Windows and Chrome/Edge trust automatically (no
manual Windows step above), then `mkcert -cert-file backend/../certs/cert.pem -key-file backend/../certs/key.pem
localhost 127.0.0.1 <your-LAN-IP>` produces files in the same place the app expects them. iOS still needs its
own manual trust step regardless of which tool generated the cert (get `mkcert`'s root CA — `mkcert -CAROOT` —
onto the phone and trust it the same way as step 4 above), so the built-in `npm run generate-cert` script above
avoids the extra install for most people.

## How the mic, corrections, and conversation start work

- **Toggle mic, not push-to-talk.** One tap starts listening (continuous, with live interim transcription);
  the mic stays on through pauses and multiple sentences. If the browser's own recognizer silently times out
  after a long pause, the app transparently restarts it behind the scenes and keeps appending to the same
  utterance, so you never notice a gap. A second tap stops listening — that's the only moment your message is
  sent to Claude and answered. Nothing is ever sent, and the app never replies, while the mic is on.
- **An EN/HU switch next to the mic button picks the recognition language for that turn.** The Web Speech API
  can only listen for one language at a time, so instead of guessing, you tell it: tap **EN** or **HU** (or
  press **Alt+L** to toggle) before you start talking, and that's the language the mic listens for during that
  turn. It defaults to **EN**, and automatically switches back to EN after a HU turn — so you only ever have to
  remember to flip it on, not off. The switch (and the shortcut) are disabled while the mic is actively
  listening, since changing it wouldn't affect a turn already in progress. Whichever language you spoke in, the
  reply and everything the app says out loud is still always English — see below.
- **The corrected sentence is spoken, never the Hungarian explanation.** When your turn had a mistake, before
  the conversational reply the app says the corrected English sentence slowly and clearly, then continues with
  the normal reply — both always in English. The Hungarian explanation is never spoken aloud; it only ever
  appears in writing under your message. Control this in Settings → **Javítások felolvasása**, with two levels:
  off / on (speak the corrected sentence — the default).
- **Either side can start.** On the start screen, choose whether you or the app speaks first. If the app
  starts, it greets you and/or asks an opening question that fits the chosen mode/scenario/level as soon as the
  session begins, out loud, then waits for you to turn the mic on. Your choice is saved as that profile's
  default for next time. In question-practice mode, the app always continues by asking the next question right
  after correcting your answer — you never have to prompt it.
- **You can mix English and Hungarian in the same session — but the app only ever speaks English.** Pick EN or
  HU on the switch before each turn that needs it; either way, Claude reads the resulting text and classifies
  what you actually said:
  - Spoke English? Handled exactly as above: a natural reply plus a correction if you made a mistake.
  - Asked in Hungarian how to say something in English (e.g. *"Angolul hogy kell mondani: sajnos nem tudok
    időben ott lenni?"*)? That's **not** graded as a mistake. Instead the app speaks the English sentence
    slowly and clearly, adds a short **written** Hungarian note on register or an alternative phrasing, and
    invites you to say it back.
  - Just spoke Hungarian as your actual turn — an answer, a comment, anything — instead of asking how to say
    it? Also **not** graded as a mistake, treated the same way: the app shows the English version of what you
    said in writing under your bubble, speaks it aloud in English, and then genuinely continues the
    conversation in English (a real follow-up, not just "try saying it").

    Both of these show up in the session summary as **"Kért kifejezések"** (phrases you asked for) and feed
    into the vocabulary review list — never counted as errors.
  - Said something else in Hungarian that's *about* the conversation rather than content you're trying to say
    (e.g. *"mit jelent ez?"*, *"nem értem"*, *"mondd lassabban"*)? The spoken reply is still entirely in
    English — the app answers or rephrases at your level in simple English and keeps the conversation going;
    any Hungarian help it adds is written-only, never spoken.

  The EN/HU switch only controls *transcription accuracy* (which language the recognizer listens for); the
  actual classification — which of the three cases above applies — is always done by Claude on the finished
  transcript, regardless of which switch position you used to record it.

## Run the tests

The correction-parsing logic (`backend/src/lib/correctionParser.ts`, including the bilingual turnType/translation/
meta-question gating) has a full backend unit-test suite, and the pure frontend logic (transcript-segment merging
for the continuous mic, the turnType-aware spoken-sequence builder, the assistant-history composer, and
elapsed-time formatting) has its own frontend suite:

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
- **Voice name / ElevenLabs voice ID** — optional override. There's only one voice, since the app only ever speaks English.
- **Correction speech level** — off / on (default: on). When on, the corrected English sentence is spoken (slowly) before the reply on a turn with a mistake; the Hungarian explanation is never spoken, only shown in writing.
- **Speech speed** — 0.5x–1.5x, applied to whichever TTS engine is active (the corrected sentence is always read back a bit slower than this for emphasis).
- **Explanation language** — Hungarian (default) or English, for the one-line **written** correction explanations.
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
confused response can never mislabel a translation request as a graded mistake. `reply` is always English and
always what gets spoken aloud, for every turn type — `explanationHu`, `translation.hungarianNote`, and
`metaReplyHu` are Hungarian and are only ever shown in writing, never spoken. Corrections never leak into the
spoken reply — unless you explicitly type/say "explain" (or "magyarázd"), which lets the model explain inline
as part of that turn's reply (still in English).

## Troubleshooting

- **`npm install` fails building `better-sqlite3`** — it ships prebuilt binaries for common Node versions on Windows, so a plain `npm install` almost always works. If it still tries to compile from source, install the "Desktop development with C++" workload from [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and re-run `npm install`.
- **Mic button says "A böngésződ nem támogatja a hangfelismerést"** — your browser doesn't support the Web Speech API. Use Chrome or Edge. If an OpenAI key is set in Settings, the app automatically falls back to recording audio and transcribing it via Whisper instead.
- **"A mikrofon használatához engedélyt kell adnod"** — microphone permission was denied. Click the padlock/site-info icon in the address bar and allow microphone access for `localhost`, then reload.
- **Corrections never show up / chat errors out** — check that an Anthropic API key is saved in Settings; the app will show a banner if it's missing.
- **The app never answers, even though I stopped talking** — remember the mic is a toggle now: tap it again to stop listening and send. It intentionally never replies while the mic is still on.
- **iPhone mic still doesn't work after trusting the certificate** — double-check step 6 in "HTTPS for LAN / iOS mic access" (**Settings → General → About → Certificate Trust Settings**): installing the profile alone isn't enough, the toggle there also has to be switched on. Also confirm the URL bar shows `https://`, not `http://`.
- **"NET::ERR_CERT_COMMON_NAME_INVALID" / cert warnings after re-running `npm run generate-cert`** — your PC's LAN IP probably changed since the certificate was generated. Re-run the generate step (pass the new IP explicitly if needed), then re-trust it on every device again — see "HTTPS for LAN / iOS mic access".
- **Chrome/Edge still warns after importing the certificate on Windows** — you likely need to fully quit and reopen the browser (closing the last tab/window isn't enough); browsers cache certificate trust state per-process.

## Data storage

Profiles, session history, and mistakes are stored locally in `backend/data/sessions.sqlite3` (SQLite via
`better-sqlite3`) — each profile only ever sees its own sessions and summaries. Shared API keys live in
`backend/data/config.json`. Both files are gitignored — they live only on your machine. Profiles have no
passwords; anyone who can open the app on your network can pick any existing profile or create a new one.
