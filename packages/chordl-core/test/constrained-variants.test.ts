import { describe, it, expect } from "vitest";
import { mapToVoicingQuality } from "@pepperhorn/chordl-voicings";
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

  it("reduces a sharp-spelled library voicing that carries extensions", () => {
    // The primary intended input: a real quality, which is the only way
    // library voicings get selected at all. rootless-dom7-a is E A A# D — its
    // 13th (A) and 9th (D) are in neither the drop order nor the identity
    // tones, and its 7th is spelled A# where core spells Bb. Before this was
    // fixed, all four notes came back untouched under a 3-note cap.
    const quality = mapToVoicingQuality("7");
    expect(quality).toBe("dom7");

    const out = generateConstrainedVariants("C", quality, ["C", "E", "G", "Bb"], 12, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7m"],
      chordType: "dominant seventh",
    });

    const rootless = out.find((v) => v.id === "rootless-dom7-a");
    expect(rootless, "the library rootless voicing should be generated").toBeDefined();
    expect(rootless!.voicing.satisfied).toBe(true);
    expect(rootless!.voicing.notes).toHaveLength(3);
    // The 13th goes first — extensions are the safest thing to lose.
    expect(rootless!.voicing.dropped).toEqual(["A"]);
    // A# is Bb: recognised as an identity tone despite the spelling gap.
    expect(rootless!.voicing.notes.map((n) => n.note)).toEqual(["E", "A#", "D"]);
  });

  it("reduces a library voicing under a flat-spelled root", () => {
    // Cm7's 3rd is Eb to core and D# to chordl-voicings. Matching by string
    // made it neither keepable nor droppable; matching by semitone protects it.
    const quality = mapToVoicingQuality("minor seventh");
    expect(quality).toBe("min7");

    const out = generateConstrainedVariants("C", quality, ["C", "Eb", "G", "Bb"], 12, JUNIOR, {
      intervals: ["1P", "3m", "5P", "7m"],
      chordType: "minor seventh",
    });

    const rootless = out.find((v) => v.id === "rootless-min7-a");
    expect(rootless, "the library rootless voicing should be generated").toBeDefined();
    expect(rootless!.voicing.satisfied).toBe(true);
    expect(rootless!.voicing.notes).toHaveLength(3);
    expect(rootless!.voicing.dropped).toEqual(["D"]);
    // D# is Eb — the identity 3rd — and survives the reduction.
    expect(rootless!.voicing.notes.map((n) => n.note)).toEqual(["D#", "G", "A#"]);
  });

  it("holds every library variant to both caps or marks it unsatisfied", () => {
    const quality = mapToVoicingQuality("7");
    const out = generateConstrainedVariants("C", quality, ["C", "E", "G", "Bb"], 12, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7m"],
      chordType: "dominant seventh",
    });
    expect(out.length).toBeGreaterThan(6);

    for (const v of out) {
      // The floor applies whether or not the caps were met.
      expect(v.voicing.notes.length, `${v.id} fell below a dyad`).toBeGreaterThanOrEqual(2);
      if (!v.voicing.satisfied) continue;
      const perHand = new Map<string, number>();
      for (const n of v.voicing.notes) perHand.set(n.hand, (perHand.get(n.hand) ?? 0) + 1);
      for (const count of perHand.values()) {
        expect(count, `${v.id} exceeded the note cap`).toBeLessThanOrEqual(JUNIOR.maxNotesPerHand);
      }
      expect(v.voicing.span, `${v.id} exceeded the reach`).toBeLessThanOrEqual(
        JUNIOR.maxSpanPerHand,
      );
    }
  });

  it("never calls a one-note shell a satisfied chord", () => {
    // shell-dom7-r7 is C + Bb, span 10, over the 9 cap. The root is
    // droppable, but dropping it leaves a lone Bb — which used to be returned
    // as a satisfied C7, sorted ahead of genuine three-note options.
    const quality = mapToVoicingQuality("7");
    const out = generateConstrainedVariants("C", quality, ["C", "E", "G", "Bb"], 12, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7m"],
      chordType: "dominant seventh",
    });

    const shell = out.find((v) => v.id === "shell-dom7-r7");
    expect(shell, "the library shell voicing should be generated").toBeDefined();
    expect(shell!.voicing.notes).toHaveLength(2);
    expect(shell!.voicing.dropped).toEqual([]);
    expect(shell!.voicing.satisfied).toBe(false);
    // Unsatisfied, so it sorts behind the variants that genuinely fit.
    expect(out.indexOf(shell!)).toBeGreaterThan(0);
  });

  it("does not spend note budget on a doubled key", () => {
    // drop24-dom7's pitch classes are E A# E G. Re-stacked and folded, both
    // Es land on the same key, so the voicing is really three notes and fits
    // the 3-note cap without dropping anything.
    const quality = mapToVoicingQuality("7");
    const out = generateConstrainedVariants("C", quality, ["C", "E", "G", "Bb"], 12, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7m"],
      chordType: "dominant seventh",
    });

    const drop24 = out.find((v) => v.id === "drop24-dom7");
    expect(drop24, "the library drop 2+4 voicing should be generated").toBeDefined();
    expect(drop24!.voicing.dropped).toEqual([]);
    expect(drop24!.voicing.satisfied).toBe(true);
    const midis = drop24!.voicing.notes.map((n) => n.midi);
    expect(midis).toHaveLength(3);
    expect(new Set(midis).size).toBe(3);
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
