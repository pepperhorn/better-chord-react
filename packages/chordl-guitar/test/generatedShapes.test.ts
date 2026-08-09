import { describe, it, expect } from "vitest";
import { bassShapeFor, violinShapeFor } from "../src/generatedShapes";
import { INSTRUMENTS } from "../src/instruments";

const PC: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

const ROOTS = Object.keys(PC);

/** Pitch class each sounded finger produces, from open-string MIDI + fret. */
function soundedPcs(
  shape: NonNullable<ReturnType<typeof bassShapeFor>>,
  instrument: "bass4" | "violin",
): number[] {
  // InstrumentConfig.openMidi is in chords-db index order (low pitch first),
  // but `f[0]` below is an svguitar string number, which counts from the
  // HIGHEST string. Reversing is the whole reason this line exists — index it
  // unreversed and every pitch class comes out wrong but plausible.
  const midi = [...INSTRUMENTS[instrument].openMidi].reverse();
  // chords-db convention: with a window position > 1, finger frets are
  // window-relative; absolute = position + fret - 1. Open strings stay open.
  const pos = shape.position ?? 1;
  const abs = (fret: number): number => (fret === 0 || pos <= 1 ? fret : pos + fret - 1);
  return shape.fingers
    .filter((f) => f[1] !== "x")
    .map((f) => (midi[Number(f[0]) - 1] + abs(Number(f[1]))) % 12);
}

describe("bassShapeFor", () => {
  for (const root of ROOTS) {
    it(`${root}: sounds exactly root, fifth and octave-root, inside six frets`, () => {
      const shape = bassShapeFor(root)!;
      expect(shape).not.toBeNull();

      const pcs = soundedPcs(shape, "bass4");
      expect(pcs).toHaveLength(3);
      // Two of the three notes are the root (root + its octave), one the fifth.
      expect(pcs.filter((pc) => pc === PC[root])).toHaveLength(2);
      expect(pcs.filter((pc) => pc === (PC[root] + 7) % 12)).toHaveLength(1);

      // The movable pattern must stay inside the diagram's six-fret window,
      // wherever that window starts.
      for (const f of shape.fingers) {
        if (f[1] !== "x") expect(Number(f[1])).toBeLessThanOrEqual(6);
      }
      expect(shape.position ?? 1).toBeGreaterThanOrEqual(1);
      // Exactly one string is muted on a 4-string bass playing 3 notes.
      expect(shape.fingers.filter((f) => f[1] === "x")).toHaveLength(1);

      // Sweet-spot placement: the root is FRETTED between frets 3 and 9 —
      // never an open string (booms, and breaks the movable pattern), never
      // against the nut. Absolute root fret = the "1"-labelled finger.
      const pos = shape.position ?? 1;
      const rootFinger = shape.fingers.find((f) => f[2] === "1")!;
      const absRoot = pos <= 1 ? Number(rootFinger[1]) : pos + Number(rootFinger[1]) - 1;
      expect(absRoot, `${root} root fret`).toBeGreaterThanOrEqual(3);
      expect(absRoot, `${root} root fret`).toBeLessThanOrEqual(9);
      for (const f of shape.fingers) {
        if (f[1] !== "x") expect(Number(f[1]), `${root} has an open string`).toBeGreaterThan(0);
      }
    });
  }

  it("returns null for an unknown root rather than guessing", () => {
    expect(bassShapeFor("H")).toBeNull();
  });
});

describe("violinShapeFor", () => {
  const TRIADS: Array<[string, number[]]> = [
    ["major", [0, 4, 7]],
    ["minor", [0, 3, 7]],
    ["7", [0, 4, 7, 10]],
    ["m7", [0, 3, 7, 10]],
    ["maj7", [0, 4, 7, 11]],
  ];
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  for (const [suffix, intervals] of TRIADS) {
    for (const root of NAMES) {
      const pcs = intervals.map((i) => NAMES[(PC[root] + i) % 12]);
      it(`${root}${suffix}: one chord tone per string, all in first position`, () => {
        const shape = violinShapeFor(pcs)!;
        expect(shape).not.toBeNull();

        const allowed = new Set(intervals.map((i) => (PC[root] + i) % 12));
        const sounded = soundedPcs(shape, "violin");

        // Every triad's largest pitch-class gap is under the 8-semitone
        // first-position reach, so all four strings sound a chord tone.
        expect(sounded).toHaveLength(4);
        for (const pc of sounded) expect(allowed.has(pc)).toBe(true);

        // First position only: no placement past the fourth finger.
        for (const f of shape.fingers) {
          if (f[1] !== "x") expect(Number(f[1])).toBeLessThanOrEqual(7);
        }
      });
    }
  }

  it("labels placements with violin finger numbers (1-2 semitones = first finger)", () => {
    // G major (G B D), worked by hand: open G string is the root (no label);
    // on the A string the nearest tone is B, 2 semitones up = first finger;
    // on the E string the nearest tone is G, 3 semitones up = second finger.
    const shape = violinShapeFor(["G", "B", "D"])!;
    const byString = new Map(shape.fingers.map((f) => [Number(f[0]), f]));
    // String 4 = open G (root), no label.
    expect(byString.get(4)![1]).toBe(0);
    // String 2 = A string: B at 2 semitones, first finger.
    expect(byString.get(2)![1]).toBe(2);
    expect(byString.get(2)![2]).toBe("1");
    // String 1 = E string: G at 3 semitones, second finger.
    expect(byString.get(1)![1]).toBe(3);
    expect(byString.get(1)![2]).toBe("2");
  });

  it("returns null for an unknown pitch class rather than guessing", () => {
    expect(violinShapeFor(["X", "B", "D"])).toBeNull();
  });
});
