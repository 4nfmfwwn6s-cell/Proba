import type { SessionSummary as SessionSummaryType } from "../types";
import { ERROR_TYPE_LABELS } from "../types";
import type { ErrorType } from "../types";

interface Props {
  summary: SessionSummaryType;
  onDone: () => void;
  doneLabel?: string;
}

export function SessionSummary({ summary, onDone, doneLabel = "Új beszélgetés" }: Props) {
  const types = Object.keys(summary.mistakesByType) as ErrorType[];

  return (
    <div className="setup-screen">
      <div className="summary-card">
        <div className="section-title">Összes hiba ebben a beszélgetésben</div>
        <div className="summary-stat">{summary.totalMistakes}</div>
      </div>

      {types.length > 0 && (
        <div className="summary-card">
          <div className="section-title">Hibák típus szerint</div>
          {types.map((type) => (
            <div className="mistake-group" key={type}>
              <h4>
                {ERROR_TYPE_LABELS[type] ?? type} ({summary.mistakesByType[type].length})
              </h4>
              {summary.mistakesByType[type].map((c, idx) => (
                <div className="mistake-item" key={idx}>
                  <span className="correction-box-inline">
                    <s>{c.original}</s> → <strong>{c.corrected}</strong>
                  </span>
                  <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{c.explanationHu}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {summary.vocabReview.length > 0 && (
        <div className="summary-card">
          <div className="section-title">5 szó/kifejezés, amit érdemes átnézni</div>
          <div className="vocab-list">
            {summary.vocabReview.map((v, idx) => (
              <span className="vocab-chip" key={idx}>
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.totalMistakes === 0 && <div className="banner info">Nagyszerű! Nem volt hiba ebben a beszélgetésben. 🎉</div>}

      <button className="primary-button" onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}
