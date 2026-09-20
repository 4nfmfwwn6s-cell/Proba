import { describe, expect, it } from "vitest";
import {
  normalizeCorrection,
  normalizeTranslation,
  parseChatResult,
  parseChatResultFromString,
} from "../src/lib/correctionParser.js";

describe("normalizeCorrection", () => {
  it("returns null for null/undefined input", () => {
    expect(normalizeCorrection(null)).toBeNull();
    expect(normalizeCorrection(undefined)).toBeNull();
  });

  it("returns null when hasError is false", () => {
    expect(
      normalizeCorrection({
        hasError: false,
        original: "I go to school yesterday",
        corrected: "I went to school yesterday",
        explanationHu: "Múlt idő kell.",
        errorType: "grammar",
      })
    ).toBeNull();
  });

  it("normalizes a valid grammar correction", () => {
    const result = normalizeCorrection({
      hasError: true,
      original: "I go to school yesterday",
      corrected: "I went to school yesterday",
      explanationHu: "Múlt időben 'went'-et kell használni.",
      errorType: "grammar",
    });
    expect(result).toEqual({
      hasError: true,
      original: "I go to school yesterday",
      corrected: "I went to school yesterday",
      explanationHu: "Múlt időben 'went'-et kell használni.",
      errorType: "grammar",
    });
  });

  it("trims whitespace on string fields", () => {
    const result = normalizeCorrection({
      hasError: true,
      original: "  She don't like it  ",
      corrected: "  She doesn't like it  ",
      explanationHu: "  Egyes szám 3. személyben 'doesn't' kell.  ",
      errorType: "grammar",
    });
    expect(result?.original).toBe("She don't like it");
    expect(result?.corrected).toBe("She doesn't like it");
    expect(result?.explanationHu).toBe("Egyes szám 3. személyben 'doesn't' kell.");
  });

  it("falls back to 'other' for an invalid errorType", () => {
    const result = normalizeCorrection({
      hasError: true,
      original: "a",
      corrected: "b",
      explanationHu: "x",
      errorType: "spelling-typo-not-a-real-category",
    });
    expect(result?.errorType).toBe("other");
  });

  it("accepts all valid error types", () => {
    for (const errorType of [
      "grammar",
      "vocabulary",
      "word_order",
      "pronunciation_transcription",
      "other",
    ]) {
      const result = normalizeCorrection({
        hasError: true,
        original: "a",
        corrected: "b",
        explanationHu: "x",
        errorType,
      });
      expect(result?.errorType).toBe(errorType);
    }
  });

  it("returns null when hasError is true but original equals corrected", () => {
    const result = normalizeCorrection({
      hasError: true,
      original: "I am fine",
      corrected: "I am fine",
      explanationHu: "",
      errorType: "grammar",
    });
    expect(result).toBeNull();
  });

  it("returns null when hasError is true but original or corrected is missing", () => {
    expect(
      normalizeCorrection({
        hasError: true,
        original: "",
        corrected: "I am fine",
        explanationHu: "",
        errorType: "grammar",
      })
    ).toBeNull();
    expect(
      normalizeCorrection({
        hasError: true,
        corrected: "I am fine",
        explanationHu: "",
        errorType: "grammar",
      })
    ).toBeNull();
  });

  it("provides a default Hungarian explanation when missing", () => {
    const result = normalizeCorrection({
      hasError: true,
      original: "He go home",
      corrected: "He goes home",
      errorType: "grammar",
    });
    expect(result?.explanationHu).toBe("Kis hiba volt a mondatban.");
  });

  it("rejects non-object input", () => {
    expect(normalizeCorrection("not an object")).toBeNull();
    expect(normalizeCorrection(42)).toBeNull();
    expect(normalizeCorrection(true)).toBeNull();
  });

  it("accepts the string 'true' for hasError (defensive against loose JSON)", () => {
    const result = normalizeCorrection({
      hasError: "true",
      original: "a",
      corrected: "b",
      explanationHu: "x",
      errorType: "grammar",
    });
    expect(result).not.toBeNull();
  });
});

describe("parseChatResult", () => {
  it("parses a full valid result with a correction", () => {
    const result = parseChatResult({
      reply: "Nice, tell me more about your weekend!",
      correction: {
        hasError: true,
        original: "I go to school yesterday",
        corrected: "I went to school yesterday",
        explanationHu: "Múlt idő kell.",
        errorType: "grammar",
      },
    });
    expect(result.reply).toBe("Nice, tell me more about your weekend!");
    expect(result.correction?.corrected).toBe("I went to school yesterday");
  });

  it("parses a valid result with no correction (correct sentence)", () => {
    const result = parseChatResult({
      reply: "Great, what did you do there?",
      correction: { hasError: false },
    });
    expect(result.reply).toBe("Great, what did you do there?");
    expect(result.correction).toBeNull();
  });

  it("falls back to a default reply when reply is missing", () => {
    const result = parseChatResult({ correction: null });
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.correction).toBeNull();
  });

  it("handles completely malformed top-level input", () => {
    expect(parseChatResult(null).correction).toBeNull();
    expect(parseChatResult("garbage").correction).toBeNull();
    expect(parseChatResult(123).correction).toBeNull();
  });

  it("handles a correction field that's an unexpected shape", () => {
    const result = parseChatResult({
      reply: "Let's continue.",
      correction: "not an object",
    });
    expect(result.correction).toBeNull();
    expect(result.reply).toBe("Let's continue.");
  });
});

