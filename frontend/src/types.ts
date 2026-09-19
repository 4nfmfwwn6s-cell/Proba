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

export interface PublicSettings {
  hasAnthropicKey: boolean;
  hasElevenLabsKey: boolean;
  hasOpenaiKey: boolean;
  ttsProvider: "browser" | "elevenlabs" | "openai";
  ttsVoice: string;
  speechSpeed: number;
  explanationLanguage: "hu" | "en";
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
