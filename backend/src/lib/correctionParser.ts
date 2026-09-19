import type { Correction, ErrorType } from "../types.js";

const VALID_ERROR_TYPES: ErrorType[] = [
  "grammar",
  "vocabulary",
  "word_order",
  "pronunciation_transcription",
  "other",
];

function isValidErrorType(value: unknown): value is ErrorType {
  return typeof value === "string" && (VALID_ERROR_TYPES as string[]).includes(value);
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

export interface RawModelOutput {
  reply?: unknown;
  correction?: unknown;
}

export interface ParsedChatResult {
  reply: string;
  correction: Correction | null;
}

const FALLBACK_REPLY =
  "Sorry, I had trouble understanding that. Could you say it again?";

/**
 * Parses/validates the raw JSON object produced by the LLM (tool-use input,
 * or a JSON.parse of text output) into a safe ParsedChatResult. Never
 * throws: malformed input degrades to a safe fallback reply with no
 * correction, so a bad model response never crashes the conversation loop.
 */
export function parseChatResult(raw: unknown): ParsedChatResult {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return { reply: FALLBACK_REPLY, correction: null };
  }

  const obj = raw as RawModelOutput;
  const reply = asTrimmedString(obj.reply) || FALLBACK_REPLY;
  const correction = normalizeCorrection(obj.correction);

  return { reply, correction };
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
    return { reply: FALLBACK_REPLY, correction: null };
  }
}
