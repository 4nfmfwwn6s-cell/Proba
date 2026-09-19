export type Difficulty = "A2" | "B1" | "B2";

export type ConversationMode =
  | "free_chat"
  | "roleplay_restaurant"
  | "roleplay_airport"
  | "roleplay_job_interview"
  | "roleplay_doctor"
  | "roleplay_phone_call"
  | "question_practice";

export type ErrorType =
  | "grammar"
  | "vocabulary"
  | "word_order"
  | "pronunciation_transcription"
  | "other";

export interface Correction {
  hasError: boolean;
  original: string;
  corrected: string;
  explanationHu: string;
  errorType: ErrorType | null;
}

export interface ChatTurnResult {
  reply: string;
  correction: Correction | null;
}

export interface AppConfig {
  anthropicApiKey: string;
  elevenLabsApiKey: string;
  openaiApiKey: string;
  ttsProvider: "browser" | "elevenlabs" | "openai";
  ttsVoice: string;
  speechSpeed: number;
  explanationLanguage: "hu" | "en";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionRecord {
  id: number;
  mode: ConversationMode;
  difficulty: Difficulty;
  startedAt: string;
  endedAt: string | null;
}

export interface TurnRecord {
  id: number;
  sessionId: number;
  role: "user" | "assistant";
  content: string;
  correction: Correction | null;
  createdAt: string;
}
