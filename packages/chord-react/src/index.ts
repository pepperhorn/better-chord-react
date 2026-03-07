export { PianoKeyboard } from "./components/PianoKeyboard";
export { PianoChord } from "./components/PianoChord";
export { ChordGroup } from "./components/ChordGroup";
export { ProgressionView } from "./components/ProgressionView";
export type { ChordGroupProps } from "./components/ChordGroup";
export type { ProgressionViewProps, GroupMode } from "./components/ProgressionView";
export { resolveChord } from "./resolver/chord-resolver";
export { calculateLayout } from "./resolver/auto-layout";
export { parseChordDescription } from "./parser/natural-language";
export { getTheme } from "./themes";
export { playBlock, playArpeggiated } from "./audio/playback";
export { generateMidiFile, downloadMidi } from "./audio/midi-export";
export { downloadSvg, downloadPng } from "./audio/svg-export";
export { autoFingering } from "@better-chord/core";

// Re-export voicings from the workspace package
export {
  VOICING_LIBRARY,
  queryVoicings,
  findVoicing,
  realizeVoicing,
  realizeVoicingFull,
  voicingPitchClasses,
  getAlternativeVoicings,
  inferStyle,
  mapToVoicingQuality,
  selectByRange,
  autoSelectVoicing,
  generateLockedHands,
  solvePolychord,
  solveSlashChord,
} from "@better-chord/voicings";
export type {
  VoicingEntry,
  VoicingQuery,
  VoicingQuality,
  VoicingEra,
  VoicingStyle,
  Hand,
  RealizedNote,
  ChordDescriptor,
} from "@better-chord/voicings";

// Progression resolver
export {
  resolveProgression,
  tokenizeProgression,
  FORM_TEMPLATES,
  findTemplate,
  resolveProgressionRequest,
} from "./progression";
export type {
  FormTemplate,
  ProgressionRequest,
  ProgressionResult,
  ProgressionExample,
  ProgressionChord,
} from "./progression";
export {
  isProgressionRequest,
  parseProgressionRequest,
} from "./parser/progression-parser";
export type { ParsedProgressionRequest } from "./parser/progression-parser";
export { MAX_EXAMPLES, SHOW_NOTE_NAMES, LIGHT_THEME, DARK_THEME, DEFAULT_UI_THEME, getUIThemeTokens } from "./config";
export type { UIThemeMode, UIThemeTokens } from "./config";
export { UIThemeProvider, useUITheme, resolveUITheme } from "./ui-theme";

export type {
  Format,
  WhiteNote,
  NoteName,
  ColorTheme,
  KeyboardProps,
  ChordProps,
  PianoChordProps,
  ParsedChordRequest,
  KeyDescriptor,
  TextSize,
} from "./types";
