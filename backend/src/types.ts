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

export type InputLanguage = "en" | "hu";

export type TurnType = "conversation" | "translation_request" | "meta_question";

export interface TranslationAnswer {
  englishSentence: string;
  hungarianNote: string;
}

export interface ChatTurnResult {
  reply: string;
  correction: Correction | null;
  inputLanguage: InputLanguage;
  turnType: TurnType;
  // Only set when turnType === "translation_request".
  translation: TranslationAnswer | null;
  // Only set when turnType === "meta_question".
  metaReplyHu: string | null;
}

// Shared secrets/config, global across all profiles (never sent to the browser).
export interface AppConfig {
  anthropicApiKey: string;
  elevenLabsApiKey: string;
  openaiApiKey: string;
}

export type TtsProvider = "browser" | "elevenlabs" | "openai";

export type CorrectionSpeechLevel = "off" | "corrected_only" | "corrected_and_explanation";

export type Starter = "user" | "app";

// Per-user preferences, stored per profile in SQLite.
export interface ProfilePrefs {
  ttsProvider: TtsProvider;
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionRecord {
  id: number;
  profileId: number;
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
