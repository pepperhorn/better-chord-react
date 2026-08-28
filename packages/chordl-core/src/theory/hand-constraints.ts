/**
 * Keyboard reach constraints.
 *
 * Two orthogonal limits, both required:
 *   - maxSpanPerHand — physical reach, in semitones
 *   - maxNotesPerHand — coordination, in note count
 *
 * Count alone does not express reach: a 3-note cap still admits C-E-C', three
 * notes spanning a full octave, which a young player cannot stretch. The
 * converse also holds — a 4-note cluster inside a 5th is an easy reach but
 * harder to coordinate.
 *
 * Deriving a junior cutoff from "no 7ths or octaves": a 7th spans 10-11
 * semitones and an octave 12, so maxSpanPerHand 9 (a major 6th) is binding.
 */
import { PC_SEMITONES, assignAscendingOctaves } from "../engine/note-spelling.js";
import type { Hand } from "@pepperhorn/chordl-voicings";

export interface HandConstraints {
  /** Maximum semitones between lowest and highest note in one hand. */
  maxSpanPerHand: number;
  /** Maximum notes in one hand. Values below 2 are clamped to 2. */
  maxNotesPerHand: number;
}

export interface PlacedNote {
  note: string;
  octave: number;
  midi: number;
}

/**
 * MIDI number for a pitch class in a given octave, C4 = 60.
 *
 * PC_SEMITONES handles both sharps and flats, so no spelling normalization is
 * needed here.
 */
export function midiOf(note: string, octave: number): number {
  const semi = PC_SEMITONES[note] ?? 0;
  return semi + (octave + 1) * 12;
}

/**
 * Stack pitch classes into an ascending voicing.
 *
 * @param notes - pitch classes in voicing order
 * @param baseOctave - octave of the first note
 * @param maxSpan - optional semitone limit; folds notes down where it can
 *   (0 = no folding). Folding is preferred over dropping because it keeps
 *   every chord tone.
 */
export function placeAscending(
  notes: string[],
  baseOctave: number,
  maxSpan: number = 0,
): PlacedNote[] {
  return assignAscendingOctaves(notes, baseOctave, maxSpan).map(({ note, octave }) => ({
    note,
    octave,
    midi: midiOf(note, octave),
  }));
}

/** Semitones between the lowest and highest pitch. Zero for 0 or 1 notes. */
export function spanOf(pitches: number[]): number {
  if (pitches.length < 2) return 0;
  return Math.max(...pitches) - Math.min(...pitches);
}

export interface ConstrainedNote extends PlacedNote {
  hand: Hand;
}

export interface ConstrainVoicingInput {
  /** Pitch classes in voicing order. */
  notes: string[];
  /**
   * Per-note hand assignment. When absent the whole voicing counts as one
   * hand — variants from the `inversion` and `algorithmic` sources carry no
   * hand hints, so both caps apply to the voicing as a whole.
   */
  handHints?: Hand[];
  /**
   * Safest-to-drop first, from core's `dropOrder(analysis)`. Matched against
   * `notes` by semitone, so either list may be spelled with sharps or flats.
   */
  dropOrder: string[];
  /**
   * Notes that must survive — the chord's identity tones. Matched by semitone,
   * like `dropOrder`.
   */
  keepAtLeast: string[];
  constraints: HandConstraints;
  /** Octave of the lowest note. Default 3. */
  baseOctave?: number;
}

export interface ConstrainedVoicing {
  /**
   * Surviving notes in voicing order, each keeping its input spelling. Never
   * two notes on the same MIDI number, and never fewer than two notes in a
   * hand unless the input itself had fewer.
   */
  notes: ConstrainedNote[];
  /**
   * Pitch classes removed, in the order they were dropped, spelled as the
   * input spelled them rather than as `dropOrder` did.
   */
  dropped: string[];
  /** Largest per-hand span in the result, semitones. */
  span: number;
  /** True when every hand is within both caps. */
  satisfied: boolean;
}

