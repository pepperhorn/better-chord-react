/**
 * Turn a detected candidate into a chordl chord string.
 *
 * chordl-listen never invents chord spelling — it produces a plain symbol like
 * "Dm7" and hands it to chordl's resolver (via the board's `nl` field or
 * `resolveChord`), keeping enharmonic/inversion logic in one place.
 */
import type { ChordCandidate } from "../detect/templateMatch.js";

/** e.g. { rootName: "D", symbolSuffix: "m7" } -> "Dm7". */
export function toChordSymbol(candidate: ChordCandidate): string {
  return `${candidate.rootName}${candidate.symbolSuffix}`;
}
