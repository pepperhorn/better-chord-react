import { describe, it, expect } from "vitest";
import { INSTRUMENTS } from "../src/instruments";

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

  it("exposes open-string MIDI in chords-db index order (low string first)", () => {
    expect(INSTRUMENTS["guitar-top3"].openMidi.slice(0, 3)).toEqual([40, 45, 50]);
    expect(INSTRUMENTS.guitar.openMidi.slice(0, 3)).toEqual([40, 45, 50]);
    expect(INSTRUMENTS.ukulele.openMidi).toEqual([67, 60, 64, 69]);
  });
});
