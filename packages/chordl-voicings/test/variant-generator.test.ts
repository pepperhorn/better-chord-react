import { describe, it, expect } from "vitest";
import { generateVariants } from "../src/variant-generator.js";
import type { VoicingVariant } from "../src/types.js";

const labels = (vs: VoicingVariant[]) => vs.map((v) => v.label);
const sources = (vs: VoicingVariant[]) => vs.map((v) => v.source);

/**
 * The A/B/C toggle is how a learner meets alternatives to what they typed, and
 * the first thing they should meet is the same chord with a different note in
 * the bass — an inversion. Library and algorithmic voicings change *which*
 * notes sound; an inversion changes only the order, so it is the smaller step
 * and belongs first.
 */
describe("generateVariants — inversions come before other voicings", () => {
  it("fills the slots after the default with inversions, in order", () => {
    const variants = generateVariants("C", "maj7", ["C", "E", "G", "B"], 4);

    expect(labels(variants)).toEqual([
      "Root position",
      "1st inv",
      "2nd inv",
      "3rd inv",
    ]);
  });

  it("rotates the notes so each inversion starts on the next chord tone", () => {
    const variants = generateVariants("C", "maj7", ["C", "E", "G", "B"], 4);

    expect(variants.map((v) => v.notes)).toEqual([
      ["C", "E", "G", "B"],
      ["E", "G", "B", "C"],
      ["G", "B", "C", "E"],
      ["B", "C", "E", "G"],
    ]);
  });

  it("reaches library voicings only once every inversion is offered", () => {
    // 4-note chord: default + 3 inversions = 4 slots before anything else.
    const variants = generateVariants("C", "maj7", ["C", "E", "G", "B"], 9);

    const firstLibrary = sources(variants).indexOf("library");
    const lastInversion = sources(variants).lastIndexOf("inversion");

    expect(firstLibrary).toBeGreaterThan(-1);
    expect(firstLibrary).toBeGreaterThan(lastInversion);
  });

  it("keeps a style hint in slot A and still offers the inversions next", () => {
    // A style hint means the user asked for that voicing by name: it stays the
    // default, but the alternatives beneath it are still inversions first.
    const variants = generateVariants("C", "maj7", ["C", "E", "G", "B"], 4, {
      styleHint: "rootless",
    });

    expect(variants[0].source).toBe("library");
    expect(labels(variants).slice(1)).toEqual(["1st inv", "2nd inv", "3rd inv"]);
  });

  it("puts algorithmic variants last, after the library ones", () => {
    const variants = generateVariants("C", "maj7", ["C", "E", "G", "B"], 30);
    const src = sources(variants);

    const firstAlgorithmic = src.indexOf("algorithmic");
    const lastLibrary = src.lastIndexOf("library");

    expect(firstAlgorithmic).toBeGreaterThan(-1);
    expect(firstAlgorithmic).toBeGreaterThan(lastLibrary);
  });

  it("offers both inversions of a triad before anything else", () => {
    // A plain triad has no voicing quality, so the library tier is empty and
    // only the ordering against the algorithmic tier is observable.
    const variants = generateVariants("D", undefined, ["D", "F#", "A"], 3);

    expect(labels(variants)).toEqual(["Root position", "1st inv", "2nd inv"]);
  });

  it("does not repeat an inversion that a library voicing already produced", () => {
    const variants = generateVariants("C", "maj7", ["C", "E", "G", "B"], 30);
    const seen = variants.map((v) => v.notes.join(","));

    expect(new Set(seen).size).toBe(seen.length);
  });

  it("still honours the requested count", () => {
    expect(generateVariants("C", "maj7", ["C", "E", "G", "B"], 2)).toHaveLength(2);
  });
});
