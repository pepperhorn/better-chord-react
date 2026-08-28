/**
 * Jazz roman numeral degree labels.
 *
 * Maps Tonal interval strings (1P, 3M, 5A, 7m, etc.) to jazz-standard
 * roman numeral notation with accidentals (I, bIII, #V, bVII, etc.).
 *
 * The accidental reflects the interval alteration from the major scale:
 * - Perfect/Major = natural (no accidental)
 * - Minor/Diminished = flat (b)
 * - Augmented = sharp (#)
 */

import { parseInterval } from "./chord-tones.js";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_EXT: Record<number, string> = {
  9: "IX", 10: "X", 11: "XI", 12: "XII", 13: "XIII",
};

/**
 * The "natural" quality for each scale degree in the major scale.
 * 1, 4, 5 are perfect (P). 2, 3, 6, 7 are major (M).
 * Extensions follow the same pattern: 9=M, 11=P, 13=M.
 */
function naturalQuality(degree: number): string {
  const simple = degree > 7 ? degree - 7 : degree;
  if (simple === 1 || simple === 4 || simple === 5) return "P";
  return "M";
}

/**
 * Convert a Tonal interval string to a jazz roman numeral degree label.
 *
 * @example
 * intervalToDegreeLabel("1P")  → "I"
 * intervalToDegreeLabel("3M")  → "III"
 * intervalToDegreeLabel("3m")  → "bIII"
 * intervalToDegreeLabel("5A")  → "#V"
 * intervalToDegreeLabel("7m")  → "bVII"
 * intervalToDegreeLabel("9A")  → "#IX"
 * intervalToDegreeLabel("5d")  → "bV"
 */
export function intervalToDegreeLabel(interval: string): string {
  const { degree, quality } = parseInterval(interval);
  if (degree === 0) return "?";

  const numeral = degree <= 7
    ? (ROMAN[degree] ?? String(degree))
    : (ROMAN_EXT[degree] ?? String(degree));

  const nat = naturalQuality(degree);

  // Determine accidental
  if (quality === nat) {
    // Natural quality for this degree — no accidental
    return numeral;
  }
  if (quality === "m" || quality === "d") {
    return `b${numeral}`;
  }
  if (quality === "A") {
    return `#${numeral}`;
  }
  // Edge case: double diminished (bb7 in dim7) → still flat in jazz notation
  if (quality === "dd") {
    return `bb${numeral}`;
  }

  return numeral;
}

/**
 * Convert an array of Tonal intervals to jazz degree labels.
 *
 * @example
 * degreesForIntervals(["1P", "3M", "5A", "7m"]) → ["I", "III", "#V", "bVII"]
 */
export function degreesForIntervals(intervals: string[]): string[] {
  return intervals.map(intervalToDegreeLabel);
}
