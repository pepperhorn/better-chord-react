import { Note } from "tonal";

const ROMAN_TO_SEMITONE: Record<string, number> = {
  i: 0, ii: 2, iii: 4, iv: 5, v: 7, vi: 9, vii: 11,
};

interface RomanNumeralChord {
  root: string;
  symbol: string;
  degree: number;
}

/**
 * Parse a single roman numeral token like "ii", "V7", "bIII", "#ivø7", "viio7"
 */
function parseRomanToken(token: string): {
  semitones: number;
  quality: string;
  hasFlat: boolean;
} | null {
  // Alternation order matters: "iv" before "i" (otherwise "i" matches first
  // in "iv"), "vi{1,2}" before "v" (otherwise "v" matches first in "vi").
  // "i{1,3}" handles i, ii, iii. Suffix group (.*) captures quality markers.
  const re = /^([#b]?)(iv|vi{1,2}|i{1,3}|v)(.*)/i;
  const m = token.match(re);
  if (!m) return null;

  const accidental = m[1];
  const numeral = m[2];
  const suffix = m[3];

  const lower = numeral.toLowerCase();
  const base = ROMAN_TO_SEMITONE[lower];
  if (base === undefined) return null;

  let semitones = base;
  if (accidental === "b") semitones -= 1;
  if (accidental === "#") semitones += 1;
  semitones = ((semitones % 12) + 12) % 12;

  const isMinor = numeral === numeral.toLowerCase();

  let quality = "";
  if (suffix) {
    let norm = suffix
      .replace(/^°7/, "dim7")
      .replace(/^°/, "dim")
      .replace(/^ø7?/, "m7b5")
      .replace(/^Δ7?/, "maj7");

    if (isMinor && !norm.startsWith("m") && !norm.startsWith("dim") && !norm.startsWith("M")) {
      quality = "m" + norm;
    } else {
      quality = norm;
    }
  } else {
    quality = isMinor ? "m" : "";
  }

  return { semitones, quality, hasFlat: accidental === "b" };
}

/**
 * Resolve a roman numeral progression in a given key.
 */
export function resolveProgression(
  numerals: string[],
  key: string,
): RomanNumeralChord[] {
  const keyMidi = Note.midi(`${key}4`);
  if (keyMidi == null) throw new Error(`Invalid key: ${key}`);

  return numerals.map((token) => {
    const parsed = parseRomanToken(token);
    if (!parsed) throw new Error(`Can't parse roman numeral: "${token}"`);

    const rootMidi = keyMidi + parsed.semitones;
    const rootNote = Note.pitchClass(Note.fromMidi(rootMidi));
    const root = preferredEnharmonic(rootNote, key, parsed.hasFlat);
    const symbol = root + parsed.quality;

    return { root, symbol, degree: parsed.semitones };
  });
}

/**
 * Parse a progression string like "ii-V-I" or "ii V7 Imaj7" into tokens.
 */
export function tokenizeProgression(input: string): string[] {
  return input
    .split(/[\s\-–—→>]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// Flat keys prefer flats, sharp keys prefer sharps
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);
const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
};
const FLAT_TO_SHARP: Record<string, string> = {
  "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#",
};

/**
 * Choose the right enharmonic spelling based on key context.
 * If the roman numeral has a flat accidental (bVII, bII), prefer flat spelling.
 */
function preferredEnharmonic(note: string, key: string, preferFlat: boolean = false): string {
  // If the numeral itself has a flat, always use flat spelling
  if (preferFlat) {
    return SHARP_TO_FLAT[note] ?? note;
  }
  if (FLAT_KEYS.has(key)) {
    return SHARP_TO_FLAT[note] ?? note;
  }
  return FLAT_TO_SHARP[note] ?? note;
}
