import { describe, it, expect } from "vitest";
import { resolveChord } from "@pepperhorn/chordl-core";

describe("resolveChord", () => {
  it("resolves Cmaj7 to [C, E, G, B]", () => {
    const result = resolveChord("Cmaj7");
    expect(result.notes).toEqual(["C", "E", "G", "B"]);
  });

  it("resolves C major triad to [C, E, G]", () => {
    const result = resolveChord("C");
    expect(result.notes).toEqual(["C", "E", "G"]);
  });

  it("resolves Cm first inversion to [Eb, G, C]", () => {
    const result = resolveChord("Cm", 1);
    expect(result.notes).toEqual(["Eb", "G", "C"]);
  });

  it("resolves Cmaj7#5 to [C, E, G#, B]", () => {
    const result = resolveChord("Cmaj7#5");
    expect(result.notes).toEqual(["C", "E", "G#", "B"]);
  });

  it("resolves Dm7 to [D, F, A, C]", () => {
    const result = resolveChord("Dm7");
    expect(result.notes).toEqual(["D", "F", "A", "C"]);
  });

  it("preserves natural flat spelling for flat-root chords", () => {
    const result = resolveChord("Bbmaj7");
    expect(result.notes).toEqual(["Bb", "D", "F", "A"]);
  });

  it("throws for unknown chords", () => {
    expect(() => resolveChord("Xmaj99")).toThrow("Unknown chord");
  });

  // Compound jazz chords (fallback resolver)
  it("resolves Dmaj7#5#11 via fallback", () => {
    const result = resolveChord("Dmaj7#5#11");
    expect(result.notes).toEqual(["D", "F#", "A#", "C#", "G#"]);
  });

  it("resolves D7#5#11 via fallback", () => {
    const result = resolveChord("D7#5#11");
    expect(result.notes).toEqual(["D", "F#", "A#", "C", "G#"]);
  });

  it("resolves Dm7#11 via fallback", () => {
    const result = resolveChord("Dm7#11");
    expect(result.notes).toEqual(["D", "F", "A", "C", "G#"]);
  });

  it("resolves Cmaj7#5#11 via fallback", () => {
    const result = resolveChord("Cmaj7#5#11");
    expect(result.notes).toEqual(["C", "E", "G#", "B", "F#"]);
  });

  it("still resolves standard chords directly", () => {
    const result = resolveChord("G7#9");
    expect(result.notes).toEqual(["G", "B", "D", "F", "A#"]);
  });
});

describe("chord types tonal leaves unnamed", () => {
  // tonal resolves these to real notes but gives them `type: ""`, because the
  // ChordType carries aliases and no name. An empty type tells a consumer
  // nothing, and `mapToVoicingQuality` reads this field to choose a voicing.
  it("names a chord from its canonical alias when tonal gives none", () => {
    expect(resolveChord("Cadd9").type).toBe("Madd9");
    expect(resolveChord("Cmadd9").type).toBe("madd9");
    expect(resolveChord("CM7b5").type).toBe("M7b5");
    expect(resolveChord("C6#11").type).toBe("M6#11");
  });

  it("leaves the notes and root exactly as they were", () => {
    expect(resolveChord("Cadd9").notes).toEqual(["C", "E", "G", "D"]);
    expect(resolveChord("Cadd9").root).toBe("C");
    expect(resolveChord("CM7b5").notes).toEqual(["C", "E", "Gb", "B"]);
  });

  it("does not touch the chords tonal does name", () => {
    expect(resolveChord("Cmaj7").type).toBe("major seventh");
    expect(resolveChord("C7").type).toBe("dominant seventh");
    expect(resolveChord("C5").type).toBe("fifth");
    expect(resolveChord("Csus2").type).toBe("suspended second");
  });

  it("spells the same chord the same way however it was written", () => {
    // add2, 2 and add9 are one chord; they must not resolve three ways.
    const t = resolveChord("Cadd9").type;
    expect(resolveChord("Cadd2").type).toBe(t);
    expect(resolveChord("C2").type).toBe(t);
  });
});
