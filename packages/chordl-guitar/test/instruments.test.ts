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

describe("bass instruments", () => {
  it("registers 4- and 5-string bass with standard tunings", () => {
    expect(INSTRUMENTS.bass4.strings).toBe(4);
    expect(INSTRUMENTS.bass4.tuning).toEqual(["E", "A", "D", "G"]);
    expect(INSTRUMENTS.bass4.openMidi).toEqual([28, 33, 38, 43]);

    expect(INSTRUMENTS.bass5.strings).toBe(5);
    expect(INSTRUMENTS.bass5.tuning).toEqual(["B", "E", "A", "D", "G"]);
    expect(INSTRUMENTS.bass5.openMidi).toEqual([23, 28, 33, 38, 43]);
  });
});
