// @pepperhorn/chordl-guitar — guitar chord-shape lookup and svguitar diagram data.
//
// Backed by @tombatossals/chords-db; returns every stored fret position for a
// chord (alternate placements). Shapes convert to svguitar `Chord` objects for
// rendering. Based on pepperhorn/frames.

export { INSTRUMENTS, dbPositionToChord } from "./instruments";
export type {
  InstrumentId,
  InstrumentConfig,
  ChordsDb,
  ChordsDbEntry,
  ChordsDbPosition,
} from "./instruments";

export { lookupGuitarChord, hasGuitarChord } from "./chordLookup";
export type { GuitarChordResult } from "./chordLookup";

export { GUITAR_TOP3_PRESETS, lookupTop3Chord } from "./staticPresets";
export type { StaticPreset } from "./staticPresets";

export { positionToMidi, rootPitchClass } from "./pitch";

export { positionFacts, duplicateVoicingMap } from "./voicingFacts";
export type { Inversion, PositionFacts } from "./voicingFacts";

export {
  matchesShapeClass,
  canonicalPositionIndex,
  selectVoicings,
  SHAPE_CLASS_LADDER,
} from "./voicingSelect";
export type {
  ShapeClass,
  CanonicalOptions,
  VoicingChoice,
  SelectVoicingsOptions,
  SelectVoicingsResult,
} from "./voicingSelect";

export { powerChordPosition, powerChordShape } from "./powerChords";
export type { PowerChordStringSet, PowerChordOptions } from "./powerChords";

export { bassShapeFor, violinShapeFor } from "./generatedShapes";
