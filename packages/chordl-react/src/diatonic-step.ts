import { WHITE_NOTE_ORDER } from "@pepperhorn/chordl-core";
import type { WhiteNote } from "./types";

/**
 * Index of a note name's diatonic step — its letter — in C..B order.
 *
 * The step must come from the note's **letter**, not from a sharp-normalised
 * name, because normalising moves the letter: Ab becomes G#, whose letter is G.
 * A G-then-Ab run then looks like it wrapped past B when the music only rose a
 * semitone, and the second note is pushed an octave up.
 *
 * Reading the letter is also the only form that works on flats at all: the
 * keyboard's `replace("#", "")` trick leaves "Bb" intact, and "Bb" is not a
 * white note, so it indexes -1.
 */
export function diatonicStep(name: string): number {
  return WHITE_NOTE_ORDER.indexOf(name.charAt(0).toUpperCase() as WhiteNote);
}

/**
 * Walk note names upward, incrementing the octave each time the diatonic step
 * fails to rise — i.e. each time the run wraps past B.
 *
 * Returns one octave per name, in the caller's own numbering (the keyboard
 * counts from 0 relative to its layout, the staff in real MIDI octaves).
 *
 * This is shared deliberately. It used to be written out three times — once for
 * the keyboard, once for the staff, once for progressions — and correcting only
 * one of them made the same chord draw in different octaves depending on which
 * view you were looking at.
 */
export function ascendingOctaves(names: string[], startOctave: number): number[] {
  let octave = startOctave;
  let prevStep = diatonicStep(names[0]);
  return names.map((n, i) => {
    const step = diatonicStep(n);
    if (i > 0 && step <= prevStep) octave++;
    prevStep = step;
    return octave;
  });
}
