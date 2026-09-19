import { describe, expect, it } from "vitest";
import { appendTranscriptSegment } from "./transcriptMerge";

describe("appendTranscriptSegment", () => {
  it("returns the segment when there's nothing accumulated yet", () => {
    expect(appendTranscriptSegment("", "hello")).toBe("hello");
  });

  it("joins an existing transcript with a new segment, separated by one space", () => {
    expect(appendTranscriptSegment("hello", "world")).toBe("hello world");
  });

  it("trims surrounding whitespace on both sides and avoids double spaces", () => {
    expect(appendTranscriptSegment("hello  ", "  world  ")).toBe("hello world");
  });

  it("ignores an empty or whitespace-only new segment", () => {
    expect(appendTranscriptSegment("hello", "")).toBe("hello");
    expect(appendTranscriptSegment("hello", "   ")).toBe("hello");
  });

  it("returns an empty string when both existing and segment are empty", () => {
    expect(appendTranscriptSegment("", "")).toBe("");
  });

  it("concatenates several segments across simulated recognizer restarts", () => {
    let transcript = "";
    transcript = appendTranscriptSegment(transcript, "I went to the store");
    transcript = appendTranscriptSegment(transcript, "and I bought some milk");
    transcript = appendTranscriptSegment(transcript, "then I came home");
    expect(transcript).toBe("I went to the store and I bought some milk then I came home");
  });
});
