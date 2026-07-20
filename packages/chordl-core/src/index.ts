// @pepperhorn/chordl-core — pure TypeScript chord engine
export type {
  Format, TextSize, NoteNameMode, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket, NotesGroup,
  DisplayMode, DisplayDefaults, ChordData, SectionData, ChordSheetData,
} from "./types";

export { computeKeyboard, computeSvgDimensions } from "./engine/keyboard-layout";
export { mapHighlights, normalizeNote } from "./engine/highlight-mapper";
export {
  FLAT_TO_SHARP, SHARP_TO_FLAT, FLAT_KEYS,
  normalizeToSharps, spellForKey, spellWithPreference,
  PC_SEMITONES, MIDI_A3, assignAscendingOctaves,
} from "./engine/note-spelling";
export { autoFingering, assignFingering } from "./engine/auto-fingering";
export { scaleAutoFingering } from "./engine/scale-fingering";
export type { HandAssignment } from "./engine/auto-fingering";
export { computeStaffLayout } from "./engine/staff-layout";
export type { StaffNote, StaffLayoutResult, StaffLayoutOptions } from "./engine/staff-layout";
export { buildMei } from "./engine/mei-builder";
export type { MeiBuildOptions, MeiBuildResult } from "./engine/mei-builder";
export { getDefaultGlyphs, setDefaultGlyphs, BRAVURA_GLYPHS, PETALUMA_GLYPHS } from "./engine/staff-glyphs";
export type { StaffGlyphSet } from "./engine/staff-glyphs";
export {
  STAFF_LINE_SPACING, HALF_STAFF_SPACING, STAFF_WIDTH, CLEF_AREA_WIDTH,
  NOTE_COLUMN_X, NOTE_HEAD_RX, ACCIDENTAL_OFFSET, LEDGER_LINE_EXTEND,
  LEDGER_LINE_STROKE, STAFF_GAP, STAFF_TOP_MARGIN, STAFF_BOTTOM_MARGIN,
  STAFF_LINE_STROKE, BRACE_WIDTH, SECOND_OFFSET, ACCIDENTAL_COL_WIDTH,
} from "./engine/staff-constants";
export {
  WHITE_KEY_WIDTH, WHITE_KEY_WIDTH_EXACT, WHITE_KEY_HEIGHT_COMPACT, WHITE_KEY_HEIGHT_EXACT,
  WHITE_KEY_RY,
  BLACK_KEY_WIDTH, BLACK_KEY_WIDTH_EXACT, BLACK_KEY_HEIGHT_COMPACT, BLACK_KEY_HEIGHT_EXACT,
  BLACK_KEY_RY,
  BLACK_KEY_OFFSETS, BLACK_KEY_OFFSETS_EXACT,
  WHITE_NOTES_WITH_SHARPS, WHITE_NOTE_ORDER,
  DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH,
} from "./engine/svg-constants";

export { parseChordDescription } from "./parser/natural-language";
export { isProgressionRequest, parseProgressionRequest } from "./parser/progression-parser";
export type { ParsedProgressionRequest } from "./parser/progression-parser";
export { resolveChord } from "./resolver/chord-resolver";
export type { ResolvedChord } from "./resolver/chord-resolver";
export { calculateLayout, whiteIdxHasSharp } from "./resolver/auto-layout";
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

// Theory
export { classifyTones, parseInterval, minimalVoicing, dropOrder } from "./theory/chord-tones";
export type { ChordTone, ChordToneRole, ChordToneAnalysis } from "./theory/chord-tones";
export { intervalToDegreeLabel, degreesForIntervals } from "./theory/degree-labels";

// Scale resolver
export { resolveScale } from "./resolver/scale-resolver";
export type { ResolvedScale } from "./resolver/scale-resolver";

// Themes
export { getTheme, resolveTheme } from "./themes";
export { CRF_PITCH_PALETTE, formatCmyk } from "./themes/crf";
export type { CrfPitchEntry } from "./themes/crf";

// Pipeline
export { processChordRequest } from "./pipeline";
export type { ChordRequest, ChordResult } from "./pipeline";

// ChordSheet
export { resolveDefaults, chordRef, SYSTEM_DEFAULTS } from "./chord-sheet/defaults";
export { CHORD_SHEET_SCHEMA_VERSION, validateVersion } from "./chord-sheet/schema";
export { encodeChordSheet, decodeChordSheet } from "./chord-sheet/codec";
