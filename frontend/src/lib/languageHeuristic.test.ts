import { describe, expect, it } from "vitest";
import { looksHungarian } from "./languageHeuristic";

describe("looksHungarian", () => {
  it("returns false for empty or whitespace-only input", () => {
    expect(looksHungarian("")).toBe(false);
    expect(looksHungarian("   ")).toBe(false);
  });

  it("returns false for plain English sentences", () => {
    expect(looksHungarian("I went to the store yesterday")).toBe(false);
    expect(looksHungarian("Can you help me with my homework")).toBe(false);
  });

  it("returns true when accented Hungarian characters are present", () => {
    expect(looksHungarian("Angolul hogy kell mondani: sajnos nem tudok időben ott lenni?")).toBe(true);
    expect(looksHungarian("Nem értem, mit jelent ez a szó")).toBe(true);
  });

  it("returns true for a Hungarian sentence even without accented characters transcribed", () => {
    // Speech recognizers commonly drop diacritics, so the heuristic must
    // still catch this via recognizable Hungarian function words.
    expect(looksHungarian("hogy mondom azt hogy nem ertem")).toBe(true);
  });

  it("returns false for a short ambiguous fragment with no real signal", () => {
    expect(looksHungarian("ok")).toBe(false);
    expect(looksHungarian("hello")).toBe(false);
  });

  it("returns false when only a small minority of words are Hungarian-like", () => {
    expect(looksHungarian("I think this restaurant is very nice and van")).toBe(false);
  });
});
