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

import { Note, Interval } from "tonal";

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

/**
 * Raise a simple 2nd, 4th or 6th by an octave so it reads as the extension it
 * is: 2→9, 4→11, 6→13. The quality is carried over untouched, so `2m` becomes
 * `9m` and `4A` becomes `11A` — a flattened or raised extension keeps its
 * accidental. Degrees 1, 3, 5, 7 and 8 are returned unchanged.
 *
 * Only for the non-chord-tone fallback in `degreeLabelsForNotes`: pitch-class
 * distances are always simple, so an added 9th arrives here as a bare `2M`.
 */
function raiseExtension(interval: string): string {
  const parsed = Interval.get(interval);
  if (parsed.empty || parsed.num == null) return interval;
  if (parsed.num !== 2 && parsed.num !== 4 && parsed.num !== 6) return interval;
  return `${parsed.num + 7}${parsed.q}`;
}

/**
 * Label each rendered note with the degree it plays in the chord, keyed by
 * pitch rather than by position.
 *
 * Position is not usable here: `notes` is rotated by inversions and by
 * "starting on", and repeated across octaves for arpeggios, while
 * `resolved.intervals` stays canonical (the resolver deliberately does not
 * rotate it — the voicing lookup classifies by degree number). Zipping the two
 * by index therefore called whatever note came first the root.
 *
 * Matching is spelling-first, then chroma. Spelling has to win: `C7#5b13`
 * renders both `G#` (5A) and `Ab` (6m), which share chroma 8, and a chroma-first
 * lookup would give them the same label. Chroma is the fallback for the cases
 * spelling cannot cover — a `7d` off C is `Bbb` but renders as `A`, and a
 * voicing may respell `Bb` as `A#`.
 *
 * A note in neither map — an added tone from a style voicing, e.g. the 9th in a
 * rootless `Cmaj7` — is labelled from its distance to the root instead of
 * borrowing a chord tone's label, and a 2nd, 4th or 6th is raised an octave so
 * it reads as the extension it is: `IX`, `XI`, `XIII`. The quality rides along,
 * so an altered extension still reads `bIX` / `#XI` / `bXIII`. Raising is safe
 * precisely because this branch only fires for notes absent from the chord's
 * own interval list: a chord that genuinely owns a 2nd, 4th or 6th (`Csus2`,
 * `Csus4`, `C6`) matches by spelling or chroma first and keeps `II`, `IV`, `VI`.
 * Anything that still cannot be named comes back `undefined`, and the keyboard
 * draws no label for it.
 *
 * @param root   The chord root, e.g. "C".
 * @param intervals The chord's canonical intervals, e.g. ["1P","3M","5P"].
 * @param notes  The notes as rendered, in render order.
 * @returns One label per note, index-parallel to `notes`.
 *
 * @example
 * degreeLabelsForNotes("C", ["1P","3M","5P"], ["E","G","C"]) → ["III","V","I"]
 * degreeLabelsForNotes("C", ["3M","5P","8P"], ["E","G","C"]) → ["III","V","8"]
 * degreeLabelsForNotes("C", ["1P","3M","5P","7M"], ["E","G","B","D"])
 *   → ["III","V","VII","IX"]  // the D is an added tone, so it reads as a 9th
 */
export function degreeLabelsForNotes(
  root: string,
  intervals: string[] | undefined,
  notes: string[],
): (string | undefined)[] {
  if (!intervals || intervals.length === 0) return notes.map(() => undefined);

  // First interval to claim a pitch keeps it: a chord that names the same
  // sounding pitch twice should read as the lower of the two degrees.
  const bySpelling = new Map<string, string>();
  const byChroma = new Map<number, string>();
  for (const iv of intervals) {
    const pc = Note.pitchClass(Note.transpose(root, iv));
    if (!pc) continue;
    const label = intervalToDegreeLabel(iv);
    if (!bySpelling.has(pc)) bySpelling.set(pc, label);
    const chroma = Note.chroma(pc);
    if (Number.isFinite(chroma) && !byChroma.has(chroma)) byChroma.set(chroma, label);
  }

  return notes.map((n) => {
    const pc = Note.pitchClass(n) || n;

    const spelled = bySpelling.get(pc);
    if (spelled !== undefined) return spelled;

    const chroma = Note.chroma(pc);
    if (Number.isFinite(chroma)) {
      const enharmonic = byChroma.get(chroma);
      if (enharmonic !== undefined) return enharmonic;
    }

    // Not a chord tone — name it by its distance from the root anyway.
    const distance = Interval.distance(root, pc);
    if (!distance) return undefined;
    const label = intervalToDegreeLabel(raiseExtension(distance));
    return label === "?" ? undefined : label;
  });
}
