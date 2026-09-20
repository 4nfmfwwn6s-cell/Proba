import type { ChatTurnResult, Correction, CorrectionSpeechLevel } from "../types";

// Every spoken part is always in English - the Hungarian explanation,
// translation note, and meta-question note are shown in writing only, never
// spoken. So a SpeechPart doesn't need a language tag.
export interface SpeechPart {
  text: string;
  rate: number;
}

// The corrected sentence is read back deliberately slower than normal
// conversational pace, so it stands out as something to pay attention to.
const SLOW_RATE_MULTIPLIER = 0.8;

/**
 * Builds the ordered sequence of TTS parts for one assistant turn: the
 * corrected English sentence (slow), if correction speech is on and there
 * was a mistake, followed by the normal reply. The Hungarian explanation is
 * never spoken - it's shown in writing only, under the learner's bubble.
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

  if (correction && level === "on") {
    parts.push({ text: correction.corrected, rate: baseSpeed * SLOW_RATE_MULTIPLIER });
  }

  parts.push({ text: replyText, rate: baseSpeed });

  return parts;
}

/**
 * Builds the spoken sequence for a full chat turn result, dispatching on
 * turnType: a translation_request speaks the English sentence (slow) then
 * the invite; a meta_question just speaks the (English) reply; a plain
 * conversation turn defers to buildSpokenSequence (correction-level gated,
 * as above). The Hungarian note/explanation is never spoken for any turn
 * type - only ever shown in writing.
 */
export function buildSpokenSequenceForTurn(
  result: Pick<ChatTurnResult, "reply" | "correction" | "turnType" | "translation" | "metaReplyHu">,
  level: CorrectionSpeechLevel,
  baseSpeed: number
): SpeechPart[] {
  if (result.turnType === "translation_request" && result.translation) {
    const parts: SpeechPart[] = [
      { text: result.translation.englishSentence, rate: baseSpeed * SLOW_RATE_MULTIPLIER },
    ];
    if (result.reply) parts.push({ text: result.reply, rate: baseSpeed });
    return parts;
  }

  if (result.turnType === "meta_question") {
    return result.reply ? [{ text: result.reply, rate: baseSpeed }] : [];
  }

  return buildSpokenSequence(result.reply, result.correction, level, baseSpeed);
}
