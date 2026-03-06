export { PianoKeyboard } from "./components/PianoKeyboard";
export { PianoChord } from "./components/PianoChord";
export { resolveChord } from "./resolver/chord-resolver";
export { calculateLayout } from "./resolver/auto-layout";
export { parseChordDescription } from "./parser/natural-language";
export { getTheme } from "./themes";
export { playBlock, playArpeggiated } from "./audio/playback";
export { generateMidiFile, downloadMidi } from "./audio/midi-export";

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
} from "@better-chord/voicings";
export type {
  VoicingEntry,
  VoicingQuery,
  VoicingQuality,
  VoicingEra,
  VoicingStyle,
  Hand,
  RealizedNote,
} from "@better-chord/voicings";

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
} from "./types";
