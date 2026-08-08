import { describe, it, expect } from "vitest";
import { lookupGuitarChord } from "../src/chordLookup";
import { rootPitchClass } from "../src/pitch";
import { selectVoicings } from "../src/voicingSelect";
import type { InstrumentId } from "../src/instruments";

/**
 * Composes the three consumer-facing modules over real chords-db data, the
 * exact path lookupGuitarChord -> rootPitchClass -> selectVoicings that every
 * consumer (chordcards, frames, etc.) actually walks. voicingFacts.test.ts
 * and voicingSelect.test.ts only exercise hand-built literals; this is the
 * regression guard on wiring those modules together over the shipped data.
 */
describe("integration: lookupGuitarChord -> selectVoicings", () => {
  const cases: Array<{ label: string; instrument: InstrumentId }> = [
    { label: "C", instrument: "guitar" },
    { label: "Am", instrument: "guitar" },
    { label: "G7", instrument: "guitar" },
    { label: "C", instrument: "ukulele" },
  ];

  for (const { label, instrument } of cases) {
    it(`selects usable voicings for ${label} on ${instrument}`, () => {
      const result = lookupGuitarChord(label, instrument);
      expect(result, `expected shapes for ${label} on ${instrument}`).not.toBeNull();
      const { positions } = result!;
      expect(positions.length).toBeGreaterThan(0);

      const rootPc = rootPitchClass(label);
      expect(rootPc).not.toBeNull();

      const selection = selectVoicings(positions, {
        instrument,
        rootPc,
        alternates: 2,
      });
      expect(selection).not.toBeNull();
      const { primary, alternates } = selection!;

      // Indices round-trip into the original positions array.
      const allChosen = [primary, ...alternates];
      for (const choice of allChosen) {
        expect(choice.index).toBeGreaterThanOrEqual(0);
        expect(choice.index).toBeLessThan(positions.length);
      }

      // Primary and alternates are pairwise distinct.
      const indices = allChosen.map((c) => c.index);
      expect(new Set(indices).size).toBe(indices.length);

      // Every returned shape is a usable svguitar Chord.
      for (const choice of allChosen) {
        expect(Array.isArray(choice.shape.fingers)).toBe(true);
        expect(Array.isArray(choice.shape.barres)).toBe(true);
        expect(typeof choice.shape.position).toBe("number");
      }
    });
  }
});
