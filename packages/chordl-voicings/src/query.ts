import { ChordType, Interval, Note } from "tonal";
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
 * Chord spellings tonal's `ChordType` does not publish, mapped to their
 * intervals — never directly to a quality.
 *
 * This table exists so that *every* input reaches the same interval
 * classifier. Mapping a spelling straight to a quality is what produced the
 * long run of bugs this rewrite replaces: two aliases of one chord could
 * disagree, because nothing tied them to the notes they name.
 */
const EXTRA_TYPE_INTERVALS: Record<string, string[]> = {
  // Hand-built chords from chordl-core's `buildSpecialChord`. tonal cannot
  // parse these at all, so `resolveChord` names them itself.
  "7omit3": ["1P", "5P", "7m"],
  m7sus4: ["1P", "3m", "4P", "7m"],
  "m6/9": ["1P", "3m", "5P", "6M", "9M"],
  // Uppercase-M shorthand for the major extensions. tonal publishes "M7" and
  // "M6" but stops there, so M9/M11/M13 have to be spelled out. Case matters:
  // "m9" is a different chord and tonal already knows it.
  M9: ["1P", "3M", "5P", "7M", "9M"],
  M11: ["1P", "3M", "5P", "7M", "9M", "11P"],
  M13: ["1P", "3M", "5P", "7M", "9M", "13M"],
  // Major-seventh markers tonal lists in some forms but not these.
  "Δ7": ["1P", "3M", "5P", "7M"],
  ma9: ["1P", "3M", "5P", "7M", "9M"],
  // Half-diminished: tonal knows "ø" and "h7", but not "ø7".
  "ø7": ["1P", "3m", "5d", "7m"],
  // Power-chord spellings alongside tonal's own "5".
  no3: ["1P", "5P"],
  "no 3": ["1P", "5P"],
  // The added-eleventh triads have a quality here but no tonal type.
  add11: ["1P", "3M", "5P", "11P"],
  add4: ["1P", "3M", "5P", "11P"],
  madd11: ["1P", "3m", "5P", "11P"],
  madd4: ["1P", "3m", "5P", "11P"],
  // Spelled-out names tonal does not publish (it has "sixth", not "major
  // sixth"; "altered", not "altered dominant"; "eleventh", not "dominant
  // eleventh").
  "major sixth": ["1P", "3M", "5P", "6M"],
  "altered dominant": ["1P", "3M", "5A", "7m", "9A"],
  "dominant eleventh": ["1P", "5P", "7m", "9M", "11P"],
  alt: ["1P", "3M", "5A", "7m", "9A"],
};

/**
 * The chord's intervals reduced to one quality letter per scale degree, as the
 * chord spells them.
 *
 * Degree number is kept rather than semitones, because two of the decisions
 * below turn on it and semitones destroy both: a 4th and an 11th are the same
 * pitch class but a suspension and an extension (`9sus4` is 1P 4P 5P 7m 9M and
 * an 11th chord is 1P 5P 7m 9M 11P), and a diminished 7th and a major 6th are
 * both nine semitones but a seventh and a sixth.
 */
function degreesOf(intervals: string[]): Map<number, string> {
  const byDegree = new Map<number, string>();
  for (const raw of intervals) {
    const ivl = Interval.get(raw);
    if (ivl.empty || typeof ivl.num !== "number" || !ivl.q) continue;
    // First spelling of a degree wins; nothing in the vocabulary spells one
    // degree twice except 7b9#9, where either answer is altered.
    if (!byDegree.has(ivl.num)) byDegree.set(ivl.num, ivl.q);
  }
  return byDegree;
}

/**
 * Pick a voicing quality from a chord's intervals.
 *
 * This is the whole mechanism: the chord's own notes decide, so no two
 * spellings of one chord can disagree, and no quality's name can be found
 * inside another's.
 */
