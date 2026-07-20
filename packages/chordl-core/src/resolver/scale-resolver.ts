/**
 * Scale resolver — resolves scale names to notes via Tonal.
 * Handles melodic minor direction, multi-octave expansion, rotation to a
 * custom starting note, and generates Tonal interval arrays for degree
 * label computation.
 */
import { Note, Scale } from "tonal";

export interface ResolvedScale {
  /** Pitch classes for the full multi-octave display (includes final tonic). */
  notes: string[];
  root: string;
  type: string;
  /** Single-octave Tonal intervals (e.g. ["1P","2M","3M","4P","5P","6M","7M"]),
   *  rotated to match `notes` when a custom starting note is used. */
  intervals: string[];
  /** Index into the un-rotated scale that `notes` starts on (0 = root). */
  startIndex: number;
}

/** Normalize common scale name variants for Tonal compatibility. */
const SCALE_NAME_MAP: Record<string, string> = {
  "natural minor": "minor",
  "minor harmonic": "harmonic minor",
  "minor melodic": "melodic minor",
  "major pentatonic": "major pentatonic",
  "minor pentatonic": "minor pentatonic",
  "whole tone": "whole tone",
  "bebop": "bebop major",
};

export function resolveScale(
  root: string,
  scaleType: string,
  direction?: "ascending" | "descending",
  octaves: number = 1,
  startOn?: string,
): ResolvedScale {
  // Melodic minor descending = natural minor
  let effectiveType = scaleType;
  if (scaleType === "melodic minor" && direction === "descending") {
    effectiveType = "minor";
  }

  // Apply name normalization
  const tonalName = SCALE_NAME_MAP[effectiveType] ?? effectiveType;

  const scale = Scale.get(`${root} ${tonalName}`);
  if (scale.empty) {
    throw new Error(`Unknown scale: "${root} ${scaleType}"`);
  }

  let oneOctaveNotes = scale.notes;
  let intervals = scale.intervals;
  let startIndex = 0;

  // "starting on X" — rotate the scale so it runs one octave (or N octaves)
  // from that note instead of the root. Matched by pitch (chroma) so an
  // enharmonic spelling like G# still finds Ab.
  if (startOn) {
    const targetChroma = Note.chroma(startOn);
    startIndex = oneOctaveNotes.findIndex((n) => Note.chroma(n) === targetChroma);
    if (startIndex < 0) {
      throw new Error(
        `${startOn} isn't in ${root} ${scaleType} — the notes are: ${oneOctaveNotes.join(", ")}`,
      );
    }
    if (startIndex > 0) {
      oneOctaveNotes = [
        ...oneOctaveNotes.slice(startIndex),
        ...oneOctaveNotes.slice(0, startIndex),
      ];
      intervals = [...intervals.slice(startIndex), ...intervals.slice(0, startIndex)];
    }
  }

  // Expand across octaves: repeat pitch classes + add final starting note
  const notes: string[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    notes.push(...oneOctaveNotes);
  }
  // Add the final starting note to complete the last octave
  notes.push(oneOctaveNotes[0]);

  return {
    notes,
    root,
    type: scaleType,
    intervals,
    startIndex,
  };
}
