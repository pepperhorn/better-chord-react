/**
 * Movable power-chord (root + fifth + octave) shapes.
 *
 * chords-db has no power-chord suffix, so these cannot be looked up. They also
 * need no curation: the shape is perfectly regular, so it derives from the
 * instrument's open-string pitches. Output goes through dbPositionToChord so
 * renderers see the same contract as any other shape.
 */
import type { Chord } from "svguitar";
import type { ChordsDbPosition } from "./instruments";
import { INSTRUMENTS, dbPositionToChord } from "./instruments";

/** Which string carries the root. "E" = 6th string, "A" = 5th string. */
export type PowerChordStringSet = "E" | "A";

export interface PowerChordOptions {
  stringSet: PowerChordStringSet;
  /** Include the octave doubling on the next string up. Default true. */
  includeOctave?: boolean;
  title?: string;
}

const ROOT_STRING_INDEX: Record<PowerChordStringSet, number> = { E: 0, A: 1 };

/**
 * Build a chords-db-shaped position for a power chord.
 *
 * @param rootPc - root pitch class, 0 = C
 * @returns null when rootPc is out of range
 */
export function powerChordPosition(
  rootPc: number,
  opts: PowerChordOptions,
): ChordsDbPosition | null {
  if (!Number.isInteger(rootPc) || rootPc < 0 || rootPc > 11) return null;

  const openMidi = INSTRUMENTS.guitar.openMidi;
  const rootIdx = ROOT_STRING_INDEX[opts.stringSet];
  const includeOctave = opts.includeOctave ?? true;

  // Fret on the root string that sounds rootPc.
  const fret = (rootPc - (openMidi[rootIdx] % 12) + 12) % 12;

  // Open position keeps baseFret at the nut so the diagram shows the nut;
  // elsewhere the window starts at the root fret and frets are window-relative.
  const baseFret = fret === 0 ? 1 : fret;
  const rootFret = fret === 0 ? 0 : 1;
  const upperFret = fret === 0 ? 2 : 3;

  const frets = new Array<number>(6).fill(-1);
  const fingers = new Array<number>(6).fill(0);

  frets[rootIdx] = rootFret;
  fingers[rootIdx] = rootFret === 0 ? 0 : 1;
  frets[rootIdx + 1] = upperFret;
  fingers[rootIdx + 1] = fret === 0 ? 2 : 3;
  if (includeOctave) {
    frets[rootIdx + 2] = upperFret;
    fingers[rootIdx + 2] = fret === 0 ? 3 : 4;
  }

  return { frets, fingers, baseFret, barres: [] };
}

/** The same shape as an svguitar Chord, ready to render. */
export function powerChordShape(rootPc: number, opts: PowerChordOptions): Chord | null {
  const pos = powerChordPosition(rootPc, opts);
  if (!pos) return null;
  return dbPositionToChord(pos, INSTRUMENTS.guitar.strings, opts.title);
}
