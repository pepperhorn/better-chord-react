import { describe, it, expect } from "vitest";
import { processChordRequest } from "../src/pipeline";

describe("processChordRequest", () => {
  it("resolves a simple chord to structured result", () => {
    const result = processChordRequest({ input: "Cmaj7" });
    expect(result.chordName).toBe("Cmaj7");
    expect(result.root).toBe("C");
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes[0]).toMatch(/^[A-G]#?\d$/);
    expect(result.keyboard.startFrom).toBeDefined();
    expect(result.keyboard.size).toBeGreaterThan(0);
    expect(result.keyboard.highlightKeys.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it("returns MIDI note names with octaves", () => {
    const result = processChordRequest({ input: "C" });
    expect(result.notes).toEqual(expect.arrayContaining([
      expect.stringMatching(/^C\d$/),
      expect.stringMatching(/^E\d$/),
      expect.stringMatching(/^G\d$/),
    ]));
  });

  it("handles inversions", () => {
    const result = processChordRequest({ input: "C in 2nd inversion" });
    expect(result.chordName).toBe("C");
    expect(result.inversion).toBe(2);
    expect(result.notes[0]).toMatch(/^G\d$/);
  });

  it("generates SVG string when format is svg", () => {
    const result = processChordRequest({ input: "Cmaj7", format: "svg" });
    expect(result.svg).toBeDefined();
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("</svg>");
  });

  it("generates MIDI bytes when format is midi", () => {
    const result = processChordRequest({ input: "Cmaj7", format: "midi" });
    expect(result.midi).toBeInstanceOf(Uint8Array);
    expect(result.midi![0]).toBe(0x4d); // M
    expect(result.midi![1]).toBe(0x54); // T
  });

  it("returns structured JSON by default (no svg or midi)", () => {
    const result = processChordRequest({ input: "Cmaj7" });
    expect(result.svg).toBeUndefined();
    expect(result.midi).toBeUndefined();
  });

  it("captures errors gracefully", () => {
    const result = processChordRequest({ input: "" });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it("includes pipeline telemetry", () => {
    const result = processChordRequest({ input: "Cmaj7" });
    expect(result.telemetry).toBeDefined();
    expect(result.telemetry.parser).toBe("chord");
    expect(result.telemetry.resolver.root).toBe("C");
    expect(result.telemetry.resolver.pitchClasses).toContain("C");
    expect(result.telemetry.durationMs).toBeGreaterThanOrEqual(0);
  });
});
