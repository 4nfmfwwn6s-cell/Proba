import type { ChatTurnResult, Correction, ErrorType, InputLanguage, TranslationAnswer, TurnType } from "../types.js";

const VALID_ERROR_TYPES: ErrorType[] = [
  "grammar",
  "vocabulary",
  "word_order",
  "pronunciation_transcription",
  "other",
];

const VALID_TURN_TYPES: TurnType[] = ["conversation", "translation_request", "meta_question"];
const VALID_INPUT_LANGUAGES: InputLanguage[] = ["en", "hu"];

function isValidErrorType(value: unknown): value is ErrorType {
  return typeof value === "string" && (VALID_ERROR_TYPES as string[]).includes(value);
}

function isValidTurnType(value: unknown): value is TurnType {
  return typeof value === "string" && (VALID_TURN_TYPES as string[]).includes(value);
}

function isValidInputLanguage(value: unknown): value is InputLanguage {
  return typeof value === "string" && (VALID_INPUT_LANGUAGES as string[]).includes(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes a raw correction object (as returned by the LLM tool call, which
 * may be malformed, missing fields, or use slightly wrong types) into a
 * strict Correction, or null if there was no error to report.
 */
export function normalizeCorrection(raw: unknown): Correction | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const hasError = obj.hasError === true || obj.hasError === "true";
  if (!hasError) return null;

  const original = asTrimmedString(obj.original);
  const corrected = asTrimmedString(obj.corrected);
  const explanationHu = asTrimmedString(obj.explanationHu);
  const errorType = isValidErrorType(obj.errorType) ? obj.errorType : "other";

  // hasError=true but no actual diff/content given -> treat as no correction.
  if (!original || !corrected || original === corrected) {
    return null;
  }

  return {
    hasError: true,
    original,
    corrected,
    explanationHu: explanationHu || "Kis hiba volt a mondatban.",
    errorType,
  };
}

/**
 * Normalizes a raw translation-answer object into a strict TranslationAnswer,
 * or null if there's no usable English sentence in it.
 */
export function normalizeTranslation(raw: unknown): TranslationAnswer | null {
  if (raw === null || raw === undefined || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const englishSentence = asTrimmedString(obj.englishSentence);
  const hungarianNote = asTrimmedString(obj.hungarianNote);

  if (!englishSentence) return null;

  return { englishSentence, hungarianNote };
}

export type ParsedChatResult = ChatTurnResult;

const FALLBACK_RESULT: ParsedChatResult = {
  reply: "Sorry, I had trouble understanding that. Could you say it again?",
  correction: null,
  inputLanguage: "en",
  turnType: "conversation",
  translation: null,
  metaReplyHu: null,
};

/**
 * Parses/validates the raw JSON object produced by the LLM (tool-use input,
 * or a JSON.parse of text output) into a safe ParsedChatResult. Never
 * throws: malformed input degrades to a safe fallback reply with no
 * correction, so a bad model response never crashes the conversation loop.
 *
 * Fields are gated by turnType: correction only applies to "conversation",
 * translation only to "translation_request", and metaReplyHu only to
 * "meta_question" - any mismatched data from the model is dropped rather
 * than trusted, so a confused model response can't corrupt the session
 * summary (e.g. a "mistake" logged for a Hungarian translation request).
 */
export function parseChatResult(raw: unknown): ParsedChatResult {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return { ...FALLBACK_RESULT };
  }

  const obj = raw as Record<string, unknown>;
  const reply = asTrimmedString(obj.reply) || FALLBACK_RESULT.reply;
  const inputLanguage = isValidInputLanguage(obj.inputLanguage) ? obj.inputLanguage : "en";
  const turnType = isValidTurnType(obj.turnType) ? obj.turnType : "conversation";

  const correction = turnType === "conversation" ? normalizeCorrection(obj.correction) : null;
  const translation = turnType === "translation_request" ? normalizeTranslation(obj.translation) : null;
  const metaReplyHuRaw = turnType === "meta_question" ? asTrimmedString(obj.metaReplyHu) : "";
  const metaReplyHu = metaReplyHuRaw || null;

  return { reply, correction, inputLanguage, turnType, translation, metaReplyHu };
}

/**
 * Parses a JSON string that may or may not be valid JSON (e.g. text output
 * from a model that ignored the tool-use instructions). Returns a safe
 * fallback on any parse failure.
 */
export function parseChatResultFromString(jsonText: string): ParsedChatResult {
  try {
    const parsed = JSON.parse(jsonText);
    return parseChatResult(parsed);
  } catch {
    return { ...FALLBACK_RESULT };
  }
}
