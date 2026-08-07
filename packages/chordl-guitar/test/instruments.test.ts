import { describe, it, expect } from "vitest";
import { INSTRUMENTS, OPEN_STRING_MIDI } from "../src/instruments";

describe("guitar-top3 instrument", () => {
  it("is registered", () => {
    expect(INSTRUMENTS["guitar-top3"]).toBeDefined();
  });

  it("is a six-string guitar whose lower strings get muted at render time", () => {
    const inst = INSTRUMENTS["guitar-top3"];
    expect(inst.strings).toBe(6);
    expect(inst.tuning).toEqual(["E", "A", "D", "G", "B", "E"]);
    expect(inst.frets).toBe(4);
  });

  it("exposes open-string MIDI ordered string 1 (high E) first", () => {
    expect(OPEN_STRING_MIDI["guitar-top3"].slice(0, 3)).toEqual([64, 59, 55]);
    expect(OPEN_STRING_MIDI.guitar.slice(0, 3)).toEqual([64, 59, 55]);
    expect(OPEN_STRING_MIDI.ukulele).toEqual([69, 64, 60, 67]);
  });
});
