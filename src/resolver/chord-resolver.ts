import { Chord, Note, Interval } from "tonal";
import { FLAT_TO_SHARP } from "../engine/svg-constants";

function normalizeToSharp(note: string): string {
  const simplified = Note.simplify(note);
  return FLAT_TO_SHARP[simplified] ?? simplified;
}

// Alteration tokens we can strip and re-apply as intervals
const ALTERATION_RE =
  /([#b](?:5|9|11|13)|add(?:9|11|13|b9|#9|b13|#11))$/;

const ALTERATION_TO_INTERVAL: Record<string, string> = {
  "#5": "5A",
  "b5": "5d",
  "#9": "2A",   // #9 = augmented 2nd (enharmonic minor 3rd, but voiced as 9th)
  "b9": "2m",   // b9 = minor 2nd
  "#11": "4A",  // #11 = augmented 4th
  "b13": "6m",  // b13 = minor 6th
  "add9": "2M",
  "add11": "4P",
  "add13": "6M",
  "addb9": "2m",
  "add#9": "2A",
  "add#11": "4A",
  "addb13": "6m",
};

// Try to resolve by stripping trailing alterations one at a time,
// then transposing the root by those intervals to get extra notes
function resolveWithFallback(
  chordName: string
): { notes: string[]; root: string; type: string } | null {
  // Extract root note
  const rootMatch = chordName.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;

  const root = rootMatch[1];
  let suffix = chordName.slice(root.length);
  const extraIntervals: string[] = [];

  // Strip alterations from the end until Tonal recognizes the base
  let attempts = 0;
  while (suffix && attempts < 5) {
    const match = suffix.match(ALTERATION_RE);
    if (!match) break;

    const token = match[1];
    const interval = ALTERATION_TO_INTERVAL[token];
    if (!interval) break;

    extraIntervals.unshift(interval);
    suffix = suffix.slice(0, -token.length);
    attempts++;

    const chord = Chord.get(root + suffix);
    if (!chord.empty) {
      let notes = chord.notes.map(normalizeToSharp);

      // Add extra notes from stripped alterations
      for (const ivl of extraIntervals) {
        const extra = Note.transpose(root, ivl);
        if (extra) {
          const normalized = normalizeToSharp(extra);
          // Replace if same degree already exists, otherwise add
          if (!notes.includes(normalized)) {
            notes.push(normalized);
          }
        }
      }

      return { notes, root: normalizeToSharp(root), type: chord.type + " (extended)" };
    }
  }

  return null;
}

export interface ResolvedChord {
  notes: string[];
  root: string;
  type: string;
}

export function resolveChord(
  chordName: string,
  inversion?: number
): ResolvedChord {
  const chord = Chord.get(chordName);

  let notes: string[];
  let root: string;
  let type: string;

  if (!chord.empty) {
    notes = chord.notes.map(normalizeToSharp);
    root = normalizeToSharp(chord.tonic ?? notes[0]);
    type = chord.type;
  } else {
    // Fallback: strip trailing alterations and reapply as intervals
    const fallback = resolveWithFallback(chordName);
    if (!fallback) {
      throw new Error(`Unknown chord: "${chordName}"`);
    }
    notes = fallback.notes;
    root = fallback.root;
    type = fallback.type;
  }

  // Apply inversion: rotate notes array
  if (inversion && inversion > 0) {
    const rotation = inversion % notes.length;
    notes = [...notes.slice(rotation), ...notes.slice(0, rotation)];
  }

  return { notes, root, type };
}
