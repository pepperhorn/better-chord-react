/**
 * Instrument configs + chords-db types + position→svguitar conversion.
 *
 * Ported/adapted from pepperhorn/frames (src/lib/instruments.ts). chords-db
 * ships guitar and ukulele voicing libraries; we start with guitar and keep the
 * config table so ukulele is a small follow-up.
 */
import type { Chord } from "svguitar";

export type InstrumentId = "guitar" | "ukulele" | "guitar-top3" | "bass4" | "bass5";

export interface InstrumentConfig {
  id: InstrumentId;
  label: string;
  description: string;
  strings: number;
  /** Default number of frets to draw. */
  frets: number;
  /** Open-string tuning, low → high. */
  tuning: string[];
  /**
   * Open-string MIDI numbers in **chords-db index order** — `openMidi[i]` is
   * the string that `frets[i]` refers to. This is NOT svguitar's string
   * numbering, which runs highest-pitch-first; `dbPositionToChord` is the one
   * place that inverts. Ukulele's reentrant high-G means the array is not
   * ascending, so the order cannot be recovered by sorting.
   */
  openMidi: number[];
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentConfig> = {
  guitar: {
    id: "guitar",
    label: "Guitar",
    description: "Standard 6-string guitar (E A D G B E)",
    strings: 6,
    frets: 5,
    tuning: ["E", "A", "D", "G", "B", "E"],
    openMidi: [40, 45, 50, 55, 59, 64],
  },
  ukulele: {
    id: "ukulele",
    label: "Ukulele",
    description: "Standard ukulele (G C E A)",
    strings: 4,
    frets: 5,
    tuning: ["G", "C", "E", "A"],
    openMidi: [67, 60, 64, 69],
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
    openMidi: [40, 45, 50, 55, 59, 64],
  },
  bass4: {
    id: "bass4",
    label: "Bass (4-string)",
    description: "Standard 4-string bass (E A D G)",
    strings: 4,
    frets: 5,
    tuning: ["E", "A", "D", "G"],
    openMidi: [28, 33, 38, 43],
  },
  bass5: {
    id: "bass5",
    label: "Bass (5-string)",
    description: "5-string bass with low B (B E A D G)",
    strings: 5,
    frets: 5,
    tuning: ["B", "E", "A", "D", "G"],
    openMidi: [23, 28, 33, 38, 43],
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

