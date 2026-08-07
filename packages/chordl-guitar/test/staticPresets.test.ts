import { describe, it, expect } from "vitest";
import { GUITAR_TOP3_PRESETS, lookupTop3Chord } from "../src/staticPresets";
import { OPEN_STRING_MIDI } from "../src/instruments";

const PC: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

const INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
};

function chordTones(key: string, suffix: string): { pcs: Set<number>; third: number } {
  const root = PC[key];
  const iv = INTERVALS[suffix];
  if (root === undefined) throw new Error(`unknown root "${key}"`);
  if (!iv) throw new Error(`unsupported suffix "${suffix}"`);
  const thirdInterval = iv.includes(4) ? 4 : 3;
  return { pcs: new Set(iv.map((i) => (root + i) % 12)), third: (root + thirdInterval) % 12 };
}

describe("GUITAR_TOP3_PRESETS", () => {
  const midi = OPEN_STRING_MIDI["guitar-top3"];

  for (const preset of GUITAR_TOP3_PRESETS) {
    it(`${preset.key}${preset.suffix} spells its chord on strings G B E`, () => {
      const sounded = preset.chord.fingers.filter(
        (f) => f[1] !== "x" && Number(f[0]) <= 3,
      );
      const pcs = new Set(
        sounded.map((f) => (midi[Number(f[0]) - 1] + Number(f[1])) % 12),
      );
      const { pcs: allowed, third } = chordTones(preset.key, preset.suffix);

      for (const pc of pcs) {
        expect(allowed.has(pc), `pitch class ${pc} is not in ${preset.key}${preset.suffix}`).toBe(true);
      }
      expect(pcs.size, "needs at least 2 distinct pitch classes").toBeGreaterThanOrEqual(2);
      expect(pcs.has(third), "must contain the third").toBe(true);
    });

    it(`${preset.key}${preset.suffix} mutes strings 4-6`, () => {
      for (const s of [4, 5, 6]) {
        const f = preset.chord.fingers.find((x) => Number(x[0]) === s);
        expect(f, `string ${s} must be declared`).toBeDefined();
        expect(f![1]).toBe("x");
      }
    });
  }

  it("covers the beginner-20 deck", () => {
    const have = new Set(GUITAR_TOP3_PRESETS.map((p) => `${p.key}${p.suffix}`));
    const want = [
      "Cmajor", "Gmajor", "Dmajor", "Amajor", "Eminor", "Aminor", "Dminor",
      "Emajor", "C7", "G7",
      "Bminor", "Fmajor", "D7", "E7", "A7", "Am7", "Dm7", "Em7", "Fmaj7", "Gminor",
    ];
    for (const w of want) expect(have.has(w), `missing preset ${w}`).toBe(true);
    expect(GUITAR_TOP3_PRESETS.length).toBe(20);
  });
});

describe("lookupTop3Chord", () => {
  it("returns a shape for a known chord", () => {
    expect(lookupTop3Chord("B", "minor")).not.toBeNull();
  });

  it("returns null for an unknown chord rather than guessing", () => {
    expect(lookupTop3Chord("F#", "dim")).toBeNull();
  });
});
