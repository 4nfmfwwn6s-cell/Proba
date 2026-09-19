import type { Correction } from "../types";
import { ERROR_TYPE_LABELS } from "../types";

interface Props {
  correction: Correction | null | undefined;
}

export function CorrectionBadge({ correction }: Props) {
  if (correction === undefined) return null;

  if (correction === null) {
    return <div className="correction-ok" title="Helyes mondat">✅</div>;
  }

  return (
    <div className="correction-box">
      <div className="arrow-line">
        <span className="original">{correction.original}</span> →{" "}
        <span className="corrected">{correction.corrected}</span>
      </div>
      <div className="explanation">
        {correction.explanationHu}
        {correction.errorType ? ` (${ERROR_TYPE_LABELS[correction.errorType]})` : ""}
      </div>
    </div>
  );
}
