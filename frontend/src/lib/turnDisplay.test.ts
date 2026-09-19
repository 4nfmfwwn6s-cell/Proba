import { describe, expect, it } from "vitest";
import { buildAssistantHistoryText } from "./turnDisplay";

describe("buildAssistantHistoryText", () => {
  it("returns just the reply for a plain conversation turn", () => {
    const text = buildAssistantHistoryText({
      reply: "Nice, tell me more!",
      turnType: "conversation",
      translation: null,
      metaReplyHu: null,
    });
    expect(text).toBe("Nice, tell me more!");
  });

  it("folds the taught sentence and note into history for a translation_request", () => {
    const text = buildAssistantHistoryText({
      reply: "Now you try saying it!",
      turnType: "translation_request",
      translation: {
        englishSentence: "Unfortunately I can't be there on time.",
        hungarianNote: "Ez egy semleges hangvételű mondat.",
      },
      metaReplyHu: null,
    });
    expect(text).toBe(
      "Unfortunately I can't be there on time. (Ez egy semleges hangvételű mondat.) Now you try saying it!"
    );
  });

  it("omits the parenthetical when hungarianNote is empty", () => {
    const text = buildAssistantHistoryText({
      reply: "Try it!",
      turnType: "translation_request",
      translation: { englishSentence: "Good morning.", hungarianNote: "" },
      metaReplyHu: null,
    });
    expect(text).toBe("Good morning. Try it!");
  });

  it("falls back to the reply when translation data is missing", () => {
    const text = buildAssistantHistoryText({
      reply: "Let's continue.",
      turnType: "translation_request",
      translation: null,
      metaReplyHu: null,
    });
    expect(text).toBe("Let's continue.");
  });

  it("folds the Hungarian answer into history for a meta_question", () => {
    const text = buildAssistantHistoryText({
      reply: "Let's continue - what did you do this weekend?",
      turnType: "meta_question",
      translation: null,
      metaReplyHu: "Ez azt jelenti, hogy...",
    });
    expect(text).toBe("Ez azt jelenti, hogy... Let's continue - what did you do this weekend?");
  });

  it("falls back to the reply when metaReplyHu is missing", () => {
    const text = buildAssistantHistoryText({
      reply: "Let's continue.",
      turnType: "meta_question",
      translation: null,
      metaReplyHu: null,
    });
    expect(text).toBe("Let's continue.");
  });
});
