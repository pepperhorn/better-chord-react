export { PianoKeyboard } from "./components/PianoKeyboard";
export { PianoChord } from "./components/PianoChord";
export { ChordGroup } from "./components/ChordGroup";
export { ProgressionView } from "./components/ProgressionView";
export type { ChordGroupProps } from "./components/ChordGroup";
export type { ProgressionViewProps, GroupMode } from "./components/ProgressionView";
export { resolveChord, calculateLayout, parseChordDescription } from "@better-chord/core";
export { getTheme, resolveTheme } from "@better-chord/core";
export { playBlock, playArpeggiated } from "./audio/playback";
export { generateMidiFile, downloadMidi } from "@better-chord/core";
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
} from "@better-chord/core";
export type {
  FormTemplate,
  ProgressionRequest,
  ProgressionResult,
  ProgressionExample,
  ProgressionChord,
} from "@better-chord/core";
export {
  isProgressionRequest,
  parseProgressionRequest,
  MAX_EXAMPLES,
} from "@better-chord/core";
export type { ParsedProgressionRequest } from "@better-chord/core";
export { SHOW_NOTE_NAMES, LIGHT_THEME, DARK_THEME, DEFAULT_UI_THEME, getUIThemeTokens } from "./config";
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
