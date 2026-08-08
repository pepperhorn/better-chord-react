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
import { constrainVoicing, pcSemitone } from "./hand-constraints";
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
 * roles cannot be classified. But it returns notes in root-position order, so
 * position stands in for role: 0 = root, 1 = 3rd, 2 = 5th, 3 = 7th, 4+ =
 * extensions. That is enough to mirror what classifyTones would conclude on
 * the primary path, rather than diverging from it.
 *
 * Triads keep the 5th — on piano a triad needs it to still be a triad, which
 * is exactly what assignRole concludes for degree 5 in the "triad" family.
 * Larger chords treat the 5th as omittable and protect the 3rd and 7th, so
 * the root stays droppable and a shell voicing can form.
 */
function fallbackDropOrder(notes: string[]): { order: string[]; keep: string[] } {
  if (notes.length <= 3) {
    const keep = notes.slice(1, 3);
    return { order: notes[0] === undefined ? [] : [notes[0]], keep };
  }

  const order: string[] = [];
  for (let i = notes.length - 1; i >= 4; i--) order.push(notes[i]); // extensions, top down
  if (notes[2] !== undefined) order.push(notes[2]); // 5th — conventionally omittable
  if (notes[0] !== undefined) order.push(notes[0]); // root — last, forming a shell
  const keep = [notes[1], notes[3]].filter((n): n is string => n !== undefined);
  return { order, keep };
}

/**
 * Put a variant's unclassified notes at the head of the drop order.
 *
 * `order` and `keep` come from the resolved chord tones, so a library
 * voicing's added 9th or 13th — the whole point of a rootless voicing — is in
 * neither list. `constrainVoicing` only ever drops what `dropOrder` names, so
 * without this the reduction stalls with the voicing still over the cap.
 * Extensions are colour tones and the safest thing to lose, so they go first,
 * in the order the voicing lists them.
 *
 * Membership is tested by semitone because chordl-voicings spells library
 * variants with sharps where core's resolver yields flats.
 */
function withUnclassifiedFirst(notes: string[], order: string[], keep: string[]): string[] {
  const classified = new Set([...order, ...keep].map(pcSemitone));
  const extras: string[] = [];
  for (const note of notes) {
    const semitone = pcSemitone(note);
    if (classified.has(semitone)) continue;
    classified.add(semitone);
    extras.push(note);
  }
  return extras.length === 0 ? order : [...extras, ...order];
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
      dropOrder: withUnclassifiedFirst(v.notes, order, keep),
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
