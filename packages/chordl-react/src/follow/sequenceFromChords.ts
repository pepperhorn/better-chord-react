/**
 * Build a follow-along sequence from chordl chord strings.
 *
 * The live listener ({@link ChordListener}) reports chords in one fixed
 * vocabulary — a sharp-spelled root (`C`, `C#`, …) plus one of a small set of
 * quality suffixes (`""`, `m`, `7`, `maj7`, `m7`, `dim`, `aug`, `sus4`, `sus2`,
 * `m7b5`, `dim7`, `6`, `m6`). {@link SequenceFollower} advances by *exact*
 * string match, so the expected sequence has to be normalized into that same
 * vocabulary or nothing would ever match.
 *
 * `normalizeToDetectorSymbol` resolves a chordl `nl` string, folds its root to
 * sharp spelling, and maps its quality onto the nearest thing the ear-detector
 * can actually hear (richer chords degrade to their triad/7th — a `Cmaj9`
 * expected chord matches a detected `Cmaj7`). Unresolvable inputs (scales, note
 * lists, junk) become `""`, a sentinel that never matches a real detection.
 */
import { parseChordDescription } from "@pepperhorn/chordl-core";
import { Note } from "tonal";
import type { ExpectedChord } from "@pepperhorn/chordl-listen";

// Sharp-spelled pitch classes, matching chordl-listen's PITCH_CLASSES.
const SHARP_PCS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** chordl chord-symbol suffix → nearest detector suffix. Always resolves. */
function toDetectorSuffix(raw: string): string {
  const s = raw.trim();
  // Exact known spellings first.
  if (s === "" || s === "maj" || s === "M") return "";
  if (s === "m" || s === "min" || s === "-") return "m";
  if (s === "7" || s === "dom7") return "7";
  if (s === "maj7" || s === "M7" || s === "Δ" || s === "Δ7") return "maj7";
  if (s === "m7" || s === "min7" || s === "-7") return "m7";
  if (s === "dim" || s === "°" || s === "o") return "dim";
  if (s === "aug" || s === "+") return "aug";
  if (s === "sus4" || s === "sus") return "sus4";
  if (s === "sus2") return "sus2";
  if (s === "m7b5" || s === "min7b5" || s === "ø" || s === "ø7") return "m7b5";
  if (s === "dim7" || s === "°7" || s === "o7") return "dim7";
  if (s === "6" || s === "maj6" || s === "M6") return "6";
  if (s === "m6" || s === "min6" || s === "-6") return "m6";

  // Richer chords: degrade to the closest template the detector models.
  // maj-family must be tested before the minor branch — "maj" also starts "m".
  if (/maj|Δ/.test(s)) return "maj7"; // maj9, maj13, …
  // Added-tone chords carry no 7th → the base triad.
  if (s.startsWith("add")) return "";
  if (/^(m|min|-)/.test(s)) {
    if (s.includes("add")) return "m";
    if (/7|9|11|13/.test(s)) return "m7"; // m9/m11 imply a b7
    if (s.includes("6")) return "m6";
    return "m";
  }
  if (/7|9|11|13/.test(s)) return "7"; // dominant extensions
  if (s.startsWith("sus")) return "sus4";
  if (s.startsWith("dim") || s.startsWith("°")) return "dim";
  if (s.startsWith("aug") || s.startsWith("+")) return "aug";
  if (s.includes("6")) return "6";
  return ""; // 5, etc. → major triad
}

/**
 * Resolve a chordl `nl` string to a detector-vocabulary symbol, or `null` if it
 * doesn't name a chord (scale, note list, unparseable).
 */
export function normalizeToDetectorSymbol(nl: string): string | null {
  let name: string;
  try {
    const parsed = parseChordDescription(nl);
    if (parsed.isScale || !parsed.chordName) return null;
    name = parsed.chordName;
  } catch {
    return null;
  }
  const m = name.trim().match(/^([A-G][#b]?)(.*)$/);
  if (!m) return null;
  const chroma = Note.chroma(m[1]);
  if (chroma == null) return null;
  return `${SHARP_PCS[chroma]}${toDetectorSuffix(m[2])}`;
}

/**
 * Turn an ordered list of chordl chord strings into a paged follow sequence.
 * One entry per input (index-aligned with the source list); unmatchable entries
 * carry an empty `chord` so the cursor can pass over them via the lookahead
 * window. Pages are assigned by chunking `perPage` chords each.
 */
export function sequenceFromChords(chords: string[], perPage = 4): ExpectedChord[] {
  const per = Math.max(1, Math.floor(perPage));
  return chords.map((nl, i) => ({
    chord: normalizeToDetectorSymbol(nl) ?? "",
    page: Math.floor(i / per) + 1,
  }));
}

/** Number of pages a chord list spans at `perPage` chords per page. */
export function pageCount(length: number, perPage = 4): number {
  const per = Math.max(1, Math.floor(perPage));
  return Math.max(1, Math.ceil(length / per));
}
