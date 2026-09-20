import { useEffect, useRef, useState } from "react";
import type { ConversationMode, Difficulty, Starter } from "../types";
import { MODE_LABELS } from "../types";

const MODES = Object.keys(MODE_LABELS) as ConversationMode[];
const DIFFICULTIES: Difficulty[] = ["A2", "B1", "B2"];

interface Props {
  onStart: (mode: ConversationMode, difficulty: Difficulty, starter: Starter) => void;
  starting: boolean;
  defaultStarter: Starter;
  onStarterChange: (starter: Starter) => void;
}

export function ModeSelect({ onStart, starting, defaultStarter, onStarterChange }: Props) {
  const [mode, setMode] = useState<ConversationMode>("free_chat");
  const [difficulty, setDifficulty] = useState<Difficulty>("B1");
  const [starter, setStarter] = useState<Starter>(defaultStarter);

  // The profile's stored default arrives asynchronously (after a settings
  // fetch), so apply it once as soon as it's known, without clobbering a
  // choice the user already made in the meantime.
  const appliedDefaultRef = useRef(false);
  useEffect(() => {
    if (!appliedDefaultRef.current) {
      appliedDefaultRef.current = true;
      setStarter(defaultStarter);
    }
  }, [defaultStarter]);

  function handleStarterSelect(value: Starter) {
    setStarter(value);
    onStarterChange(value);
  }

  return (
    <div className="setup-screen">
      <div>
        <div className="section-title">Válassz beszélgetési módot</div>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-card${m === mode ? " selected" : ""}`}
              onClick={() => setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="section-title">Nehézségi szint</div>
        <div className="difficulty-row">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              className={`difficulty-pill${d === difficulty ? " selected" : ""}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="section-title">Ki kezdi a beszélgetést?</div>
        <div className="difficulty-row">
          <button
            type="button"
            className={`difficulty-pill${starter === "user" ? " selected" : ""}`}
            onClick={() => handleStarterSelect("user")}
          >
            Én kezdek
          </button>
          <button
            type="button"
            className={`difficulty-pill${starter === "app" ? " selected" : ""}`}
            onClick={() => handleStarterSelect("app")}
          >
            Az alkalmazás kezd
          </button>
        </div>
      </div>

      <button className="primary-button" disabled={starting} onClick={() => onStart(mode, difficulty, starter)}>
        {starting ? "Indítás..." : "Beszélgetés indítása"}
      </button>
    </div>
  );
}
