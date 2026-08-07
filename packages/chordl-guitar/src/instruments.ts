/**
 * Instrument configs + chords-db types + position→svguitar conversion.
 *
 * Ported/adapted from pepperhorn/frames (src/lib/instruments.ts). chords-db
 * ships guitar and ukulele voicing libraries; we start with guitar and keep the
 * config table so ukulele is a small follow-up.
 */
import type { Chord } from "svguitar";

export type InstrumentId = "guitar" | "ukulele" | "guitar-top3";

export interface InstrumentConfig {
  id: InstrumentId;
  label: string;
  description: string;
  strings: number;
  /** Default number of frets to draw. */
  frets: number;
  /** Open-string tuning, low → high. */
  tuning: string[];
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentConfig> = {
  guitar: {
    id: "guitar",
    label: "Guitar",
    description: "Standard 6-string guitar (E A D G B E)",
    strings: 6,
    frets: 5,
    tuning: ["E", "A", "D", "G", "B", "E"],
  },
  ukulele: {
    id: "ukulele",
    label: "Ukulele",
    description: "Standard ukulele (G C E A)",
    strings: 4,
    frets: 5,
    tuning: ["G", "C", "E", "A"],
  },
  "guitar-top3": {
    id: "guitar-top3",
    label: "Guitar (top 3)",
    description:
      "Six-string guitar, beginner voicings on the top three strings only (G B E). " +
      "Strings 4-6 are muted at render time.",
    strings: 6,
    frets: 4,
    tuning: ["E", "A", "D", "G", "B", "E"],
  },
};

// ── chords-db shapes ──────────────────────────────────────────────

export interface ChordsDbPosition {
  /** Per-string fret, low→high. -1 = muted, 0 = open, else absolute-ish (see baseFret). */
  frets: number[];
  /** Per-string finger number (0 = none). */
  fingers: number[];
  /** Lowest fret the diagram window starts on (1 = nut). */
  baseFret: number;
  /** Fret numbers that carry a barre. */
  barres: number[];
  capo?: boolean;
  midi?: number[];
}

export interface ChordsDbEntry {
  key: string;
  suffix: string;
  positions: ChordsDbPosition[];
}

export interface ChordsDb {
  main: { strings: number; fretsOnChord: number; name: string; numberOfChords: number };
  tunings: Record<string, string[]>;
  keys: string[];
  suffixes: string[];
  chords: Record<string, ChordsDbEntry[]>;
}

/**
 * Convert a chords-db position into an svguitar Chord (fingers + barres +
 * window position). Ported from pepperhorn/frames.
 *
 * @param pos - chords-db position
 * @param stringCount - number of strings (6 guitar, 4 ukulele)
 * @param title - optional diagram title
 */
export function dbPositionToChord(
  pos: ChordsDbPosition,
  stringCount: number,
  title?: string,
): Chord {
  const fingers: Chord["fingers"] = [];
  const barreFrets = new Set(pos.barres);

  pos.frets.forEach((fret, dbIdx) => {
    // chords-db lists strings low→high; svguitar numbers strings high→low.
    const stringNum = stringCount - dbIdx;
    if (fret === -1) {
      fingers.push([stringNum, "x"]);
      return;
    }
    if (fret === 0) {
      fingers.push([stringNum, 0]);
      return;
    }
    // Skip strings covered by a barre — the barre draws them.
    if (barreFrets.has(fret)) return;
    const fingerNum = pos.fingers[dbIdx];
    const text = fingerNum && fingerNum > 0 ? String(fingerNum) : undefined;
    fingers.push(text ? [stringNum, fret, text] : [stringNum, fret]);
  });

  const barres: Chord["barres"] = pos.barres.map((fret) => {
    const playingIdxs = pos.frets
      .map((f, i) => (f === fret ? i : -1))
      .filter((i) => i >= 0);
    const stringNums = playingIdxs.map((i) => stringCount - i);
    const fromString = Math.max(...stringNums);
    const toString = Math.min(...stringNums);
    const fingerNums = playingIdxs
      .map((i) => pos.fingers[i])
      .filter((n): n is number => typeof n === "number" && n > 0);
    const fingerLabel = fingerNums.length ? String(Math.min(...fingerNums)) : undefined;
    return { fromString, toString, fret, ...(fingerLabel ? { text: fingerLabel } : {}) };
  });

  return {
    fingers,
    barres,
    position: pos.baseFret,
    ...(title ? { title } : {}),
  };
}

/**
 * Open-string MIDI numbers, ordered string 1 first (highest pitch), matching
 * svguitar's string numbering. Used to verify that a hand-authored shape
 * actually spells the chord it claims to.
 */
export const OPEN_STRING_MIDI: Record<InstrumentId, number[]> = {
  guitar: [64, 59, 55, 50, 45, 40],
  "guitar-top3": [64, 59, 55, 50, 45, 40],
  ukulele: [69, 64, 60, 67],
};
