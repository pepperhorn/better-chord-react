// @pepperhorn/chordl-guitar — guitar chord-shape lookup and svguitar diagram data.
//
// Backed by @tombatossals/chords-db; returns every stored fret position for a
// chord (alternate placements). Shapes convert to svguitar `Chord` objects for
// rendering. Based on pepperhorn/frames.

export { INSTRUMENTS, dbPositionToChord } from "./instruments.js";
export type {
  InstrumentId,
  InstrumentConfig,
  ChordsDb,
  ChordsDbEntry,
  ChordsDbPosition,
} from "./instruments.js";

export { lookupGuitarChord, hasGuitarChord } from "./chordLookup.js";
export type { GuitarChordResult } from "./chordLookup.js";

export { GUITAR_TOP3_PRESETS, lookupTop3Chord } from "./staticPresets.js";
export type { StaticPreset } from "./staticPresets.js";

export { positionToMidi, rootPitchClass } from "./pitch.js";

export { positionFacts, duplicateVoicingMap } from "./voicingFacts.js";
export type { Inversion, PositionFacts } from "./voicingFacts.js";

export {
  matchesShapeClass,
  canonicalPositionIndex,
  selectVoicings,
  SHAPE_CLASS_LADDER,
} from "./voicingSelect.js";
export type {
  ShapeClass,
  CanonicalOptions,
  VoicingChoice,
  SelectVoicingsOptions,
  SelectVoicingsResult,
} from "./voicingSelect.js";

export { powerChordPosition, powerChordShape } from "./powerChords.js";
export type { PowerChordStringSet, PowerChordOptions } from "./powerChords.js";

export { bassShapeFor, violinShapeFor, violinCoverage } from "./generatedShapes.js";
