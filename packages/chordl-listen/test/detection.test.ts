import { describe, it, expect } from "vitest";
import {
  matchChord,
  ChordStabilizer,
  toChordSymbol,
  SequenceFollower,
  templateVector,
} from "../src";
import type { ChordCandidate } from "../src";

/** Build an ideal chroma vector for a set of semitone offsets from a root. */
function chromaFor(root: number, offsets: number[]): number[] {
  const v = new Array(12).fill(0);
  for (const off of offsets) v[(root + off) % 12] = 1;
  return v;
}

describe("matchChord", () => {
  it("identifies a C major triad", () => {
    const [top] = matchChord(chromaFor(0, [0, 4, 7]));
    expect(top.rootName).toBe("C");
    expect(top.quality).toBe("maj");
    expect(top.confidence).toBeCloseTo(1, 5);
  });

  it("identifies a D minor 7th", () => {
    const [top] = matchChord(chromaFor(2, [0, 3, 7, 10]));
    expect(toChordSymbol(top)).toBe("Dm7");
  });

  it("identifies a G dominant 7th", () => {
    const [top] = matchChord(chromaFor(7, [0, 4, 7, 10]));
    expect(toChordSymbol(top)).toBe("G7");
  });

  it("identifies a B half-diminished (m7b5)", () => {
    const [top] = matchChord(chromaFor(11, [0, 3, 6, 10]));
    expect(toChordSymbol(top)).toBe("Bm7b5");
  });

  it("prefers the triad over its 7th supersets for a clean triad", () => {
    const [top] = matchChord(chromaFor(5, [0, 4, 7])); // F major
    expect(top.quality).toBe("maj");
    expect(toChordSymbol(top)).toBe("F");
  });

  it("templateVector is unit length", () => {
    const v = templateVector([0, 4, 7], 0);
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(mag).toBeCloseTo(1, 6);
  });
});

describe("ChordStabilizer", () => {
  const cand = (rootName: string, quality: string, confidence = 1): ChordCandidate => ({
    root: 0, rootName, quality, label: quality, symbolSuffix: "", confidence,
  });

  it("emits only after confirmFrames agreeing frames", () => {
    const s = new ChordStabilizer({ confirmFrames: 3, minConfidence: 0.85 });
    expect(s.update(cand("C", "maj")).changed).toBe(false);
    expect(s.update(cand("C", "maj")).changed).toBe(false);
    const r = s.update(cand("C", "maj"));
    expect(r.changed).toBe(true);
    expect(r.stable?.rootName).toBe("C");
  });

  it("does not re-emit a held chord every frame", () => {
    const s = new ChordStabilizer({ confirmFrames: 2 });
    s.update(cand("C", "maj"));
    expect(s.update(cand("C", "maj")).changed).toBe(true);
    expect(s.update(cand("C", "maj")).changed).toBe(false);
    expect(s.update(cand("C", "maj")).changed).toBe(false);
  });

  it("ignores low-confidence frames but keeps the held chord", () => {
    const s = new ChordStabilizer({ confirmFrames: 2, minConfidence: 0.85 });
    s.update(cand("C", "maj"));
    s.update(cand("C", "maj"));
    const r = s.update(cand("D", "min", 0.4)); // noisy frame
    expect(r.changed).toBe(false);
    expect(r.stable?.rootName).toBe("C");
  });

  it("re-emits a chord after a different chord intervened", () => {
    const s = new ChordStabilizer({ confirmFrames: 1 });
    expect(s.update(cand("C", "maj")).changed).toBe(true);
    expect(s.update(cand("G", "maj")).changed).toBe(true);
    expect(s.update(cand("C", "maj")).changed).toBe(true);
  });
});

describe("SequenceFollower", () => {
  const seq = [
    { chord: "Dm7", page: 1 },
    { chord: "G7", page: 1 },
    { chord: "Cmaj7", page: 2 },
  ];

  it("advances and reports page changes on boundary crossings", () => {
    const f = new SequenceFollower({ sequence: seq, confirmFrames: 1, lookahead: 3 });
    expect(f.onChordDetected("G7")).toEqual({ advanced: true }); // same page 1
    const r = f.onChordDetected("Cmaj7");
    expect(r.advanced).toBe(true);
    expect(r.page).toBe(2);
  });

  it("stays put on an unrecognized chord", () => {
    const f = new SequenceFollower({ sequence: seq, confirmFrames: 1 });
    expect(f.onChordDetected("Ab7")).toEqual({ advanced: false });
    expect(f.position).toBe(0);
  });

  it("requires confirmFrames before advancing", () => {
    const f = new SequenceFollower({ sequence: seq, confirmFrames: 2 });
    expect(f.onChordDetected("G7").advanced).toBe(false);
    expect(f.onChordDetected("G7").advanced).toBe(true);
  });
});
