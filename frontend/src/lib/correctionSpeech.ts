import type { Correction, CorrectionSpeechLevel } from "../types";

export interface SpeechPart {
  text: string;
  lang: "en" | "hu";
  rate: number;
}

// The corrected sentence is read back deliberately slower than normal
// conversational pace, so it stands out as something to pay attention to.
const SLOW_RATE_MULTIPLIER = 0.8;

/**
 * Builds the ordered sequence of TTS parts for one assistant turn: the
 * corrected sentence (slow, English) and/or the Hungarian explanation - per
 * the profile's correction-speech level - followed by the normal reply.
 * Pure and DOM-free so it's easy to unit test independently of the Web
 * Speech / audio playback machinery.
 */
export function buildSpokenSequence(
  replyText: string,
  correction: Correction | null,
  level: CorrectionSpeechLevel,
  baseSpeed: number
): SpeechPart[] {
  const parts: SpeechPart[] = [];

  if (correction && level !== "off") {
    parts.push({ text: correction.corrected, lang: "en", rate: baseSpeed * SLOW_RATE_MULTIPLIER });
    if (level === "corrected_and_explanation") {
      parts.push({ text: correction.explanationHu, lang: "hu", rate: baseSpeed });
    }
  }

  parts.push({ text: replyText, lang: "en", rate: baseSpeed });

  return parts;
}
