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
  // Anchoring this to the whole string was too strict: tonal also publishes
  // altered uppercase aliases ("M69" for a 6/9, "M7#11"), and those fell past
  // the table into the lowercase logic, where `/^m\d/` read them as *minor*
  // shorthand — M69 came out min6 and M7#11 came out min7. Matching the prefix
  // and classifying the remainder keeps the whole family major.
  const t = chordType.toLowerCase();

  // "sixth" names a sixth chord — but "major seventh flat sixth" and friends
  // use the same word for an *altered degree inside a seventh chord*, and
  // answering those with a maj6 voicing drops the 7th and adds a 6th the chord
  // does not contain.
  // Note on "major seventh flat sixth" (tonal's `M7b6`, 1P 3M 6m 7M): there is
  // no b6 in that chord. With no perfect fifth present the Ab is a raised
  // fifth, making it an augmented major seventh — maj7#5, which tonal itself
  // spells that way under "augmented seventh". VoicingQuality has no maj7#5,
  // so it answers maj7: the seventh agrees, though a voicing carrying a
  // natural fifth will contradict the raised one.
  const namesASixthChord =
    (t.includes("sixth") && !t.includes("flat sixth") && !t.includes("sharp sixth")) ||
    // The digit form has the same trap: the "6" in "mMaj7b6" is a flattened
    // 6th inside a major-seventh chord, not a sixth chord. Only a 6 that is
    // not being altered counts.
    /(^|[^#b])6/.test(t);

  // Case-sensitive, and ahead of the half-diminished test below: lowercasing
  // "M7b5" produces "m7b5" and it would be answered as a half-diminished, which
  // is a different chord (1 b3 b5 b7 against this one's 1 3 b5 7).
  if (/^M(7|9|11|13)b5/.test(chordType)) return "maj7b5";

  // Root and fifth, no third — the guitar power chord. tonal names it "fifth".
  if (t === "5" || t === "fifth" || t === "no3" || t === "no 3") return "5";

  if (t.includes("alt")) return "alt";
  // "o7" and "°7" are the same chord as "dim7" and carry none of its letters,
  // so they used to fall all the way to the digit catchall and be answered as
  // dominants. The bare "o"/"°" is the diminished *triad*, which has no seventh
  // — handled with the other triads below.
  if (t.includes("dim7") || t.includes("diminished seventh")) return "dim7";
  if (/^(o|°)7$/.test(chordType)) return "dim7";
  // "ø", "h" and "h7" are the other half-diminished symbols. Anchored, because
  // a bare `includes("h")` would match "seventh", "eleventh", "half" and most
  // of the spelled-out vocabulary.
  if (
    t.includes("m7b5") ||
    t.includes("-7b5") ||
    t.includes("half") ||
    /^(ø7?|h7?)$/.test(chordType)
  ) {
    return "m7b5";
  }
  // Trap #1 again, one chord along: "diminished" contains "min" (di-MIN-ished),
  // so a bare diminished triad reached the minor branch and rendered min7
  // voicings. It has no seventh-chord voicing of its own, so it is undefined
  // like the major and minor triads — "diminished seventh" and the
  // half-diminished spellings are both already answered above.
  if (t.includes("dim") || /^(o|°)$/.test(chordType)) return undefined;
  // "sus2" is a different chord from sus4: 1 2 5, not 1 4 5. The sus4 voicings
  // are quartal stacks on a P4 and a m7, neither of which a sus2 contains.
  // Anchored so "sus24" (which really does have a P4) still reads as sus4.
  if (/(^|[^0-9])sus2($|[^0-9])/.test(t) || t === "suspended second") return "sus2";
  // A sus chord whose seventh is major (M7sus4, M9sus4) is not what the sus4
  // voicings describe: those are quartal stacks built on a *minor* seventh
  // (`[0, 5, 10]`), so answering one would sound a b7 against the chord's
  // natural 7. There is no maj7sus4 quality to return, so return none — the
  // caller falls back to the chord's own tones rather than a contradiction.
  if (t.includes("sus")) {
    return /^M\d/.test(chordType) || t.includes("maj") ? undefined : "sus4";
  }
  // The minor/major seventh family. The canonical name "minor/major seventh"
  // contains "minor" and resolves below, but every shorthand alias for it
  // scattered: mMaj7 and -maj7 landed in the *major* branch (they contain
  // "maj"), while mM7 and -Δ7 fell through to the dominant catchall. A minor
  // chord was being answered with major and dominant voicings.
  //
  // Matched on the original string, since the lowercase m / uppercase M
  // distinction is the whole signal. "maj7" itself does not match: after the
  // leading "m" the rest is "aj7", not another major marker.
  //
  // A leading lowercase m (not the "m" of "maj"/"ma7") or "-", plus a major
  // seventh marker anywhere after it, is this family: mMaj7, mM7, -Δ7, -^7,
  // -maj7, mMaj7b6, mb6M7.
  // "o"/"°" join this: oM7 and o7M7 are diminished triads carrying a *major*
  // seventh, which is the minor/major shape with a lowered fifth. They are
  // minor chords, and min7 is the nearest quality the library holds for one.
  const startsMinor = /^([mo°](?!aj|a\d)|-)/.test(chordType);
  // The markers jazz lead sheets use for a major seventh. "M" only counts
  // against a digit, or "M7"/"M9" would be indistinguishable from a bare "M".
  // "[Mm]aj" so the prefixed forms ("mMaj7") are caught; "M" against a digit
  // stays case-sensitive, or plain "m7" would read as a major seventh.
  const hasMajorSeventhMarker = /(?:[Mm]aj|ma\d|M\d|Δ|\^)/.test(chordType);
  if (startsMinor && hasMajorSeventhMarker) return "mMaj7";
  // The same markers with no minor prefix are simply a major seventh. Without
  // this, "^7", "^9", "Δ9" and "ma7" carry no "maj" for the major branch to
  // find and fall through to the digit catchall — so the most common jazz
  // spelling of a major seventh was answered with a *dominant* voicing, a b7
  // against the chord's natural 7.
  // The marker must carry a digit: a bare "^" (and "^#5") is tonal's major
  // *triad*, which has no seventh to voice.
  if (!startsMinor && /(ma\d|Δ\d|\^\d)/.test(chordType) && !t.includes("dim")) {
    if (/(69|6\/9|6add9)/.test(chordType)) return "6/9";
    return "maj7";
  }
  // Uppercase M is major, lowercase m is minor, and lowercasing destroys the
  // difference — so this reads the original string. It sits *here*, not at the
  // top: `M7sus4` and `M9sus4` are suspended chords, and `M7b5` is the standard
  // spelling of a half-diminished, so those tests outrank the family. Anchoring
  // it to the whole string was too strict — tonal also publishes altered
  // aliases (`M69`, `M7#11`) that then fell into the lowercase logic, where
  // `/^m\d/` read them as *minor* shorthand.
  if (/^M\d/.test(chordType)) {
    const rest = chordType.slice(1);
    if (/^(69|6\/9|6add9)/.test(rest)) return "6/9";
    if (/^6/.test(rest)) return "maj6";
    return "maj7";
  }
  // "dominant" contains the substring "min", so this must precede the minor
  // test below or every dominant chord resolves to min7.
  if (t.includes("dom")) return "dom7";
  // Trap #2: minor shorthand ("m7", "m9", "m11", "m13", "m6", "m6/9") contains
  // neither "min" nor "minor", so without this it falls through all the way
  // to the dominant/6 catchall below and gets misclassified (e.g. "m7" ->
  // dom7, "m6" -> maj6). Match "m" directly followed by a digit instead:
  // "maj7"/"major seventh" have "a" after the "m" so they don't collide, and
  // "m7b5" is already caught above so it never reaches this check.
  // tonal publishes a leading "-" for minor alongside "m": -7, -9, -11, -13,
  // -6, -69. Same shorthand, same trap — without it they fall to the digit
  // catchall and come out dominant.
  const isMinorShorthand = /^[m-]\d/.test(t);
  if (t.includes("min") || t.includes("minor") || isMinorShorthand) {
    // Plain triads ("minor", "minor triad") don't map to 7th voicings
    // Triads with no seventh of their own, same reasoning as the diminished
    // triad above.
    if (
      t === "minor" ||
      t === "min" ||
      t === "minor triad" ||
      t === "minor augmented"
    ) {
      return undefined;
    }
    // Kept in step with the major branch below: the two used to test different
    // 6/9 spellings, which is the asymmetry that let "minor sixth" through as
    // min7 in the first place.
    if (
      t.includes("6/9") ||
      t.includes("69") ||
      t.includes("6add9") ||
      t.includes("sixth added ninth")
    ) {
      return "m6/9";
    }
    // Trap #4: Tonal spells the minor sixth chord "minor sixth" with no digit
    // at all, so the numeral-only test misses it and falls through to
    // min7. Recognize the spelled-out word alongside the numeral.
    if (namesASixthChord) return "min6";
    return "min7";
  }
  if (t.includes("maj") || t.includes("major")) {
    if (t === "major" || t === "maj" || t === "major triad") return undefined;
    if (
      t.includes("6/9") ||
      t.includes("69") ||
      t.includes("6add9") ||
      t.includes("sixth added ninth")
    ) {
      return "6/9";
    }
    // Same Trap #4 spelled-out-sixth issue as the minor branch above
    // ("major sixth" has no digit); without this "major sixth" falls
    // through to maj7.
    if (namesASixthChord) return "maj6";
    return "maj7";
  }
  // A triad with an added tone and no seventh: add9/add2/2, madd9, add11/add4,
  // madd4. These carry a 9, 4 or 11 with no seventh anywhere, so the digit
  // catchall below used to claim them and answer dom7 — putting a b7 into a
  // chord defined by not having one.
  //
  // Whether the triad is major or minor comes from the original string, not the
  // lowercased one: "Madd9" and "madd9" are different chords and differ only by
  // that capital.
  // Only when there is no seventh: "7add6" and "7add13" are dominant chords
  // that happen to name an added tone, and they belong to the catchall below.
  if ((/add/.test(t) || t === "2") && !t.includes("7")) {
    // An altered added tone (addb9, add#9) or a raised fifth (+add9, M#5add9)
    // is a different chord again, and the plain add voicings would contradict
    // it. No quality fits, so none is returned.
    if (/[b#]\d/.test(t) || t.includes("+") || t.includes("#5")) return undefined;
    // A sixth *and* a ninth is the 6/9 chord, which has its own quality — this
    // has to be asked before the plain sixth test or "6add9" answers maj6.
    if (/(69|6\/9|6add9|sixth added ninth)/.test(t)) {
      return startsMinor ? "m6/9" : "6/9";
    }
    // add6/add13 are the sixth chord, which already has a quality.
    if (/6|13/.test(t)) return startsMinor ? "min6" : "maj6";
    if (/11|4/.test(t)) return startsMinor ? "madd11" : "add11";
    if (/9|2/.test(t)) return startsMinor ? "madd9" : "add9";
    return undefined;
  }

  // Bare extension/6-chord shorthand with no "dom"/"min"/"maj" qualifier
  // word (e.g. "7", "9", "11", "13", "6", "6/9", "6add9", or Tonal's bare
  // "sixth" / "sixth added ninth" / "eleventh" names). The 6-family checks
  // must run before the 7/9/11/13 catchall or "6/9" and "6add9" (which
  // contain "9") get caught by it and misclassified as dom7.
  if (
    t.includes("6/9") ||
    t.includes("69") ||
    t.includes("6add9") ||
    t.includes("sixth added ninth")
  ) {
    return "6/9";
  }
  // Trap #5: Tonal's canonical type for an 11th chord is the bare word
  // "eleventh" ("C11".type === "eleventh"), with no "7"/"9"/"13" digit for
  // this catchall to match — so 11th chords fell through to `undefined`
  // (no voicing at all) instead of dom7. Recognize both the digit "11" and
  // the spelled-out word, matching how "9"/"13" (digit only, since Tonal
  // never emits a bare "ninth"/"thirteenth" without a qualifier) are
  // already handled.
  if (
    t.includes("7") ||
    t.includes("9") ||
    // Not a bare `includes("11")`: that also matches the alteration in "6#11"
    // and "13#11", claiming a sixth chord for dom7. Only an 11 used as the
    // chord's own extension counts. ("dom" is not tested here — every string
    // containing it returned above.)
    /(^|[^#b])11/.test(t) ||
    t.includes("13") ||
    t.includes("eleventh")
  ) {
    return "dom7";
  }
  // Trap: Tonal's canonical name for the bare major sixth chord is "sixth"
  // (no digit), not "major sixth" — recognize the spelled-out word here too,
  // or "sixth" alone resolves to undefined instead of maj6.
  if (namesASixthChord) return "maj6";

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
