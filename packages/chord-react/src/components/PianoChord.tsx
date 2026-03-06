import { Note } from "tonal";
import type { ChordProps, KeyboardProps } from "../types";
import { PianoKeyboard } from "./PianoKeyboard";
import { parseChordDescription } from "../parser/natural-language";
import { resolveChord } from "../resolver/chord-resolver";
import { calculateLayout } from "../resolver/auto-layout";
import { FLAT_TO_SHARP } from "../engine/svg-constants";
import { findVoicing, voicingPitchClasses, mapToVoicingQuality } from "@better-chord/voicings";
import type { WhiteNote } from "../types";

/**
 * Map semitones (mod 12) from root to a scale degree number.
 * Handles both major and minor variants of each degree.
 */
function semitonesToDegree(semitones: number): number {
  const s = ((semitones % 12) + 12) % 12;
  if (s === 0) return 1;
  if (s <= 2) return 2;   // m2=1, M2=2 (also 9th)
  if (s <= 4) return 3;   // m3=3, M3=4
  if (s === 5) return 4;  // P4=5 (also 11th)
  if (s <= 7) return 5;   // d5=6, P5=7
  if (s <= 9) return 6;   // m6=8, M6=9 (also 13th)
  return 7;               // m7=10, M7=11
}

const DEGREE_NAMES: Record<number, string> = {
  1: "root", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th",
  9: "9th", 11: "11th", 13: "13th",
};

/**
 * Find the chord tone matching a musical degree, regardless of quality.
 * e.g. degree 3 finds Eb in Cm7 and E in Cmaj7.
 */
function degreeToNote(root: string, degree: number, notes: string[]): string | undefined {
  const rootMidi = Note.midi(`${root}4`);
  if (rootMidi == null) return undefined;

  // Normalize compound degrees: 9→2, 11→4, 13→6
  const simpleDegree = degree > 7 ? degree - 7 : degree;

  for (const note of notes) {
    const noteMidi = Note.midi(`${note}4`);
    if (noteMidi == null) continue;
    const semitones = ((noteMidi - rootMidi) % 12 + 12) % 12;
    if (semitonesToDegree(semitones) === simpleDegree) return note;
  }

  return undefined;
}

/** Format the available degrees for error messages */
function describeAvailableDegrees(root: string, notes: string[]): string {
  const rootMidi = Note.midi(`${root}4`);
  if (rootMidi == null) return notes.join(", ");

  const degrees: string[] = [];
  for (const note of notes) {
    const noteMidi = Note.midi(`${note}4`);
    if (noteMidi == null) continue;
    const semitones = ((noteMidi - rootMidi) % 12 + 12) % 12;
    const deg = semitonesToDegree(semitones);
    const name = DEGREE_NAMES[deg] ?? `${deg}th`;
    degrees.push(`${name} (${note})`);
  }
  return degrees.join(", ");
}

function isChordProps(props: ChordProps | KeyboardProps): props is ChordProps {
  return "chord" in props;
}

export function PianoChord(props: ChordProps | KeyboardProps) {
  if (!isChordProps(props)) {
    return <PianoKeyboard {...props} />;
  }

  const { chord, format, theme, highlightColor, padding, className, style } =
    props;

  const parsed = parseChordDescription(chord);
  const resolved = resolveChord(parsed.chordName, parsed.inversion);
  let { notes } = resolved;

  // If a style hint is present, try the voicing library for richer voicings
  if (parsed.styleHint) {
    const quality = mapToVoicingQuality(resolved.type, resolved.notes);
    if (quality) {
      const voicing = findVoicing(quality, parsed.styleHint);
      if (voicing) {
        const pitchClasses = voicingPitchClasses(resolved.root, voicing);
        if (pitchClasses.length > 0) {
          notes = pitchClasses;
        }
      }
    }
  }

  const available = describeAvailableDegrees(resolved.root, notes);

  // Reorder notes if bass note/degree is specified ("with the 5th in the bottom")
  if (parsed.bassDegree != null) {
    const bassNote = degreeToNote(resolved.root, parsed.bassDegree, notes);
    if (!bassNote) {
      const name = DEGREE_NAMES[parsed.bassDegree] ?? `${parsed.bassDegree}th`;
      throw new Error(
        `${parsed.chordName} doesn't have a ${name} — try: ${available}`
      );
    }
    const idx = notes.indexOf(bassNote);
    if (idx > 0) {
      notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }
  } else if (parsed.bassNote) {
    const bassNorm = FLAT_TO_SHARP[parsed.bassNote] ?? parsed.bassNote;
    const idx = notes.indexOf(bassNorm);
    if (idx < 0) {
      throw new Error(
        `${parsed.bassNote} isn't in ${parsed.chordName} — the notes are: ${available}`
      );
    }
    if (idx > 0) {
      notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }
  }

  // Resolve startingDegree/startingNote: rotate voicing so that note is lowest
  let startingNote = parsed.startingNote;
  if (!startingNote && parsed.startingDegree != null) {
    startingNote = degreeToNote(resolved.root, parsed.startingDegree, notes);
    if (!startingNote) {
      const name = DEGREE_NAMES[parsed.startingDegree] ?? `${parsed.startingDegree}th`;
      throw new Error(
        `${parsed.chordName} doesn't have a ${name} — try: ${available}`
      );
    }
  }
  if (startingNote) {
    const norm = FLAT_TO_SHARP[startingNote] ?? startingNote;
    const idx = notes.indexOf(norm);
    if (idx < 0) {
      throw new Error(
        `${startingNote} isn't in ${parsed.chordName} — the notes are: ${available}`
      );
    }
    if (idx > 0) {
      notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }
  }

  const layout = calculateLayout(notes, {
    padding: parsed.padding ?? padding ?? 1,
    startingNote,
    spanFrom: parsed.spanFrom,
    spanTo: parsed.spanTo,
  });

  return (
    <PianoKeyboard
      format={parsed.format ?? format}
      size={layout.size}
      startFrom={layout.startFrom as WhiteNote}
      highlightKeys={notes}
      theme={theme}
      highlightColor={highlightColor}
      chordLabel={parsed.chordName}
      className={className}
      style={style}
    />
  );
}
