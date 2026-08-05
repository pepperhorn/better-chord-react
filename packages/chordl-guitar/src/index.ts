// @pepperhorn/chordl-guitar — guitar chord-shape lookup and svguitar diagram data.
//
// Backed by @tombatossals/chords-db; returns every stored fret position for a
// chord (alternate placements). Shapes convert to svguitar `Chord` objects for
// rendering. Based on pepperhorn/frames.

export { INSTRUMENTS, OPEN_STRING_MIDI, dbPositionToChord } from "./instruments";
export type {
  InstrumentId,
  InstrumentConfig,
  ChordsDb,
  ChordsDbEntry,
  ChordsDbPosition,
} from "./instruments";

export { lookupGuitarChord, hasGuitarChord } from "./chordLookup";
export type { GuitarChordResult } from "./chordLookup";
