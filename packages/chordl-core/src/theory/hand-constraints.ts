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
