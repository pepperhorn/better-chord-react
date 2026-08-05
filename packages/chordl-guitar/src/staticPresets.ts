import type { Chord } from "svguitar";

export interface StaticPreset {
  key: string;
  suffix: string;
  chord: Chord;
}

/** Strings 4-6 are always muted for top-3 voicings. */
const MUTED_LOW: Chord["fingers"] = [[4, "x"], [5, "x"], [6, "x"]];

function top3(
  key: string,
  suffix: string,
  g: [number, string?],
  b: [number, string?],
  e: [number, string?],
): StaticPreset {
  const finger = (s: number, [fret, label]: [number, string?]): Chord["fingers"][number] =>
    label ? [s, fret, label] : [s, fret];
  return {
    key,
    suffix,
    chord: {
      fingers: [finger(3, g), finger(2, b), finger(1, e), ...MUTED_LOW],
      barres: [],
    },
  };
}

/**
 * Hand-authored beginner voicings on the top three strings (G B E).
 *
 * chords-db has no three-string voicings, so these cannot be derived — the table
 * is the sole source. Every entry is checked against pitch-class arithmetic by
 * staticPresets.test.ts, because a wrong shape is unrecoverable once printed.
 */
export const GUITAR_TOP3_PRESETS: StaticPreset[] = [
  top3("C", "major", [0], [1, "1"], [0]),
  top3("G", "major", [0], [0], [3, "3"]),
  top3("D", "major", [2, "1"], [3, "3"], [2, "2"]),
  top3("A", "major", [2, "1"], [2, "2"], [0]),
  top3("E", "minor", [0], [0], [0]),
  top3("A", "minor", [2, "2"], [1, "1"], [0]),
  top3("D", "minor", [2, "2"], [3, "3"], [1, "1"]),
  top3("E", "major", [1, "1"], [0], [0]),
  top3("C", "7", [3, "3"], [1, "1"], [0]),
  top3("G", "7", [0], [0], [1, "1"]),
  top3("B", "minor", [4, "3"], [3, "2"], [2, "1"]),
  top3("F", "major", [2, "2"], [1, "1"], [1, "1"]),
  top3("D", "7", [2, "2"], [1, "1"], [2, "3"]),
  top3("E", "7", [1, "1"], [3, "3"], [0]),
  top3("A", "7", [0], [2, "2"], [0]),
  top3("A", "m7", [0], [1, "1"], [0]),
  top3("D", "m7", [2, "2"], [1, "1"], [1, "1"]),
  top3("E", "m7", [0], [3, "3"], [0]),
  top3("F", "maj7", [2, "2"], [1, "1"], [0]),
  top3("G", "minor", [3, "1"], [3, "2"], [3, "3"]),
];

/** Look up a top-3 shape. Returns null rather than guessing at an unknown chord. */
export function lookupTop3Chord(key: string, suffix: string): Chord | null {
  const hit = GUITAR_TOP3_PRESETS.find((p) => p.key === key && p.suffix === suffix);
  return hit ? hit.chord : null;
}
