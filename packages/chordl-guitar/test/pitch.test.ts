import { describe, it, expect } from "vitest";
import { positionToMidi, rootPitchClass } from "../src/pitch";
import { INSTRUMENTS } from "../src/instruments";

describe("positionToMidi", () => {
  const guitar = INSTRUMENTS.guitar.openMidi;

  it("treats frets as relative to baseFret, not as absolute fret numbers", () => {
    // F major, chords-db position 2: baseFret 3, low E muted.
    // Absolute-fret reading would give [46,51,58,63,67] — wrong.
    const pos = {
      frets: [-1, 1, 1, 3, 4, 3],
      fingers: [0, 1, 1, 3, 4, 2],
      baseFret: 3,
      barres: [1],
    };
    expect(positionToMidi(pos, guitar)).toEqual([48, 53, 60, 65, 69]);
  });

  it("omits muted strings and sounds open strings regardless of the window", () => {
    // Open C: x32010 at baseFret 1
    const pos = {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      barres: [],
    };
    expect(positionToMidi(pos, guitar)).toEqual([48, 52, 55, 60, 64]);
  });

  it("handles the ukulele's reentrant tuning", () => {
    // Ukulele C major: 0003. openMidi is G4 C4 E4 A4 — not ascending.
    const pos = { frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], baseFret: 1, barres: [] };
    expect(positionToMidi(pos, INSTRUMENTS.ukulele.openMidi)).toEqual([67, 60, 64, 72]);
  });

  it("returns an empty array for an all-muted position", () => {
    const pos = { frets: [-1, -1, -1, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 1, barres: [] };
    expect(positionToMidi(pos, guitar)).toEqual([]);
  });
});

describe("INSTRUMENTS openMidi", () => {
  it("is in chords-db index order — index 0 is the string frets[0] refers to", () => {
    expect(INSTRUMENTS.guitar.openMidi).toEqual([40, 45, 50, 55, 59, 64]);
    expect(INSTRUMENTS["guitar-top3"].openMidi).toEqual([40, 45, 50, 55, 59, 64]);
    expect(INSTRUMENTS.ukulele.openMidi).toEqual([67, 60, 64, 69]);
  });

  it("has one openMidi entry per string", () => {
    for (const inst of Object.values(INSTRUMENTS)) {
      expect(inst.openMidi.length, `${inst.id} openMidi length`).toBe(inst.strings);
    }
  });
});

describe("rootPitchClass", () => {
  it("parses naturals, sharps and flats", () => {
    expect(rootPitchClass("C")).toBe(0);
    expect(rootPitchClass("F#m7")).toBe(6);
    expect(rootPitchClass("Bbmaj7")).toBe(10);
    expect(rootPitchClass("Eb")).toBe(3);
  });

  it("returns null for a label with no parseable root", () => {
    expect(rootPitchClass("H7")).toBeNull();
    expect(rootPitchClass("")).toBeNull();
  });

  it("parses the rare enharmonics that cross an octave or name a natural", () => {
    expect(rootPitchClass("B#")).toBe(0); // B# = C
    expect(rootPitchClass("Cb")).toBe(11); // Cb = B
    expect(rootPitchClass("E#")).toBe(5); // E# = F
    expect(rootPitchClass("Fb")).toBe(4); // Fb = E
  });
});
