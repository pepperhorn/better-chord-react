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
  "#9": "2A",
  "b9": "2m",
  "#11": "4A",
  "b11": "4d",
  "#13": "6A",
  "b13": "6m",
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

// Normalize chord symbols that Tonal doesn't recognize into equivalents
function normalizeChordName(name: string): string {
  // Extract root note first
  const rootMatch = name.match(/^([A-G][#b]?)/i);
  if (!rootMatch) return name;
  const root = rootMatch[1];
  let suffix = name.slice(root.length);

  // m7sus is special — handled by buildSpecialChord, don't normalize it away

  // Cmaug → Cm#5 (minor augmented)
  suffix = suffix.replace(/^maug$/i, "m#5");

  // Cm6/9 → Cm6add9 (Tonal doesn't know m6/9 but knows the notes)
  // Actually build it manually below via special handling

  // CmMaj → CmM (Tonal recognizes mM but not mmaj for some roots)
  // Dbmmaj7 → DbmMaj7 — ensure proper casing
  suffix = suffix.replace(/mmaj/i, "mMaj");

  // omit3 → remove, we'll handle it post-resolution
  // Keep it for now, handle in resolveChord

  return root + suffix;
}

// Special chord builders for symbols Tonal can't handle at all
function buildSpecialChord(name: string): { notes: string[]; root: string; type: string } | null {
  const rootMatch = name.match(/^([A-G][#b]?)/i);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  const suffix = name.slice(root.length);

  // X7omit3 → root, 5th, b7 (no 3rd)
  if (/^7omit3$/i.test(suffix)) {
    return {
      notes: [root, Note.transpose(root, "5P"), Note.transpose(root, "7m")].map(normalizeToSharp),
      root: normalizeToSharp(root),
      type: "7omit3",
    };
  }

  // Xm7sus / Xm7sus4 → root, m3, P4, m7
  if (/^m7sus4?$/i.test(suffix)) {
    return {
      notes: [
        root,
        Note.transpose(root, "3m"),
        Note.transpose(root, "4P"),
        Note.transpose(root, "7m"),
      ].map(normalizeToSharp),
      root: normalizeToSharp(root),
      type: "m7sus4",
    };
  }

  // Xm6/9 → root, m3, 5, 6, 9
  if (/^m6\/9$/i.test(suffix)) {
    return {
      notes: [
        root,
        Note.transpose(root, "3m"),
        Note.transpose(root, "5P"),
        Note.transpose(root, "6M"),
        Note.transpose(root, "2M"),
      ].map(normalizeToSharp),
      root: normalizeToSharp(root),
      type: "m6/9",
    };
  }

  return null;
}

export function resolveChord(
  chordName: string,
  inversion?: number
): ResolvedChord {
  chordName = normalizeChordName(chordName);
  const chord = Chord.get(chordName);

  let notes: string[];
  let root: string;
  let type: string;

  // Try special chord builders first (omit3, m6/9, etc.)
  const special = buildSpecialChord(chordName);
  if (special) {
    notes = special.notes;
    root = special.root;
    type = special.type;
  } else if (!chord.empty) {
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
