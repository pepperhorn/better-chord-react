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

export { parseChordDescription } from "./parser/natural-language";
export { isProgressionRequest, parseProgressionRequest } from "./parser/progression-parser";
export type { ParsedProgressionRequest } from "./parser/progression-parser";
export { resolveChord } from "./resolver/chord-resolver";
export type { ResolvedChord } from "./resolver/chord-resolver";
export { calculateLayout } from "./resolver/auto-layout";
export type { LayoutOptions, LayoutResult } from "./resolver/auto-layout";
export { MAX_EXAMPLES, ENABLE_CHORD_LOGGING } from "./config";

// Progression
export { resolveProgression, tokenizeProgression } from "./progression/roman-numeral";
export { FORM_TEMPLATES, findTemplate } from "./progression/form-templates";
export type { FormTemplate } from "./progression/form-templates";
export { resolveProgressionRequest } from "./progression/progression-resolver";
export type { ProgressionRequest, ProgressionResult, ProgressionExample, ProgressionChord } from "./progression/progression-resolver";

// Audio
export { generateMidiFile, downloadMidi } from "./audio/midi-export";

// Logging
export { logChordRequest, LOG_SCHEMA_VERSION } from "./logging";
export type { ChordLogEntry, LogConfig } from "./logging";

// Themes
export { getTheme, resolveTheme } from "./themes";

// Pipeline
export { processChordRequest } from "./pipeline";
export type { ChordRequest, ChordResult } from "./pipeline";
