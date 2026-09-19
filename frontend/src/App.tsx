import { useCallback, useEffect, useRef, useState } from "react";
import { ModeSelect } from "./components/ModeSelect";
import { ChatBubble } from "./components/ChatBubble";
import { MicButton } from "./components/MicButton";
import { SettingsPage } from "./components/SettingsPage";
import { SessionSummary } from "./components/SessionSummary";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { createSession, endSession, getSession, getSettings, listSessions, sendChatTurn } from "./api";
import type { ChatBubbleData, ChatMessage, ConversationMode, Difficulty, PublicSettings, SessionListItem, SessionSummary as SessionSummaryType } from "./types";
import { MODE_LABELS } from "./types";

type Screen = "setup" | "chat" | "summary" | "settings" | "history" | "historyDetail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [starting, setStarting] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [mode, setMode] = useState<ConversationMode>("free_chat");
  const [difficulty, setDifficulty] = useState<Difficulty>("B1");
  const [bubbles, setBubbles] = useState<ChatBubbleData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [summary, setSummary] = useState<SessionSummaryType | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);

  const historyRef = useRef<ChatMessage[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const { speak } = useSpeechSynthesis(settings);

  const onResult = useCallback(
    async (text: string) => {
      setError(null);
      const userBubbleId = `u-${Date.now()}`;
      setBubbles((prev) => [...prev, { id: userBubbleId, role: "user", content: text }]);

      const nextHistory: ChatMessage[] = [...historyRef.current, { role: "user", content: text }];
      historyRef.current = nextHistory;

      if (sessionId === null) return;

      setIsSending(true);
      try {
        const result = await sendChatTurn(sessionId, nextHistory);
        setBubbles((prev) =>
          prev.map((b) => (b.id === userBubbleId ? { ...b, correction: result.correction } : b))
        );
        const assistantBubbleId = `a-${Date.now()}`;
        setBubbles((prev) => [...prev, { id: assistantBubbleId, role: "assistant", content: result.reply }]);
        historyRef.current = [...historyRef.current, { role: "assistant", content: result.reply }];
        speak(result.reply);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Hiba történt a válasz lekérésekor.");
      } finally {
        setIsSending(false);
      }
    },
    [sessionId, speak]
  );

  const onSpeechError = useCallback((message: string) => setError(message), []);

  const { method, isListening, start, stop } = useSpeechRecognition({ onResult, onError: onSpeechError });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles]);

  async function handleStart(selectedMode: ConversationMode, selectedDifficulty: Difficulty) {
    setStarting(true);
    setError(null);
    try {
      const session = await createSession(selectedMode, selectedDifficulty);
      setSessionId(session.sessionId);
      setMode(selectedMode);
      setDifficulty(selectedDifficulty);
      setBubbles([]);
      historyRef.current = [];
      setScreen("chat");
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
    try {
      const list = await listSessions();
      setSessions(list);
      setScreen("history");
    } catch {
      setError("Nem sikerült betölteni az előzményeket.");
    }
  }

  async function openHistoryDetail(id: number) {
    try {
      const detail = await getSession(id);
      setSummary(detail.summary);
      setScreen("historyDetail");
    } catch {
      setError("Nem sikerült betölteni a beszélgetést.");
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🗣️ English Coach</h1>
        <div style={{ display: "flex", gap: 4 }}>
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

        {screen === "setup" && <ModeSelect onStart={handleStart} starting={starting} />}

        {screen === "settings" && <SettingsPage onClose={() => setScreen("setup")} />}

        {screen === "history" && (
          <div className="setup-screen">
            <div className="section-title">Korábbi beszélgetések</div>
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
              <MicButton
                isListening={isListening}
                disabled={isSending || method === "none"}
                onClick={() => (isListening ? stop() : start())}
              />
              <div className="mic-status">
                {method === "none"
                  ? "A böngésződ nem támogatja a hangfelismerést."
                  : isSending
                    ? "Gondolkodom..."
                    : isListening
                      ? "Hallgatlak..."
                      : "Koppints és beszélj"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
