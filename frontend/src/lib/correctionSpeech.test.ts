import { describe, expect, it } from "vitest";
import { buildSpokenSequence, buildSpokenSequenceForTurn } from "./correctionSpeech";
import type { Correction } from "../types";

const ERROR_CORRECTION: Correction = {
  hasError: true,
  original: "I go to school yesterday",
  corrected: "I went to school yesterday",
  explanationHu: "Múlt időben 'went'-et kell használni.",
  errorType: "grammar",
};

describe("buildSpokenSequence", () => {
  it("speaks only the reply when there was no correction, regardless of level", () => {
    for (const level of ["off", "on"] as const) {
      const parts = buildSpokenSequence("Nice to hear that!", null, level, 1.0);
      expect(parts).toEqual([{ text: "Nice to hear that!", rate: 1.0 }]);
    }
  });

  it("speaks only the reply when correction speech is off, even with a real correction", () => {
    const parts = buildSpokenSequence("Nice to hear that!", ERROR_CORRECTION, "off", 1.0);
    expect(parts).toEqual([{ text: "Nice to hear that!", rate: 1.0 }]);
  });

  it("speaks the slowed corrected sentence then the reply when 'on' - never the Hungarian explanation", () => {
    const parts = buildSpokenSequence("Nice to hear that!", ERROR_CORRECTION, "on", 1.0);
    expect(parts).toEqual([
      { text: "I went to school yesterday", rate: 0.8 },
      { text: "Nice to hear that!", rate: 1.0 },
    ]);
    expect(parts.some((p) => p.text.includes(ERROR_CORRECTION.explanationHu))).toBe(false);
  });

  it("scales the slow rate relative to the user's base speed", () => {
    const parts = buildSpokenSequence("Reply", ERROR_CORRECTION, "on", 1.25);
    expect(parts[0].rate).toBeCloseTo(1.0);
    expect(parts[1].rate).toBe(1.25);
  });
});

describe("buildSpokenSequenceForTurn", () => {
  it("speaks the slowed English sentence then the invite for a translation_request - never the Hungarian note", () => {
    const parts = buildSpokenSequenceForTurn(
      {
        reply: "Now you try saying it!",
        correction: null,
        turnType: "translation_request",
        translation: {
          englishSentence: "Unfortunately I can't be there on time.",
          hungarianNote: "Ez egy semleges hangvételű mondat.",
        },
        metaReplyHu: null,
      },
      "on",
      1.0
    );
    expect(parts).toEqual([
      { text: "Unfortunately I can't be there on time.", rate: 0.8 },
      { text: "Now you try saying it!", rate: 1.0 },
    ]);
  });

  it("is unaffected by correctionSpeechLevel for a translation_request (always speaks the sentence + invite)", () => {
    const parts = buildSpokenSequenceForTurn(
      {
        reply: "Now you try saying it!",
        correction: null,
        turnType: "translation_request",
        translation: { englishSentence: "Hello there.", hungarianNote: "" },
        metaReplyHu: null,
      },
      "off",
      1.0
    );
    expect(parts).toEqual([
      { text: "Hello there.", rate: 0.8 },
      { text: "Now you try saying it!", rate: 1.0 },
    ]);
  });

  it("speaks only the English reply for a meta_question - never metaReplyHu", () => {
    const parts = buildSpokenSequenceForTurn(
      {
        reply: "That word means 'unfortunately' - let's continue, what did you do this weekend?",
        correction: null,
        turnType: "meta_question",
        translation: null,
        metaReplyHu: "Ez azt jelenti, hogy sajnos.",
      },
      "on",
      1.0
    );
    expect(parts).toEqual([
      { text: "That word means 'unfortunately' - let's continue, what did you do this weekend?", rate: 1.0 },
    ]);
  });

  it("returns nothing for a meta_question with an empty reply", () => {
    const parts = buildSpokenSequenceForTurn(
      { reply: "", correction: null, turnType: "meta_question", translation: null, metaReplyHu: "x" },
      "on",
      1.0
    );
    expect(parts).toEqual([]);
  });

  it("falls back to buildSpokenSequence (correction-gated) for a conversation turn", () => {
    const parts = buildSpokenSequenceForTurn(
      {
        reply: "Nice to hear that!",
        correction: ERROR_CORRECTION,
        turnType: "conversation",
        translation: null,
        metaReplyHu: null,
      },
      "on",
      1.0
    );
    expect(parts).toEqual([
      { text: "I went to school yesterday", rate: 0.8 },
      { text: "Nice to hear that!", rate: 1.0 },
    ]);
  });

  it("falls back to just the reply for a translation_request with no translation data", () => {
    const parts = buildSpokenSequenceForTurn(
      { reply: "Sorry, let's continue.", correction: null, turnType: "translation_request", translation: null, metaReplyHu: null },
      "on",
      1.0
    );
    expect(parts).toEqual([{ text: "Sorry, let's continue.", rate: 1.0 }]);
  });
});
