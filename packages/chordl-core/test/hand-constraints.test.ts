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

  it("preserves hand hints for duplicate pitch classes", () => {
    // Doubled root across hands: C in LH and C in RH. Each should keep its hint.
    const r = constrainVoicing({
      notes: ["C", "E", "G", "C"],
      handHints: ["LH", "LH", "RH", "RH"],
      dropOrder: ["G", "C", "E"],
      keepAtLeast: ["E"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 4 },
    });
    expect(r.notes).toHaveLength(4);
    // Verify hand assignments: first C is LH, second C is RH
    expect(r.notes[0].note).toBe("C");
    expect(r.notes[0].hand).toBe("LH");
    expect(r.notes[3].note).toBe("C");
    expect(r.notes[3].hand).toBe("RH");
  });

  it("drops only one occurrence when dropping a duplicate pitch class", () => {
    // Voicing with doubled root: ["C", "E", "G", "C"] treated as single hand.
    // With maxNotesPerHand: 3, one note must drop.
    const r = constrainVoicing({
      notes: ["C", "E", "G", "C"],
      dropOrder: ["C", "G", "E"],
      keepAtLeast: ["E"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 3 },
    });
    // Dropping C should remove exactly one occurrence (the last one, C4).
    expect(r.dropped).toEqual(["C"]);
    expect(r.notes).toHaveLength(3);
    // Remaining notes in voicing order: C3, E3, G3.
    expect(r.notes.map((n) => n.note)).toEqual(["C", "E", "G"]);
    expect(r.notes.map((n) => n.midi)).toEqual([48, 52, 55]);
  });

  it("matches dropOrder and keepAtLeast by semitone, not by spelling", () => {
    // chordl-voicings spells library variants with sharps; core's resolver
    // yields flats. "A#" and "Bb" are one key, so a drop order and identity
    // list written in flats must still recognise a voicing written in sharps.
    // Without semitone matching, A# is invisible: neither kept nor droppable.
    const r = constrainVoicing({
      notes: ["C", "E", "G", "A#"],
      dropOrder: ["G", "C", "E", "Bb"],
      keepAtLeast: ["E", "Bb"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual(["G", "C"]);
    // A# was recognised as the kept 7th and survived — and kept its own
    // spelling rather than being rewritten as the "Bb" that matched it.
    expect(r.notes.map((n) => n.note)).toEqual(["E", "A#"]);
  });

  it("reports the dropped note with its own spelling", () => {
    const r = constrainVoicing({
      notes: ["C", "D#", "A#"],
      dropOrder: ["Eb", "C"],
      keepAtLeast: ["Bb"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 2 },
    });
    expect(r.dropped).toEqual(["D#"]);
    expect(r.notes.map((n) => n.note)).toEqual(["C", "A#"]);
  });

  it("stops at two notes rather than returning a lone pitch", () => {
    // Shell C7: root + 7th, C3=48 to A#3=58, span 10 — over the 9 cap, and
    // folding cannot help because A# is already in the base octave. The root
    // is droppable, but dropping it would leave a single note claiming to be
    // a C7. A dyad is the floor: report failure instead.
    const r = constrainVoicing({
      notes: ["C", "A#"],
      dropOrder: ["G", "C"],
      keepAtLeast: ["E", "Bb"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(false);
    expect(r.dropped).toEqual([]);
    expect(r.notes.map((n) => n.note)).toEqual(["C", "A#"]);
    expect(r.span).toBe(10);
  });

  it("reduces down to the floor but no further", () => {
    // Everything is droppable here, so only the two-note floor stops it.
    const r = constrainVoicing({
      notes: ["C", "E", "G"],
      dropOrder: ["G", "E", "C"],
      keepAtLeast: [],
      constraints: { maxSpanPerHand: 1, maxNotesPerHand: 1 },
    });
    expect(r.notes).toHaveLength(2);
    expect(r.dropped).toEqual(["G"]);
    expect(r.satisfied).toBe(false);
  });

  it("counts two notes on the same key once", () => {
    // drop24-maj7's pitch classes are E B E G. Re-stacked and folded to the
    // hand, both Es land on MIDI 52 — one key, one finger. Counting them
    // separately would make a 3-note voicing look like 4 and force a needless
    // drop.
    const r = constrainVoicing({
      notes: ["E", "B", "E", "G"],
      dropOrder: ["G", "C"],
      keepAtLeast: ["E", "B"],
      constraints: JUNIOR,
    });
    expect(r.dropped).toEqual([]);
    expect(r.satisfied).toBe(true);
    expect(r.notes.map((n) => n.midi)).toEqual([52, 59, 55]);
    expect(new Set(r.notes.map((n) => n.midi)).size).toBe(3);
  });

  it("falls back to the default hand when handHints is short", () => {
    // constrainVoicing is a public export, so a caller can pass a hint array
    // shorter than notes. Every ConstrainedNote must still carry a real Hand.
    const r = constrainVoicing({
      notes: ["C", "E", "G"],
      handHints: ["RH"],
      dropOrder: ["G", "C"],
      keepAtLeast: ["E"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 4 },
    });
    expect(r.notes).toHaveLength(3);
    expect(r.notes.map((n) => n.hand)).toEqual(["RH", "LH", "LH"]);
    for (const n of r.notes) expect(n.hand).toBeDefined();
  });

  it("asserts per-hand octaves in hand-split voicing", () => {
    // Test that octaves remain hand-local and unfolded when each hand fits independently.
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
    // C3=48, G3=55, E4=64, B4=71 — no hand-crossing fold
    expect(r.notes.map((n) => n.midi)).toEqual([48, 55, 64, 71]);
  });

  it("handles interleaved hand hints, not just block-contiguous ones", () => {
    // Every other test uses ["LH","LH","RH","RH"]. Here hints alternate
    // ["LH","RH","LH","RH"], so each hand's notes are non-adjacent in the
    // voicing — the grouping-by-hand and the per-hand fold both have to do
    // real work to find them.
    //
    // Derivation, from midi = PC_SEMITONES[note] + (octave + 1) * 12:
    //   Unfolded placement walks all four notes in voicing order (hand is
    //   irrelevant to this pass), bumping the octave only when a note's
    //   semitone would not ascend past the previous note's:
    //     C: semitone 0, first note -> octave 3
    //     E: semitone 4, ascends past 0 -> octave 3
    //     G: semitone 7, ascends past 4 -> octave 3
    //     B: semitone 11, ascends past 7 -> octave 3
    //   So unfolded = C3 E3 G3 B3 = MIDI 48, 52, 55, 59.
    //   Grouped by hand: LH = [C3=48, G3=55], span 7; RH = [E3=52, B3=59],
    //   span 7. Both spans are already within the 9-semitone cap, so neither
    //   hand needs re-folding — the unfolded placement stands.
    const r = constrainVoicing({
      notes: ["C", "E", "G", "B"],
      handHints: ["LH", "RH", "LH", "RH"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual([]);
    expect(r.notes.map((n) => n.midi)).toEqual([48, 52, 55, 59]);
    expect(r.notes.map((n) => n.hand)).toEqual(["LH", "RH", "LH", "RH"]);
  });
});

import * as core from "../src/index";

describe("public API", () => {
  it("exports the hand-constraint surface", () => {
    for (const name of [
      "midiOf",
      "placeAscending",
      "spanOf",
      "constrainVoicing",
      "generateConstrainedVariants",
    ]) {
      expect(core, `missing export ${name}`).toHaveProperty(name);
    }
  });
});
