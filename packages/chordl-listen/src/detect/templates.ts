/**
 * Chroma templates for chord qualities.
 *
 * Each template is a set of semitone offsets from the root (0 = root). Matching
 * rotates a template to every root and correlates it against a 12-bin chroma
 * vector (see templateMatch.ts). Qualities are ordered so that, on an exact tie,
 * the earlier (simpler / more common) quality wins.
 *
 * `symbolSuffix` is the chord-symbol suffix appended to the root when producing
 * a chordl chord string, e.g. root "D" + "m7" -> "Dm7".
 */
export interface ChordTemplate {
  /** Internal quality id. */
  quality: string;
  /** Human label for the overlay. */
  label: string;
  /** Semitone offsets from the root that make up the chord. */
  offsets: number[];
  /** Suffix appended to the root to form a chordl chord symbol. */
  symbolSuffix: string;
}

// Order matters: triads before 7ths, common qualities before rare ones, so an
// exact-similarity tie resolves to the simpler chord.
export const CHORD_TEMPLATES: ChordTemplate[] = [
  { quality: "maj", label: "major", offsets: [0, 4, 7], symbolSuffix: "" },
  { quality: "min", label: "minor", offsets: [0, 3, 7], symbolSuffix: "m" },
  { quality: "dom7", label: "dominant 7th", offsets: [0, 4, 7, 10], symbolSuffix: "7" },
  { quality: "maj7", label: "major 7th", offsets: [0, 4, 7, 11], symbolSuffix: "maj7" },
  { quality: "min7", label: "minor 7th", offsets: [0, 3, 7, 10], symbolSuffix: "m7" },
  { quality: "dim", label: "diminished", offsets: [0, 3, 6], symbolSuffix: "dim" },
  { quality: "aug", label: "augmented", offsets: [0, 4, 8], symbolSuffix: "aug" },
  { quality: "sus4", label: "sus4", offsets: [0, 5, 7], symbolSuffix: "sus4" },
  { quality: "sus2", label: "sus2", offsets: [0, 2, 7], symbolSuffix: "sus2" },
  { quality: "min7b5", label: "half-diminished", offsets: [0, 3, 6, 10], symbolSuffix: "m7b5" },
  { quality: "dim7", label: "diminished 7th", offsets: [0, 3, 6, 9], symbolSuffix: "dim7" },
  { quality: "maj6", label: "6th", offsets: [0, 4, 7, 9], symbolSuffix: "6" },
  { quality: "min6", label: "minor 6th", offsets: [0, 3, 7, 9], symbolSuffix: "m6" },
];

/** Pitch-class names indexed 0..11 (C..B), sharp spelling. */
export const PITCH_CLASSES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

/** Unit-normalized 12-vector for a template rotated to `root`. */
export function templateVector(offsets: number[], root: number): number[] {
  const v = new Array(12).fill(0);
  for (const off of offsets) v[(root + off) % 12] = 1;
  const norm = Math.sqrt(offsets.length);
  return v.map((x) => x / norm);
}
