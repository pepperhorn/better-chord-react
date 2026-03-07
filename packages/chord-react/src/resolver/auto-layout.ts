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
  /** Relative octave where the lowest chord note sits (for octave-qualified highlights). */
  chordOctave: number;
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
      return { startFrom: start, size: Math.max(span, notes.length + 2), chordOctave: 0 };
    }
    return { startFrom: start, size: 8, chordOctave: 0 };
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
  const endIdx = maxAsc + padding;

  const startNote = WHITE_NOTE_ORDER[((startIdx % 7) + 7) % 7] as WhiteNote;
  const keyCount = endIdx - startIdx + 1;

  // Calculate which relative octave the chord notes live in.
  // Count how many times we cross C going from startNote to the first chord note.
  const startNoteIdx = WHITE_NOTE_ORDER.indexOf(startNote);
  let chordOctave = 0;
  for (let i = 1; i <= padding; i++) {
    const noteIdx = (startNoteIdx + i) % 7;
    if (WHITE_NOTE_ORDER[noteIdx] === "C") chordOctave++;
  }

  return {
    startFrom: startNote,
    size: Math.max(keyCount, notes.length + 2),
    chordOctave,
  };
}
