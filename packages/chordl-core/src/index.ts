// @pepperhorn/chordl-core — pure TypeScript chord engine
export type {
  Format, TextSize, NoteNameMode, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket, NotesGroup,
  DisplayMode, DisplayDefaults, ChordData, SectionData, ChordSheetData,
} from "./types.js";

export { computeKeyboard, computeSvgDimensions } from "./engine/keyboard-layout.js";
export { mapHighlights, normalizeNote } from "./engine/highlight-mapper.js";
export {
  FLAT_TO_SHARP, SHARP_TO_FLAT, FLAT_KEYS,
  normalizeToSharps, spellForKey, spellWithPreference,
  PC_SEMITONES, MIDI_A3, assignAscendingOctaves,
} from "./engine/note-spelling.js";
export { autoFingering, assignFingering } from "./engine/auto-fingering.js";
export { scaleAutoFingering } from "./engine/scale-fingering.js";
export type { HandAssignment } from "./engine/auto-fingering.js";
export { computeStaffLayout } from "./engine/staff-layout.js";
export type { StaffNote, StaffLayoutResult, StaffLayoutOptions } from "./engine/staff-layout.js";
export { buildMei } from "./engine/mei-builder.js";
export type { MeiBuildOptions, MeiBuildResult } from "./engine/mei-builder.js";
export { getDefaultGlyphs, setDefaultGlyphs, BRAVURA_GLYPHS, PETALUMA_GLYPHS } from "./engine/staff-glyphs.js";
export type { StaffGlyphSet } from "./engine/staff-glyphs.js";
export {
  STAFF_LINE_SPACING, HALF_STAFF_SPACING, STAFF_WIDTH, CLEF_AREA_WIDTH,
  NOTE_COLUMN_X, NOTE_HEAD_RX, ACCIDENTAL_OFFSET, LEDGER_LINE_EXTEND,
  LEDGER_LINE_STROKE, STAFF_GAP, STAFF_TOP_MARGIN, STAFF_BOTTOM_MARGIN,
  STAFF_LINE_STROKE, BRACE_WIDTH, SECOND_OFFSET, ACCIDENTAL_COL_WIDTH,
} from "./engine/staff-constants.js";
export {
  WHITE_KEY_WIDTH, WHITE_KEY_WIDTH_EXACT, WHITE_KEY_HEIGHT_COMPACT, WHITE_KEY_HEIGHT_EXACT,
  WHITE_KEY_RY,
  BLACK_KEY_WIDTH, BLACK_KEY_WIDTH_EXACT, BLACK_KEY_HEIGHT_COMPACT, BLACK_KEY_HEIGHT_EXACT,
  BLACK_KEY_RY,
  BLACK_KEY_OFFSETS, BLACK_KEY_OFFSETS_EXACT,
  WHITE_NOTES_WITH_SHARPS, WHITE_NOTE_ORDER,
  DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH,
} from "./engine/svg-constants.js";

export { parseChordDescription } from "./parser/natural-language.js";
export { isProgressionRequest, parseProgressionRequest } from "./parser/progression-parser.js";
export type { ParsedProgressionRequest } from "./parser/progression-parser.js";
export { resolveChord } from "./resolver/chord-resolver.js";
export type { ResolvedChord } from "./resolver/chord-resolver.js";
export { calculateLayout, whiteIdxHasSharp } from "./resolver/auto-layout.js";
export type { LayoutOptions, LayoutResult } from "./resolver/auto-layout.js";
export { MAX_EXAMPLES, ENABLE_CHORD_LOGGING } from "./config.js";

// Progression
export { resolveProgression, tokenizeProgression } from "./progression/roman-numeral.js";
export { FORM_TEMPLATES, findTemplate } from "./progression/form-templates.js";
export type { FormTemplate } from "./progression/form-templates.js";
export { resolveProgressionRequest } from "./progression/progression-resolver.js";
export type { ProgressionRequest, ProgressionResult, ProgressionExample, ProgressionChord } from "./progression/progression-resolver.js";

// Audio
export { generateMidiFile, downloadMidi } from "./audio/midi-export.js";

// Logging
export { logChordRequest, LOG_SCHEMA_VERSION } from "./logging.js";
export type { ChordLogEntry, LogConfig } from "./logging.js";

// Theory
export { classifyTones, parseInterval, minimalVoicing, dropOrder } from "./theory/chord-tones.js";
export type { ChordTone, ChordToneRole, ChordToneAnalysis } from "./theory/chord-tones.js";
export { intervalToDegreeLabel, degreesForIntervals, degreeLabelsForNotes } from "./theory/degree-labels.js";

// Scale resolver
export { resolveScale } from "./resolver/scale-resolver.js";
export type { ResolvedScale } from "./resolver/scale-resolver.js";

// Themes
export { getTheme, resolveTheme } from "./themes/index.js";
export { CRF_PITCH_PALETTE, formatCmyk } from "./themes/crf.js";
export type { CrfPitchEntry } from "./themes/crf.js";

// Pipeline
export { processChordRequest } from "./pipeline.js";
export type { ChordRequest, ChordResult } from "./pipeline.js";

// ChordSheet
export { resolveDefaults, chordRef, SYSTEM_DEFAULTS } from "./chord-sheet/defaults.js";
export { CHORD_SHEET_SCHEMA_VERSION, validateVersion } from "./chord-sheet/schema.js";
export { encodeChordSheet, decodeChordSheet } from "./chord-sheet/codec.js";

// Hand Constraints
export { midiOf, placeAscending, spanOf, constrainVoicing } from "./theory/hand-constraints.js";
export type {
  HandConstraints,
  PlacedNote,
  ConstrainedNote,
  ConstrainVoicingInput,
  ConstrainedVoicing,
} from "./theory/hand-constraints.js";

export { generateConstrainedVariants } from "./theory/constrained-variants.js";
export type {
  ConstrainedVariant,
  GenerateConstrainedOptions,
} from "./theory/constrained-variants.js";
