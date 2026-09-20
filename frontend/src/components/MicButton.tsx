interface Props {
  isListening: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function MicButton({ isListening, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className={`mic-button${isListening ? " listening" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={isListening ? "Felvétel leállítása" : "Beszéd indítása"}
    >
      {isListening ? "⏹" : "🎤"}
    </button>
  );
}
