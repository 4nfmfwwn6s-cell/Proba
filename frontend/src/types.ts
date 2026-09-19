export type Difficulty = "A2" | "B1" | "B2";

export type ConversationMode =
  | "free_chat"
  | "roleplay_restaurant"
  | "roleplay_airport"
  | "roleplay_job_interview"
  | "roleplay_doctor"
  | "roleplay_phone_call"
  | "question_practice";

export type ErrorType = "grammar" | "vocabulary" | "word_order" | "pronunciation_transcription" | "other";

export interface Correction {
  hasError: boolean;
  original: string;
  corrected: string;
  explanationHu: string;
  errorType: ErrorType | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatBubbleData {
  id: string;
  role: "user" | "assistant";
  content: string;
  correction?: Correction | null;
  pending?: boolean;
}

export interface ChatTurnResult {
  reply: string;
  correction: Correction | null;
}

export interface GlobalKeySettings {
  hasAnthropicKey: boolean;
  hasElevenLabsKey: boolean;
  hasOpenaiKey: boolean;
}

export type CorrectionSpeechLevel = "off" | "corrected_only" | "corrected_and_explanation";

export type Starter = "user" | "app";

// Global key-presence flags plus the active profile's own preferences.
export interface ProfileSettings extends GlobalKeySettings {
  ttsProvider: "browser" | "elevenlabs" | "openai";
  ttsVoice: string;
  huTtsVoice: string;
  speechSpeed: number;
  explanationLanguage: "hu" | "en";
  correctionSpeechLevel: CorrectionSpeechLevel;
  defaultStarter: Starter;
}

export interface Profile {
  id: number;
  name: string;
}

export interface SessionSummary {
  totalMistakes: number;
  mistakesByType: Record<string, Correction[]>;
  vocabReview: string[];
}

export interface SessionListItem {
  id: number;
  mode: ConversationMode;
  difficulty: Difficulty;
  startedAt: string;
  endedAt: string | null;
}

export const MODE_LABELS: Record<ConversationMode, string> = {
  free_chat: "Szabad beszélgetés",
  roleplay_restaurant: "Szerepjáték: Étterem",
  roleplay_airport: "Szerepjáték: Repülőtér",
  roleplay_job_interview: "Szerepjáték: Állásinterjú",
  roleplay_doctor: "Szerepjáték: Orvosnál",
  roleplay_phone_call: "Szerepjáték: Telefonhívás",
  question_practice: "Kérdés-gyakorlás",
};

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  grammar: "Nyelvtan",
  vocabulary: "Szókincs",
  word_order: "Szórend",
  pronunciation_transcription: "Kiejtés / leírás",
  other: "Egyéb",
};

export const CORRECTION_SPEECH_LABELS: Record<CorrectionSpeechLevel, string> = {
  off: "Kikapcsolva",
  corrected_only: "Csak a javított mondat felolvasása",
  corrected_and_explanation: "Javított mondat + magyar magyarázat felolvasása",
};
