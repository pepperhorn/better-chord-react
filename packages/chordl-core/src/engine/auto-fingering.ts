import { normalizeToSharps, PC_SEMITONES as NOTE_SEMITONE } from "./note-spelling.js";

/**
 * Auto-fingering engine for piano chord voicings.
 *
 * Inspired by Mark Levine's "The Jazz Piano Book" approach:
 * - Chords are always playable — split across hands when needed
 * - Max span per hand: a 12th (19 semitones)
 * - Max notes per hand: 5
 * - LH typically takes root + guide tones (3rd/7th)
 * - RH takes upper extensions (9th, #11th, 13th)
 *
 * Finger assignment rules:
 * - RH: 1 (thumb) = lowest, 5 (pinky) = highest
 * - LH: 5 (pinky) = lowest, 1 (thumb) = highest
 * - Avoid thumb on black keys except at the bottom of RH / top of LH
 * - Wider intervals skip middle fingers (1-2-5 rather than 1-2-3)
 */

export type Hand = "rh" | "lh";

/** Max playable span for a single hand: a 12th = 19 semitones */
const MAX_HAND_SPAN = 19;

/** Max notes a single hand can play */
const MAX_HAND_NOTES = 5;

const BLACK_NOTES = new Set(["C#", "D#", "F#", "G#", "A#"]);

function normalize(note: string): string {
  return normalizeToSharps(note);
}

function isBlack(note: string): boolean {
  return BLACK_NOTES.has(normalize(note));
}

/** Ascending semitone interval between two pitch classes (mod 12). */
function interval(a: string, b: string): number {
  const sa = NOTE_SEMITONE[normalize(a)];
  const sb = NOTE_SEMITONE[normalize(b)];
  if (sa == null || sb == null) return 0;
  return ((sb - sa) % 12 + 12) % 12;
}

/** Total ascending span of a note sequence in semitones (mod 12 per step). */
function totalSpanMod12(notes: string[]): number {
  let span = 0;
  for (let i = 1; i < notes.length; i++) {
    span += interval(notes[i - 1], notes[i]);
  }
  return span;
}

/** Check if a set of notes is playable by one hand using mod-12 intervals. */
function isOneHandPlayable(notes: string[]): boolean {
  return notes.length <= MAX_HAND_NOTES && totalSpanMod12(notes) <= MAX_HAND_SPAN;
}

/** Check if a set of MIDI values is playable by one hand. */
function isOneHandPlayableMidi(midis: number[]): boolean {
  if (midis.length > MAX_HAND_NOTES) return false;
  if (midis.length <= 1) return true;
  const sorted = [...midis].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0] <= MAX_HAND_SPAN;
}

// ── Fingering patterns ────────────────────────────────────────────

/** Standard RH fingering patterns by note count. */
const RH_PATTERNS: Record<number, number[][]> = {
  2: [[1, 5], [1, 3], [2, 5]],
  3: [[1, 3, 5], [1, 2, 5], [1, 2, 4], [1, 3, 4], [2, 3, 5], [1, 2, 3]],
  4: [[1, 2, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4], [1, 3, 4, 5], [2, 3, 4, 5]],
  5: [[1, 2, 3, 4, 5]],
};

/**
 * Score a candidate fingering for a set of notes (RH perspective).
 * Lower is better.
 */
function scoreFingering(notes: string[], fingers: number[]): number {
  let penalty = 0;

  for (let i = 0; i < notes.length; i++) {
    if (fingers[i] === 1 && isBlack(notes[i]) && i !== 0) {
      penalty += 10;
    }
    if (fingers[i] === 5 && isBlack(notes[i])) {
      penalty += 2;
    }
  }

  for (let i = 0; i < notes.length - 1; i++) {
    const semitones = interval(notes[i], notes[i + 1]);
    const fingerGap = Math.abs(fingers[i + 1] - fingers[i]);

    if (semitones >= 5 && fingerGap <= 1) {
      penalty += 5;
    }
    if (semitones <= 1 && fingerGap >= 3) {
      penalty += 3;
    }
  }

  if (fingers[0] !== 1) penalty += 1;

  const last = fingers[fingers.length - 1];
  if (last !== 5 && last !== 4) penalty += 1;

  return penalty;
}

