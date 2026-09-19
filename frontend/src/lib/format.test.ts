import { describe, expect, it } from "vitest";
import { formatElapsed } from "./format";

describe("formatElapsed", () => {
  it("formats zero seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
  });

  it("formats seconds under a minute, zero-padded", () => {
    expect(formatElapsed(5)).toBe("0:05");
    expect(formatElapsed(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatElapsed(65)).toBe("1:05");
    expect(formatElapsed(600)).toBe("10:00");
  });

  it("floors fractional seconds", () => {
    expect(formatElapsed(65.9)).toBe("1:05");
  });

  it("clamps negative input to zero", () => {
    expect(formatElapsed(-5)).toBe("0:00");
  });
});
