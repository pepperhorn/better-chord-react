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
import { PC_SEMITONES, assignAscendingOctaves } from "../engine/note-spelling";
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
  /** Safest-to-drop first, from core's `dropOrder(analysis)`. */
  dropOrder: string[];
  /** Notes that must survive — the chord's identity tones. */
  keepAtLeast: string[];
  constraints: HandConstraints;
  /** Octave of the lowest note. Default 3. */
  baseOctave?: number;
}

export interface ConstrainedVoicing {
  notes: ConstrainedNote[];
  /** Pitch classes removed, in the order they were dropped. */
  dropped: string[];
  /** Largest per-hand span in the result, semitones. */
  span: number;
  /** True when every hand is within both caps. */
  satisfied: boolean;
}

const DEFAULT_HAND: Hand = "LH";

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

/**
 * Fit a voicing inside a hand's reach and note count.
 *
 * Strategy, in order:
 *   1. Fold octaves — keeps every chord tone, so it is always preferred.
 *   2. Drop notes in `dropOrder`, never below `keepAtLeast`.
 *
 * When the constraints still cannot be met without dropping an identity tone,
 * returns the closest legal voicing with `satisfied: false` rather than
 * returning nothing or a chord that is no longer the chord asked for.
 * Callers wanting a voicing that genuinely fits should try other variants —
 * an inversion often fits where root position cannot.
 */
export function constrainVoicing(input: ConstrainVoicingInput): ConstrainedVoicing {
  const baseOctave = input.baseOctave ?? 3;
  const maxNotes = Math.max(2, input.constraints.maxNotesPerHand);
  const keep = new Set(input.keepAtLeast);

  // Track note indices instead of strings to handle duplicates correctly.
  // Each entry is an index into input.notes.
  let working = input.notes.map((_, i) => i);
  const dropped: string[] = [];

  const place = (indices: number[]): ConstrainedNote[] => {
    const notesForThisCall = indices.map((i) => input.notes[i]);

    // Step 1: Place ascending with NO folding to preserve the voicing's true shape.
    const unfolded = placeAscending(notesForThisCall, baseOctave, 0);

    // Step 2: Group by hand and re-fold each hand independently if needed.
    interface IndexedPlacedNote extends PlacedNote {
      originalIndex: number;
    }

    let placed: IndexedPlacedNote[] = unfolded.map((p, i) => ({
      ...p,
      originalIndex: indices[i],
    }));

    // Group by hand
    const handToNotes = new Map<Hand, IndexedPlacedNote[]>();
    for (const p of placed) {
      const hand = input.handHints ? input.handHints[p.originalIndex] : DEFAULT_HAND;
      const list = handToNotes.get(hand);
      if (list) list.push(p);
      else handToNotes.set(hand, [p]);
    }

    // Recompute placed by re-folding each hand that exceeds maxSpan.
    const refolded: IndexedPlacedNote[] = [];
    for (const [hand, notesInHand] of handToNotes) {
      const notesForFold = notesInHand.map((n) => n.note);
      const handBaseOctave = notesInHand[0].octave;

      const span = spanOf(notesInHand.map((n) => n.midi));
      if (span <= input.constraints.maxSpanPerHand) {
        // Already fits, use as-is
        refolded.push(...notesInHand);
      } else {
        // Exceeds span, re-fold this hand's notes
        const refolded_hand = placeAscending(
          notesForFold,
          handBaseOctave,
          input.constraints.maxSpanPerHand,
        );
        for (let i = 0; i < refolded_hand.length; i++) {
          refolded.push({
            ...refolded_hand[i],
            originalIndex: notesInHand[i].originalIndex,
          });
        }
      }
    }

    // Restore original voicing order by sorting by originalIndex.
    refolded.sort((a, b) => a.originalIndex - b.originalIndex);

    return refolded.map((p) => ({
      note: p.note,
      octave: p.octave,
      midi: p.midi,
      hand: input.handHints ? input.handHints[p.originalIndex] : DEFAULT_HAND,
    }));
  };

  for (;;) {
    const placed = place(working);
    const groups = groupsOf(placed);
    if (withinCaps(groups, input.constraints, maxNotes)) {
      return {
        notes: placed,
        dropped,
        span: Math.max(0, ...groups.map((g) => spanOf(g.map((n) => n.midi)))),
        satisfied: true,
      };
    }

    // Find the next note to drop, by original pitch class in working indices.
    const nextPC = input.dropOrder.find((pc) => {
      const hasPC = working.some((idx) => input.notes[idx] === pc);
      const isKept = keep.has(pc);
      return hasPC && !isKept;
    });

    if (nextPC === undefined) {
      return {
        notes: placed,
        dropped,
        span: Math.max(0, ...groups.map((g) => spanOf(g.map((n) => n.midi)))),
        satisfied: false,
      };
    }

    // Remove the LAST occurrence of this pitch class (conventional choice).
    let removed = false;
    for (let i = working.length - 1; i >= 0; i--) {
      if (input.notes[working[i]] === nextPC) {
        working.splice(i, 1);
        dropped.push(nextPC);
        removed = true;
        break;
      }
    }

    // Safety check (should never happen, but satisfy TypeScript).
    if (!removed) {
      return {
        notes: place(working),
        dropped,
        span: 0,
        satisfied: false,
      };
    }
  }
}
