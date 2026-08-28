// chordl-listen — live microphone chord identification.
//
// Pipeline: mic -> chroma (FFT template) -> template match -> stabilizer ->
// chord symbol handed to chordl's resolver. See README for the design and the
// forward-only score follower for page turning (wired via chordl-react's
// FollowAlongOverlay).

// Detection
export { CHORD_TEMPLATES, PITCH_CLASSES, templateVector } from "./detect/templates.js";
export type { ChordTemplate } from "./detect/templates.js";
export { matchChord } from "./detect/templateMatch.js";
export type { ChordCandidate } from "./detect/templateMatch.js";
export { chromaFromSpectrum, spectrumLoudness } from "./detect/chroma.js";
export type { ChromaOptions } from "./detect/chroma.js";
export { ChordStabilizer } from "./detect/stabilizer.js";
export type { StabilizerConfig, StabilizerResult } from "./detect/stabilizer.js";
export { ChordListener } from "./detect/chordListener.js";
export type { ChordListenerOptions } from "./detect/chordListener.js";

// Resolve
export { toChordSymbol } from "./resolve/toChordSymbol.js";

// Follow (page turning — driven by FollowAlongOverlay in chordl-react)
export { SequenceFollower } from "./follow/sequenceFollower.js";
export type { ExpectedChord, FollowerConfig, FollowResult } from "./follow/types.js";
