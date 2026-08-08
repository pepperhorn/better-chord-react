import { describe, it, expect } from "vitest";
import { midiOf, placeAscending, spanOf } from "../src/theory/hand-constraints";

describe("midiOf", () => {
  it("uses the C4 = 60 convention", () => {
    expect(midiOf("C", 4)).toBe(60);
    expect(midiOf("A", 3)).toBe(57);
  });

  it("accepts flats as well as sharps", () => {
    expect(midiOf("Bb", 3)).toBe(58);
    expect(midiOf("A#", 3)).toBe(58);
  });
});

describe("placeAscending", () => {
  it("stacks a triad upward without bumping the octave", () => {
    expect(placeAscending(["C", "E", "G"], 3).map((n) => n.midi)).toEqual([48, 52, 55]);
  });

  it("bumps the octave when a note would descend", () => {
    // 1st inversion Cmaj7: C wraps above B.
    expect(placeAscending(["E", "G", "B", "C"], 3).map((n) => n.midi)).toEqual([52, 55, 59, 60]);
  });

  it("returns an empty array for no notes", () => {
    expect(placeAscending([], 3)).toEqual([]);
  });
});

describe("spanOf", () => {
  it("measures lowest to highest in semitones", () => {
    expect(spanOf([48, 52, 55])).toBe(7);
    expect(spanOf([52, 59])).toBe(7);
  });

  it("is zero for one note or none", () => {
    expect(spanOf([60])).toBe(0);
    expect(spanOf([])).toBe(0);
  });
});

import { constrainVoicing } from "../src/theory/hand-constraints";

describe("constrainVoicing", () => {
  const JUNIOR = { maxSpanPerHand: 9, maxNotesPerHand: 3 };

  it("leaves a triad alone when it already fits", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "G"],
      dropOrder: ["G", "C", "E"],
      keepAtLeast: ["E"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual([]);
    expect(r.notes.map((n) => n.note)).toEqual(["C", "E", "G"]);
    expect(r.span).toBe(7);
  });

  it("drops toward a shell voicing when a maj7 cannot be reached", () => {
    // Root-position Cmaj7 spans C3-B3 = 11 semitones, over the 9 cap, and
    // octave folding cannot help because every note is already in one octave.
    const r = constrainVoicing({
      notes: ["C", "E", "G", "B"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual(["G", "C"]);
    expect(r.notes.map((n) => n.note)).toEqual(["E", "B"]);
    expect(r.span).toBe(7);
  });

  it("enforces the note-count cap even when the span already fits", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "G", "B"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 3 },
    });
    expect(r.notes).toHaveLength(3);
    expect(r.dropped).toEqual(["G"]);
    expect(r.satisfied).toBe(true);
  });

  it("never drops an identity tone, reporting failure instead", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "B"],
      dropOrder: ["C", "E", "B"],
      keepAtLeast: ["C", "E", "B"],
      constraints: { maxSpanPerHand: 3, maxNotesPerHand: 3 },
    });
    expect(r.satisfied).toBe(false);
    expect(r.dropped).toEqual([]);
    expect(r.notes).toHaveLength(3);
  });

  it("clamps a note cap below 2 up to 2", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "G"],
      dropOrder: ["G", "C", "E"],
      keepAtLeast: ["E"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 1 },
    });
    expect(r.notes).toHaveLength(2);
  });

  it("measures span per hand, not across the whole voicing", () => {
    // Ascending placement from octave 3: C3=48 G3=55 | E4=64 B4=71.
    // LH span 7, RH span 7 — but the whole-voicing span is 23, well over the cap.
    const r = constrainVoicing({
      notes: ["C", "G", "E", "B"],
      handHints: ["LH", "LH", "RH", "RH"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: { maxSpanPerHand: 9, maxNotesPerHand: 2 },
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual([]);
    expect(r.notes).toHaveLength(4);
  });

  it("treats a voicing with no hand hints as a single hand", () => {
    const r = constrainVoicing({
      notes: ["C", "G", "E", "B"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: { maxSpanPerHand: 9, maxNotesPerHand: 2 },
    });
    expect(r.notes.length).toBeLessThan(4);
  });
});
