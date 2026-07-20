/**
 * Chord label → guitar chord shapes (all positions) via chords-db.
 *
 * chordl produces chord symbols like "Am", "G7", "Cmaj7", "F#m7b5"; this maps
 * them to chords-db entries and returns every stored position, so callers can
 * offer alternate fret placements. Never invents shapes — unknown chords
 * return null.
 */
import guitarDb from "@tombatossals/chords-db/lib/guitar.json";
import type { Chord } from "svguitar";
import {
  INSTRUMENTS,
  dbPositionToChord,
} from "./instruments";
import type {
  ChordsDb,
  ChordsDbEntry,
  ChordsDbPosition,
  InstrumentId,
} from "./instruments";

const GUITAR_DB = guitarDb as unknown as ChordsDb;

function dbFor(instrument: InstrumentId): ChordsDb | null {
  if (instrument === "guitar") return GUITAR_DB;
  // Ukulele wiring is a follow-up (chords-db also ships ukulele.json).
  return null;
}

// chordl roots (sharp/flat spellings) → chords-db root keys.
const ROOT_TO_DB_KEY: Record<string, string> = {
  C: "C", "C#": "Csharp", Db: "Csharp",
  D: "D", "D#": "Eb", Eb: "Eb",
  E: "E", Fb: "E", "E#": "F",
  F: "F", "F#": "Fsharp", Gb: "Fsharp",
  G: "G", "G#": "Ab", Ab: "Ab",
  A: "A", "A#": "Bb", Bb: "Bb",
  B: "B", Cb: "B", "B#": "C",
};

// chordl suffix → chords-db suffix. Most match verbatim; only the triads and a
// couple of aliases need translating.
function toDbSuffix(suffix: string): string {
  const s = suffix.trim();
  if (s === "" || s === "maj" || s === "M") return "major";
  if (s === "m" || s === "min" || s === "-") return "minor";
  if (s === "min7") return "m7";
  if (s === "°") return "dim";
  if (s === "ø" || s === "ø7") return "m7b5";
  return s; // m7, maj7, 7, dim7, sus4, 6, 9, 11, 13, m7b5, ... match verbatim
}

function splitLabel(label: string): { root: string; suffix: string } | null {
  const m = label.trim().match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!m) return null;
  const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return { root, suffix: m[2] };
}

function findEntry(db: ChordsDb, label: string): ChordsDbEntry | null {
  const parsed = splitLabel(label);
  if (!parsed) return null;
  const dbKey = ROOT_TO_DB_KEY[parsed.root];
  if (!dbKey) return null;
  const entries = db.chords[dbKey];
  if (!entries) return null;
  const dbSuffix = toDbSuffix(parsed.suffix);
  return entries.find((e) => e.suffix === dbSuffix) ?? null;
}

export interface GuitarChordResult {
  /** The chord label as given. */
  label: string;
  instrument: InstrumentId;
  /** Raw chords-db positions (low→high frets, baseFret, barres, fingers). */
  positions: ChordsDbPosition[];
  /** svguitar Chord objects, one per position, ready to render. */
  shapes: Chord[];
}

/**
 * Look up all stored shapes for a chord label. Returns null when the chord or
 * instrument isn't supported.
 */
export function lookupGuitarChord(
  label: string,
  instrument: InstrumentId = "guitar",
): GuitarChordResult | null {
  const db = dbFor(instrument);
  if (!db) return null;
  const entry = findEntry(db, label);
  if (!entry || entry.positions.length === 0) return null;

  const strings = INSTRUMENTS[instrument].strings;
  const shapes = entry.positions.map((pos) => dbPositionToChord(pos, strings, label));
  return { label, instrument, positions: entry.positions, shapes };
}

/** True when at least one shape exists for the label. */
export function hasGuitarChord(label: string, instrument: InstrumentId = "guitar"): boolean {
  return lookupGuitarChord(label, instrument) !== null;
}
