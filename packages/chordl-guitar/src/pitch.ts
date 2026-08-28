/**
 * Fret → pitch derivation.
 *
 * chords-db ships a `midi` array per position, but scripts/build-data.mjs
 * strips it from the shipped JSON to cut bundle weight. Deriving rather than
 * reviving keeps one pitch code path: the candidate szaza merge source ships
 * no midi field at all, so derivation is required regardless.
 */
import type { ChordsDbPosition } from "./instruments.js";

/**
 * Sounding MIDI pitches for a chords-db position.
 *
 * `frets` values are relative to `baseFret`, not absolute fret numbers: a
 * value of 1 at baseFret 3 sounds fret 3. Muted strings (-1) are omitted;
 * open strings (0) sound the open pitch regardless of the diagram window.
 *
 * `capo` is deliberately ignored — it is a rendering hint (draw a bar), not a
 * pitch offset. All 901 capo-flagged guitar positions reproduce chords-db's
 * own `midi` array exactly without it; see test/pitch-golden.test.ts.
 *
 * @param pos - chords-db position
 * @param openMidi - open-string MIDI in chords-db index order (InstrumentConfig.openMidi)
 * @returns sounding pitches only, in chords-db string order
 */
export function positionToMidi(pos: ChordsDbPosition, openMidi: number[]): number[] {
  const out: number[] = [];
  pos.frets.forEach((fret, i) => {
    if (fret === -1) return;
    const open = openMidi[i];
    if (open === undefined) return;
    out.push(fret === 0 ? open : open + pos.baseFret + fret - 1);
  });
  return out;
}

const PITCH_CLASSES: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

/**
 * Pitch class of a chord label's root, or null when unparseable.
 *
 * Derived from the requested label rather than from a chords-db `key` field:
 * chords-db spells the same root inconsistently ("Csharp" as a container key,
 * "C#" on the entry), and the label is what the caller actually asked for.
 */
export function rootPitchClass(label: string): number | null {
  const m = label.trim().match(/^([A-Ga-g][#b]?)/);
  if (!m) return null;
  const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const pc = PITCH_CLASSES[root];
  return pc === undefined ? null : pc;
}
