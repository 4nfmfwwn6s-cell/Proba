import { describe, expect, it } from "vitest";
import { buildSpokenSequence } from "./correctionSpeech";
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
