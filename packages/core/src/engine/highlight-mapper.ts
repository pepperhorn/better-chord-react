import type { KeyDescriptor, ColorTheme } from "../types";
import { FLAT_TO_SHARP, DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL } from "./svg-constants";

export function normalizeNote(note: string): string {
  return FLAT_TO_SHARP[note] ?? note;
}

/**
 * Normalize a highlight key. Supports octave-qualified format "note:octave"
 * (e.g., "A#:0", "C:1") for multi-octave keyboards.
 */
function normalizeHighlightKey(key: string): { note: string; octave: number | null } {
  const colonIdx = key.indexOf(":");
  if (colonIdx !== -1) {
    const note = normalizeNote(key.slice(0, colonIdx));
    const octave = parseInt(key.slice(colonIdx + 1), 10);
    return { note, octave };
  }
  return { note: normalizeNote(key), octave: null };
}

export function mapHighlights(
  keys: KeyDescriptor[],
  highlightKeys: string[],
  theme?: ColorTheme
): string[] {
  const normalized = highlightKeys.map(normalizeHighlightKey);
  const remaining = [...normalized];

  return keys.map((key) => {
    const keyNote = normalizeNote(key.note);
    const matchIndex = remaining.findIndex((h) => {
      if (h.note !== keyNote) return false;
      if (h.octave !== null && h.octave !== key.octave) return false;
      return true;
    });
    const isHighlighted = matchIndex !== -1;

    if (isHighlighted) {
      remaining.splice(matchIndex, 1);
    }

    if (theme) {
      return key.isBlack
        ? theme.blackKey(keyNote, isHighlighted)
        : theme.whiteKey(keyNote, isHighlighted);
    }

    if (isHighlighted) {
      return key.isBlack ? "#5a8ab5" : "#a0c6e8";
    }

    return key.isBlack ? DEFAULT_BLACK_FILL : DEFAULT_WHITE_FILL;
  });
}
