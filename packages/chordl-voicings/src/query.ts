import { Note } from "tonal";
import type { VoicingEntry, VoicingQuery, VoicingQuality, VoicingStyle, RealizedNote, Hand } from "./types";
import { VOICING_LIBRARY } from "./library";
import { normalizeToSharps, spellForKey } from "./spelling";

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
 * IMPORTANT: Check order matters, and the reason differs per check. Every
 * ordering dependency below has been verified by reordering the branches and
 * observing the result, not by reasoning about it — one of them was reasoned
 * about first and the reasoning was wrong.
 *
 * - alt, dim7, m7b5 and sus must precede the TRAILING DIGIT CATCHALL at the
 *   end, because that catchall matches any "7"/"9"/"11"/"13" anywhere in the
 *   string. "m7b5" and "7sus4" both contain a digit it would claim.
 *   Note this is a dependency on the catchall, NOT on the "dom" check — no
 *   sus or m7b5 name contains the substring "dom", so swapping those two
 *   branches changes nothing.
 * - The "dom" check must precede the "min" check: "dominant" contains the
 *   substring "min" (do-**min**-ant), so without this ordering every dominant
 *   chord type is misclassified as minor.
 */
export function mapToVoicingQuality(chordType: string, notes?: string[]): VoicingQuality | undefined {
  // Trap #3: lowercasing chordType below (for every other check in this
  // function) destroys the one signal that distinguishes uppercase-M
  // shorthand ("M", "M7", "M9", "M11", "M13", "M6" — major) from
  // lowercase-m shorthand ("m", "m7", "m9", ... — minor). This casing
  // convention is real and used elsewhere in the monorepo (chordl-guitar's
  // toDbSuffix maps "M7" -> "maj7" and "m"/"min" -> "minor"), so it must be
  // tested case-sensitively, on the original string, before lowercasing.
  // Only these bare numeral shorthand forms are ambiguous by case; "maj"-
  // prefixed forms ("maj7") and spelled-out names ("major seventh") already
  // contain enough letters to survive lowercasing unambiguously, so they
  // are deliberately left out of this table and handled by the general
  // logic below, same as before.
  //
  // "M7b5" is also deliberately left out: m7b5 is the standard, universally
  // lowercase notation for a half-diminished chord — there is no
  // established "major seventh flat five" symbol (and VoicingQuality has no
  // such quality to return). So "M7b5" falls through to the general
  // lowercase logic below, where lowercasing it produces the same string as
  // "m7b5" and it resolves to "m7b5" (half-diminished), identically to its
  // lowercase form. Bare "M" (major triad shorthand) is likewise left out
  // of this table: it isn't ambiguous by case either way, since lowercasing
  // it to "m" already falls through every branch below to `undefined`, the
  // same as "major"/"major triad" do for plain triads.
  if (/^M(6|7|9|11|13)$/.test(chordType)) {
    return chordType === "M6" ? "maj6" : "maj7";
  }

  const t = chordType.toLowerCase();

  if (t.includes("alt")) return "alt";
  if (t.includes("dim7") || t.includes("diminished seventh")) return "dim7";
  if (t.includes("m7b5") || t.includes("half")) return "m7b5";
  if (t.includes("sus")) return "sus4";
  // "dominant" contains the substring "min", so this must precede the minor
  // test below or every dominant chord resolves to min7.
  if (t.includes("dom")) return "dom7";
  // Trap #2: minor shorthand ("m7", "m9", "m11", "m13", "m6", "m6/9") contains
  // neither "min" nor "minor", so without this it falls through all the way
  // to the dominant/6 catchall below and gets misclassified (e.g. "m7" ->
  // dom7, "m6" -> maj6). Match "m" directly followed by a digit instead:
  // "maj7"/"major seventh" have "a" after the "m" so they don't collide, and
  // "m7b5" is already caught above so it never reaches this check.
  const isMinorShorthand = /^m\d/.test(t);
  if (t.includes("min") || t.includes("minor") || isMinorShorthand) {
    // Plain triads ("minor", "minor triad") don't map to 7th voicings
    if (t === "minor" || t === "minor triad") return undefined;
    if (t.includes("6/9") || t.includes("6add9")) return "m6/9";
    // Trap #4: Tonal spells the minor sixth chord "minor sixth" with no digit
    // at all, so the numeral-only test misses it and falls through to
    // min7. Recognize the spelled-out word alongside the numeral.
    if (t.includes("6") || t.includes("sixth")) return "min6";
    return "min7";
  }
  if (t.includes("maj") || t.includes("major")) {
    if (t === "major" || t === "major triad") return undefined;
    if (t.includes("6/9") || t.includes("6add9") || t.includes("sixth added ninth")) return "6/9";
    // Same Trap #4 spelled-out-sixth issue as the minor branch above
    // ("major sixth" has no digit); without this "major sixth" falls
    // through to maj7.
    if (t.includes("6") || t.includes("sixth")) return "maj6";
    return "maj7";
  }
  // Bare extension/6-chord shorthand with no "dom"/"min"/"maj" qualifier
  // word (e.g. "7", "9", "11", "13", "6", "6/9", "6add9", or Tonal's bare
  // "sixth" / "sixth added ninth" / "eleventh" names). The 6-family checks
  // must run before the 7/9/11/13 catchall or "6/9" and "6add9" (which
  // contain "9") get caught by it and misclassified as dom7.
  if (t.includes("6/9") || t.includes("6add9") || t.includes("sixth added ninth")) return "6/9";
  // Trap #5: Tonal's canonical type for an 11th chord is the bare word
  // "eleventh" ("C11".type === "eleventh"), with no "7"/"9"/"13" digit for
  // this catchall to match — so 11th chords fell through to `undefined`
  // (no voicing at all) instead of dom7. Recognize both the digit "11" and
  // the spelled-out word, matching how "9"/"13" (digit only, since Tonal
  // never emits a bare "ninth"/"thirteenth" without a qualifier) are
  // already handled.
  if (
    t.includes("dom") ||
    t.includes("7") ||
    t.includes("9") ||
    t.includes("11") ||
    t.includes("13") ||
    t.includes("eleventh")
  ) {
    return "dom7";
  }
  // Trap: Tonal's canonical name for the bare major sixth chord is "sixth"
  // (no digit), not "major sixth" — recognize the spelled-out word here too,
  // or "sixth" alone resolves to undefined instead of maj6.
  if (t.includes("6") || t.includes("sixth")) return "maj6";

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
    const spelled = spellForKey(pc, root);
    const hand: Hand = voicing.hands?.[i] ?? "LH";
    return {
      note: noteName,
      midi,
      pitchClass: spelled,
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
