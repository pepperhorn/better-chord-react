/**
 * Choosing among a chord's stored shapes.
 *
 * The package offers a sensible default and a ranked list; which shape a
 * product actually displays stays the consumer's decision.
 */
import type { ChordsDbPosition, InstrumentId } from "./instruments";
import type { PositionFacts } from "./voicingFacts";
import { positionFacts, duplicateVoicingMap } from "./voicingFacts";

/**
 * Difficulty rungs expressible as a filter over stored shapes.
 *
 * The `guitar-top3` and `power` rungs are not filters — top-3 comes from
 * GUITAR_TOP3_PRESETS and power chords are generated (src/powerChords.ts),
 * because chords-db has neither.
 */
export type ShapeClass = "open" | "no-barre" | "any";

/** Rungs ordered easiest → hardest, for the "widen by one rung" option. */
export const SHAPE_CLASS_LADDER: ShapeClass[] = ["open", "no-barre", "any"];

export function matchesShapeClass(facts: PositionFacts, cls: ShapeClass): boolean {
  if (cls === "any") return true;
  if (cls === "no-barre") return !facts.hasBarre;
  return facts.isOpenShape;
}

export interface CanonicalOptions {
  instrument: InstrumentId;
  /** Root pitch class from `rootPitchClass(label)`; null disables inversion ranking. */
  rootPc: number | null;
}

/**
 * Index of the shape to present by default.
 *
 * Guitar: the first root-position shape, falling back to the first shape when
 * none is root position (50 of 529 guitar entries have none).
 *
 * Ukulele: lowest baseFret, because root position barely applies — its
 * reentrant high-G tuning leaves 317 of 552 entries with no root-position
 * shape at all.
 *
 * Duplicate voicings are never chosen.
 */
export function canonicalPositionIndex(
  positions: ChordsDbPosition[],
  openMidi: number[],
  opts: CanonicalOptions,
): number {
  if (positions.length === 0) return -1;
  const dupes = duplicateVoicingMap(positions, openMidi);
  const candidates = positions
    .map((pos, index) => ({ index, facts: positionFacts(pos, openMidi, opts.rootPc) }))
    .filter((c) => dupes[c.index] === null);

  if (candidates.length === 0) return 0;

  if (opts.instrument === "ukulele") {
    let best = candidates[0];
    for (const c of candidates) {
      if (c.facts.baseFret < best.facts.baseFret) best = c;
    }
    return best.index;
  }

  const rootPosition = candidates.find((c) => c.facts.inversion === "root");
  return (rootPosition ?? candidates[0]).index;
}
