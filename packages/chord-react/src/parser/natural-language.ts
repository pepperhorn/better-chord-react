import type { Format, ParsedChordRequest } from "../types";

const FILLER_WORDS =
  /\b(show\s+me|draw|display|render|please|a|an|the|with|that|this|me|of)\b/gi;

const FORMAT_RE = /\b(compact|exact)\b/i;

const INVERSION_WORD: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  root: 0,
};

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
  /\b(bebop|basie|nestico|modal|comping|rootless|quartal|block\s*chords?|locked\s*hands|drop\s*2\s*\+?\s*4|drop\s*2|upper\s*structure|shell|stride|spread|4[- ]?note\s*closed)\b/i;

// "with 2 notes on either side" / "with 3 keys on each side"
const PADDING_RE =
  /(?:with\s+)?(\d+)\s+(?:notes?|keys?)\s+(?:on\s+)?(?:either|each|both)\s+side/i;

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

const CHORD_RE =
  /([A-Ga-g][#b]?)\s*(maj|min|m|aug|dim|sus|add|dom|M|°|ø|[0-9#b/]+)*/i;

function capitalizeNote(note: string): string {
  return note.charAt(0).toUpperCase() + note.slice(1);
}

export function parseChordDescription(input: string): ParsedChordRequest {
  const result: ParsedChordRequest = { chordName: "" };

  // Extract format
  const formatMatch = input.match(FORMAT_RE);
  if (formatMatch) {
    result.format = formatMatch[1].toLowerCase() as Format;
  }

  // Extract inversion
  const numInvMatch = input.match(INVERSION_NUM_RE);
  const wordInvMatch = input.match(INVERSION_WORD_RE);
  const rootMatch = input.match(ROOT_POSITION_RE);

  if (numInvMatch) {
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

  // Extract starting note or degree
  const startDegreeMatch = input.match(STARTING_DEGREE_RE);
  const startMatch = input.match(STARTING_NOTE_RE);
  if (startDegreeMatch) {
    result.startingDegree = parseInt(startDegreeMatch[1], 10);
  } else if (startMatch) {
    result.startingNote = capitalizeNote(startMatch[1]);
  }

  // Strip extracted patterns and filler for chord name extraction
  let cleaned = input
    .replace(FORMAT_RE, "")
    .replace(INVERSION_NUM_RE, "")
    .replace(INVERSION_WORD_RE, "")
    .replace(ROOT_POSITION_RE, "")
    .replace(SPAN_RE, "")
    .replace(PADDING_RE, "")
    .replace(STYLE_RE, "")
    .replace(STYLE_KEYWORD_RE, "")
    .replace(BASS_DEGREE_RE, "")
    .replace(BASS_NOTE_RE, "")
    .replace(OVER_BASS_NOTE_RE, "")
    .replace(STARTING_DEGREE_RE, "")
    .replace(STARTING_NOTE_RE, "")
    .replace(FILLER_WORDS, "")
    .replace(/,/g, "")
    .replace(/\blayout\b/gi, "")
    .replace(/\bin\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

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
      const fullMatch = chordMatch[0];
      const afterRoot = fullMatch.slice(chordMatch[1].length);
      result.chordName = root + afterRoot.trim();
    }
  }

  return result;
}
