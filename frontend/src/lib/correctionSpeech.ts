import type { ChatTurnResult, Correction, CorrectionSpeechLevel } from "../types";

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

/**
 * Builds the spoken sequence for a full chat turn result, dispatching on
 * turnType: a translation_request always speaks the English sentence (slow),
 * then the Hungarian note, then the invite; a meta_question always speaks
 * the Hungarian answer then the English steer-back; a plain conversation
 * turn defers to buildSpokenSequence (correction-level gated, as above).
 * Unlike corrections, translation/meta answers are always spoken - they
 * aren't gated by the correction-speech-level setting.
 */
export function buildSpokenSequenceForTurn(
  result: Pick<ChatTurnResult, "reply" | "correction" | "turnType" | "translation" | "metaReplyHu">,
  level: CorrectionSpeechLevel,
  baseSpeed: number
): SpeechPart[] {
  if (result.turnType === "translation_request" && result.translation) {
    const parts: SpeechPart[] = [
      { text: result.translation.englishSentence, lang: "en", rate: baseSpeed * SLOW_RATE_MULTIPLIER },
    ];
    if (result.translation.hungarianNote) {
      parts.push({ text: result.translation.hungarianNote, lang: "hu", rate: baseSpeed });
    }
    if (result.reply) parts.push({ text: result.reply, lang: "en", rate: baseSpeed });
    return parts;
  }

  if (result.turnType === "meta_question") {
    const parts: SpeechPart[] = [];
    if (result.metaReplyHu) parts.push({ text: result.metaReplyHu, lang: "hu", rate: baseSpeed });
    if (result.reply) parts.push({ text: result.reply, lang: "en", rate: baseSpeed });
    return parts;
  }

  return buildSpokenSequence(result.reply, result.correction, level, baseSpeed);
}
