import type { Format, TextSize, ParsedChordRequest, NotesGroup } from "../types.js";
import { resolveChord } from "../resolver/chord-resolver.js";

// Filler runs in two passes, and the order is load-bearing.
//
// The articles "a"/"an" are also the note A, and by the time filler is stripped
// every modifier has already been cut out — so "A with note names" arrives as
// "A ", and so does "a compact". The residual cannot tell them apart, because
// the article's own noun is one of the things that was deleted.
//
// So the article pass decides on evidence the stripping cannot destroy: the
// character after it, the capital letter the user typed, and where the token
// sat in the original input. See `stripArticles`.
const FILLER_WORDS =
  /\b(show\s+me|draw|display|render|please|the|with|that|this|me|of)\b/gi;

const ARTICLE_RE = /\b(an?)\b/gi;

/** An article at the very end of the *original* input is the note A: "a", "an A". */
const ARTICLE_AT_INPUT_END = /\ban?(?=[#/]|\s*$)/i;

/**
 * Remove English articles without eating the note A.
 *
 * Three things say "this is the note, not an article", none of which an earlier
 * `.replace` can have invented:
 *
 *  - what follows is `#` or `/` — only a root can be ("A#dim", "A/C#");
 *  - the token is a capital `A`, which is how a chord is written and not how an
 *    article is ("A minor", "A with note names", "A in second inversion");
 *  - the article ends the original input ("a", "show me an A").
 *
 * Anything else is an article, including one left trailing because its noun was
 * stripped — "in a compact layout" must not resolve to the chord A.
 */
function stripArticles(text: string, input: string): string {
  const bareArticleAtEnd = ARTICLE_AT_INPUT_END.test(input);
  return text.replace(ARTICLE_RE, (token, _g, offset: number, whole: string) => {
    const rest = whole.slice(offset + token.length);
    if (/^[#/]/.test(rest)) return token;
    if (token === "A") return token;
    if (/^\s*$/.test(rest) && bareArticleAtEnd) return token;
    return "";
  });
}

const FORMAT_RE = /\b(compact|exact|full)\b/i;
const FORMAT_FULL_RE = /\bfull\s+(?:layout|height|size|keys?)\b/i;

// "size 80" / "size 80%" / "size 0.8" / "size xl" / "keys xl"
const SIZE_NUM_RE = /\b(?:size|keys?)\s+([\d.]+)\s*%?\b/i;
const SIZE_NAME_RE = /\b(?:size|keys?)\s+(sm|base|lg|xl|2xl)\b/i;
const SIZE_SCALE: Record<string, number> = {
  sm: 0.5,
  base: 0.7,
  lg: 0.85,
  xl: 1.0,
  "2xl": 1.2,
};

const INVERSION_WORD: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  root: 0,
};

const ALL_INVERSIONS_RE = /(?:(?:with\s+|show\s+)?all|every)\s+inversions?/i;
const INVERSION_NUM_RE = /(\d+)(?:st|nd|rd|th)\s+inversion/i;
const INVERSION_WORD_RE =
  /(first|second|third|fourth)\s+inversion/i;
const ROOT_POSITION_RE = /root\s+position/i;

const SPAN_RE =
  /spanning\s+([A-Ga-g][#b]?)\s+to\s+([A-Ga-g][#b]?)/i;

const STARTING_NOTE_RE =
  /start(?:s|ing)?\s+(?:on|from|at|around)\s+(?:the\s+)?([A-Ga-g][#b]?)/i;

// "starting on the 5th" or "starting on the 3rd"
const STARTING_DEGREE_RE =
  /start(?:s|ing)?\s+(?:on|from|at|around)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)/i;

// "with the 5th in the bottom/bass" or "with G in the bass"
const BASS_DEGREE_RE =
  /(?:with\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+(?:in\s+)?(?:the\s+)?(?:bottom|bass|lowest)/i;
const BASS_NOTE_RE =
  /(?:with\s+)?([A-Ga-g][#b]?)\s+(?:in\s+)?(?:the\s+)?(?:bottom|bass|lowest)/i;
// "C6/9 over D" or "Cmaj7 over E"
const OVER_BASS_NOTE_RE =
  /\bover\s+([A-Ga-g][#b]?)(?:\s|$)/i;

// "in the style of Bill Evans" / "like McCoy Tyner" / "bebop style"
const STYLE_RE =
  /(?:(?:in\s+)?(?:the\s+)?style\s+of\s+|like\s+|a\s+la\s+)([\w\s]+?)(?:\s*$|\s*,|\s+(?:starting|spanning|with|compact|exact))/i;
const STYLE_KEYWORD_RE =
  /\b(bebop|basie|nestico|ellington|modal|comping|rootless|quartal|block\s*chords?|locked\s*hands|drop\s*2\s*\+?\s*4|drop\s*2|upper\s*structure|shell|stride|spread|4[- ]?note\s*closed)\b/i;

// "with 2 notes on either side" / "with 3 keys on each side"
const PADDING_RE =
  /(?:with\s+)?(\d+)\s+(?:notes?|keys?)\s+(?:on\s+)?(?:either|each|both)\s+side/i;

// "chord down an octave" / "chord up 2 octaves" / "with the chord an octave lower"
const CHORD_OCTAVE_RE =
  /(?:with\s+)?(?:the\s+)?chord\s+(?:(?:(down|up|lower|higher)\s+)?(?:(\d+)\s+)?(?:an?\s+)?octaves?(?:\s+(down|up|lower|higher))?)/i;

// "bass note up an octave" / "with the bass up 2 octaves" / "bass down an octave"
const BASS_OCTAVE_RE =
  /(?:with\s+)?(?:the\s+)?bass(?:\s+note)?\s+(?:(?:(down|up|lower|higher)\s+)?(?:(\d+)\s+)?(?:an?\s+)?octaves?(?:\s+(down|up|lower|higher))?)/i;

// "with note names" / "note names in xl" / "name the notes" / "xl note names"
const NOTE_NAMES_RE =
  /(?:(?:with\s+)?(?:show\s+)?(?:(base|lg|xl|2xl)\s+)?note\s*names?(?:\s+(?:in\s+)?(base|lg|xl|2xl))?|name\s+the\s+notes(?:\s+(?:in\s+)?(base|lg|xl|2xl))?)/i;

// "midi note names" / "with midi names" / "show midi note names in xl"
const MIDI_NAMES_RE =
  /(?:(?:with\s+)?(?:show\s+)?midi\s+(?:(base|lg|xl|2xl)\s+)?(?:note\s*)?names?(?:\s+(?:in\s+)?(base|lg|xl|2xl))?)/i;

// "fingering 1 2 3 5" / "with fingering 1-3-5 in lg" / "fingering 1 x 3 5"
// Negative lookahead prevents matching "2xl" as a finger number
const FINGERING_RE =
  /(?:with\s+)?finger(?:ing|s)?\s+([\dxX\-](?:[,\s\-]*[\dxX\-])+)(?!\s*xl)(?:\s+(?:in\s+)?(base|lg|xl|2xl))?/i;

/** Valid fingering values: digits 0–5 plus extra symbols. Anything else → "?" */
const VALID_FINGERING = new Set(["0", "1", "2", "3", "4", "5", "-", "x"]);

// "custom fingering "A0,A1,A2"" / "fingering "G3-G0-E1"" / "fingering xl "1-2-3"" / "fingering "1-2-3" 2xl"
// Quoted strings after "fingering" or "custom fingering" are treated as free-form labels.
const CUSTOM_FINGERING_RE =
  /(?:with\s+)?(?:custom\s+)?finger(?:ing|s)?\s+(?:(?:in\s+)?(base|lg|xl|2xl)\s+)?["“”']([^"“”']+)["“”'](?:\s+(?:in\s+)?(base|lg|xl|2xl))?/i;

// "with fingerings" / "show fingering" / "with fingering in xl" / "fingering 2xl" (no explicit numbers → auto)
// Negative lookahead: don't match when followed by digits (explicit fingering like "1 2 3 5")
const AUTO_FINGERING_RE =
  /(?:with\s+)?(?:show\s+)?finger(?:ings?|s)?(?:\s+(?:in\s+)?(base|lg|xl|2xl)|\s+(base|lg|xl|2xl))?(?!\s+\d)(?:\s|$)/i;

const VALID_TEXT_SIZES = new Set<string>(["base", "lg", "xl", "2xl"]);
function toTextSize(s: string | undefined): TextSize | undefined {
  if (!s) return undefined;
  const lower = s.toLowerCase();
  return VALID_TEXT_SIZES.has(lower) ? (lower as TextSize) : undefined;
}

// Scale types that are unambiguous (never collide with chord names)
const UNAMBIGUOUS_SCALE_TYPES = [
  "dorian", "mixolydian", "phrygian", "lydian", "locrian",
  "harmonic\\s+minor", "minor\\s+harmonic", "melodic\\s+minor", "minor\\s+melodic", "natural\\s+minor",
  "major\\s+pentatonic", "minor\\s+pentatonic", "pentatonic",
  "blues", "whole\\s+tone", "bebop", "diminished",
];

// Scale patterns: "D major scale", "C blues", "A dorian", "Dm harmonic minor".
// For "major"/"minor" alone, require the trailing word "scale" to avoid chord collision.
//
// The root must not be preceded by a letter, or the trailing "c" of
// "harmonic"/"melodic" is read as a root note and "dm harmonic minor" resolves
// to C minor. An optional chord-quality marker may sit between the root and the
// scale type, so shorthand roots ("dm", "f#m", "dmaj") work the same as bare
// ones — the named scale type wins, the marker is only there to be absorbed.
const ROOT = "(?<![A-Za-z#b])([A-Ga-g][#b]?)";
const QUALITY_MARKER = "(?:\\s*(?:maj|min|m|M)\\b)?";
const SCALE_UNAMBIGUOUS_RE = new RegExp(
  `${ROOT}${QUALITY_MARKER}\\s+(${UNAMBIGUOUS_SCALE_TYPES.join("|")})(?:\\s+scale)?`,
  "i",
);
const SCALE_EXPLICIT_RE = new RegExp(
  `${ROOT}${QUALITY_MARKER}\\s+(major|minor)\\s+scale`,
  "i",
);

// Chord-shorthand scales: "dm scale", "d maj scale", "dmaj scale", "d scale".
// Only the major/minor markers — anything richer stays a chord. The word
// "scale" is required, so a bare "Dm" is still a chord.
// The quality marker is matched case-insensitively but read case-sensitively,
// since "M" means major and "m" means minor.
const SCALE_SHORTHAND_RE =
  /(?<![A-Za-z#b])([A-Ga-g][#b]?)\s*(major|maj|minor|min|M|m)?\s+scale\b/i;

/** Resolve a shorthand quality marker to a scale type. Absent marker = major. */
function shorthandScaleType(marker: string | undefined): "major" | "minor" {
  if (!marker) return "major";
  if (marker === "M") return "major";
  if (marker === "m") return "minor";
  return marker.toLowerCase().startsWith("min") ? "minor" : "major";
}

// "ascending" / "descending" for melodic minor
const DIRECTION_RE = /\b(ascending|descending)\b/i;

// "in N octaves" / "N octaves" — works for both scales and arpeggios
const OCTAVES_RE = /\b(?:in\s+)?(\d+)\s+octaves?\b/i;

// "degrees" anywhere — combined with note names if present, standalone otherwise.
// The literal word "degree(s)" isn't used by any other parser rule
// (bass-degree / starting-degree use "5th", "9th", etc.), so a broad match is safe.
const DEGREES_KEYWORD_RE = /\bdegrees?(?:\s+(?:in\s+)?(base|lg|xl|2xl))?\b/i;

// "with heading" / "with a heading" / "show heading"
const HEADING_RE = /\b(?:with\s+)?(?:a\s+)?(?:show\s+)?heading\b/i;

// All recognized hand/clef phrases — long forms before shorthand to ensure
// the longest alternative is matched first under JS regex alternation.
const HAND_CLEF_PATTERN =
  "left\\s+hand|right\\s+hand|bottom\\s+hand|top\\s+hand|bass\\s+clef|treble\\s+clef|l\\.?h\\.?|r\\.?h\\.?|lh|rh|left|right|bottom|top|bass|treble";

// 2+ note tokens separated by spaces/commas/dashes; "and" allowed between tokens.
// Single-letter notes (A-G) plus optional accidental (#/b) and optional single-digit octave.
const NOTE_LIST_PATTERN =
  "[A-Ga-g][#b]?\\d?(?:[\\s,\\-]+(?:and\\s+)?[A-Ga-g][#b]?\\d?)+";

// After the explicit "notes" keyword, a token may be a run-together sequence
// of notes with no separators ("cdefgabc", "EbGbBb", "E4G4C5"). The trailing
// lookahead stops the run at any non-note word ("and", "in", "with", ...)
// while still allowing a run to end in an accidental ("C#").
const NOTE_RUN_PATTERN = "(?:[A-Ga-g][#b]?\\d?)+(?![A-Za-z0-9])";

// "with notes C E G" / "notes E4 G4 C5" / "notes cdefgabc" — optional
// trailing "in <hand|clef>".
const NOTES_GROUP_RE = new RegExp(
  `(?:with\\s+|and\\s+)?notes\\s+(${NOTE_RUN_PATTERN}(?:[\\s,\\-]+${NOTE_RUN_PATTERN})*)(?:\\s+in\\s+(?:the\\s+)?(${HAND_CLEF_PATTERN}))?`,
  "gi",
);

// "notes in lh Eb Gb Bb" / "notes in the right hand D F A" — prefix form.
const NOTES_GROUP_PREFIX_RE = new RegExp(
  `(?:with\\s+|and\\s+)?notes\\s+in\\s+(?:the\\s+)?(${HAND_CLEF_PATTERN})\\s+(${NOTE_RUN_PATTERN}(?:[\\s,\\-]+${NOTE_RUN_PATTERN})*)`,
  "gi",
);

// "lh Eb Gb Bb" / "lh: Eb Gb Bb" / "left Eb Gb Bb" / "bass clef C E G"
// Hand keyword first, no "notes" word. Optional colon between hand and notes.
const HAND_PREFIX_BARE_RE = new RegExp(
  `\\b(${HAND_CLEF_PATTERN})\\s*(?::\\s*|\\s+)(${NOTE_LIST_PATTERN})`,
  "gi",
);

// "Eb Gb Bb in lh" / "Eb Gb Bb lh" / "(Eb Gb Bb) lh" — notes first, hand after.
// "in" is optional. Surrounding parens optional. Requires 2+ notes to avoid
// swallowing chord symbols like "G7 in lh".
const NOTES_BARE_HAND_RE = new RegExp(
  `\\(?\\b(${NOTE_LIST_PATTERN})\\b\\)?\\s*(?:in\\s+(?:the\\s+)?)?(${HAND_CLEF_PATTERN})\\b`,
  "gi",
);

// Single bare note + hand variants. Restricted to [A-G][#b]? with no octave
// digit and no chord-quality suffix — that way "G7 in lh" / "Bb7 in lh" stay
// chord symbols (no \b between letter and digit), but "Bb in lh" works.
const SINGLE_NOTE_PATTERN = "[A-Ga-g][#b]?";

// "lh Bb" / "lh: Bb" / "left Bb" / "bass clef C" — hand keyword + single note.
// Lookahead requires the note to be followed by whitespace, comma, semicolon,
// or end-of-string so "lh G7" doesn't absorb G as a note.
const HAND_PREFIX_SINGLE_RE = new RegExp(
  `\\b(${HAND_CLEF_PATTERN})\\s*(?::\\s*|\\s+)(${SINGLE_NOTE_PATTERN})(?=[\\s,;]|$)`,
  "gi",
);

// "Bb in lh" / "Bb lh" / "(Bb) lh" — single bare note + hand.
const NOTE_BARE_HAND_SINGLE_RE = new RegExp(
  `\\(?\\b(${SINGLE_NOTE_PATTERN})\\b\\)?\\s*(?:in\\s+(?:the\\s+)?)?(${HAND_CLEF_PATTERN})\\b`,
  "gi",
);

// A chord symbol following a hand keyword: "rh Cmaj7", "lh: Bbm7b5",
// "left hand Am", "bass clef G7/B". Deliberately permissive — the token is
// validated by actually resolving it as a chord, so junk never becomes a group.
const CHORD_TOKEN_PATTERN = "[A-Ga-g][#b]?[A-Za-z0-9#b\\u00b0\\u00f8+\\-/]*";

// "rh Cmaj7 lh Dm7" — hand keyword + chord symbol(s). The trailing group
// captures any further chord tokens so "rh Cmaj7 Dm7" can drop the second one:
// only the first chord after a hand keyword is used.
const HAND_PREFIX_CHORD_RE = new RegExp(
  `\\b(${HAND_CLEF_PATTERN})\\s*(?::\\s*|\\s+)(${CHORD_TOKEN_PATTERN})((?:\\s+${CHORD_TOKEN_PATTERN})*)`,
  "gi",
);

// A plain pitch class ("C", "Eb") — the single-note pass already claims those.
// Tokens carrying a digit ("G7", "C9") read as chords here, matching how
// "G7 in lh" / "Bb7 in lh" are treated elsewhere in this parser; an
// octave-qualified note needs the explicit "notes" keyword ("notes G7 in lh").
const BARE_NOTE_TOKEN_RE = /^[A-Ga-g][#b]?$/;

/**
 * Resolve a token as a chord symbol, or undefined when it isn't one.
 * Bare pitches are rejected so "lh Bb" stays a single-note assignment.
 */
function chordTokenNotes(token: string): string[] | undefined {
  if (BARE_NOTE_TOKEN_RE.test(token)) return undefined;
  try {
    const { notes } = resolveChord(token);
    return notes.length > 0 ? notes : undefined;
  } catch {
    return undefined;
  }
}

// "Eb Gb Bb // Db Eb F Gb" — polychord-style "top over bottom" (rh then lh).
const POLYCHORD_SLASH_RE = new RegExp(
  `(${NOTE_LIST_PATTERN})\\s*\\/\\/\\s*(${NOTE_LIST_PATTERN})`,
  "gi",
);

// "Eb Gb Bb; Db Eb F Gb" — semicolon separator; reading order (lh then rh).
const SEMI_SEP_RE = new RegExp(
  `(${NOTE_LIST_PATTERN})\\s*;\\s*(${NOTE_LIST_PATTERN})`,
  "gi",
);

/** Normalize a captured hand/clef phrase to (hand, clef) tuple. */
function parseHandOrClef(raw: string | undefined): { hand?: "lh" | "rh"; clef?: "bass" | "treble" } {
  if (!raw) return {};
  const h = raw.toLowerCase().replace(/[\s.:]/g, "");
  if (h === "bassclef" || h === "bass") return { clef: "bass", hand: "lh" };
  if (h === "trebleclef" || h === "treble") return { clef: "treble", hand: "rh" };
  if (h === "lefthand" || h === "bottomhand" || h === "lh" || h === "left" || h === "bottom") return { hand: "lh" };
  if (h === "righthand" || h === "tophand" || h === "rh" || h === "right" || h === "top") return { hand: "rh" };
  return {};
}

// "boomwhacker" / "with boomwhacker theme" / "crf theme" / "rainbow"
const THEME_RE = /\b(?:(?:with\s+)?(?:the\s+)?)?(?:(boomwhacker|boomwhackers|crf|rainbow)\s*(?:theme|colors?|colours?)?)\b/i;
const THEME_MAP: Record<string, string> = {
  boomwhacker: "boomwhacker",
  boomwhackers: "boomwhacker",
  crf: "crf",
  rainbow: "crf",
};

// Quality word mapping for descriptive chord names
const QUALITY_WORDS: Record<string, string> = {
  major: "",
  minor: "m",
  diminished: "dim",
  augmented: "aug",
  dominant: "dom",
  suspended: "sus",
  triad: "",
  seventh: "7",
  ninth: "9",
  eleventh: "11",
  thirteenth: "13",
};

// Slash-bass is captured as its own group (any note letter, not just B) rather
// than folded into the quality-suffix class — the old catch-all `[0-9#b/]+`
// let '/' bleed into the flat-symbol 'b', so only B/Bb bass notes round-tripped.
// `\/[0-9]+` stays in the quality group so "6/9"-style suffixes (slash
// followed by digits, not a bass letter) aren't mistaken for a slash bass.
const CHORD_RE =
  /([A-Ga-g][#b]?)\s*(maj|min|m|aug|dim|sus|add|dom|M|°|ø|\/[0-9]+|[0-9#b]+)*(\/[A-Ga-g][#b]?)?/i;

function capitalizeNote(note: string): string {
  return note.charAt(0).toUpperCase() + note.slice(1);
}

/**
 * Extract modifiers first (format, inversion, bass, style, etc.) using
 * dedicated regexes, then strip ALL matched patterns plus filler words
 * from the input. Whatever remains is treated as the chord symbol.
 * This "strip everything known, keep the residual" approach avoids needing
 * a single monolithic chord regex that accounts for all possible contexts.
 */
export function parseChordDescription(input: string): ParsedChordRequest {
  const result: ParsedChordRequest = { chordName: "" };

  // Extract format ("compact", "exact", "full", "full layout", "full height")
  const formatFullMatch = input.match(FORMAT_FULL_RE);
  const formatMatch = input.match(FORMAT_RE);
  if (formatFullMatch) {
    result.format = "exact";
  } else if (formatMatch) {
    const f = formatMatch[1].toLowerCase();
    result.format = (f === "full" ? "exact" : f) as Format;
  }

  // Extract display scale ("size 80", "size 80%", "size 0.8", "size xl", "keys lg")
  const sizeNameMatch = input.match(SIZE_NAME_RE);
  const sizeNumMatch = input.match(SIZE_NUM_RE);
  if (sizeNameMatch) {
    result.scale = SIZE_SCALE[sizeNameMatch[1].toLowerCase()];
  } else if (sizeNumMatch) {
    const v = parseFloat(sizeNumMatch[1]);
    result.scale = v > 10 ? v / 100 : v; // "80" → 0.8, "0.8" → 0.8
  }

  // Extract inversion
  const allInvMatch = input.match(ALL_INVERSIONS_RE);
  const numInvMatch = input.match(INVERSION_NUM_RE);
  const wordInvMatch = input.match(INVERSION_WORD_RE);
  const rootMatch = input.match(ROOT_POSITION_RE);

  if (allInvMatch) {
    result.allInversions = true;
  } else if (numInvMatch) {
    result.inversion = parseInt(numInvMatch[1], 10);
  } else if (wordInvMatch) {
    result.inversion = INVERSION_WORD[wordInvMatch[1].toLowerCase()];
  } else if (rootMatch) {
    result.inversion = 0;
  }

  // Extract span
  const spanMatch = input.match(SPAN_RE);
  if (spanMatch) {
    result.spanFrom = capitalizeNote(spanMatch[1]);
    result.spanTo = capitalizeNote(spanMatch[2]);
  }

  // Extract padding ("with 2 notes on either side")
  const paddingMatch = input.match(PADDING_RE);
  if (paddingMatch) {
    result.padding = parseInt(paddingMatch[1], 10);
  }

  // Extract chord octave shift ("chord down an octave" / "chord up 2 octaves")
  const chordOctaveMatch = input.match(CHORD_OCTAVE_RE);
  if (chordOctaveMatch) {
    const direction = (chordOctaveMatch[1] || chordOctaveMatch[3] || "").toLowerCase();
    const count = chordOctaveMatch[2] ? parseInt(chordOctaveMatch[2], 10) : 1;
    const isDown = direction === "down" || direction === "lower";
    result.chordOctaveShift = isDown ? -count : count;
  }

  // Extract bass octave shift ("bass note up an octave" / "bass down 2 octaves")
  const bassOctaveMatch = input.match(BASS_OCTAVE_RE);
  if (bassOctaveMatch) {
    const direction = (bassOctaveMatch[1] || bassOctaveMatch[3] || "").toLowerCase();
    const count = bassOctaveMatch[2] ? parseInt(bassOctaveMatch[2], 10) : 1;
    const isDown = direction === "down" || direction === "lower";
    result.bassOctaveShift = isDown ? -count : count;
  }

  // Extract "midi note names" / "with midi names" (check before regular note names)
  const midiNamesMatch = input.match(MIDI_NAMES_RE);
  if (midiNamesMatch) {
    result.showNoteNames = true;
    result.noteNameMode = "midi";
    result.noteNameSize = toTextSize(midiNamesMatch[1]) ?? toTextSize(midiNamesMatch[2]);
  }

  // Extract "with note names" / "note names in xl" / "xl note names"
  if (!midiNamesMatch) {
    const noteNamesMatch = input.match(NOTE_NAMES_RE);
    if (noteNamesMatch) {
      result.showNoteNames = true;
      // Size can be in group 1 (before "note names"), 2 (after), or 3 ("name the notes in xl")
      result.noteNameSize = toTextSize(noteNamesMatch[1]) ?? toTextSize(noteNamesMatch[2]) ?? toTextSize(noteNamesMatch[3]);
    }
  }

  // Fallback: bare "midi" in the input implies MIDI note names
  if (!result.showNoteNames && /\bmidi\b/i.test(input)) {
    result.showNoteNames = true;
    result.noteNameMode = "midi";
  }

  // Check custom fingering FIRST ("custom fingering A0,A1,A2")
  const customFingerMatch = input.match(CUSTOM_FINGERING_RE);
  if (customFingerMatch) {
    // Comma-separated lists split ONLY on commas/spaces so "-" placeholders
    // survive as positional blanks ("1,-,3"); dash-separated lists keep the
    // documented "D2-D1-D0-D1" behavior.
    const raw = customFingerMatch[2];
    result.customFingering = (raw.includes(",")
      ? raw.split(/[,\s]+/)
      : raw.split(/[\-\s]+/)
    ).filter(Boolean);
    result.fingeringSize = toTextSize(customFingerMatch[1]) ?? toTextSize(customFingerMatch[3]);
  }

  // Check auto fingering ("with fingering", "fingering 2xl", "fingering in xl")
  // so that size keywords like "2xl" aren't grabbed as explicit finger numbers.
  if (!result.customFingering) {
  const autoFingerMatch = input.match(AUTO_FINGERING_RE);
  if (autoFingerMatch) {
    result.autoFingering = true;
    result.fingeringSize = toTextSize(autoFingerMatch[1]) ?? toTextSize(autoFingerMatch[2]);
  }

  // Then check for explicit fingering numbers ("fingering 1 2 3 5 in lg")
  // only if auto-fingering didn't match
  if (!result.autoFingering) {
    const fingeringMatch = input.match(FINGERING_RE);
    if (fingeringMatch) {
      const tokens: string[] = [];
      for (const part of fingeringMatch[1].split(/[\s,]+/)) {
        if (part === "-" || part === "x" || part === "X") {
          tokens.push(part);
        } else if (part.includes("-")) {
          tokens.push(...part.split("-").filter((s) => s.length > 0));
        } else {
          tokens.push(part);
        }
      }
      result.fingering = tokens.map((s) => {
        const lower = s.toLowerCase();
        if (!VALID_FINGERING.has(lower)) return "?";
        const num = parseInt(lower, 10);
        return isNaN(num) ? lower : num;
      });
      result.fingeringSize = toTextSize(fingeringMatch[2]);
    }
  }
  } // end if (!result.customFingering)

  // Extract bass note or degree ("with the 5th in the bottom" / "over D")
  const bassDegreeMatch = input.match(BASS_DEGREE_RE);
  const bassNoteMatch = input.match(BASS_NOTE_RE);
  const overBassMatch = input.match(OVER_BASS_NOTE_RE);
  if (bassDegreeMatch) {
    result.bassDegree = parseInt(bassDegreeMatch[1], 10);
  } else if (bassNoteMatch) {
    result.bassNote = capitalizeNote(bassNoteMatch[1]);
  } else if (overBassMatch) {
    result.bassNote = capitalizeNote(overBassMatch[1]);
  }

  // Extract style hint
  const styleMatch = input.match(STYLE_RE);
  const styleKeywordMatch = input.match(STYLE_KEYWORD_RE);
  if (styleMatch) {
    result.styleHint = styleMatch[1].trim();
  } else if (styleKeywordMatch) {
    result.styleHint = styleKeywordMatch[1].trim();
  }

  // Extract heading flag
  if (HEADING_RE.test(input)) {
    result.showHeading = true;
  }

  // Extract explicit notes group(s) — supports one or more "with notes ... [in <hand/clef>]"
  // segments separated by "and" / "with". Paired example:
  //   "notes C E G in bass clef and notes B D F in treble clef"
  const groups: NotesGroup[] = [];

  // Explode a run-together token ("cdefgabc", "EbGbBb", "E4G4C5") into
  // individual notes. In runs, a lowercase 'b' binds as a flat only after
  // an UPPERCASE letter ("EbGbBb") — in lowercase runs like "cdefgabc"
  // every letter is its own note, so 'b' stays the note B.
  const explodeNoteRun = (token: string): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < token.length) {
      const letter = token[i];
      if (!/[A-Ga-g]/.test(letter)) return [token]; // not a pure note run
      i++;
      let accidental = "";
      if (token[i] === "#") {
        accidental = "#";
        i++;
      } else if (token[i] === "b" && letter === letter.toUpperCase()) {
        accidental = "b";
        i++;
      }
      let octave = "";
      if (/\d/.test(token[i] ?? "")) {
        octave = token[i];
        i++;
      }
      out.push(letter.toUpperCase() + accidental + octave);
    }
    return out;
  };

  const normalizeTokens = (raw: string): string[] =>
    raw
      .split(/[\s,\-]+/)
      .filter(Boolean)
      .flatMap((t) => {
        // Single-note tokens keep their exact old handling ("eb5" → Eb5,
        // "bb" → Bb) — run explosion applies only to longer sequences.
        const nm = t.match(/^([A-Ga-g])([#b])?(\d)?$/);
        if (nm) return [nm[1].toUpperCase() + (nm[2] ?? "") + (nm[3] ?? "")];
        return explodeNoteRun(t);
      });

  // Note-group extraction runs in priority order. Each pass strips its matches
  // from `residual` so later (looser) passes can't re-consume the same notes.
  let residual = input;
  // Hand-prefixed chord phrases actually consumed by pass 4d, so the chord-name
  // pass below strips exactly those (and not look-alikes it rejected).
  const handChordMatches: string[] = [];
  const stripFromResidual = (match: string) => {
    residual = residual.replace(match, " ");
  };
  const pushGroup = (
    tokens: string[],
    hand?: "lh" | "rh",
    clef?: "bass" | "treble",
    chord?: string,
  ) => {
    const g: NotesGroup = { notes: tokens };
    if (hand) g.hand = hand;
    if (clef) g.clef = clef;
    if (chord) g.chord = chord;
    groups.push(g);
  };

  // 1. "notes in <hand> <notes>" (prefix with explicit "notes" keyword)
  NOTES_GROUP_PREFIX_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(NOTES_GROUP_PREFIX_RE)]) {
    const tokens = normalizeTokens(m[2]);
    if (tokens.length === 0) continue;
    const { hand, clef } = parseHandOrClef(m[1]);
    pushGroup(tokens, hand, clef);
    stripFromResidual(m[0]);
  }

  // 2. "notes <notes> [in <hand>]" (suffix with explicit "notes" keyword)
  NOTES_GROUP_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(NOTES_GROUP_RE)]) {
    const tokens = normalizeTokens(m[1]);
    if (tokens.length === 0) continue;
    const { hand, clef } = parseHandOrClef(m[2]);
    pushGroup(tokens, hand, clef);
    stripFromResidual(m[0]);
  }

  // 3. "lh Eb Gb Bb" / "lh: Eb Gb Bb" / "left Eb Gb Bb" / "bass clef C E G"
  //    Hand keyword first, no "notes" word required.
  HAND_PREFIX_BARE_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(HAND_PREFIX_BARE_RE)]) {
    const tokens = normalizeTokens(m[2].replace(/\band\b/gi, " "));
    if (tokens.length < 2) continue;
    const { hand, clef } = parseHandOrClef(m[1]);
    if (!hand && !clef) continue;
    pushGroup(tokens, hand, clef);
    stripFromResidual(m[0]);
  }

  // 4. "Eb Gb Bb in lh" / "Eb Gb Bb lh" / "(Eb Gb Bb) lh" — bare notes + hand.
  NOTES_BARE_HAND_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(NOTES_BARE_HAND_RE)]) {
    const tokens = normalizeTokens(m[1].replace(/\band\b/gi, " "));
    if (tokens.length < 2) continue;
    const { hand, clef } = parseHandOrClef(m[2]);
    if (!hand && !clef) continue;
    pushGroup(tokens, hand, clef);
    stripFromResidual(m[0]);
  }

  // 4b. "lh Bb" / "lh: Bb" / "left Bb" — single bare note after hand keyword.
  // Runs AFTER the multi-note passes so a 3-note group is preferred where
  // both could match. Anything left here is a genuine single-note assignment.
  HAND_PREFIX_SINGLE_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(HAND_PREFIX_SINGLE_RE)]) {
    const tokens = normalizeTokens(m[2]);
    if (tokens.length === 0) continue;
    const { hand, clef } = parseHandOrClef(m[1]);
    if (!hand && !clef) continue;
    pushGroup(tokens, hand, clef);
    stripFromResidual(m[0]);
  }

  // 4c. "Bb in lh" / "Bb lh" / "(Bb) lh" — single bare note before hand keyword.
  NOTE_BARE_HAND_SINGLE_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(NOTE_BARE_HAND_SINGLE_RE)]) {
    const tokens = normalizeTokens(m[1]);
    if (tokens.length === 0) continue;
    const { hand, clef } = parseHandOrClef(m[2]);
    if (!hand && !clef) continue;
    pushGroup(tokens, hand, clef);
    stripFromResidual(m[0]);
  }

  // 4d. "rh Cmaj7 lh Dm7" — hand keyword + chord symbol. Runs after every
  // bare-note pass so note lists still win; whatever is left here is a chord.
  // Only the first chord after a hand keyword is used — trailing chords are
  // dropped (and removed from the residual so they don't become the chord name).
  HAND_PREFIX_CHORD_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(HAND_PREFIX_CHORD_RE)]) {
    const { hand, clef } = parseHandOrClef(m[1]);
    if (!hand && !clef) continue;
    const notes = chordTokenNotes(m[2]);
    if (!notes) continue;
    pushGroup(notes, hand, clef, m[2]);

    // Drop the run of extra chord tokens that directly follows, stopping at
    // the first token that isn't a chord so unrelated text survives.
    let extras = m[3] ?? "";
    while (extras.length > 0) {
      const next = extras.match(/^\s+(\S+)/);
      if (!next || !chordTokenNotes(next[1])) break;
      extras = extras.slice(next[0].length);
    }
    const consumed = m[0].slice(0, m[0].length - extras.length);
    handChordMatches.push(consumed);
    stripFromResidual(consumed);
  }

  // 5. "Eb Gb Bb // Db Eb F Gb" — polychord-style "top over bottom" (rh, lh).
  POLYCHORD_SLASH_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(POLYCHORD_SLASH_RE)]) {
    const top = normalizeTokens(m[1].replace(/\band\b/gi, " "));
    const bottom = normalizeTokens(m[2].replace(/\band\b/gi, " "));
    if (top.length < 2 || bottom.length < 2) continue;
    pushGroup(top, "rh");
    pushGroup(bottom, "lh");
    stripFromResidual(m[0]);
  }

  // 6. "Eb Gb Bb; Db Eb F Gb" — semicolon separator; reading order (lh, rh).
  SEMI_SEP_RE.lastIndex = 0;
  for (const m of [...residual.matchAll(SEMI_SEP_RE)]) {
    const first = normalizeTokens(m[1].replace(/\band\b/gi, " "));
    const second = normalizeTokens(m[2].replace(/\band\b/gi, " "));
    if (first.length < 2 || second.length < 2) continue;
    pushGroup(first, "lh");
    pushGroup(second, "rh");
    stripFromResidual(m[0]);
  }
  if (groups.length > 0) {
    result.notesGroups = groups;
  }

  // Extract color theme
  const themeMatch = input.match(THEME_RE);
  if (themeMatch) {
    result.colorTheme = THEME_MAP[themeMatch[1].toLowerCase()] ?? themeMatch[1].toLowerCase();
  }

  // Degrees keyword is independent — combines with note names if already detected,
  // otherwise stands alone as degree-only mode. Skipped if MIDI names are active
  // since "midi+degree" isn't a supported display mode.
  const degMatch = input.match(DEGREES_KEYWORD_RE);
  if (degMatch && result.noteNameMode !== "midi") {
    if (result.showNoteNames) {
      result.noteNameMode = "pitch-class+degree";
    } else {
      result.showNoteNames = true;
      result.noteNameMode = "degree";
    }
    const sz = toTextSize(degMatch[1]);
    if (sz) result.noteNameSize = sz;
  }

  // Extract scale direction
  const dirMatch = input.match(DIRECTION_RE);
  if (dirMatch) {
    result.scaleDirection = dirMatch[1].toLowerCase() as "ascending" | "descending";
  }

  // Extract octave count (used by both scales and arpeggios)
  const octavesMatch = input.match(OCTAVES_RE);
  const octaveCount = octavesMatch ? parseInt(octavesMatch[1], 10) : undefined;

  // Detect scales — check BEFORE chord extraction. Spelled-out forms first,
  // then chord shorthand ("dm scale"), so "d minor scale" keeps its own path.
  const scaleUnambig = input.match(SCALE_UNAMBIGUOUS_RE);
  const scaleExplicit = input.match(SCALE_EXPLICIT_RE);
  const scaleMatch = scaleUnambig || scaleExplicit;
  const scaleShorthand = scaleMatch ? null : input.match(SCALE_SHORTHAND_RE);

  if (scaleMatch) {
    const scaleRoot = capitalizeNote(scaleMatch[1]);
    const scaleType = scaleMatch[2].toLowerCase().replace(/\s+/g, " ").trim();
    result.isScale = true;
    result.scaleName = `${scaleRoot} ${scaleType}`;
    result.scaleOctaves = octaveCount ?? 1;
  } else if (scaleShorthand) {
    const scaleRoot = capitalizeNote(scaleShorthand[1]);
    result.isScale = true;
    result.scaleName = `${scaleRoot} ${shorthandScaleType(scaleShorthand[2])}`;
    result.scaleOctaves = octaveCount ?? 1;
  } else if (octaveCount) {
    // Not a scale but has "N octaves" → arpeggio mode for chord
    result.chordOctaves = octaveCount;
  }

  // Extract starting note or degree
  const startDegreeMatch = input.match(STARTING_DEGREE_RE);
  const startMatch = input.match(STARTING_NOTE_RE);
  if (startDegreeMatch) {
    result.startingDegree = parseInt(startDegreeMatch[1], 10);
  } else if (startMatch) {
    result.startingNote = capitalizeNote(startMatch[1]);
  }

  // Strip extracted patterns and filler for chord name extraction. Chord
  // phrases already claimed by a hand go first — they're plain substrings of
  // the input, so removing them here keeps them out of the chord name.
  let cleaned = handChordMatches
    .reduce((text, phrase) => text.replace(phrase, " "), input)
    .replace(FORMAT_FULL_RE, "")
    .replace(FORMAT_RE, "")
    .replace(SIZE_NAME_RE, "")
    .replace(SIZE_NUM_RE, "")
    .replace(ALL_INVERSIONS_RE, "")
    .replace(INVERSION_NUM_RE, "")
    .replace(INVERSION_WORD_RE, "")
    .replace(ROOT_POSITION_RE, "")
    .replace(SPAN_RE, "")
    .replace(PADDING_RE, "")
    .replace(CHORD_OCTAVE_RE, "")
    .replace(BASS_OCTAVE_RE, "")
    // Before NOTE_NAMES_RE, which matches the "note names" half on its own and
    // would leave "midi" behind. The leftover word is not inert: CHORD_RE's
    // quality class contains `m`, so "C midi" parsed as Cm, and an A root lost
    // to FILLER_WORDS let the extractor find its root in the `d` of "midi".
    .replace(MIDI_NAMES_RE, "")
    .replace(NOTE_NAMES_RE, "")
    .replace(CUSTOM_FINGERING_RE, "")
    .replace(FINGERING_RE, "")
    .replace(AUTO_FINGERING_RE, "")
    .replace(STYLE_RE, "")
    .replace(STYLE_KEYWORD_RE, "")
    .replace(BASS_DEGREE_RE, "")
    .replace(BASS_NOTE_RE, "")
    .replace(OVER_BASS_NOTE_RE, "")
    .replace(STARTING_DEGREE_RE, "")
    .replace(STARTING_NOTE_RE, "")
    .replace(DEGREES_KEYWORD_RE, "")
    .replace(DIRECTION_RE, "")
    .replace(OCTAVES_RE, "")
    .replace(SCALE_UNAMBIGUOUS_RE, "")
    .replace(SCALE_EXPLICIT_RE, "")
    .replace(SCALE_SHORTHAND_RE, "")
    // A loose "midi" is itself the request for midi note names (see the
    // fallback above), so it has to leave with the rest of the request.
    .replace(/\bmidi\b/gi, "")
    .replace(/\bscale\b/gi, "")
    .replace(HEADING_RE, "")
    .replace(NOTES_GROUP_PREFIX_RE, "")
    .replace(NOTES_GROUP_RE, "")
    .replace(HAND_PREFIX_BARE_RE, "")
    .replace(NOTES_BARE_HAND_RE, "")
    .replace(HAND_PREFIX_SINGLE_RE, "")
    .replace(NOTE_BARE_HAND_SINGLE_RE, "")
    .replace(POLYCHORD_SLASH_RE, "")
    .replace(SEMI_SEP_RE, "")
    .replace(THEME_RE, "")
    .replace(/\btheme\b/gi, "")
    .replace(/\bcolou?rs?\b/gi, "")
    .replace(/\bcustom\b/gi, "")
    .replace(/\band\b/gi, "")
    .replace(FILLER_WORDS, "")
    .replace(/,/g, "")
    .replace(/\blayout\b/gi, "")
    .replace(/\bfull\b/gi, "")
    .replace(/\bheight\b/gi, "")
    .replace(/\bsize\b/gi, "")
    .replace(/\bkeys?\b/gi, "")
    .replace(/\bin\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Last, so the article test is asked of text that is finished — and of the
  // original input, which still knows what the article was standing in front of.
  cleaned = stripArticles(cleaned, input).replace(/\s+/g, " ").trim();

  // Replace word-based accidentals before chord extraction
  cleaned = cleaned
    .replace(/\bsharp\b/gi, "#")
    .replace(/\bflat\b/gi, "b");
  // Collapse spaces around accidentals: "G #" → "G#"
  cleaned = cleaned.replace(/([A-Ga-g])\s+([#b])/g, "$1$2");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Try to extract chord from descriptive words: "C minor seventh" → "Cm7"
  const descriptiveRe =
    /([A-Ga-g][#b]?)\s+((?:major|minor|diminished|augmented|dominant|suspended)\s*(?:triad|seventh|ninth|eleventh|thirteenth)?)/i;
  const descMatch = cleaned.match(descriptiveRe);

  if (descMatch) {
    const root = capitalizeNote(descMatch[1]);
    const words = descMatch[2].toLowerCase().trim().split(/\s+/);
    let suffix = "";
    for (const word of words) {
      suffix += QUALITY_WORDS[word] ?? "";
    }
    result.chordName = root + suffix;
  } else {
    const chordMatch = cleaned.match(CHORD_RE);
    if (chordMatch) {
      const root = capitalizeNote(chordMatch[1]);
      const afterRoot = chordMatch[0]
        .slice(chordMatch[1].length)
        .trim()
        .replace(/\/([A-Ga-g])/, (_m, letter: string) => `/${letter.toUpperCase()}`);
      result.chordName = root + afterRoot;
    }
  }

  return result;
}
