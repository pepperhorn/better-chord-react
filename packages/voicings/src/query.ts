import { Note } from "tonal";
import type { VoicingEntry, VoicingQuery, VoicingQuality, VoicingStyle, RealizedNote, Hand } from "./types";
import { VOICING_LIBRARY } from "./library";

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
};

function normalizeNote(note: string): string {
  return FLAT_TO_SHARP[note] ?? note;
}

/** Map artist names / keywords to voicing styles */
const ARTIST_STYLE_MAP: Record<string, { style?: VoicingStyle; era?: string }> = {
  "bud powell": { style: "Shell" },
  "thelonious monk": { style: "Shell" },
  "bebop": { style: "Shell" },
  "count basie": { style: "Shell" },
  "basie": { style: "Shell" },
  "bill evans": { style: "Rootless Type A" },
  "wynton kelly": { style: "Rootless Type A" },
  "comping": { style: "Rootless Type A" },
  "rootless": { style: "Rootless Type A" },
  "mccoy tyner": { style: "Quartal" },
  "modal": { style: "Quartal" },
  "so what": { style: "Quartal" },
  "herbie hancock": { style: "Upper Structure" },
  "upper structure": { style: "Upper Structure" },
  "altered": { style: "Upper Structure" },
  "duke ellington": { style: "Drop 2" },
  "ellington": { style: "Drop 2" },
  "george shearing": { style: "Drop 2" },
  "barry harris": { style: "Drop 2" },
  "block": { style: "Drop 2" },
  "drop 2+4": { style: "Drop 2+4" },
  "drop 2 and 4": { style: "Drop 2+4" },
  "drop 2": { style: "Drop 2" },
  "locked hands": { style: "Drop 2" },
  "spread": { style: "Spread" },
  "sax section": { style: "Spread" },
  "sammy nestico": { style: "4-Note Closed" },
  "nestico": { style: "4-Note Closed" },
  "4-note closed": { style: "4-Note Closed" },
  "four note closed": { style: "4-Note Closed" },
  "trumpet section": { style: "4-Note Closed" },
};

/**
 * Map a chord quality string (from our resolver) to a VoicingQuality.
 * Handles the many names Tonal/our resolver can produce.
 *
 * IMPORTANT: Check order matters. More specific types (alt, dim7, m7b5, sus)
 * must be tested before general ones (min, maj, dom7) because the general
 * checks use broad substring matching (e.g., "7" would match "m7b5").
 */
export function mapToVoicingQuality(chordType: string, notes?: string[]): VoicingQuality | undefined {
  const t = chordType.toLowerCase();

  if (t.includes("alt")) return "alt";
  if (t.includes("dim7") || t.includes("diminished seventh")) return "dim7";
  if (t.includes("m7b5") || t.includes("half")) return "m7b5";
  if (t.includes("sus")) return "sus4";
  if (t.includes("min") || t.includes("minor")) {
    // Plain triads ("minor", "minor triad") don't map to 7th voicings
    if (t === "minor" || t === "minor triad") return undefined;
    if (t.includes("6/9") || t.includes("6add9")) return "m6/9";
    if (t.includes("6")) return "min6";
    return "min7";
  }
  if (t.includes("maj") || t.includes("major")) {
    if (t === "major" || t === "major triad") return undefined;
    return "maj7";
  }
  if (t.includes("dom") || t.includes("7") || t.includes("9") || t.includes("13")) return "dom7";
  if (t.includes("6/9")) return "6/9";
  if (t.includes("6")) return "maj6";

  return undefined;
}

/**
 * Infer a voicing style from a natural language style hint.
 */
export function inferStyle(styleHint: string): VoicingStyle | undefined {
  const lower = styleHint.toLowerCase().trim();
  for (const [keyword, mapping] of Object.entries(ARTIST_STYLE_MAP)) {
    if (lower.includes(keyword)) {
      return mapping.style;
    }
  }
  return undefined;
}

/**
 * Query the voicing library with filters.
 */
export function queryVoicings(query: VoicingQuery): VoicingEntry[] {
  return VOICING_LIBRARY.filter((v) => {
    if (query.quality && v.quality !== query.quality) return false;
    if (query.era && v.tags.era !== query.era) return false;
    if (query.style && v.tags.style !== query.style) return false;
    if (query.artist) {
      const lower = query.artist.toLowerCase();
      if (v.tags.artist && !v.tags.artist.toLowerCase().includes(lower)) return false;
      if (!v.tags.artist) return false;
    }
    return true;
  });
}

/**
 * Realize a voicing with full note data including hand assignments.
 */
export function realizeVoicingFull(
  root: string,
  voicing: VoicingEntry,
  octave: number = 3
): RealizedNote[] {
  const rootMidi = Note.midi(`${root}${octave}`);
  if (rootMidi == null) return [];

  return voicing.intervals.map((interval, i) => {
    const midi = rootMidi + interval;
    const noteName = Note.fromMidi(midi);
    const pc = Note.pitchClass(noteName);
    const hand: Hand = voicing.hands?.[i] ?? "LH";
    return {
      note: noteName,
      midi,
      pitchClass: normalizeNote(pc),
      hand,
    };
  });
}

/**
 * Realize a voicing: returns note name strings (scientific pitch notation).
 * For backwards compatibility.
 */
export function realizeVoicing(
  root: string,
  voicing: VoicingEntry,
  octave: number = 3
): string[] {
  return realizeVoicingFull(root, voicing, octave).map((n) => n.note);
}

/**
 * Get the pitch classes (without octave) from a realized voicing.
 * Useful for highlighting keys on the SVG keyboard.
 */
export function voicingPitchClasses(
  root: string,
  voicing: VoicingEntry,
  octave: number = 3
): string[] {
  return realizeVoicingFull(root, voicing, octave).map((n) => n.pitchClass);
}

/**
 * Get all alternative voicings for a quality (excluding the given one).
 */
export function getAlternativeVoicings(
  quality: VoicingQuality,
  excludeId?: string
): VoicingEntry[] {
  return VOICING_LIBRARY.filter(
    (v) => v.quality === quality && v.id !== excludeId
  );
}

/**
 * Find the best voicing for a chord + style combination.
 * Returns the first match (prefer Type A for rootless).
 */
export function findVoicing(
  quality: VoicingQuality,
  styleHint?: string
): VoicingEntry | undefined {
  const style = styleHint ? inferStyle(styleHint) : undefined;

  // Try exact style match first
  if (style) {
    const matches = queryVoicings({ quality, style });
    if (matches.length > 0) return matches[0];

    // For rootless, if Type A doesn't match quality, try Type B
    if (style === "Rootless Type A") {
      const typeB = queryVoicings({ quality, style: "Rootless Type B" });
      if (typeB.length > 0) return typeB[0];
    }
  }

  // Fallback: any voicing for this quality
  const any = queryVoicings({ quality });
  if (any.length > 0) return any[0];

  if (styleHint) {
    console.warn(`No voicing found for quality "${quality}" with style hint "${styleHint}"`);
  }
  return undefined;
}
