import { Note, Chord } from "tonal";
import type { RealizedNote, Hand } from "./types.js";

/**
 * Describes a chord by its root note name and quality string
 * (e.g. root: "C", quality: "maj" or root: "Eb", quality: "dom7").
 */
export interface ChordDescriptor {
  root: string;
  quality: string;
}

/**
 * Build a RealizedNote from a MIDI number and hand assignment.
 */
function midiToRealized(midi: number, hand: Hand): RealizedNote {
  const noteName = Note.fromMidi(midi);
  const pc = Note.pitchClass(noteName);
  return { note: noteName, midi, pitchClass: pc, hand };
}

/**
 * Resolve chord note names from a root + quality string using tonal's Chord module.
 * Returns pitch classes (no octave) like ["C", "E", "G"].
 */
function chordPitchClasses(root: string, quality: string): string[] {
  // tonal expects e.g. "Cmaj7", "Ebm", "G7" etc.
  const chordData = Chord.get(`${root}${quality}`);
  if (!chordData || chordData.empty) {
    // Fallback: try common aliases
    const aliases: Record<string, string> = {
      dom7: "7",
      maj: "M",
      min: "m",
      maj7: "maj7",
      min7: "m7",
      dim: "dim",
      aug: "aug",
    };
    const mapped = aliases[quality];
    if (mapped) {
      const retry = Chord.get(`${root}${mapped}`);
      if (retry && !retry.empty) return retry.notes;
    }
    // Last resort: just return root as a single-note chord
    return [root];
  }
  return chordData.notes;
}

/**
 * Get the MIDI number for a pitch class in a given octave.
 */
function pitchClassToMidi(pc: string, octave: number): number {
  const midi = Note.midi(`${pc}${octave}`);
  if (midi == null) {
    throw new Error(`Cannot resolve MIDI for ${pc}${octave}`);
  }
  return midi;
}

/**
 * Determine the tritone shell voicing (3rd + b7th) for a dom7 chord.
 * Returns two pitch classes: the 3rd and the b7th of the dominant chord.
 */
function tritonePitchClasses(root: string): string[] {
  // A dom7 chord has intervals: 1 3 5 b7
  // Shell voicing uses just the 3rd and the b7th (the tritone pair)
  const chordData = Chord.get(`${root}7`);
  if (!chordData || chordData.empty || chordData.notes.length < 4) {
    // Manual fallback: 3rd = root + 4 semitones, b7th = root + 10 semitones
    const rootMidi = Note.midi(`${root}4`);
    if (rootMidi == null) throw new Error(`Invalid root note: ${root}`);
    return [
      Note.pitchClass(Note.fromMidi(rootMidi + 4)),
      Note.pitchClass(Note.fromMidi(rootMidi + 10)),
    ];
  }
  // notes[0]=root, notes[1]=3rd, notes[2]=5th, notes[3]=b7th
  return [chordData.notes[1], chordData.notes[3]];
}

/**
 * Solve a polychord voicing: upper triad in the right hand over a lower chord
 * context in the left hand.
 *
 * - Upper chord notes are placed in octave 4 (RH).
 * - If the lower chord quality is "dom7", the LH plays the tritone shell
 *   (3rd + b7th) in octave 3.
 * - Otherwise, the LH plays just the bass root in octave 3.
 *
 * @param upper - Upper chord descriptor (root + quality), played by RH in octave 4
 * @param lower - Lower chord descriptor (root + quality), providing LH context in octave 3
 * @returns Array of RealizedNote with hand assignments
 */
export function solvePolychord(
  upper: ChordDescriptor,
  lower: ChordDescriptor,
): RealizedNote[] {
  const result: RealizedNote[] = [];

  // --- Left Hand (octave 3) ---
  if (lower.quality === "dom7" || lower.quality === "7") {
    // Tritone shell: 3rd and b7th of the dominant chord
    const shell = tritonePitchClasses(lower.root);
    for (const pc of shell) {
      const midi = pitchClassToMidi(pc, 3);
      result.push(midiToRealized(midi, "LH"));
    }
  } else {
    // Just the bass note
    const midi = pitchClassToMidi(lower.root, 3);
    result.push(midiToRealized(midi, "LH"));
  }

  // --- Right Hand (octave 4) ---
  const upperNotes = chordPitchClasses(upper.root, upper.quality);
  for (const pc of upperNotes) {
    const midi = pitchClassToMidi(pc, 4);
    result.push(midiToRealized(midi, "RH"));
  }

  // Sort by MIDI number ascending
  result.sort((a, b) => a.midi - b.midi);

  return result;
}

/**
 * Solve a slash chord voicing: standard chord notes over a specific bass note
 * in a lower octave.
 *
 * The chord notes are placed in octave 4 (RH) and the bass note is placed
 * in octave 3 (LH). If the bass note already exists in the chord, it is
 * omitted from the RH to avoid doubling.
 *
 * @param chordNotes - Array of pitch classes representing the chord (e.g. ["C", "E", "G"])
 * @param bassNote - The bass pitch class (e.g. "E" for C/E)
 * @returns Array of RealizedNote with hand assignments
 */
export function solveSlashChord(
  chordNotes: string[],
  bassNote: string,
): RealizedNote[] {
  const result: RealizedNote[] = [];

  // Bass note in LH, octave 3
  const bassMidi = pitchClassToMidi(bassNote, 3);
  result.push(midiToRealized(bassMidi, "LH"));

  // Chord notes in RH, octave 4
  // Remove bass note from chord notes if present (avoid doubling)
  const bassEnharmonic = Note.enharmonic(bassNote);
  const rhNotes = chordNotes.filter((pc) => {
    return pc !== bassNote && pc !== bassEnharmonic;
  });

  // If filtering removed all notes, use original chord notes
  const notesToUse = rhNotes.length > 0 ? rhNotes : chordNotes;

  for (const pc of notesToUse) {
    const midi = pitchClassToMidi(pc, 4);
    result.push(midiToRealized(midi, "RH"));
  }

  // Sort by MIDI number ascending
  result.sort((a, b) => a.midi - b.midi);

  return result;
}
