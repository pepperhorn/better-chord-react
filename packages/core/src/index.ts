// @better-chord/core — pure TypeScript chord engine
export type {
  Format, TextSize, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket,
} from "./types";

export { computeKeyboard, computeSvgDimensions } from "./engine/keyboard-layout";
export { mapHighlights, normalizeNote } from "./engine/highlight-mapper";
export { autoFingering } from "./engine/auto-fingering";
export {
  WHITE_KEY_WIDTH, WHITE_KEY_WIDTH_EXACT, WHITE_KEY_HEIGHT_COMPACT, WHITE_KEY_HEIGHT_EXACT,
  WHITE_KEY_RY,
  BLACK_KEY_WIDTH, BLACK_KEY_WIDTH_EXACT, BLACK_KEY_HEIGHT_COMPACT, BLACK_KEY_HEIGHT_EXACT,
  BLACK_KEY_RY,
  BLACK_KEY_OFFSETS, BLACK_KEY_OFFSETS_EXACT,
  WHITE_NOTES_WITH_SHARPS, WHITE_NOTE_ORDER, FLAT_TO_SHARP,
  DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH,
} from "./engine/svg-constants";
