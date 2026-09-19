import { useState } from "react";
import type { ConversationMode, Difficulty } from "../types";
import { MODE_LABELS } from "../types";

const MODES = Object.keys(MODE_LABELS) as ConversationMode[];
const DIFFICULTIES: Difficulty[] = ["A2", "B1", "B2"];

interface Props {
  onStart: (mode: ConversationMode, difficulty: Difficulty) => void;
  starting: boolean;
}

export function ModeSelect({ onStart, starting }: Props) {
  const [mode, setMode] = useState<ConversationMode>("free_chat");
  const [difficulty, setDifficulty] = useState<Difficulty>("B1");

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

      <button className="primary-button" disabled={starting} onClick={() => onStart(mode, difficulty)}>
        {starting ? "Indítás..." : "Beszélgetés indítása"}
      </button>
    </div>
  );
}
