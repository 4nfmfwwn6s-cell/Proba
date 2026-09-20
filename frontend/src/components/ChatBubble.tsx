import type { ChatBubbleData } from "../types";
import { CorrectionBadge } from "./CorrectionBadge";

interface Props {
  bubble: ChatBubbleData;
}

export function ChatBubble({ bubble }: Props) {
  const isTranslationAnswer =
    bubble.role === "assistant" && bubble.turnType === "translation_request" && bubble.translation;
  const isMetaAnswer = bubble.role === "assistant" && bubble.turnType === "meta_question" && bubble.metaReplyHu;

  return (
    <div className={`bubble-row ${bubble.role}`}>
      <div className={`bubble${bubble.pending ? " pending" : ""}`}>
        {isTranslationAnswer && bubble.translation ? (
          <>
            <div className="translation-english">{bubble.translation.englishSentence}</div>
            {bubble.translation.hungarianNote && (
              <div className="translation-note">{bubble.translation.hungarianNote}</div>
            )}
            {bubble.content && <div className="translation-invite">{bubble.content}</div>}
          </>
        ) : isMetaAnswer ? (
          <>
            <div className="translation-note">{bubble.metaReplyHu}</div>
            {bubble.content && <div className="translation-invite">{bubble.content}</div>}
          </>
        ) : (
          bubble.content
        )}
      </div>
      {bubble.role === "user" &&
        !bubble.pending &&
        (bubble.turnType === "translation_request" ? (
          <span className="turn-type-badge">🌐 fordítás kérés</span>
        ) : bubble.turnType === "meta_question" ? (
          <span className="turn-type-badge">💬 kérdés magyarul</span>
        ) : (
          <CorrectionBadge correction={bubble.correction} />
        ))}
    </div>
  );
}
