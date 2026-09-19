import type { ChatBubbleData } from "../types";
import { CorrectionBadge } from "./CorrectionBadge";

interface Props {
  bubble: ChatBubbleData;
}

export function ChatBubble({ bubble }: Props) {
  return (
    <div className={`bubble-row ${bubble.role}`}>
      <div className={`bubble${bubble.pending ? " pending" : ""}`}>{bubble.content}</div>
      {bubble.role === "user" && !bubble.pending && <CorrectionBadge correction={bubble.correction} />}
    </div>
  );
}
