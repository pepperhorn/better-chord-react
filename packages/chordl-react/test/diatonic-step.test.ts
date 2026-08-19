import { describe, it, expect } from "vitest";
import { ascendingOctaves, diatonicStep } from "../src/diatonic-step";

describe("diatonicStep", () => {
  it("reads the letter, so a flat keeps its own step", () => {
    expect(diatonicStep("Bb")).toBe(diatonicStep("B"));
    expect(diatonicStep("Ab")).toBe(diatonicStep("A"));
    expect(diatonicStep("C#")).toBe(diatonicStep("C"));
  });

  it("does not collapse a flat onto the letter below it", () => {
    // The bug this exists to prevent: Ab normalised to G# reads as step G.
    expect(diatonicStep("Ab")).not.toBe(diatonicStep("G"));
    expect(diatonicStep("Bb")).not.toBe(diatonicStep("A"));
  });

  it("handles the spellings whose letter octave differs from their pitch", () => {
    expect(diatonicStep("Cb")).toBe(diatonicStep("C"));
    expect(diatonicStep("B#")).toBe(diatonicStep("B"));
  });
});

describe("ascendingOctaves", () => {
  it("only steps up when the run wraps past B", () => {
    expect(ascendingOctaves(["C", "E", "G"], 4)).toEqual([4, 4, 4]);
    expect(ascendingOctaves(["G", "C", "E"], 4)).toEqual([4, 5, 5]);
  });

  // These are the voicings that drew differently on the keyboard and the staff
  // while only one of the three copies of this walk stepped by letter.
  it("keeps a flat a semitone above its neighbour in the same octave", () => {
    expect(ascendingOctaves(["G", "Ab", "C", "Eb"], 4)).toEqual([4, 4, 5, 5]);
    expect(ascendingOctaves(["G", "Bb", "D", "Eb"], 4)).toEqual([4, 4, 5, 5]);
    expect(ascendingOctaves(["A", "Bb", "D", "F"], 4)).toEqual([4, 4, 5, 5]);
    expect(ascendingOctaves(["Ab", "C", "Db", "F"], 4)).toEqual([4, 5, 5, 5]);
  });

  it("would have put the second note an octave too high under sharp-stepping", () => {
    // Ab -> G# reads as step G, equal to the previous G, which looks like a wrap.
    // G, G#(=G step, reads as a wrap), C(wrap), D# — scattered over three octaves.
    expect(ascendingOctaves(["G", "G#", "C", "D#"], 4)).toEqual([4, 5, 6, 6]);
    // Same pitches, spelled as the resolver spells them, stay compact.
    expect(ascendingOctaves(["G", "Ab", "C", "Eb"], 4)).toEqual([4, 4, 5, 5]);
  });

  it("respects the caller's own octave numbering", () => {
    expect(ascendingOctaves(["G", "C"], 0)).toEqual([0, 1]);
  });
});
