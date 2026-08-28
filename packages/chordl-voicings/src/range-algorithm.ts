import { Note } from "tonal";
import type { VoicingEntry, VoicingQuality } from "./types.js";
import { queryVoicings } from "./query.js";

/**
 * Range-aware voicing selection algorithm.
 *
 * "Green Zone" for left-hand voicings:
 * - Below D3 (MIDI 50): muddy, indistinct
 * - Above C5 (MIDI 72): thin, clashes with melody
 *
 * For rootless voicings (Type A starts on 3rd, Type B starts on 7th):
 * - If the 3rd would fall below the Green Zone -> use Type B
 * - If the 3rd would fall above the sweet spot -> use Type A
 */

const GREEN_ZONE = {
  MIN: 50,  // D3
  MAX: 72,  // C5
  SWEET_LOW: 50,   // D3
  SWEET_HIGH: 62,  // D4
};

/**
 * Select the best voicing inversion based on the root's register.
 *
 * @param rootMidi - MIDI note number of the root (e.g. C3 = 48)
 * @param quality - Chord quality to look up
 * @returns The best VoicingEntry, or undefined if none found
 */
export function selectByRange(
  rootMidi: number,
  quality: VoicingQuality
): VoicingEntry | undefined {
  const typeA = queryVoicings({ quality, style: "Rootless Type A" });
  const typeB = queryVoicings({ quality, style: "Rootless Type B" });

  if (typeA.length === 0 && typeB.length === 0) return undefined;
  if (typeA.length === 0) return typeB[0];
  if (typeB.length === 0) return typeA[0];

  // Calculate where the lowest note of Type A would land
  const lowestIntervalA = Math.min(...typeA[0].intervals);
  const lowestPitchA = rootMidi + lowestIntervalA;

  // If Type A's lowest note is below the Green Zone, use Type B
  if (lowestPitchA < GREEN_ZONE.SWEET_LOW) {
    return typeB[0];
  }

  // If Type A's lowest note is above the sweet spot, still use Type A
  // (it just means the root is high, Type A keeps things from getting too spread)
  if (lowestPitchA > GREEN_ZONE.SWEET_HIGH) {
    return typeA[0];
  }

  // Default: Type A (3rd on bottom) in the sweet spot
  return typeA[0];
}

/**
 * Auto-select the best voicing for a root note and quality,
 * considering both style preference and register.
 *
 * @param root - Root note name (e.g. "C", "F#")
 * @param quality - Chord quality
 * @param octave - Base octave (default 3)
 * @param preferredStyle - Optional style preference (overrides auto-selection)
 */
export function autoSelectVoicing(
  root: string,
  quality: VoicingQuality,
  octave: number = 3,
  preferredStyle?: string
): VoicingEntry | undefined {
  // If a non-rootless style is preferred, use that directly
  if (preferredStyle) {
    const style = preferredStyle as any;
    const matches = queryVoicings({ quality, style });
    if (matches.length > 0) return matches[0];
  }

  // For rootless voicings, use the range algorithm
  const rootMidi = Note.midi(`${root}${octave}`);
  if (rootMidi == null) return undefined;

  return selectByRange(rootMidi, quality);
}
