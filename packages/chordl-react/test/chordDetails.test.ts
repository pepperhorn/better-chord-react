import { describe, it, expect } from "vitest";
import {
  composeChordDetails,
  composeOctaveShift,
  splitChordDetails,
  DEFAULT_CHORD_DETAILS,
} from "../src/editor/chordDetails";

const compose = (base: string, state: Partial<typeof DEFAULT_CHORD_DETAILS>) => {
  const full = { ...DEFAULT_CHORD_DETAILS, ...state };
  return base + composeOctaveShift(full.octaveShift) + composeChordDetails(full);
};

/**
 * A card stores one string; the editor holds it as typed text plus toggles.
 * The two must be exact inverses — without the split, opening a card for edit
 * showed an empty detail panel and the first toggle appended a second
 * "note names in lg" to a string that already had one.
 */
describe("splitChordDetails", () => {
  it("reads back the annotations a card carries", () => {
    const split = splitChordDetails("C note names in xl with degrees in lg");

    expect(split.input).toBe("C");
    expect(split.showNoteNames).toBe(true);
    expect(split.noteNameSize).toBe("xl");
    expect(split.showDegrees).toBe(true);
    expect(split.degreeSize).toBe("lg");
  });

  it("reads back an octave shift", () => {
    expect(splitChordDetails("C chord up 1 octave")).toMatchObject({ input: "C", octaveShift: 1 });
    expect(splitChordDetails("C chord down 2 octaves")).toMatchObject({ input: "C", octaveShift: -2 });
  });

  it("tells midi note names from plain ones", () => {
    expect(splitChordDetails("Cmaj7 midi note names in lg")).toMatchObject({
      input: "Cmaj7",
      showNoteNames: true,
      noteNameMode: "midi",
    });
    expect(splitChordDetails("Cmaj7 note names in lg").noteNameMode).toBe("pitch-class");
  });

  it("reads auto and custom fingering apart", () => {
    expect(splitChordDetails("C with fingering in lg")).toMatchObject({
      input: "C",
      fingeringMode: "auto",
    });
    expect(splitChordDetails('C custom fingering "1,-,5" in xl')).toMatchObject({
      input: "C",
      fingeringMode: "custom",
      fingeringValues: ["1", "-", "5"],
      fingeringSize: "xl",
    });
  });

  it("leaves a phrase it does not own in the input", () => {
    // "starting on G#" belongs to the user's text, not to the form.
    const split = splitChordDetails("Cmaj7#5 starting on G# note names in lg");
    expect(split.input).toBe("Cmaj7#5 starting on G#");
    expect(split.showNoteNames).toBe(true);
  });

  it("returns defaults for a plain chord", () => {
    expect(splitChordDetails("Am7")).toEqual({ ...DEFAULT_CHORD_DETAILS, input: "Am7" });
  });

  it("round-trips everything compose can write", () => {
    const states = [
      { showNoteNames: true, noteNameSize: "xl" as const, showDegrees: true },
      { showNoteNames: true, noteNameMode: "midi" as const },
      { fingeringMode: "auto" as const, fingeringSize: "2xl" as const },
      { fingeringMode: "custom" as const, fingeringValues: ["1", "3", "5"] },
      { octaveShift: -1 },
      { octaveShift: 2, showNoteNames: true, showDegrees: true, fingeringMode: "auto" as const },
    ];

    for (const state of states) {
      const nl = compose("C", state);
      const split = splitChordDetails(nl);
      expect(split.input, nl).toBe("C");
      expect(compose(split.input, split), nl).toBe(nl);
    }
  });

  it("never leaves a clause in the text that a toggle also claims", () => {
    // The failure this guards: input keeps "note names in lg" while the toggle
    // reads on, so the next change writes the words a second time.
    const split = splitChordDetails("C note names in lg with degrees in lg");
    expect(split.input).not.toMatch(/note names|degrees/i);
  });
});
