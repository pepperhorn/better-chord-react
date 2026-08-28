/**
 * Facts about a chord shape, derived from its sounding pitches.
 *
 * This module states facts; it never decides which shape a product should
 * display. Selection lives in src/voicingSelect.ts.
 */
import type { ChordsDbPosition } from "./instruments.js";
import { positionToMidi } from "./pitch.js";

export type Inversion = "root" | "1st" | "2nd" | "3rd" | "other";

export interface PositionFacts {
  /** Sounding pitches, chords-db string order. */
  midi: number[];
  /** Lowest sounding pitch, or -1 for an all-muted position. */
  bassMidi: number;
  /** Pitch class of the bass note, or -1 when nothing sounds. */
  bassPitchClass: number;
  inversion: Inversion;
  /** Sounding string count, including doublings. */
  noteCount: number;
  /** Distinct pitch classes, ascending. */
  pitchClasses: number[];
  /** Sounding strings beyond the first of each pitch class. */
  doubledCount: number;
  hasBarre: boolean;
  /** Barre-free and at the nut — the beginner "open chord" rung. */
  isOpenShape: boolean;
  baseFret: number;
}

/**
 * Interval from root to bass → inversion name.
 *
 * On guitar this constrains the bass note only: doubling, note count and
 * register are all unconstrained, so "root position" means far less here than
 * on a keyboard. Both major and minor thirds map to 1st inversion, and altered
 * fifths to 2nd, so dim/aug shapes classify rather than falling through.
 */
function inversionFor(interval: number): Inversion {
  if (interval === 0) return "root";
  if (interval === 3 || interval === 4) return "1st";
  if (interval === 6 || interval === 7 || interval === 8) return "2nd";
  if (interval === 9 || interval === 10 || interval === 11) return "3rd";
  return "other";
}

/**
 * Derive facts for one position.
 *
 * @param pos - chords-db position
 * @param openMidi - open-string MIDI in chords-db index order
 * @param rootPc - root pitch class from `rootPitchClass(label)`, or null when
 *   unparseable; null yields inversion "other" rather than a wrong guess.
 */
export function positionFacts(
  pos: ChordsDbPosition,
  openMidi: number[],
  rootPc: number | null,
): PositionFacts {
  const midi = positionToMidi(pos, openMidi);
  const bassMidi = midi.length ? Math.min(...midi) : -1;
  const bassPitchClass = bassMidi >= 0 ? bassMidi % 12 : -1;
  const pitchClasses = [...new Set(midi.map((m) => m % 12))].sort((a, b) => a - b);
  const hasBarre = pos.barres.length > 0;

  const inversion: Inversion =
    rootPc === null || bassPitchClass < 0
      ? "other"
      : inversionFor((bassPitchClass - rootPc + 12) % 12);

  return {
    midi,
    bassMidi,
    bassPitchClass,
    inversion,
    noteCount: midi.length,
    pitchClasses,
    doubledCount: midi.length - pitchClasses.length,
    hasBarre,
    isOpenShape: !hasBarre && pos.baseFret === 1,
    baseFret: pos.baseFret,
  };
}

/**
 * For each position, the index of the first earlier position that sounds
 * exactly the same pitches, or null when it is the first of its kind.
 *
 * chords-db ships 63 such redundant positions across 62 guitar entries
 * (ukulele has none). Callers offering alternate voicings must skip these or
 * they will present visual twins.
 *
 * Flags rather than removes: frames' /api/frame exposes a positionIndex
 * parameter, so renumbering positions would silently change existing results.
 */
export function duplicateVoicingMap(
  positions: ChordsDbPosition[],
  openMidi: number[],
): Array<number | null> {
  const firstSeen = new Map<string, number>();
  return positions.map((pos, i) => {
    const key = positionToMidi(pos, openMidi).join(",");
    const seen = firstSeen.get(key);
    if (seen === undefined) {
      firstSeen.set(key, i);
      return null;
    }
    return seen;
  });
}
