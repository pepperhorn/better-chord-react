import type { WhiteNote } from "../types.js";
import { WHITE_NOTE_ORDER } from "../engine/svg-constants.js";
import { normalizeToSharps } from "../engine/note-spelling.js";

// White notes that have a sharp (black key to their right)
const HAS_SHARP = new Set<string>(["C", "D", "F", "G", "A"]);

/** Check if a white-key index (mod 7) has a sharp. */
export function whiteIdxHasSharp(idx: number): boolean {
  return HAS_SHARP.has(WHITE_NOTE_ORDER[((idx % 7) + 7) % 7]);
}

// Map a note to its nearest white key (the white key it sits on or just below)
function nearestWhiteKey(note: string): WhiteNote {
  const normalized = normalizeToSharps(note);
  const base = normalized.replace("#", "") as WhiteNote;
  return base;
}

// Count white keys from one white note to another (inclusive of start, exclusive of end)
function whiteKeySpan(from: WhiteNote, to: WhiteNote): number {
  const fromIdx = WHITE_NOTE_ORDER.indexOf(from);
  let toIdx = WHITE_NOTE_ORDER.indexOf(to);
  if (toIdx < fromIdx) toIdx += 7;
  return toIdx - fromIdx;
}

export interface LayoutOptions {
  padding?: number;
  startingNote?: string;
  spanFrom?: string;
  spanTo?: string;
}

export interface LayoutResult {
  startFrom: WhiteNote;
  size: number;
  /** Relative octave where the lowest chord note sits (for octave-qualified highlights). */
  chordOctave: number;
  /** True when the left edge was extended for black-key context (crop half a key). */
  clipLeft?: boolean;
  /** True when the right edge was extended for black-key context (crop half a key). */
  clipRight?: boolean;
}

/**
 * Ensure the visible keyboard range doesn't cut through the middle of a
 * black-key group, making orientation difficult.
 *
 * Piano keys form repeating groups:
 * - 2-group: C(0), D(1), E(2)       — black keys C#, D#
 * - 3-group: F(3), G(4), A(5), B(6) — black keys F#, G#, A#
 *
 * Rule: if the keyboard starts or ends in the INTERIOR of a group
 * (not at its boundary), extend outward to the nearest group boundary.
 * Starting/ending at a group boundary (C, F, E, B) is fine — the edge
 * itself provides enough orientation context.
 */
function ensureFullBlackKeyGroups(startIdx: number, endIdx: number): { startIdx: number; endIdx: number } {
  // Determine which position within a group the start/end falls
  // Group boundaries: C(0)=start of 2-group, F(3)=start of 3-group
  // Interior: D(1), E(2) are interior of 2-group; G(4), A(5) are interior of 3-group
  // B(6) is the end of the 3-group — a boundary, fine to start/end on

  const startMod = ((startIdx % 7) + 7) % 7;
  const endMod = ((endIdx % 7) + 7) % 7;

  // Fix left edge: if we start in the interior of a group, extend left to group start.
  // Group boundaries (OK to start on): C(0), F(3), E(2)→end of 2-group, B(6)→end of 3-group
  // Interior (confusing): D(1), G(4), A(5)
  if (startMod === 1) startIdx -= 1;  // D → extend to C
  if (startMod === 4) startIdx -= 1;  // G → extend to F
  if (startMod === 5) startIdx -= 2;  // A → extend to F

  // Fix right edge: if we end in the interior of a group, extend right to group end.
  // Group boundaries (OK to end on): E(2), B(6), C(0)→start of 2-group, F(3)→start of 3-group
  // Interior (confusing): D(1), G(4), A(5)
  if (endMod === 1) endIdx += 1;  // D → extend to E
  if (endMod === 4) endIdx += 2;  // G → extend to B
  if (endMod === 5) endIdx += 1;  // A → extend to B

  return { startIdx, endIdx };
}

