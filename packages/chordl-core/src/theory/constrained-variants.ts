/**
 * Voicing variants that fit a given hand.
 *
 * This lives in core rather than chordl-voicings because it needs
 * classifyTones/dropOrder, and voicings is a leaf package that core depends
 * on — the dependency cannot run the other way.
 */
import { generateVariants } from "@pepperhorn/chordl-voicings";
import type { VoicingQuality, VoicingVariant } from "@pepperhorn/chordl-voicings";
import { classifyTones, dropOrder } from "./chord-tones";
import { constrainVoicing } from "./hand-constraints";
import type { ConstrainedVoicing, HandConstraints } from "./hand-constraints";

export interface ConstrainedVariant {
  id: string;
  label: string;
  source: VoicingVariant["source"];
  voicing: ConstrainedVoicing;
}

export interface GenerateConstrainedOptions {
  /** Tonal interval names, e.g. ["1P","3M","5P","7M"]. */
  intervals?: string[];
  /** Tonal chord type, e.g. "major seventh". */
  chordType?: string;
  styleHint?: string;
  excludeIds?: string[];
  baseOctave?: number;
}

/**
 * Drop order when the chord's intervals are unknown.
 *
 * resolveChord returns undefined intervals for special-builder chords, so
 * guessing roles is not possible. Dropping from the top of the stack downward
 * is the conservative choice: it removes extensions before the root and third,
 * which sit lowest in a root-position voicing.
 */
function fallbackDropOrder(notes: string[]): { order: string[]; keep: string[] } {
  const order = [...notes].reverse();
  return { order, keep: notes.slice(0, 2) };
}

/**
 * Generate voicing variants and fit each to a hand.
 *
 * Variants that satisfy the constraints are returned first, then those that
 * could not be satisfied without losing a chord tone. Ordering matters because
 * an inversion often fits where root position cannot: Cmaj7 spans 11 semitones
 * in root position but 8 in first inversion.
 *
 * @param root - root note, e.g. "C"
 * @param quality - voicing quality from mapToVoicingQuality, may be undefined
 * @param resolvedNotes - pitch classes in root position
 * @param count - how many variants to generate before constraining
 * @param constraints - the hand's reach and note count
 */
export function generateConstrainedVariants(
  root: string,
  quality: VoicingQuality | undefined,
  resolvedNotes: string[],
  count: number,
  constraints: HandConstraints,
  options: GenerateConstrainedOptions = {},
): ConstrainedVariant[] {
  const variants = generateVariants(root, quality, resolvedNotes, count, {
    styleHint: options.styleHint,
    excludeIds: options.excludeIds,
  });
  if (variants.length === 0) return [];

  let order: string[];
  let keep: string[];
  if (options.intervals && options.intervals.length > 0) {
    const analysis = classifyTones(
      root,
      options.chordType ?? "",
      options.intervals,
      resolvedNotes,
      "piano",
    );
    order = dropOrder(analysis);
    // Identity tones only — the root is droppable as a last resort, which is
    // exactly how a shell voicing is formed.
    keep = analysis.identityTones;
  } else {
    ({ order, keep } = fallbackDropOrder(resolvedNotes));
  }

  const constrained = variants.map((v) => ({
    id: v.id,
    label: v.label,
    source: v.source,
    voicing: constrainVoicing({
      notes: v.notes,
      handHints: v.handHints,
      dropOrder: order,
      keepAtLeast: keep,
      constraints,
      baseOctave: options.baseOctave,
    }),
  }));

  // Stable partition: satisfied first, original order preserved within groups.
  return [
    ...constrained.filter((c) => c.voicing.satisfied),
    ...constrained.filter((c) => !c.voicing.satisfied),
  ];
}
