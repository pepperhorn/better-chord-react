import type { WhiteNote } from "../types";
import { WHITE_NOTE_ORDER, FLAT_TO_SHARP } from "../engine/svg-constants";

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1,
  D: 2, "D#": 3,
  E: 4,
  F: 5, "F#": 6,
  G: 7, "G#": 8,
  A: 9, "A#": 10,
  B: 11,
};

// Map a note to its nearest white key (the white key it sits on or just below)
function nearestWhiteKey(note: string): WhiteNote {
  // Normalize flats to sharps first
  const normalized = FLAT_TO_SHARP[note] ?? note;
  const base = normalized.replace("#", "");
  if (WHITE_NOTE_ORDER.includes(base as WhiteNote)) {
    return base as WhiteNote;
  }
  return base as WhiteNote;
}

// Count white keys from one white note to another (inclusive of start, exclusive of end)
function whiteKeySpan(from: WhiteNote, to: WhiteNote): number {
  const fromIdx = WHITE_NOTE_ORDER.indexOf(from);
  let toIdx = WHITE_NOTE_ORDER.indexOf(to);
  if (toIdx <= fromIdx) toIdx += 7;
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
}

export function calculateLayout(
  notes: string[],
  options: LayoutOptions = {}
): LayoutResult {
  const { padding = 1, startingNote, spanFrom, spanTo } = options;

  // Explicit starting note: anchor the keyboard there
  if (startingNote) {
    const start = nearestWhiteKey(startingNote);
    // Size the keyboard to fit all notes with padding on the right
    const startIdx = WHITE_NOTE_ORDER.indexOf(start);
    if (notes.length > 0) {
      const whiteKeys = notes.map(nearestWhiteKey);
      const indices = whiteKeys.map((w) => {
        let idx = WHITE_NOTE_ORDER.indexOf(w);
        if (idx < startIdx) idx += 7;
        return idx;
      });
      const maxIdx = Math.max(...indices);
      const span = maxIdx - startIdx + 1 + padding;
      return { startFrom: start, size: Math.max(span, notes.length + 2) };
    }
    return { startFrom: start, size: 8 };
  }

  if (spanFrom && spanTo) {
    const from = nearestWhiteKey(spanFrom);
    const to = nearestWhiteKey(spanTo);
    const span = whiteKeySpan(from, to);
    return {
      startFrom: from,
      size: span === 0 ? 8 : span + 1,
    };
  }

  if (notes.length === 0) {
    return { startFrom: "C", size: 8 };
  }

  // Find semitone positions
  const semitones = notes.map((n) => NOTE_TO_SEMITONE[n] ?? 0);

  // Find bounding white keys
  const whiteKeys = notes.map(nearestWhiteKey);
  const indices = whiteKeys.map((w) => WHITE_NOTE_ORDER.indexOf(w));

  // Find min and max, accounting for wrapping
  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);

  // Check if the chord wraps around (e.g., B to C)
  const span = maxIdx - minIdx;

  let startIdx = minIdx - padding;
  let endIdx = maxIdx + padding;

  // Ensure we don't go below 0
  if (startIdx < 0) startIdx += 7;
  if (endIdx >= 7) {
    // Need extra keys to wrap
  }

  const startNote = WHITE_NOTE_ORDER[((startIdx % 7) + 7) % 7] as WhiteNote;
  const keyCount = (endIdx - minIdx + padding) + 1;

  return {
    startFrom: startNote,
    size: Math.max(keyCount, notes.length + 2),
  };
}
