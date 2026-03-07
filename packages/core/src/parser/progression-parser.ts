import type { Format } from "../types";
import { MAX_EXAMPLES } from "../config";

export interface ParsedProgressionRequest {
  progression: string;
  key: string;
  numExamples: number;
  styleHint?: string;
  format?: Format;
}

// Roman numeral pattern — must not be followed by a letter (prevents "in", "it", "is" etc.)
const ROMAN_NUMERAL_SRC = `[#b]?(?:iv|vi{1,2}|i{1,3}|IV|VI{1,2}|I{1,3}|V)(?:[°ø]?\\d*(?:maj|m)?[0-9#b]*)(?![a-z])`;

// A progression: 2+ roman numerals separated by delimiters
const PROGRESSION_PATTERN = new RegExp(
  `(?:^|\\s)(${ROMAN_NUMERAL_SRC}(?:[\\s\\-–—→>]+${ROMAN_NUMERAL_SRC})+)`,
  "i"
);

// Example count: "3 examples", "show me 2", "give me 5 examples"
const EXAMPLE_COUNT_RE = /(\d+)\s*(?:examples?|variations?|versions?|ways?|options?)/i;

// Style hints
const STYLE_RE =
  /(?:(?:in\s+)?(?:the\s+)?style\s+of\s+|like\s+|a\s+la\s+)([\w\s]+?)(?:\s*$|\s*,|\s+(?:in\s|examples?|variations?))/i;
const STYLE_KEYWORD_RE =
  /\b(bebop|basie|nestico|ellington|modal|comping|rootless|quartal|block\s*chords?|locked\s*hands|drop\s*2\s*\+?\s*4|drop\s*2|upper\s*structure|shell|stride|spread|4[- ]?note\s*closed|bill\s*evans|mccoy\s*tyner|herbie\s*hancock|bud\s*powell|monk)\b/i;

// Form template names — must come before roman numeral detection
const FORM_NAMES: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /\bjazz\s*blues\b/i, id: "jazz blues" },
  { pattern: /\bblues\b/i, id: "blues" },
  { pattern: /\brhythm\s*changes?\b/i, id: "rhythm changes" },
  { pattern: /\bturnaround\b/i, id: "I-vi-ii-V" },
  { pattern: /\bmodal\s*vamp\b/i, id: "modal vamp" },
  { pattern: /\bbackdoor\b/i, id: "backdoor" },
  { pattern: /\btritone\s*sub(?:stitution)?\b/i, id: "tritone sub" },
  { pattern: /\bminor\s*(?:ii[\s\-–—]*v[\s\-–—]*i|2[\s\-–—]*5[\s\-–—]*1)\b/i, id: "minor ii-V-i" },
];

/**
 * Detect whether an input string is a progression request rather than a single chord.
 */
export function isProgressionRequest(input: string): boolean {
  // Check for form template names first
  for (const { pattern } of FORM_NAMES) {
    if (pattern.test(input)) return true;
  }

  // Check for roman numeral progression pattern (2+ numerals separated by delimiters)
  if (PROGRESSION_PATTERN.test(input)) return true;

  // Check for "progression" keyword
  if (/\bprogression\b/i.test(input)) return true;

  return false;
}

/**
 * Parse a progression request from natural language.
 */
export function parseProgressionRequest(input: string): ParsedProgressionRequest {
  // Extract example count
  let numExamples = MAX_EXAMPLES;
  const countMatch = input.match(EXAMPLE_COUNT_RE);
  if (countMatch) {
    numExamples = Math.min(parseInt(countMatch[1], 10), MAX_EXAMPLES);
  }

  // Extract style
  let styleHint: string | undefined;
  const styleMatch = input.match(STYLE_RE);
  const styleKeywordMatch = input.match(STYLE_KEYWORD_RE);
  if (styleMatch) {
    styleHint = styleMatch[1].trim();
  } else if (styleKeywordMatch) {
    styleHint = styleKeywordMatch[1].trim();
  }

  // Extract format
  let format: Format | undefined;
  const formatMatch = input.match(/\b(compact|exact)\b/i);
  if (formatMatch) {
    format = formatMatch[1].toLowerCase() as Format;
  }

  // Extract key — "in G", "in the key of Db", "in F#"
  let key = "C";
  const keyMatch = input.match(/\bin\s+(?:the\s+)?(?:key\s+(?:of\s+)?)?([A-Ga-g][#b]?)(?:\s|$)/i);
  if (keyMatch) {
    key = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1);
  }

  // Extract progression — check form names first, then roman numerals
  let progression = "";

  for (const { pattern, id } of FORM_NAMES) {
    if (pattern.test(input)) {
      progression = id;
      break;
    }
  }

  // If no form name matched, try roman numeral pattern
  if (!progression) {
    const progMatch = input.match(PROGRESSION_PATTERN);
    if (progMatch) {
      progression = progMatch[1].trim();
    }
  }

  if (!progression) {
    progression = "ii-V-I";
  }

  return {
    progression,
    key,
    numExamples,
    styleHint,
    format,
  };
}