const DEFAULT_HAND: Hand = "LH";

/**
 * Fewest notes a hand may be reduced to. A dyad is already a shell voicing —
 * below that there is no chord left to name, so reduction stops and reports
 * failure rather than returning a single note as a satisfied chord.
 */
const MIN_NOTES_PER_HAND = 2;

/**
 * Semitone value for matching pitch classes across spellings.
 *
 * `PC_SEMITONES` maps sharps and flats onto the same number, so "Bb" and "A#"
 * compare equal — necessary because chordl-voicings spells library variants
 * with sharps while core's resolver yields flats. Unknown spellings map to -1
 * rather than 0 so they never collide with C.
 */
export function pcSemitone(note: string): number {
  return PC_SEMITONES[note] ?? -1;
}

function groupsOf(notes: ConstrainedNote[]): ConstrainedNote[][] {
  const byHand = new Map<Hand, ConstrainedNote[]>();
  for (const n of notes) {
    const list = byHand.get(n.hand);
    if (list) list.push(n);
    else byHand.set(n.hand, [n]);
  }
  return [...byHand.values()];
}

function withinCaps(groups: ConstrainedNote[][], c: HandConstraints, maxNotes: number): boolean {
  return groups.every(
    (g) => g.length <= maxNotes && spanOf(g.map((n) => n.midi)) <= c.maxSpanPerHand,
  );
}

/** A placed note that still remembers where it sat in the input voicing. */
interface IndexedConstrainedNote extends ConstrainedNote {
  originalIndex: number;
}

/**
 * Place a subset of the voicing (by index) and settle each hand's octaves.
 *
 * Step 1 stacks the whole subset ascending with no folding, so the voicing's
 * true shape is preserved. Step 2 groups the result by hand and re-folds
 * only the hands whose span exceeds the cap — folding is per-hand because
 * two hands an octave apart should not be squeezed together just because
 * the whole voicing looks wide. Step 3 collapses duplicate MIDI numbers
 * (same key, one finger) so they cost one slot of the note-count budget.
 */
function place(
  indices: number[],
  notes: string[],
  baseOctave: number,
  maxSpanPerHand: number,
  handOf: (originalIndex: number) => Hand,
): IndexedConstrainedNote[] {
  const notesForThisCall = indices.map((i) => notes[i]);

  // Step 1: Place ascending with NO folding to preserve the voicing's true shape.
  const unfolded: IndexedConstrainedNote[] = placeAscending(notesForThisCall, baseOctave, 0).map(
    (p, i) => ({ ...p, originalIndex: indices[i], hand: handOf(indices[i]) }),
  );

  // Step 2: Group by hand and re-fold each hand independently if needed.
  const handToNotes = new Map<Hand, IndexedConstrainedNote[]>();
  for (const p of unfolded) {
    const list = handToNotes.get(p.hand);
    if (list) list.push(p);
    else handToNotes.set(p.hand, [p]);
  }

  const refolded: IndexedConstrainedNote[] = [];
  for (const [hand, notesInHand] of handToNotes) {
    const span = spanOf(notesInHand.map((n) => n.midi));
    if (span <= maxSpanPerHand) {
      // Already fits, use as-is
      refolded.push(...notesInHand);
      continue;
    }
    // Exceeds span, re-fold this hand's notes
    const refoldedHand = placeAscending(
      notesInHand.map((n) => n.note),
      notesInHand[0].octave,
      maxSpanPerHand,
    );
    for (let i = 0; i < refoldedHand.length; i++) {
      refolded.push({
        ...refoldedHand[i],
        originalIndex: notesInHand[i].originalIndex,
        hand,
      });
    }
  }

  // Restore original voicing order by sorting by originalIndex.
  refolded.sort((a, b) => a.originalIndex - b.originalIndex);

  // Step 3: Two notes on the same MIDI number are one key under one finger.
  // Collapse them so they cost one slot of the note-count budget, not two.
  // The first in voicing order wins, so the surviving spelling and hand are
  // the ones the voicing led with.
  const seenMidi = new Set<number>();
  return refolded.filter((p) => {
    if (seenMidi.has(p.midi)) return false;
    seenMidi.add(p.midi);
    return true;
  });
}

