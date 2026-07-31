import { describe, it, expect } from "vitest";
import {
  normalizeToDetectorSymbol,
  sequenceFromChords,
  pageCount,
} from "../src/follow/sequenceFromChords";

describe("normalizeToDetectorSymbol", () => {
  it("passes through the detector's own vocabulary", () => {
    expect(normalizeToDetectorSymbol("Am")).toBe("Am");
    expect(normalizeToDetectorSymbol("G7")).toBe("G7");
    expect(normalizeToDetectorSymbol("Cmaj7")).toBe("Cmaj7");
    expect(normalizeToDetectorSymbol("Dm7")).toBe("Dm7");
    expect(normalizeToDetectorSymbol("C")).toBe("C");
  });

  it("folds flat roots to sharp spelling (detector vocabulary)", () => {
    expect(normalizeToDetectorSymbol("Bb")).toBe("A#");
    expect(normalizeToDetectorSymbol("Bbm7")).toBe("A#m7");
    expect(normalizeToDetectorSymbol("Db")).toBe("C#");
    expect(normalizeToDetectorSymbol("Eb7")).toBe("D#7");
    expect(normalizeToDetectorSymbol("Gb")).toBe("F#");
  });

  it("degrades richer chords to the nearest hearable template", () => {
    expect(normalizeToDetectorSymbol("Cmaj9")).toBe("Cmaj7");
    expect(normalizeToDetectorSymbol("C9")).toBe("C7");
    expect(normalizeToDetectorSymbol("C13")).toBe("C7");
    expect(normalizeToDetectorSymbol("Cm9")).toBe("Cm7");
    expect(normalizeToDetectorSymbol("Cadd9")).toBe("C"); // no 7th → triad
  });

  it("maps alternate quality spellings", () => {
    expect(normalizeToDetectorSymbol("CM7")).toBe("Cmaj7");
    expect(normalizeToDetectorSymbol("Cmin7")).toBe("Cm7");
    expect(normalizeToDetectorSymbol("Csus")).toBe("Csus4");
    expect(normalizeToDetectorSymbol("Cdim7")).toBe("Cdim7");
    expect(normalizeToDetectorSymbol("Cm7b5")).toBe("Cm7b5");
  });

  it("returns null for non-chords (scales, note lists, junk)", () => {
    expect(normalizeToDetectorSymbol("c major scale")).toBeNull();
    expect(normalizeToDetectorSymbol("")).toBeNull();
    expect(normalizeToDetectorSymbol("notes c e g")).toBeNull();
  });
});

describe("sequenceFromChords", () => {
  it("keeps index alignment and chunks pages", () => {
    const seq = sequenceFromChords(["Am", "Dm7", "G7", "Cmaj7", "F"], 2);
    expect(seq.map((e) => e.chord)).toEqual(["Am", "Dm7", "G7", "Cmaj7", "F"]);
    expect(seq.map((e) => e.page)).toEqual([1, 1, 2, 2, 3]);
  });

  it("uses an empty sentinel for unmatchable entries but keeps their slot", () => {
    const seq = sequenceFromChords(["Am", "c major scale", "G7"], 4);
    expect(seq.map((e) => e.chord)).toEqual(["Am", "", "G7"]);
    expect(seq).toHaveLength(3);
  });
});

describe("pageCount", () => {
  it("counts pages at perPage chords each, minimum 1", () => {
    expect(pageCount(0, 4)).toBe(1);
    expect(pageCount(4, 4)).toBe(1);
    expect(pageCount(5, 4)).toBe(2);
    expect(pageCount(9, 4)).toBe(3);
  });
});
