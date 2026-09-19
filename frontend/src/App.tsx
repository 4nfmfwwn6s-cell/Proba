import { useCallback, useEffect, useRef, useState } from "react";
import { ModeSelect } from "./components/ModeSelect";
import { ChatBubble } from "./components/ChatBubble";
import { MicButton } from "./components/MicButton";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { SettingsPage } from "./components/SettingsPage";
import { SessionSummary } from "./components/SessionSummary";
import { ProfileSelect } from "./components/ProfileSelect";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { buildSpokenSequenceForTurn } from "./lib/correctionSpeech";
import { buildAssistantHistoryText } from "./lib/turnDisplay";
import { formatElapsed } from "./lib/format";
import {
  createSession,
  endSession,
  getOpeningReply,
  getProfileSettings,
  getSession,
  listSessions,
  sendChatTurn,
  updateProfileSettings,
} from "./api";
import type {
  ChatBubbleData,
  ChatMessage,
  ConversationMode,
  Difficulty,
  MicLanguage,
  Profile,
  ProfileSettings,
  SessionListItem,
  SessionSummary as SessionSummaryType,
  Starter,
} from "./types";
import { MODE_LABELS } from "./types";

type Screen = "profile" | "setup" | "chat" | "summary" | "settings" | "history" | "historyDetail";

const PROFILE_STORAGE_KEY = "englishCoachProfile";

function loadStoredProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (typeof parsed.id === "number" && typeof parsed.name === "string") {
      return { id: parsed.id, name: parsed.name };
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadStoredProfile());
  const [screen, setScreen] = useState<Screen>(() => (loadStoredProfile() ? "setup" : "profile"));
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [starting, setStarting] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [mode, setMode] = useState<ConversationMode>("free_chat");
  const [difficulty, setDifficulty] = useState<Difficulty>("B1");
  const [bubbles, setBubbles] = useState<ChatBubbleData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [summary, setSummary] = useState<SessionSummaryType | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  // Speech-recognition language for the next mic turn, chosen via the EN/HU
  // switch next to the mic button (or Alt+L). Always defaults back to EN
  // after a HU turn - see onResult below.
  const [micLang, setMicLang] = useState<MicLanguage>("en");

  const historyRef = useRef<ChatMessage[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<ProfileSettings | null>(null);
  settingsRef.current = settings;

  useEffect(() => {
    if (!profile) return;
    getProfileSettings(profile.id)
      .then(setSettings)
      .catch(() => {});
  }, [profile]);

  const { speak, speakSequence, stop: stopSpeaking } = useSpeechSynthesis(settings);

  const onResult = useCallback(
    async (text: string) => {
      setError(null);
      // Default is EN; a HU turn always reverts the switch back to EN for
      // the next turn, so HU has to be chosen again each time it's needed.
      setMicLang((prev) => (prev === "hu" ? "en" : prev));
      const userBubbleId = `u-${Date.now()}`;
      setBubbles((prev) => [...prev, { id: userBubbleId, role: "user", content: text }]);

      const nextHistory: ChatMessage[] = [...historyRef.current, { role: "user", content: text }];
      historyRef.current = nextHistory;

      if (sessionId === null) return;

      setIsSending(true);
      try {
        const result = await sendChatTurn(sessionId, nextHistory);
        setBubbles((prev) =>
          prev.map((b) =>
            b.id === userBubbleId ? { ...b, correction: result.correction, turnType: result.turnType } : b
          )
        );
        const assistantBubbleId = `a-${Date.now()}`;
        setBubbles((prev) => [
          ...prev,
          {
            id: assistantBubbleId,
            role: "assistant",
            content: result.reply,
            turnType: result.turnType,
            translation: result.translation,
            metaReplyHu: result.metaReplyHu,
          },
        ]);
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: buildAssistantHistoryText(result) },
        ];

        const level = settingsRef.current?.correctionSpeechLevel ?? "on";
        const baseSpeed = settingsRef.current?.speechSpeed ?? 1.0;
        const parts = buildSpokenSequenceForTurn(result, level, baseSpeed);
        void speakSequence(parts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Hiba történt a válasz lekérésekor.");
      } finally {
        setIsSending(false);
      }
    },
    [sessionId, speakSequence]
  );

  const onSpeechError = useCallback((message: string) => setError(message), []);

  const { method, isListening, partialTranscript, elapsedSeconds, start, stop } = useSpeechRecognition({
    onResult,
    onError: onSpeechError,
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  function handleProfileSelected(selected: Profile) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(selected));
    setProfile(selected);
    setScreen("setup");
  }

  function handleSwitchProfile() {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfile(null);
    setSettings(null);
    setSessionId(null);
    setBubbles([]);
    historyRef.current = [];
    setScreen("profile");
  }

  function handleStarterChange(starter: Starter) {
    if (!profile) return;
    setSettings((prev) => (prev ? { ...prev, defaultStarter: starter } : prev));
    updateProfileSettings(profile.id, { defaultStarter: starter }).catch(() => {});
  }

  function handleMicToggle() {
    if (isListening) {
      stop();
    } else {
      stopSpeaking();
      start(micLang);
    }
  }

  const micLangLocked = isSending || starting || isListening || method === "none";

  // Alt+L toggles the EN/HU mic language switch, while on the chat screen
  // and not mid-turn (mirrors the switch's own disabled state).
  useEffect(() => {
    if (screen !== "chat" || micLangLocked) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setMicLang((prev) => (prev === "en" ? "hu" : "en"));
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [screen, micLangLocked]);

  async function handleStart(selectedMode: ConversationMode, selectedDifficulty: Difficulty, starter: Starter) {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const session = await createSession(profile.id, selectedMode, selectedDifficulty);
      setSessionId(session.sessionId);
      setMode(selectedMode);
      setDifficulty(selectedDifficulty);
      setBubbles([]);
      historyRef.current = [];
      setMicLang("en");
      setScreen("chat");

      if (starter === "app") {
        const opening = await getOpeningReply(session.sessionId);
        const assistantBubbleId = `a-${Date.now()}`;
        setBubbles([{ id: assistantBubbleId, role: "assistant", content: opening.reply }]);
        historyRef.current = [{ role: "assistant", content: opening.reply }];
        speak(opening.reply);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nem sikerült elindítani a beszélgetést.");
    } finally {
      setStarting(false);
    }
  }

  async function handleEndSession() {
    if (sessionId === null) return;
    try {
      const result = await endSession(sessionId);
      setSummary(result.summary);
      setScreen("summary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nem sikerült lezárni a beszélgetést.");
    }
  }

  async function openHistory() {
    if (!profile) return;
    try {
      const list = await listSessions(profile.id);
      setSessions(list);
      setScreen("history");
    } catch {
      setError("Nem sikerült betölteni az előzményeket.");
    }
  }

  async function openHistoryDetail(id: number) {
    if (!profile) return;
    try {
      const detail = await getSession(id, profile.id);
      setSummary(detail.summary);
      setScreen("historyDetail");
    } catch {
      setError("Nem sikerült betölteni a beszélgetést.");
    }
  }

  if (screen === "profile" || !profile) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🗣️ English Coach</h1>
        </header>
        <div className="main">
          {error && <div className="banner error">{error}</div>}
          <ProfileSelect onSelect={handleProfileSelected} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🗣️ English Coach</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button className="text-link-button" onClick={handleSwitchProfile} title="Profil váltása">
            👤 {profile.name}
          </button>
          {screen === "setup" && (
            <button className="icon-button" onClick={openHistory} aria-label="Előzmények">
              📜
            </button>
          )}
          <button className="icon-button" onClick={() => setScreen("settings")} aria-label="Beállítások">
            ⚙️
          </button>
        </div>
      </header>

      <div className="main">
        {error && <div className="banner error">{error}</div>}
        {settings && !settings.hasAnthropicKey && screen !== "settings" && (
          <div className="banner info">
            Nincs beállítva Anthropic API kulcs. Kattints a ⚙️ ikonra a beállításokhoz.
          </div>
        )}

        {screen === "setup" && (
          <ModeSelect
            onStart={handleStart}
            starting={starting}
            defaultStarter={settings?.defaultStarter ?? "user"}
            onStarterChange={handleStarterChange}
          />
        )}

        {screen === "settings" && (
          <SettingsPage
            profileId={profile.id}
            profileName={profile.name}
            onClose={() => setScreen("setup")}
            onSettingsChanged={setSettings}
          />
        )}

        {screen === "history" && (
          <div className="setup-screen">
            <div className="section-title">Korábbi beszélgetések - {profile.name}</div>
            {sessions.length === 0 && <div>Még nincs mentett beszélgetés.</div>}
            {sessions.map((s) => (
              <div className="session-list-item" key={s.id} onClick={() => openHistoryDetail(s.id)}>
                <div className="title">{MODE_LABELS[s.mode]}</div>
                <div className="subtitle">
                  {s.difficulty} · {new Date(s.startedAt).toLocaleString("hu-HU")}
                </div>
              </div>
            ))}
            <button className="secondary-button" onClick={() => setScreen("setup")}>
              Vissza
            </button>
          </div>
        )}

        {screen === "historyDetail" && summary && (
          <SessionSummary summary={summary} onDone={() => setScreen("history")} doneLabel="Vissza az előzményekhez" />
        )}

        {screen === "summary" && summary && (
          <SessionSummary
            summary={summary}
            onDone={() => {
              setSummary(null);
              setSessionId(null);
              setScreen("setup");
            }}
          />
        )}

        {screen === "chat" && (
          <div className="chat-screen">
            <div className="chat-topbar">
              <span className="meta">
                {MODE_LABELS[mode]} · {difficulty}
              </span>
              <button className="text-link-button" onClick={handleEndSession}>
                Beszélgetés befejezése
              </button>
            </div>

            <div className="chat-log">
              {bubbles.length === 0 && (
                <div className="banner info">Nyomd meg a mikrofon gombot és kezdj el beszélni angolul!</div>
              )}
              {bubbles.map((b) => (
                <ChatBubble key={b.id} bubble={b} />
              ))}
              <div ref={logEndRef} />
            </div>

            <div className="mic-area">
              <div className="mic-controls-row">
                <LanguageSwitch value={micLang} onChange={setMicLang} disabled={micLangLocked} />
                <MicButton
                  isListening={isListening}
                  disabled={isSending || starting || method === "none"}
                  onClick={handleMicToggle}
                />
              </div>
              {isListening && (
                <div className="recording-indicator">
                  <span className="recording-dot" />
                  Felvétel... {formatElapsed(elapsedSeconds)}
                </div>
              )}
              {isListening && partialTranscript && <div className="partial-transcript">{partialTranscript}</div>}
              <div className="mic-status">
                {method === "none"
                  ? "A böngésződ nem támogatja a hangfelismerést."
                  : isSending
                    ? "Gondolkodom..."
                    : isListening
                      ? "Hallgatlak, koppints ismét a leállításhoz..."
                      : "Koppints és beszélj"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
