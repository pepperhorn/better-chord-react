import { FLAT_TO_SHARP } from "./svg-constants";

/**
 * Auto-fingering engine for static chord voicings.
 *
 * Assigns sensible finger numbers (1=thumb, 5=pinky) for a single
 * hand position. Works for 2–5 note chords in RH and LH.
 *
 * Rules:
 * - Avoid thumb (1) on black keys when adjacent white key is available
 * - Wider intervals skip middle fingers (use 1-2-5 instead of 1-2-3)
 * - LH mirrors RH (5=lowest, 1=highest)
 */

export type Hand = "rh" | "lh";

const NOTE_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

const BLACK_NOTES = new Set(["C#", "D#", "F#", "G#", "A#"]);

function normalize(note: string): string {
  return FLAT_TO_SHARP[note] ?? note;
}

function isBlack(note: string): boolean {
  return BLACK_NOTES.has(normalize(note));
}

/** Semitone interval between two pitch classes (ascending). */
function interval(a: string, b: string): number {
  const sa = NOTE_SEMITONE[normalize(a)];
  const sb = NOTE_SEMITONE[normalize(b)];
  if (sa == null || sb == null) return 0;
  return ((sb - sa) % 12 + 12) % 12;
}

/** Standard RH fingering patterns by note count. */
const RH_PATTERNS: Record<number, number[][]> = {
  2: [[1, 5], [1, 3], [2, 5]],
  3: [[1, 3, 5], [1, 2, 5], [1, 2, 4], [1, 3, 4], [2, 3, 5], [1, 2, 3]],
  4: [[1, 2, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4], [1, 3, 4, 5], [2, 3, 4, 5]],
  5: [[1, 2, 3, 4, 5]],
};

/**
 * Score a candidate fingering for a set of notes (RH perspective).
 * Lower is better. Penalty weights are empirically tuned:
 * - Thumb on black key (10) dominates all other penalties
 * - Stretch/cramp thresholds: 5 semitones (~P4) and 1 semitone (~m2)
 * - Position preferences (1) are tiebreakers only
 */
function scoreFingering(notes: string[], fingers: number[]): number {
  let penalty = 0;

  for (let i = 0; i < notes.length; i++) {
    // Thumb on black key: penalize
    if (fingers[i] === 1 && isBlack(notes[i])) {
      penalty += 10;
    }
    // Pinky on black key: slight penalty (less natural)
    if (fingers[i] === 5 && isBlack(notes[i])) {
      penalty += 2;
    }
  }

  // Penalize large finger stretches
  for (let i = 0; i < notes.length - 1; i++) {
    const semitones = interval(notes[i], notes[i + 1]);
    const fingerGap = Math.abs(fingers[i + 1] - fingers[i]);

    // Wide interval with small finger gap = uncomfortable stretch
    if (semitones >= 5 && fingerGap <= 1) {
      penalty += 5;
    }
    // Very narrow interval with large finger gap = cramped
    if (semitones <= 1 && fingerGap >= 3) {
      penalty += 3;
    }
  }

  // Prefer patterns that start with thumb (natural RH position)
  if (fingers[0] !== 1) {
    penalty += 1;
  }

  // Prefer patterns that end with pinky or ring finger
  const last = fingers[fingers.length - 1];
  if (last !== 5 && last !== 4) {
    penalty += 1;
  }

  return penalty;
}

/**
 * Compute auto-fingering for a chord voicing.
 *
 * @param notes - Pitch classes in ascending voicing order (e.g. ["C", "E", "G", "B"])
 * @param hand - "rh" (default) or "lh"
 * @returns Array of finger numbers (1-5), one per note
 */
export function autoFingering(notes: string[], hand: Hand = "rh"): number[] {
  const n = notes.length;
  if (n === 0) return [];
  if (n === 1) return hand === "rh" ? [3] : [3]; // middle finger for single note

  // For >5 notes, assign 1-2-3-4-5 and repeat 5 for extra notes
  if (n > 5) {
    const base = [1, 2, 3, 4, 5];
    const fingers = [...base, ...Array(n - 5).fill(5)];
    return hand === "lh" ? fingers.map((f) => 6 - f) : fingers;
  }

  const patterns = RH_PATTERNS[n];
  if (!patterns) return Array(n).fill(3); // fallback

  // Score each pattern and pick the best
  let bestPattern = patterns[0];
  let bestScore = Infinity;

  for (const pattern of patterns) {
    const score = scoreFingering(notes, pattern);
    if (score < bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  // LH: mirror via (5+1)-f so 1↔5, 2↔4, 3 stays.
  // LH lowest note gets pinky (5) where RH lowest gets thumb (1).
  if (hand === "lh") {
    return bestPattern.map((f) => 6 - f);
  }

  return bestPattern;
}