function classifyIntervals(intervals: string[]): VoicingQuality | undefined {
  const byDegree = degreesOf(intervals);
  const third = byDegree.get(3);
  const fifth = byDegree.get(5);
  const seventh = byDegree.get(7);
  const sixth = byDegree.get(6);
  const fourth = byDegree.get(4);
  const eleventh = byDegree.get(11);
  // A ninth is a ninth however it is spelled: tonal writes `m9b5` as
  // 1P 2M 3m 5d 7m, with the ninth as a second.
  const ninths = [byDegree.get(9), byDegree.get(2)].filter(Boolean);
  const hasNaturalNinth = ninths.includes("M");
  const hasAlteredNinth = ninths.some((q) => q === "m" || q === "A");
  const hasNaturalFifth = fifth === "P";

  // The power chord: root and fifth, and nothing else at all.
  const degrees = [...byDegree.keys()].filter((d) => d !== 1);
  if (degrees.length === 1 && hasNaturalFifth) return "5";

  // The altered dominant: a major third and a minor seventh over a fifth that
  // is raised, lowered or absent, with an altered ninth. Asked before the
  // seventh family below, which would otherwise answer every one of these
  // dom7. A natural fifth disqualifies it — `7b9` and `7#9` are ordinary
  // dominants with one altered tone, not altered chords.
  if (third === "M" && seventh === "m" && !hasNaturalFifth && hasAlteredNinth) {
    return "alt";
  }

  // The seventh chords. A seventh outranks a sixth: `7b6` (1P 3M 5P 6m 7m) and
  // `M13` both carry a sixth degree that is an extension, not the chord.
  if (seventh) {
    // A diminished seventh — nine semitones, but spelled as a seventh.
    if (seventh === "d") return "dim7";
    if (seventh === "M") {
      if (third === "m") return "mMaj7";
      if (third === "M") return fifth === "d" ? "maj7b5" : "maj7";
      // A suspended chord whose seventh is major. The sus4 voicings are
      // quartal stacks on a *minor* seventh, so answering one would sound a b7
      // against the chord's natural 7; there is no maj7sus4 quality to return.
      return undefined;
    }
    // A minor seventh.
    // A perfect fourth with no perfect fifth is a quartal chord, whatever
    // third it also carries: `m7sus4` (1P 3m 4P 7m) and `quartal` (1P 4P 7m
    // 10m) are both voiced by the sus4 stack [0, 5, 10], which sounds only
    // notes they contain. The min7 voicings would sound the natural fifth
    // these chords replace with a fourth.
    if (fourth === "P" && !hasNaturalFifth) return "sus4";
    if (third === "m") return fifth === "d" ? "m7b5" : "min7";
    if (third === "M") return "dom7";
    // No third. A fourth is a suspension; an eleventh is the 11th chord
    // (1P 5P 7m 9M 11P), which is a dominant that happens to omit its third.
    if (fourth) return "sus4";
    return "dom7";
  }

  // No seventh. A natural sixth makes it a sixth chord; a minor sixth is a
  // flattened thirteenth and does not.
  if (sixth === "M") {
    if (third === "m") return hasNaturalNinth ? "m6/9" : "min6";
    if (third === "M") return hasNaturalNinth ? "6/9" : "maj6";
    return undefined;
  }

  // No seventh and no sixth. Without a third the chord is suspended — the
  // fourth first, so `sus2sus4` (which really does carry a P4) reads as sus4.
  if (!third) {
    if (fourth) return "sus4";
    if (byDegree.get(2) === "M") return "sus2";
    return undefined;
  }

  // A triad, possibly with an added tone. An altered fifth or an altered added
  // tone makes it a different chord that the plain add voicings contradict, so
  // no quality is returned for those.
  if (fifth === "d" || fifth === "A") return undefined;
  if (hasAlteredNinth) return undefined;
  if (hasNaturalNinth) return third === "m" ? "madd9" : "add9";
  if (fourth === "P" || eleventh === "P") return third === "m" ? "madd11" : "add11";
  // A plain major or minor triad. It has no seventh to voice.
  return undefined;
}

/**
 * Intervals a caller supplied, if they really are intervals.
 *
 * The second parameter used to be the chord's *notes* and was never read; all
 * three call sites in this monorepo passed them. Note names never parse as
 * intervals (`Interval.get("C").empty` is true), so notes are ignored here and
 * such a caller falls through to the chord-type name exactly as before.
 */
function suppliedIntervals(values?: string[]): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  return values.every((v) => !Interval.get(v).empty) ? values : undefined;
}

/**
 * Intervals for a chord *type name*, via tonal.
 *
 * tonal resolves all 249 of its own type names and aliases here, case
 * sensitively — `Madd9` and `madd9` are different chords and it knows it.
 * Everything it does not know is in EXTRA_TYPE_INTERVALS above.
 */
function intervalsForTypeName(chordType: string): string[] | undefined {
  const name = chordType.trim();
  if (!name) return undefined;
  // chordl-core's resolveWithFallback labels its result "<type> (extended)".
  const base = name.replace(/\s*\(extended\)$/, "");
  const byType = ChordType.get(base);
  if (!byType.empty) return byType.intervals;
  return EXTRA_TYPE_INTERVALS[base];
}

/**
 * Map a chord to the voicing quality that speaks for it.
 *
 * Classification is by **interval**, never by the shape of the chord's name.
 * Pattern-matching the name produced a long run of bugs over PRs #18 and
 * #31-#33, every one of them the same shape — one quality's name appearing
 * inside another's ("do-*min*-ant" reading as minor, "di*min*ished" as minor,
 * "major seventh flat *sixth*" as a sixth chord, `6#11` as an eleventh) — and
 * fixing each one exposed the next. Intervals cannot be misread that way:
 * `1P 3M 5P 9M` is unambiguous where "major seventh flat sixth" is not.
 *
 * It also made alias disagreement possible, and six chords in tonal's
 * vocabulary really did disagree with themselves: `mi7` answered dom7 while
 * `m7` answered min7, `7#5#9` answered dom7 while `7alt` answered alt, and
 * `Δ` answered nothing while `M7` answered maj7 — the same chords, the same
 * notes, different answers. Deciding from the intervals makes that
 * unrepresentable.
 *
 * @param chordType  A chord *type* name or alias (`resolved.type`). Used only
 *                   to look up intervals when none are supplied.
 * @param intervals  The chord's intervals (`resolved.intervals`). Preferred
 *                   when present. Notes are accepted and ignored, for callers
 *                   written against the old signature.
 */
export function mapToVoicingQuality(
  chordType: string,
  intervals?: string[]
): VoicingQuality | undefined {
  const resolved = suppliedIntervals(intervals) ?? intervalsForTypeName(chordType);
  if (!resolved) return undefined;
  return classifyIntervals(resolved);
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
