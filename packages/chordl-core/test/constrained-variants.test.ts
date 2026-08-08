import { describe, it, expect } from "vitest";
import { generateConstrainedVariants } from "../src/theory/constrained-variants";

const JUNIOR = { maxSpanPerHand: 9, maxNotesPerHand: 3 };

describe("generateConstrainedVariants", () => {
  it("returns variants that fit before ones that do not", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7M"],
      chordType: "major seventh",
    });
    expect(out.length).toBeGreaterThan(0);
    // Once an unsatisfied variant appears, every variant after it must also
    // be unsatisfied — satisfied variants never trail behind unsatisfied
    // ones. Assert the partition property directly: no `false` (unsatisfied)
    // can be followed later in the array by a `true` (satisfied). Guarding
    // this behind `if (firstUnsatisfied >= 0)` asserts nothing when every
    // variant happens to be satisfied, which is exactly what this fixture
    // produces.
    const flags = out.map((v) => v.voicing.satisfied);
    let sawUnsatisfied = false;
    for (const satisfied of flags) {
      if (!satisfied) sawUnsatisfied = true;
      else expect(sawUnsatisfied).toBe(false);
    }
  });

  it("keeps every chord tone when an inversion fits the reach", () => {
    // Span is the binding constraint here, not note count. Root-position
    // Cmaj7 places as C3=48 E3=52 G3=55 B3=59 — span 11, over the 9 cap, so
    // it must lose a tone. Its first inversion places as E3=52 G3=55 B3=59
    // C4=60 — span 8 — and survives with all four tones. That is the whole
    // reason generateConstrainedVariants tries variants rather than
    // constraining one voicing in isolation.
    const REACH_BOUND = { maxSpanPerHand: 9, maxNotesPerHand: 4 };
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, REACH_BOUND, {
      intervals: ["1P", "3M", "5P", "7M"],
      chordType: "major seventh",
    });
    const intact = out.find((v) => v.voicing.satisfied && v.voicing.dropped.length === 0);
    expect(intact, "an inversion should fit without dropping").toBeDefined();
    expect(intact!.voicing.notes.length).toBe(4);
  });

  it("never returns an empty list for a plain triad", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, JUNIOR, {
      intervals: ["1P", "3M", "5P"],
      chordType: "major",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].voicing.satisfied).toBe(true);
  });

  it("carries the source variant's id and label through", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, JUNIOR, {
      intervals: ["1P", "3M", "5P"],
      chordType: "major",
    });
    expect(out[0].id).toBeTruthy();
    expect(out[0].label).toBeTruthy();
  });

  it("falls back to a safe drop order when intervals are unavailable", () => {
    // resolveChord returns undefined intervals for special-builder chords.
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, JUNIOR);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].voicing.notes.length).toBeGreaterThanOrEqual(2);
  });

  it("fallback: keeps the 5th and only the root droppable for a triad", () => {
    // No intervals passed, so this exercises fallbackDropOrder. For a triad
    // (notes.length <= 3), position stands in for role: C=root, E=3rd,
    // G=5th. A triad needs its 5th to still read as a triad, so only the
    // root should ever be dropped. Constraints tight enough (2 notes/hand)
    // to force exactly one drop from the 3-note chord.
    const TRIAD_TIGHT = { maxSpanPerHand: 9, maxNotesPerHand: 2 };
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, TRIAD_TIGHT);
    expect(out.length).toBeGreaterThan(0);
    for (const v of out) {
      expect(v.voicing.dropped).toEqual(["C"]);
      expect(v.voicing.notes.map((n) => n.note).sort()).toEqual(["E", "G"]);
    }
  });

  it("fallback: drops the 5th before the root for a 4-note chord, forming a shell", () => {
    // No intervals passed. For a 4-note chord, position stands in for role:
    // C=root, E=3rd, G=5th, B=7th. The 5th is conventionally omittable and
    // should go before the root; the root should be droppable last so a
    // shell (3rd + 7th) can form. Constraints tight enough (2 notes/hand) to
    // force both drops from the 4-note chord.
    const SHELL_TIGHT = { maxSpanPerHand: 9, maxNotesPerHand: 2 };
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, SHELL_TIGHT);
    expect(out.length).toBeGreaterThan(0);
    for (const v of out) {
      // 5th dropped before root — order matters, not just membership.
      expect(v.voicing.dropped).toEqual(["G", "C"]);
      // What survives is the shell: 3rd + 7th, root dropped last.
      expect(v.voicing.notes.map((n) => n.note).sort()).toEqual(["B", "E"]);
    }
  });

  it("tightens the result as the reach shrinks", () => {
    const roomy = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, {
      maxSpanPerHand: 24,
      maxNotesPerHand: 4,
    }, { intervals: ["1P", "3M", "5P", "7M"], chordType: "major seventh" });
    const tight = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, {
      maxSpanPerHand: 5,
      maxNotesPerHand: 2,
    }, { intervals: ["1P", "3M", "5P", "7M"], chordType: "major seventh" });

    const maxNotes = (xs: typeof roomy) => Math.max(...xs.map((v) => v.voicing.notes.length));
    expect(maxNotes(tight)).toBeLessThan(maxNotes(roomy));
  });
});
