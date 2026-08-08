import { describe, it, expect } from "vitest";
import { powerChordPosition, powerChordShape } from "../src/powerChords";
import { positionToMidi } from "../src/pitch";
import { INSTRUMENTS } from "../src/instruments";

const guitar = INSTRUMENTS.guitar.openMidi;

describe("powerChordPosition", () => {
  it("puts G5 at the 3rd fret of the low E string", () => {
    const pos = powerChordPosition(7, { stringSet: "E" })!;
    expect(pos.baseFret).toBe(3);
    expect(pos.frets).toEqual([1, 3, 3, -1, -1, -1]);
    // G2 D3 G3
    expect(positionToMidi(pos, guitar)).toEqual([43, 50, 55]);
  });

  it("uses the nut for an open E5", () => {
    const pos = powerChordPosition(4, { stringSet: "E" })!;
    expect(pos.baseFret).toBe(1);
    expect(pos.frets).toEqual([0, 2, 2, -1, -1, -1]);
    expect(positionToMidi(pos, guitar)).toEqual([40, 47, 52]);
  });

  it("puts C5 at the 3rd fret of the A string", () => {
    const pos = powerChordPosition(0, { stringSet: "A" })!;
    expect(pos.baseFret).toBe(3);
    expect(pos.frets).toEqual([-1, 1, 3, 3, -1, -1]);
    expect(positionToMidi(pos, guitar)).toEqual([48, 55, 60]);
  });

  it("drops the octave when includeOctave is false", () => {
    const pos = powerChordPosition(7, { stringSet: "E", includeOctave: false })!;
    expect(pos.frets).toEqual([1, 3, -1, -1, -1, -1]);
    expect(positionToMidi(pos, guitar)).toEqual([43, 50]);
  });

  it("always sounds root, fifth and octave in pitch-class terms", () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const stringSet of ["E", "A"] as const) {
        const pos = powerChordPosition(pc, { stringSet })!;
        const pcs = new Set(positionToMidi(pos, guitar).map((m) => m % 12));
        expect([...pcs].sort((a, b) => a - b), `${pc} on ${stringSet}`).toEqual(
          [pc % 12, (pc + 7) % 12].sort((a, b) => a - b),
        );
      }
    }
  });
});

describe("powerChordShape", () => {
  it("returns an svguitar Chord with no barres", () => {
    const chord = powerChordShape(7, { stringSet: "E", title: "G5" })!;
    expect(chord.barres).toEqual([]);
    expect(chord.position).toBe(3);
    expect(chord.title).toBe("G5");
  });
});
