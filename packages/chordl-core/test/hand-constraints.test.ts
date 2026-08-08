import { describe, it, expect } from "vitest";
import { midiOf, placeAscending, spanOf } from "../src/theory/hand-constraints";

describe("midiOf", () => {
  it("uses the C4 = 60 convention", () => {
    expect(midiOf("C", 4)).toBe(60);
    expect(midiOf("A", 3)).toBe(57);
  });

  it("accepts flats as well as sharps", () => {
    expect(midiOf("Bb", 3)).toBe(58);
    expect(midiOf("A#", 3)).toBe(58);
  });
});

describe("placeAscending", () => {
  it("stacks a triad upward without bumping the octave", () => {
    expect(placeAscending(["C", "E", "G"], 3).map((n) => n.midi)).toEqual([48, 52, 55]);
  });

  it("bumps the octave when a note would descend", () => {
    // 1st inversion Cmaj7: C wraps above B.
    expect(placeAscending(["E", "G", "B", "C"], 3).map((n) => n.midi)).toEqual([52, 55, 59, 60]);
  });

  it("returns an empty array for no notes", () => {
    expect(placeAscending([], 3)).toEqual([]);
  });
});

describe("spanOf", () => {
  it("measures lowest to highest in semitones", () => {
    expect(spanOf([48, 52, 55])).toBe(7);
    expect(spanOf([52, 59])).toBe(7);
  });

  it("is zero for one note or none", () => {
    expect(spanOf([60])).toBe(0);
    expect(spanOf([])).toBe(0);
  });
});
