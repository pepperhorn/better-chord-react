import { Chord, Note } from "tonal";
import type { RealizedNote, Hand } from "./types.js";
import { normalizeToSharps } from "./spelling.js";

/**
 * George Shearing "Locked Hands" block chord voicing.
 *
 * 1. The melody note sits on top.
 * 2. The next 3 chord tones are stacked in close position beneath it (4-way close).
 * 3. The melody note is doubled exactly one octave below.
 *
 * The doubled bottom note is assigned to LH; the four upper notes are assigned to RH.
 *
 * @param melodyNote  Absolute pitch, e.g. "G4"
 * @param chordSymbol Chord name, e.g. "Cmaj7"
 * @returns Array of 5 RealizedNotes sorted low to high
 */
export function generateLockedHands(
  melodyNote: string,
  chordSymbol: string,
): RealizedNote[] {
  const melodyMidi = Note.midi(melodyNote);
  if (melodyMidi == null) {
    throw new Error(`Invalid melody note: ${melodyNote}`);
  }

  const chord = Chord.get(chordSymbol);
  if (!chord.notes.length) {
    throw new Error(`Unknown chord symbol: ${chordSymbol}`);
  }

  // Get pitch classes of the chord as MIDI pitch classes (0-11)
  const chordPCs = chord.notes.map((n) => {
    const midi = Note.midi(`${n}4`);
    return midi! % 12;
  });

  // Locked hands requires at least 4 distinct pitch classes (e.g. 7th chords)
  if (chordPCs.length < 4) {
    throw new Error(
      `${chordSymbol} has only ${chordPCs.length} notes — locked hands requires a 7th chord or richer`,
    );
  }

  const melodyPC = melodyMidi % 12;

  // Verify the melody note is a chord tone
  if (!chordPCs.includes(melodyPC)) {
    throw new Error(
      `Melody note ${melodyNote} (pc=${melodyPC}) is not a chord tone of ${chordSymbol} (pcs=${chordPCs.join(",")})`,
    );
  }

  // Build 4-way close voicing beneath the melody note.
  // Starting from the melody, pick the next 3 chord tones moving downward
  // through the chord tones chromatically (no duplicate pitch classes).
  const closePitches: number[] = [melodyMidi];
  const usedPCs = new Set<number>([melodyPC]);

  let current = melodyMidi - 1;
  while (closePitches.length < 4) {
    const pc = ((current % 12) + 12) % 12;
    if (chordPCs.includes(pc) && !usedPCs.has(pc)) {
      closePitches.push(current);
      usedPCs.add(pc);
    }
    current--;
    if (melodyMidi - current > 24) {
      throw new Error(
        `Could not find enough chord tones below ${melodyNote} for ${chordSymbol}`,
      );
    }
  }

  // The doubled melody note one octave below
  const doubledMidi = melodyMidi - 12;

  // Sort all 4 close-position notes ascending
  closePitches.sort((a, b) => a - b);

  // Build the final 5-note voicing: doubled bottom note + 4-way close
  const allMidi = [doubledMidi, ...closePitches];
  allMidi.sort((a, b) => a - b);

  // Map to RealizedNote. The bottom note (doubled melody) is LH; rest are RH.
  const result: RealizedNote[] = allMidi.map((midi, i) => {
    const noteName = Note.fromMidi(midi);
    const pc = Note.pitchClass(noteName);
    const hand: Hand = i === 0 ? "LH" : "RH";
    return {
      note: noteName,
      midi,
      pitchClass: normalizeToSharps(pc),
      hand,
    };
  });

  return result;
}