/** Pick the best fingering pattern for a single hand. */
function fingerOneHand(notes: string[], hand: Hand): number[] {
  const n = notes.length;
  if (n === 0) return [];
  if (n === 1) return [3];

  const patterns = RH_PATTERNS[n];
  if (!patterns) return Array(n).fill(3);

  let bestPattern = patterns[0];
  let bestScore = Infinity;

  for (const pattern of patterns) {
    const score = scoreFingering(notes, pattern);
    if (score < bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  // LH: mirror via (5+1)-f so 1↔5, 2↔4, 3 stays
  if (hand === "lh") {
    return bestPattern.map((f) => 6 - f);
  }
  return bestPattern;
}

// ── Hand splitting (Levine-inspired) ──────────────────────────────

export interface HandAssignment {
  /** Finger number per note (1-5), matching the input notes array order */
  fingering: number[];
  /** Hand assignment per note: "lh" or "rh" */
  hands: Hand[];
}

/**
 * Assign fingering to chord notes, splitting across hands when needed.
 *
 * @param notes - Pitch classes in voicing order (e.g. ["B", "D#", "F#", ...])
 * @param handHints - Optional per-note hand assignments from voicing library ("LH"/"RH")
 * @param midiValues - Optional MIDI note numbers for accurate pitch ordering and span calculation.
 *                     When provided, notes are sorted by actual pitch before splitting.
 */
export function assignFingering(
  notes: string[],
  handHints?: ("LH" | "RH")[],
  midiValues?: number[],
): HandAssignment {
  const n = notes.length;
  if (n === 0) return { fingering: [], hands: [] };

  // If hand hints are provided (from voicing library), use them directly
  if (handHints && handHints.length === n) {
    return fingerWithHints(notes, handHints);
  }

  // When MIDI values are provided, sort by actual pitch to avoid crossing
  if (midiValues && midiValues.length === n) {
    return assignFingeringByMidi(notes, midiValues);
  }

  // Fallback: pitch-class-only mode (mod 12)
  if (isOneHandPlayable(notes)) {
    const fingers = fingerOneHand(notes, "rh");
    return { fingering: fingers, hands: Array(n).fill("rh" as Hand) };
  }

  const splitIdx = findSplitPointMod12(notes);
  return splitAndFinger(notes, splitIdx);
}

/**
 * MIDI-aware fingering: sorts notes by actual pitch, splits, and maps back
 * to original order.
 */
function assignFingeringByMidi(
  notes: string[],
  midiValues: number[],
): HandAssignment {
  const n = notes.length;

  // Create index array sorted by MIDI pitch (ascending)
  const sortedIndices = Array.from({ length: n }, (_, i) => i)
    .sort((a, b) => midiValues[a] - midiValues[b]);

  const sortedNotes = sortedIndices.map((i) => notes[i]);
  const sortedMidis = sortedIndices.map((i) => midiValues[i]);

  // Check if playable by one hand using actual MIDI span
  if (isOneHandPlayableMidi(sortedMidis)) {
    const fingers = fingerOneHand(sortedNotes, "rh");
    // Map back to original order
    const fingering = new Array<number>(n);
    const hands = new Array<Hand>(n);
    sortedIndices.forEach((origIdx, sortIdx) => {
      fingering[origIdx] = fingers[sortIdx];
      hands[origIdx] = "rh";
    });
    return { fingering, hands };
  }

  // Find best split point using actual MIDI distances
  const splitIdx = findSplitPointMidi(sortedNotes, sortedMidis);
  const lhNotes = sortedNotes.slice(0, splitIdx);
  const rhNotes = sortedNotes.slice(splitIdx);
  const lhFingers = fingerOneHand(lhNotes, "lh");
  const rhFingers = fingerOneHand(rhNotes, "rh");

  // Map back to original order
  const fingering = new Array<number>(n);
  const hands = new Array<Hand>(n);
  sortedIndices.forEach((origIdx, sortIdx) => {
    if (sortIdx < splitIdx) {
      fingering[origIdx] = lhFingers[sortIdx];
      hands[origIdx] = "lh";
    } else {
      fingering[origIdx] = rhFingers[sortIdx - splitIdx];
      hands[origIdx] = "rh";
    }
  });

  return { fingering, hands };
}

/** Split and finger using sorted note order. */
function splitAndFinger(notes: string[], splitIdx: number): HandAssignment {
  const lhNotes = notes.slice(0, splitIdx);
  const rhNotes = notes.slice(splitIdx);
  const lhFingers = fingerOneHand(lhNotes, "lh");
  const rhFingers = fingerOneHand(rhNotes, "rh");

  return {
    fingering: [...lhFingers, ...rhFingers],
    hands: [
      ...Array(lhNotes.length).fill("lh" as Hand),
      ...Array(rhNotes.length).fill("rh" as Hand),
    ],
  };
}

/** Use voicing library hand hints to finger each hand independently. */
function fingerWithHints(
  notes: string[],
  hints: ("LH" | "RH")[],
): HandAssignment {
  const lhIndices: number[] = [];
  const rhIndices: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    if (hints[i] === "LH") lhIndices.push(i);
    else rhIndices.push(i);
  }

  const lhNotes = lhIndices.map((i) => notes[i]);
  const rhNotes = rhIndices.map((i) => notes[i]);
  const lhFingers = fingerOneHand(lhNotes, "lh");
  const rhFingers = fingerOneHand(rhNotes, "rh");

  const fingering = new Array<number>(notes.length);
  const hands = new Array<Hand>(notes.length);
  lhIndices.forEach((idx, i) => {
    fingering[idx] = lhFingers[i];
    hands[idx] = "lh";
  });
  rhIndices.forEach((idx, i) => {
    fingering[idx] = rhFingers[i];
    hands[idx] = "rh";
  });

  return { fingering, hands };
}

/**
 * Find split point using actual MIDI values — guaranteed no hand crossing.
 *
 * Levine-style:
 * - LH gets 1-3 lower notes (root + guide tones)
 * - RH gets upper notes (extensions)
 * - Prefer split at the widest MIDI gap
 */
/** Largest interval between adjacent notes in a sorted MIDI array. */
function maxAdjacentStretch(midis: number[]): number {
  let max = 0;
  for (let i = 1; i < midis.length; i++) {
    max = Math.max(max, midis[i] - midis[i - 1]);
  }
  return max;
}

/**
 * Find split point using actual MIDI values — guaranteed no hand crossing.
 *
 * Scoring priorities (highest to lowest):
 * 1. Minimize worst-case stretch — penalize the hand with the biggest
 *    inter-note gap. If LH has spare capacity, absorb notes to give RH room.
 * 2. Prefer split at wider MIDI gaps — natural hand separation.
 * 3. Levine-style preferences — LH 1-3 notes, RH 3-4 notes.
 * 4. Balance note count between hands.
 */
function findSplitPointMidi(sortedNotes: string[], sortedMidis: number[]): number {
  const n = sortedNotes.length;
  let bestSplit = Math.min(2, n - 1);
  let bestScore = Infinity;

  for (let split = 1; split < n; split++) {
    const lhMidis = sortedMidis.slice(0, split);
    const rhMidis = sortedMidis.slice(split);

    // Both hands must be playable
    if (split > MAX_HAND_NOTES || (n - split) > MAX_HAND_NOTES) continue;
    const lhSpan = lhMidis[lhMidis.length - 1] - lhMidis[0];
    const rhSpan = rhMidis[rhMidis.length - 1] - rhMidis[0];
    if (lhSpan > MAX_HAND_SPAN || rhSpan > MAX_HAND_SPAN) continue;

    let score = 0;

    const lhCount = split;
    const rhCount = n - split;

    // 1. STRAIN BALANCE — minimize the worst stretch in either hand.
    const lhStretch = maxAdjacentStretch(lhMidis);
    const rhStretch = maxAdjacentStretch(rhMidis);
    const worstStretch = Math.max(lhStretch, rhStretch);
    score += worstStretch * 5;

    // 2. LOAD BALANCE — penalize hands at max capacity (5 notes = no slack).
    //    A hand with spare fingers can accommodate stretches more comfortably.
    //    Reward splits where both hands have breathing room.
    const lhLoad = lhCount / MAX_HAND_NOTES; // 0.2 to 1.0
    const rhLoad = rhCount / MAX_HAND_NOTES;
    const loadImbalance = Math.abs(lhLoad - rhLoad);
    score += loadImbalance * 8;

    // Extra penalty when either hand is maxed out at 5 notes
    if (lhCount === MAX_HAND_NOTES || rhCount === MAX_HAND_NOTES) {
      score += 4;
    }

    // 3. Prefer wider MIDI gap at the split point — natural hand separation
    const gap = sortedMidis[split] - sortedMidis[split - 1];
    score -= gap * 3;

    // 4. Levine-style: LH with 1-3 notes (root + guide tones)
    if (lhCount >= 1 && lhCount <= 3) score -= 4;

    // 5. Prefer RH with 3-4 notes
    if (rhCount >= 3 && rhCount <= 4) score -= 2;

    if (score < bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }

  return bestSplit;
}

/** Fallback split point using mod-12 intervals (no MIDI data). */
function findSplitPointMod12(notes: string[]): number {
  const n = notes.length;
  let bestSplit = Math.min(2, n - 1);
  let bestScore = Infinity;

  for (let split = 1; split < n; split++) {
    const lhNotes = notes.slice(0, split);
    const rhNotes = notes.slice(split);

    if (split > MAX_HAND_NOTES || (n - split) > MAX_HAND_NOTES) continue;
    if (totalSpanMod12(lhNotes) > MAX_HAND_SPAN || totalSpanMod12(rhNotes) > MAX_HAND_SPAN) continue;

    let score = 0;

    // Strain balance: penalize the hand with biggest adjacent interval
    let lhMaxGap = 0;
    for (let i = 1; i < split; i++) lhMaxGap = Math.max(lhMaxGap, interval(notes[i - 1], notes[i]));
    let rhMaxGap = 0;
    for (let i = split + 1; i < n; i++) rhMaxGap = Math.max(rhMaxGap, interval(notes[i - 1], notes[i]));
    score += Math.max(lhMaxGap, rhMaxGap) * 5;

    const gapSemitones = interval(notes[split - 1], notes[split]);
    score -= gapSemitones * 3;
    if (split >= 1 && split <= 3) score -= 4;
    if ((n - split) >= 3 && (n - split) <= 4) score -= 2;
    score += Math.abs(split - (n - split));

    if (score < bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }

  return bestSplit;
}

// ── Legacy API ────────────────────────────────────────────────────

/**
 * Compute auto-fingering for a chord voicing (legacy API).
 */
export function autoFingering(notes: string[], hand: Hand = "rh"): number[] {
  const n = notes.length;
  if (n === 0) return [];
  if (n === 1) return [3];

  if (isOneHandPlayable(notes)) {
    return fingerOneHand(notes, hand);
  }

  const result = assignFingering(notes);
  return result.fingering;
}
