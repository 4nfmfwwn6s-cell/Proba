import type { MicLanguage } from "../types";

interface Props {
  value: MicLanguage;
  onChange: (lang: MicLanguage) => void;
  disabled: boolean;
}

export function LanguageSwitch({ value, onChange, disabled }: Props) {
  return (
    <div className="lang-switch" role="group" aria-label="Felismerés nyelve" title="Felismerés nyelve (Alt+L)">
      <button
        type="button"
        className={`lang-switch-btn${value === "en" ? " selected" : ""}`}
        onClick={() => onChange("en")}
        disabled={disabled}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-switch-btn${value === "hu" ? " selected" : ""}`}
        onClick={() => onChange("hu")}
        disabled={disabled}
      >
        HU
      </button>
    </div>
  );
}
