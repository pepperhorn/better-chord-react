/**
 * Choosing among a chord's stored shapes.
 *
 * The package offers a sensible default and a ranked list; which shape a
 * product actually displays stays the consumer's decision.
 */
import type { Chord } from "svguitar";
import type { ChordsDbPosition, InstrumentId } from "./instruments";
import { INSTRUMENTS, dbPositionToChord } from "./instruments";
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
  opts: CanonicalOptions,
): number {
  if (positions.length === 0) return -1;
  const openMidi = INSTRUMENTS[opts.instrument].openMidi;
  const dupes = duplicateVoicingMap(positions, openMidi);
  const candidates = positions
    .map((pos, index) => ({ index, facts: positionFacts(pos, openMidi, opts.rootPc) }))
    .filter((c) => dupes[c.index] === null);

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

export interface VoicingChoice {
  /** Index into the original positions array — stable, so it round-trips. */
  index: number;
  facts: PositionFacts;
  shape: Chord;
  /**
   * Human label derived from facts, e.g. "Open", "Barre, fret 8". English
   * display text only — consumers who need their own wording or i18n should
   * derive it from `facts` instead, which carries every fact this label is
   * built from.
   */
  label: string;
}

export interface SelectVoicingsOptions extends CanonicalOptions {
  /** How many alternates to return alongside the primary. */
  alternates: number;
  /** Restrict candidates to a difficulty rung. Default "any". */
  shapeClass?: ShapeClass;
  /** Widen the pool by one rung when the requested rung runs dry. Default false. */
  allowNextRung?: boolean;
  title?: string;
}

export interface SelectVoicingsResult {
  primary: VoicingChoice;
  alternates: VoicingChoice[];
  /** True when fewer alternates were available than requested. */
  short: boolean;
}

function labelFor(facts: PositionFacts): string {
  if (facts.isOpenShape) return "Open";
  if (facts.hasBarre) return `Barre, fret ${facts.baseFret}`;
  return `Fret ${facts.baseFret}`;
}

/**
 * How different two shapes look and feel to a player. Higher = more contrast.
 *
 * Inversion dominates because it changes what the chord sounds like; barre vs
 * open is the next most visible difference; neck distance breaks ties.
 */
function contrast(a: PositionFacts, b: PositionFacts): number {
  let score = 0;
  if (a.inversion !== b.inversion) score += 4;
  if (a.hasBarre !== b.hasBarre) score += 2;
  score += Math.min(Math.abs(a.baseFret - b.baseFret), 5) / 5;
  return score;
}

function widen(cls: ShapeClass): ShapeClass {
  const i = SHAPE_CLASS_LADDER.indexOf(cls);
  return SHAPE_CLASS_LADDER[Math.min(i + 1, SHAPE_CLASS_LADDER.length - 1)];
}

/**
 * A primary shape plus up to `alternates` maximally-contrasting others.
 *
 * Alternates are chosen greedily: each pick maximises its minimum contrast
 * against everything already chosen. Naive first-n selection repeats an
 * (inversion, barre) profile on 74.9% of guitar entries, which reads as a
 * broken card when three shapes appear side by side.
 *
 * Duplicate voicings are excluded, so a card can never print visual twins.
 * Returns fewer alternates than asked for rather than padding, with `short`
 * set — 5 guitar entries have fewer than 3 unique voicings.
 *
 * Returns `null` in two distinct cases: an empty `positions` array, or a
 * `positions` array whose entries all fail the requested `shapeClass` (after
 * `allowNextRung` widening, if set). The second case is common, not
 * exceptional — `shapeClass: "open"` alone returns `null` for roughly 40% of
 * entries (220/529 guitar, 211/552 ukulele), so callers must handle `null`
 * as a normal outcome rather than an error.
 *
 * When the requested `shapeClass` filters out the corpus-wide canonical
 * position entirely, the primary falls back to `primaryPool[0]` (array
 * order) rather than re-running root-position preference within the
 * filtered pool. Measured at ~0.9% of entries — accepted as a known
 * shortcut, not an oversight.
 */
export function selectVoicings(
  positions: ChordsDbPosition[],
  opts: SelectVoicingsOptions,
): SelectVoicingsResult | null {
  if (positions.length === 0) return null;

  const openMidi = INSTRUMENTS[opts.instrument].openMidi;
  const dupes = duplicateVoicingMap(positions, openMidi);
  const stringCount = INSTRUMENTS[opts.instrument].strings;

  const build = (index: number): VoicingChoice => {
    const facts = positionFacts(positions[index], openMidi, opts.rootPc);
    return {
      index,
      facts,
      shape: dbPositionToChord(positions[index], stringCount, opts.title),
      label: labelFor(facts),
    };
  };

  const requested: ShapeClass = opts.shapeClass ?? "any";
  const classes = opts.allowNextRung ? [requested, widen(requested)] : [requested];

  // narrowPool is the pool for the originally requested rung; pool may widen
  // beyond it when allowNextRung kicks in. The primary must come from
  // narrowPool whenever it has candidates — widening exists to backfill
  // alternates, not to bump the primary to a harder rung. See Fix 4.
  let pool: VoicingChoice[] = [];
  let narrowPool: VoicingChoice[] = [];
  for (const cls of classes) {
    pool = positions
      .map((_, index) => index)
      .filter((index) => dupes[index] === null)
      .map(build)
      .filter((c) => matchesShapeClass(c.facts, cls));
    if (cls === requested) narrowPool = pool;
    if (pool.length > opts.alternates) break;
  }
  if (pool.length === 0) return null;

  const canonical = canonicalPositionIndex(positions, opts);
  const primaryPool = narrowPool.length > 0 ? narrowPool : pool;
  // Fallback to primaryPool[0] documented on the function's JSDoc above.
  const primary = primaryPool.find((c) => c.index === canonical) ?? primaryPool[0];

  const chosen: VoicingChoice[] = [primary];
  const remaining = pool.filter((c) => c.index !== primary.index);

  while (chosen.length <= opts.alternates && remaining.length > 0) {
    let bestAt = 0;
    let bestScore = -Infinity;
    remaining.forEach((cand, i) => {
      const score = Math.min(...chosen.map((c) => contrast(c.facts, cand.facts)));
      if (score > bestScore) {
        bestScore = score;
        bestAt = i;
      }
    });
    chosen.push(remaining.splice(bestAt, 1)[0]);
  }

  const alternates = chosen.slice(1);
  return { primary, alternates, short: alternates.length < opts.alternates };
}