export function calculateLayout(
  notes: string[],
  options: LayoutOptions = {}
): LayoutResult {
  const { padding = 1, startingNote, spanFrom, spanTo } = options;

  // Explicit starting note: anchor the keyboard there
  if (startingNote) {
    const anchorKey = nearestWhiteKey(startingNote);
    let startIdx = WHITE_NOTE_ORDER.indexOf(anchorKey) - padding;
    // Black-key context: extend left edge if it has a sharp
    let clipLeft = false;
    if (whiteIdxHasSharp(startIdx)) { startIdx -= 1; clipLeft = true; }
    const start = WHITE_NOTE_ORDER[((startIdx % 7) + 7) % 7] as WhiteNote;
    // Size the keyboard to fit all notes with padding on the right
    if (notes.length > 0) {
      const whiteKeys = notes.map(nearestWhiteKey);
      // Treat notes as ascending from the anchor: each note at or below
      // the previous wraps into the next octave (matches voicing rotation).
      const anchorWhiteIdx = WHITE_NOTE_ORDER.indexOf(anchorKey);
      const indices: number[] = [];
      for (const w of whiteKeys) {
        let idx = WHITE_NOTE_ORDER.indexOf(w);
        if (indices.length === 0) {
          // First note: place relative to anchor (must be >= anchor)
          while (idx < anchorWhiteIdx) idx += 7;
        } else {
          // Subsequent notes: must be above the previous
          const lastIdx = indices[indices.length - 1];
          while (idx <= lastIdx) idx += 7;
        }
        indices.push(idx);
      }
      const maxIdx = Math.max(...indices);
      let endIdx = maxIdx + padding;
      // Black-key context: extend right edge if it lands on a sharp key
      let clipRight = false;
      if (whiteIdxHasSharp(endIdx)) { endIdx += 1; clipRight = true; }
      // Ensure full black-key groups are visible
      const expanded = ensureFullBlackKeyGroups(startIdx, endIdx);
      startIdx = expanded.startIdx;
      endIdx = expanded.endIdx;
      const finalStart = WHITE_NOTE_ORDER[((startIdx % 7) + 7) % 7] as WhiteNote;
      let span = endIdx - startIdx + 1;
      // chordOctave: count C crossings from start to the anchor note
      const anchorIdx = WHITE_NOTE_ORDER.indexOf(anchorKey);
      const startNoteIdx = WHITE_NOTE_ORDER.indexOf(finalStart);
      const rawSteps = ((anchorIdx - startNoteIdx) % 7 + 7) % 7;
      // Only add a full octave if the modular distance is 0 (anchor == start)
      // AND there is padding (meaning the anchor is actually one octave away)
      const stepsToAnchor = rawSteps === 0 && padding > 0 ? 7 : rawSteps;
      let chordOctave = 0;
      for (let i = 1; i <= stepsToAnchor; i++) {
        if (WHITE_NOTE_ORDER[(startNoteIdx + i) % 7] === "C") chordOctave++;
      }
      return { startFrom: finalStart, size: Math.max(span, notes.length + 2), chordOctave, clipLeft, clipRight };
    }
    return { startFrom: start, size: 8, chordOctave: 0, clipLeft };
  }

  if (spanFrom && spanTo) {
    const from = nearestWhiteKey(spanFrom);
    const to = nearestWhiteKey(spanTo);
    const span = whiteKeySpan(from, to);
    return {
      startFrom: from,
      size: span === 0 ? 8 : span + 1,
      chordOctave: 0,
    };
  }

  if (notes.length === 0) {
    return { startFrom: "C", size: 8, chordOctave: 0 };
  }

  // Treat notes as an ascending sequence: each note that is at or below
  // the previous one (in white-key index) wraps into the next octave.
  const whiteKeys = notes.map(nearestWhiteKey);
  const ascending: number[] = [];
  for (const w of whiteKeys) {
    let idx = WHITE_NOTE_ORDER.indexOf(w);
    if (ascending.length > 0) {
      const lastIdx = ascending[ascending.length - 1];
      while (idx <= lastIdx) idx += 7;
    }
    ascending.push(idx);
  }

  const minAsc = ascending[0];
  const maxAsc = ascending[ascending.length - 1];

  let startIdx = minAsc - padding;
  let endIdx = maxAsc + padding;

  // Black-key context padding: if an edge white key has a sharp, extend by 1
  // so the neighboring black key is visible, giving orientation landmarks.
  let clipLeft = false;
  let clipRight = false;
  if (whiteIdxHasSharp(startIdx)) { startIdx -= 1; clipLeft = true; }
  if (whiteIdxHasSharp(endIdx)) { endIdx += 1; clipRight = true; }

  // Ensure full black-key groups are visible for keyboard orientation.
  // If we can see part of the 3-group (F-B) or 2-group (C-E), show all of it.
  const expanded = ensureFullBlackKeyGroups(startIdx, endIdx);
  startIdx = expanded.startIdx;
  endIdx = expanded.endIdx;

  const startNote = WHITE_NOTE_ORDER[((startIdx % 7) + 7) % 7] as WhiteNote;
  const keyCount = endIdx - startIdx + 1;

  // Calculate which relative octave the chord notes live in.
  // Count how many times we cross C going from startNote to the first chord note.
  const actualPadding = minAsc - startIdx;
  const startNoteIdx = WHITE_NOTE_ORDER.indexOf(startNote);
  let chordOctave = 0;
  for (let i = 1; i <= actualPadding; i++) {
    const noteIdx = (startNoteIdx + i) % 7;
    if (WHITE_NOTE_ORDER[noteIdx] === "C") chordOctave++;
  }

  return {
    startFrom: startNote,
    size: Math.max(keyCount, notes.length + 2),
    chordOctave,
    clipLeft,
    clipRight,
  };
}
