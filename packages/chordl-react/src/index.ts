// ─── React components (local) ───────────────────────────────────────────────
export { PianoKeyboard } from "./components/PianoKeyboard";
export { PianoChord } from "./components/PianoChord";
export { VoicingVariantToggle } from "./components/VoicingVariantToggle";
export { ChordGroup } from "./components/ChordGroup";
export { ProgressionView } from "./components/ProgressionView";
export { StaffNotation } from "./components/StaffNotation";
export { ChordSheet } from "./components/ChordSheet";
export type { StaffNotationProps } from "./components/StaffNotation";
export { ListenOverlay } from "./components/ListenOverlay";
export type { ListenOverlayProps } from "./components/ListenOverlay";
export { FollowAlongOverlay } from "./components/FollowAlongOverlay";
export type { FollowAlongOverlayProps } from "./components/FollowAlongOverlay";
export { useFollowAlong } from "./follow/useFollowAlong";
export type { UseFollowAlongOptions, FollowAlongState, FollowStatus, FollowListener } from "./follow/useFollowAlong";
export { sequenceFromChords, normalizeToDetectorSymbol, pageCount } from "./follow/sequenceFromChords";
export { GuitarChord } from "./components/GuitarChord";
export type { GuitarChordProps } from "./components/GuitarChord";
export { GuitarChordPanel } from "./components/GuitarChordPanel";
export type { GuitarChordPanelProps } from "./components/GuitarChordPanel";
/** Re-exported so consumers can name the type `GuitarChordPanelProps` uses. */
export type { InstrumentId } from "@pepperhorn/chordl-guitar";
export type { ChordGroupProps } from "./components/ChordGroup";
export type { ProgressionViewProps, GroupMode } from "./components/ProgressionView";

// ─── Browser-only modules (local) ──────────────────────────────────────────
export { playBlock, playArpeggiated } from "./audio/playback";
export { downloadSvg, downloadPng, prepareExportClone } from "./audio/svg-export";

// ─── UI theme (local — React context) ──────────────────────────────────────
export { UIThemeProvider, useUITheme, resolveUITheme } from "./ui-theme";
export { SHOW_NOTE_NAMES, ARPEGGIO_BPM, arpeggioDelayMs, LIGHT_THEME, DARK_THEME, DEFAULT_UI_THEME, getUIThemeTokens } from "./config";
export type { UIThemeMode, UIThemeTokens } from "./config";

// ─── React-specific types (local) ──────────────────────────────────────────
export type { KeyboardProps, ChordProps, PianoChordProps, DisplayMode, ChordSheetProps, DisplayDefaults, ChordData, SectionData, ChordSheetData, VariationContext, RenderVariationExtras, OnVariation } from "./types";

// ─── Re-export everything from @pepperhorn/chordl-core for backwards compat ─────
export {
  // Engine
  computeKeyboard, computeSvgDimensions,
  mapHighlights, normalizeNote,
  autoFingering,
  computeStaffLayout,
  getDefaultGlyphs, setDefaultGlyphs, BRAVURA_GLYPHS, PETALUMA_GLYPHS,
  // SVG constants
  WHITE_KEY_WIDTH, WHITE_KEY_WIDTH_EXACT, WHITE_KEY_HEIGHT_COMPACT, WHITE_KEY_HEIGHT_EXACT,
  WHITE_KEY_RY,
  BLACK_KEY_WIDTH, BLACK_KEY_WIDTH_EXACT, BLACK_KEY_HEIGHT_COMPACT, BLACK_KEY_HEIGHT_EXACT,
  BLACK_KEY_RY,
  BLACK_KEY_OFFSETS, BLACK_KEY_OFFSETS_EXACT,
  WHITE_NOTES_WITH_SHARPS, WHITE_NOTE_ORDER, FLAT_TO_SHARP,
  DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH,
  // Parser & Resolver
  parseChordDescription,
  resolveChord,
  calculateLayout,
  isProgressionRequest, parseProgressionRequest,
  // Progression
  resolveProgression, tokenizeProgression,
  FORM_TEMPLATES, findTemplate,
  resolveProgressionRequest,
  // Themes
  getTheme, resolveTheme,
  // MIDI
  generateMidiFile, downloadMidi,
  // Pipeline
  processChordRequest,
  // Logging
  logChordRequest, LOG_SCHEMA_VERSION,
  // Config
  ENABLE_CHORD_LOGGING, MAX_EXAMPLES,
  // ChordSheet
  resolveDefaults, chordRef, SYSTEM_DEFAULTS,
  CHORD_SHEET_SCHEMA_VERSION, validateVersion,
  encodeChordSheet, decodeChordSheet,
} from "@pepperhorn/chordl-core";

export type {
  // Shared types
  Format, TextSize, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket,
  ResolvedChord,
  // Staff types
  StaffNote, StaffLayoutResult, StaffLayoutOptions,
  StaffGlyphSet,
  // Parser types
  ParsedProgressionRequest,
  // Layout types
  LayoutOptions, LayoutResult,
  // Progression types
  FormTemplate, ProgressionRequest, ProgressionResult,
  ProgressionExample, ProgressionChord,
  // Pipeline types
  ChordRequest, ChordResult,
  // Logging types
  ChordLogEntry, LogConfig,
} from "@pepperhorn/chordl-core";

// ─── Re-export voicings (pass-through) ─────────────────────────────────────
export {
  VOICING_LIBRARY, queryVoicings, findVoicing,
  realizeVoicing, realizeVoicingFull, voicingPitchClasses,
  getAlternativeVoicings, inferStyle, mapToVoicingQuality,
  selectByRange, autoSelectVoicing,
  generateLockedHands, solvePolychord, solveSlashChord,
} from "@pepperhorn/chordl-voicings";
export type {
  VoicingEntry, VoicingQuery, VoicingQuality, VoicingEra,
  VoicingStyle, Hand, RealizedNote, ChordDescriptor,
} from "@pepperhorn/chordl-voicings";