describe("parseChatResultFromString", () => {
  it("parses valid JSON text", () => {
    const json = JSON.stringify({
      reply: "Cool!",
      correction: {
        hasError: true,
        original: "I has a dog",
        corrected: "I have a dog",
        explanationHu: "Egyes szám 1. személyben 'have' kell.",
        errorType: "grammar",
      },
    });
    const result = parseChatResultFromString(json);
    expect(result.reply).toBe("Cool!");
    expect(result.correction?.original).toBe("I has a dog");
  });

  it("degrades gracefully on invalid JSON text instead of throwing", () => {
    expect(() => parseChatResultFromString("{not valid json")).not.toThrow();
    const result = parseChatResultFromString("{not valid json");
    expect(result.correction).toBeNull();
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("degrades gracefully on an empty string", () => {
    const result = parseChatResultFromString("");
    expect(result.correction).toBeNull();
  });
});

describe("normalizeTranslation", () => {
  it("returns null for null/undefined/non-object input", () => {
    expect(normalizeTranslation(null)).toBeNull();
    expect(normalizeTranslation(undefined)).toBeNull();
    expect(normalizeTranslation("not an object")).toBeNull();
  });

  it("returns null when englishSentence is missing or blank", () => {
    expect(normalizeTranslation({ englishSentence: "", hungarianNote: "x" })).toBeNull();
    expect(normalizeTranslation({ englishSentence: "   ", hungarianNote: "x" })).toBeNull();
    expect(normalizeTranslation({ hungarianNote: "x" })).toBeNull();
  });

  it("normalizes and trims a valid translation answer", () => {
    const result = normalizeTranslation({
      englishSentence: "  Unfortunately I can't be there on time.  ",
      hungarianNote: "  Ez egy semleges hangvételű mondat.  ",
    });
    expect(result).toEqual({
      englishSentence: "Unfortunately I can't be there on time.",
      hungarianNote: "Ez egy semleges hangvételű mondat.",
    });
  });

  it("allows an empty hungarianNote", () => {
    const result = normalizeTranslation({ englishSentence: "Hello there." });
    expect(result).toEqual({ englishSentence: "Hello there.", hungarianNote: "" });
  });
});

describe("parseChatResult - turnType gating", () => {
  it("defaults to turnType=conversation and inputLanguage=en when omitted", () => {
    const result = parseChatResult({ reply: "Nice!", correction: { hasError: false } });
    expect(result.turnType).toBe("conversation");
    expect(result.inputLanguage).toBe("en");
    expect(result.translation).toBeNull();
    expect(result.metaReplyHu).toBeNull();
  });

  it("parses a translation_request turn and ignores correction on it", () => {
    const result = parseChatResult({
      inputLanguage: "hu",
      turnType: "translation_request",
      reply: "Now you try saying it!",
      correction: { hasError: true, original: "x", corrected: "y", errorType: "grammar" },
      translation: {
        englishSentence: "Unfortunately I can't be there on time.",
        hungarianNote: "Ez egy formális változat.",
      },
    });
    expect(result.turnType).toBe("translation_request");
    expect(result.inputLanguage).toBe("hu");
    expect(result.correction).toBeNull();
    expect(result.translation).toEqual({
      englishSentence: "Unfortunately I can't be there on time.",
      hungarianNote: "Ez egy formális változat.",
    });
    expect(result.metaReplyHu).toBeNull();
  });

  it("drops translation data when turnType is not translation_request", () => {
    const result = parseChatResult({
      turnType: "conversation",
      reply: "Let's continue.",
      correction: { hasError: false },
      translation: { englishSentence: "Should be ignored." },
    });
    expect(result.translation).toBeNull();
  });

  it("parses a meta_question turn and ignores correction/translation on it", () => {
    const result = parseChatResult({
      inputLanguage: "hu",
      turnType: "meta_question",
      reply: "Let's continue - what did you do this weekend?",
      correction: { hasError: true, original: "x", corrected: "y" },
      metaReplyHu: "Ez azt jelenti, hogy...",
    });
    expect(result.turnType).toBe("meta_question");
    expect(result.correction).toBeNull();
    expect(result.translation).toBeNull();
    expect(result.metaReplyHu).toBe("Ez azt jelenti, hogy...");
  });

  it("falls back to null metaReplyHu when blank or turnType mismatched", () => {
    expect(parseChatResult({ turnType: "meta_question", reply: "x", metaReplyHu: "" }).metaReplyHu).toBeNull();
    expect(
      parseChatResult({ turnType: "conversation", reply: "x", metaReplyHu: "should be ignored" }).metaReplyHu
    ).toBeNull();
  });

  it("falls back to turnType=conversation for an invalid/unknown turnType value", () => {
    const result = parseChatResult({ turnType: "something_else", reply: "Hi", correction: { hasError: false } });
    expect(result.turnType).toBe("conversation");
  });

  it("falls back to inputLanguage=en for an invalid value", () => {
    const result = parseChatResult({ inputLanguage: "de", reply: "Hi", correction: { hasError: false } });
    expect(result.inputLanguage).toBe("en");
  });

  it("total garbage input still returns a fully-shaped fallback result", () => {
    const result = parseChatResult("garbage");
    expect(result).toEqual({
      reply: expect.any(String),
      correction: null,
      inputLanguage: "en",
      turnType: "conversation",
      translation: null,
      metaReplyHu: null,
    });
  });
});
