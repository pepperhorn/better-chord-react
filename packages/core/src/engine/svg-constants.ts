export const WHITE_KEY_WIDTH = 23;
export const WHITE_KEY_WIDTH_EXACT = 25.3;
export const WHITE_KEY_HEIGHT_COMPACT = 65;
export const WHITE_KEY_HEIGHT_EXACT = 120;
export const WHITE_KEY_RY = 3;

export const BLACK_KEY_WIDTH = 13;
export const BLACK_KEY_WIDTH_EXACT = 14.3;
export const BLACK_KEY_HEIGHT_COMPACT = 40;
export const BLACK_KEY_HEIGHT_EXACT = 80;
export const BLACK_KEY_RY = 1;

export const DEFAULT_WHITE_FILL = "#fafafa";
export const DEFAULT_BLACK_FILL = "#222222";
export const DEFAULT_STROKE = "#333333";
export const DEFAULT_STROKE_WIDTH = 1;

// Black key x-offsets relative to the left edge of the parent white key
export const BLACK_KEY_OFFSETS: Record<string, number> = {
  C: 14.33,
  D: 18.67,
  F: 13.25,
  G: 16.25,
  A: 19.75,
};

export const BLACK_KEY_OFFSETS_EXACT: Record<string, number> = {
  C: 15.76,
  D: 20.54,
  F: 14.58,
  G: 17.88,
  A: 21.73,
};

// Which white notes have a black key to their right
export const WHITE_NOTES_WITH_SHARPS = new Set(["C", "D", "F", "G", "A"]);

export const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

export const WHITE_NOTE_ORDER = ["C", "D", "E", "F", "G", "A", "B"] as const;
