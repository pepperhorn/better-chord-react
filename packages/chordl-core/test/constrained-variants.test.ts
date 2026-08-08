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
    const firstUnsatisfied = out.findIndex((v) => !v.voicing.satisfied);
    if (firstUnsatisfied >= 0) {
      expect(out.slice(firstUnsatisfied).every((v) => !v.voicing.satisfied)).toBe(true);
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