/**
 * Fit a voicing inside a hand's reach and note count.
 *
 * Strategy, in order:
 *   1. Fold octaves — keeps every chord tone, so it is always preferred.
 *   2. Drop notes in `dropOrder`, never below `keepAtLeast`, and never below
 *      two notes in any one hand.
 *
 * `dropOrder` and `keepAtLeast` are matched by semitone rather than by
 * spelling, so a drop order written in flats still recognises a voicing
 * spelled in sharps. Each returned note keeps its own original spelling —
 * only the matching normalizes.
 *
 * When the constraints still cannot be met without dropping an identity tone
 * or taking a hand below a dyad, returns the closest legal voicing with
 * `satisfied: false` rather than returning nothing or a chord that is no
 * longer the chord asked for. Callers wanting a voicing that genuinely fits
 * should try other variants — an inversion often fits where root position
 * cannot.
 */
export function constrainVoicing(input: ConstrainVoicingInput): ConstrainedVoicing {
  const baseOctave = input.baseOctave ?? 3;
  const maxNotes = Math.max(MIN_NOTES_PER_HAND, input.constraints.maxNotesPerHand);
  const keepSemitones = new Set(input.keepAtLeast.map(pcSemitone));

  const handOf = (originalIndex: number): Hand =>
    input.handHints?.[originalIndex] ?? DEFAULT_HAND;

  // Track note indices instead of strings to handle duplicates correctly.
  // Each entry is an index into input.notes.
  let working = input.notes.map((_, i) => i);
  const dropped: string[] = [];

  for (;;) {
    const placed = place(
      working,
      input.notes,
      baseOctave,
      input.constraints.maxSpanPerHand,
      handOf,
    );

    // A collapsed duplicate is gone from the result, so drop it from `working`
    // too — otherwise the drop loop would keep offering a note the caller can
    // no longer see. `working` only ever shrinks, so this terminates.
    if (placed.length < working.length) {
      working = placed.map((p) => p.originalIndex);
      continue;
    }

    const groups = groupsOf(placed);
    const result = (satisfied: boolean): ConstrainedVoicing => ({
      notes: placed.map((p) => ({ note: p.note, octave: p.octave, midi: p.midi, hand: p.hand })),
      dropped,
      span: Math.max(0, ...groups.map((g) => spanOf(g.map((n) => n.midi)))),
      satisfied,
    });

    if (withinCaps(groups, input.constraints, maxNotes)) return result(true);

    const notesPerHand = new Map<Hand, number>();
    for (const n of placed) notesPerHand.set(n.hand, (notesPerHand.get(n.hand) ?? 0) + 1);

    // Find the next note to drop: earliest in dropOrder, not an identity tone,
    // and not the note that would take its hand below a dyad. Candidates are
    // matched by semitone so spelling differences do not hide them.
    let target = -1;
    for (const pc of input.dropOrder) {
      const semitone = pcSemitone(pc);
      if (keepSemitones.has(semitone)) continue;
      // Remove the LAST occurrence of this pitch class (conventional choice).
      for (let i = working.length - 1; i >= 0; i--) {
        if (pcSemitone(input.notes[working[i]]) !== semitone) continue;
        if ((notesPerHand.get(handOf(working[i])) ?? 0) <= MIN_NOTES_PER_HAND) continue;
        target = i;
        break;
      }
      if (target >= 0) break;
    }

    // Nothing left that may be dropped: every remaining note is an identity
    // tone, or dropping it would leave a hand with fewer than two notes.
    if (target < 0) return result(false);

    dropped.push(input.notes[working[target]]);
    working.splice(target, 1);
  }
}
