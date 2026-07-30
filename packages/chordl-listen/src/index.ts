// chordl-listen — live microphone chord identification.
//
// Pipeline: mic -> chroma (FFT template) -> template match -> stabilizer ->
// chord symbol handed to chordl's resolver. See README for the design and the
// forward-only score follower for page turning (wired via chordl-react's
// FollowAlongOverlay).

// Detection
export { CHORD_TEMPLATES, PITCH_CLASSES, templateVector } from "./detect/templates";
export type { ChordTemplate } from "./detect/templates";
export { matchChord } from "./detect/templateMatch";
export type { ChordCandidate } from "./detect/templateMatch";
export { chromaFromSpectrum, spectrumLoudness } from "./detect/chroma";
export type { ChromaOptions } from "./detect/chroma";
export { ChordStabilizer } from "./detect/stabilizer";
export type { StabilizerConfig, StabilizerResult } from "./detect/stabilizer";
export { ChordListener } from "./detect/chordListener";
export type { ChordListenerOptions } from "./detect/chordListener";

// Resolve
export { toChordSymbol } from "./resolve/toChordSymbol";

// Follow (page turning — driven by FollowAlongOverlay in chordl-react)
export { SequenceFollower } from "./follow/sequenceFollower";
export type { ExpectedChord, FollowerConfig, FollowResult } from "./follow/types";
