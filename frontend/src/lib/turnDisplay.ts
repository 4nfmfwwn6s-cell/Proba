import type { ChatTurnResult } from "../types";

/**
 * Composes the text pushed into the client-side conversation history for an
 * assistant turn. For a plain conversation turn this is just the reply, but
 * for a translation_request/meta_question turn the reply alone would lose
 * what was actually taught (the translated sentence, or the Hungarian
 * answer) - so those get folded in, giving Claude full context on later
 * turns. Mirrors the backend's buildAssistantDisplayContent (chat.ts), which
 * does the same for the persisted session-history view.
 */
export function buildAssistantHistoryText(
  result: Pick<ChatTurnResult, "reply" | "turnType" | "translation" | "metaReplyHu">
): string {
  if (result.turnType === "translation_request" && result.translation) {
    const note = result.translation.hungarianNote ? ` (${result.translation.hungarianNote})` : "";
    return `${result.translation.englishSentence}${note} ${result.reply}`.trim();
  }
  if (result.turnType === "meta_question" && result.metaReplyHu) {
    return `${result.metaReplyHu} ${result.reply}`.trim();
  }
  return result.reply;
}
