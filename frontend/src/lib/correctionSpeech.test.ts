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
    for (const level of ["off", "corrected_only", "corrected_and_explanation"] as const) {
      const parts = buildSpokenSequence("Nice to hear that!", null, level, 1.0);
      expect(parts).toEqual([{ text: "Nice to hear that!", lang: "en", rate: 1.0 }]);
    }
  });

  it("speaks only the reply when correction speech is off, even with a real correction", () => {
    const parts = buildSpokenSequence("Nice to hear that!", ERROR_CORRECTION, "off", 1.0);
    expect(parts).toEqual([{ text: "Nice to hear that!", lang: "en", rate: 1.0 }]);
  });

  it("speaks the slowed corrected sentence then the reply at 'corrected_only'", () => {
    const parts = buildSpokenSequence("Nice to hear that!", ERROR_CORRECTION, "corrected_only", 1.0);
    expect(parts).toEqual([
      { text: "I went to school yesterday", lang: "en", rate: 0.8 },
      { text: "Nice to hear that!", lang: "en", rate: 1.0 },
    ]);
  });

  it("speaks corrected sentence, then Hungarian explanation, then reply at 'corrected_and_explanation'", () => {
    const parts = buildSpokenSequence("Nice to hear that!", ERROR_CORRECTION, "corrected_and_explanation", 1.0);
    expect(parts).toEqual([
      { text: "I went to school yesterday", lang: "en", rate: 0.8 },
      { text: "Múlt időben 'went'-et kell használni.", lang: "hu", rate: 1.0 },
      { text: "Nice to hear that!", lang: "en", rate: 1.0 },
    ]);
  });

  it("scales the slow rate relative to the user's base speed", () => {
    const parts = buildSpokenSequence("Reply", ERROR_CORRECTION, "corrected_only", 1.25);
    expect(parts[0].rate).toBeCloseTo(1.0);
    expect(parts[1].rate).toBe(1.25);
  });
});

describe("buildSpokenSequenceForTurn", () => {
  it("speaks the slowed English sentence, the Hungarian note, then the invite for a translation_request", () => {
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
      "corrected_and_explanation",
      1.0
    );
    expect(parts).toEqual([
      { text: "Unfortunately I can't be there on time.", lang: "en", rate: 0.8 },
      { text: "Ez egy semleges hangvételű mondat.", lang: "hu", rate: 1.0 },
      { text: "Now you try saying it!", lang: "en", rate: 1.0 },
    ]);
  });

  it("is unaffected by correctionSpeechLevel for a translation_request (always speaks all parts)", () => {
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
      { text: "Hello there.", lang: "en", rate: 0.8 },
      { text: "Now you try saying it!", lang: "en", rate: 1.0 },
    ]);
  });

  it("skips an empty Hungarian note for a translation_request", () => {
    const parts = buildSpokenSequenceForTurn(
      {
        reply: "Try it!",
        correction: null,
        turnType: "translation_request",
        translation: { englishSentence: "Good morning.", hungarianNote: "" },
        metaReplyHu: null,
      },
      "corrected_and_explanation",
      1.0
    );
    expect(parts.map((p) => p.lang)).toEqual(["en", "en"]);
  });

  it("speaks the Hungarian answer then the English steer-back for a meta_question", () => {
    const parts = buildSpokenSequenceForTurn(
      {
        reply: "Let's continue - what did you do this weekend?",
        correction: null,
        turnType: "meta_question",
        translation: null,
        metaReplyHu: "Ez azt jelenti, hogy...",
      },
      "corrected_and_explanation",
      1.0
    );
    expect(parts).toEqual([
      { text: "Ez azt jelenti, hogy...", lang: "hu", rate: 1.0 },
      { text: "Let's continue - what did you do this weekend?", lang: "en", rate: 1.0 },
    ]);
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
      "corrected_only",
      1.0
    );
    expect(parts).toEqual([
      { text: "I went to school yesterday", lang: "en", rate: 0.8 },
      { text: "Nice to hear that!", lang: "en", rate: 1.0 },
    ]);
  });

  it("falls back to just the reply for a translation_request with no translation data", () => {
    const parts = buildSpokenSequenceForTurn(
      { reply: "Sorry, let's continue.", correction: null, turnType: "translation_request", translation: null, metaReplyHu: null },
      "corrected_and_explanation",
      1.0
    );
    expect(parts).toEqual([{ text: "Sorry, let's continue.", lang: "en", rate: 1.0 }]);
  });
});
