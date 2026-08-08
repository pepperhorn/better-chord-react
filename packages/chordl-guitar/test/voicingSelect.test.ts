import { describe, it, expect } from "vitest";
import { matchesShapeClass, canonicalPositionIndex } from "../src/voicingSelect";
import { positionFacts } from "../src/voicingFacts";
import { INSTRUMENTS } from "../src/instruments";

const guitar = INSTRUMENTS.guitar.openMidi;

const OPEN_C = { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [] };
const BARRE_C3 = { frets: [1, 1, 3, 3, 3, 1], fingers: [1, 1, 2, 3, 4, 1], baseFret: 3, barres: [1] };
const BARRE_C5 = { frets: [-1, -1, 1, 1, 1, 4], fingers: [0, 0, 1, 1, 1, 4], baseFret: 5, barres: [1] };
const BARRE_C8 = { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8, barres: [1] };
const C_POSITIONS = [OPEN_C, BARRE_C3, BARRE_C5, BARRE_C8];

describe("matchesShapeClass", () => {
  it("accepts only nut-position barre-free shapes as open", () => {
    expect(matchesShapeClass(positionFacts(OPEN_C, guitar, 0), "open")).toBe(true);
    expect(matchesShapeClass(positionFacts(BARRE_C3, guitar, 0), "open")).toBe(false);
  });

  it("accepts any barre-free shape as no-barre", () => {
    expect(matchesShapeClass(positionFacts(OPEN_C, guitar, 0), "no-barre")).toBe(true);
    expect(matchesShapeClass(positionFacts(BARRE_C8, guitar, 0), "no-barre")).toBe(false);
  });

  it("accepts everything as any", () => {
    for (const p of C_POSITIONS) {
      expect(matchesShapeClass(positionFacts(p, guitar, 0), "any")).toBe(true);
    }
  });
});

describe("canonicalPositionIndex", () => {
  it("prefers the first root-position shape on guitar", () => {
    const i = canonicalPositionIndex(C_POSITIONS, guitar, { instrument: "guitar", rootPc: 0 });
    expect(i).toBe(0); // open C, root position
  });

  it("falls back to the first position when no shape is root position", () => {
    // Both are 2nd inversion for C.
    const i = canonicalPositionIndex([BARRE_C3, BARRE_C5], guitar, { instrument: "guitar", rootPc: 0 });
    expect(i).toBe(0);
  });

  it("prefers root position over a lower-fret inversion on guitar", () => {
    // BARRE_C3 is 2nd inversion at baseFret 3; BARRE_C8 is root position at
    // baseFret 8. A compactness rule would pick index 0 — on guitar the
    // inversion must win, which is what separates it from the ukulele rule.
    const i = canonicalPositionIndex([BARRE_C3, BARRE_C8], guitar, {
      instrument: "guitar",
      rootPc: 0,
    });
    expect(i).toBe(1);
  });

  it("ranks ukulele on compactness, not inversion", () => {
    const uke = INSTRUMENTS.ukulele.openMidi;
    // Root position (bass C at MIDI 60) with higher baseFret; ukulele should reject it
    // in favor of lower baseFret even though it's non-root (1st inversion, bass E at MIDI 64).
    const rootHighFret = { frets: [-1, 0, -1, -1], fingers: [0, 0, 0, 0], baseFret: 5, barres: [] };
    // Bass MIDI: 60 (C, root position for C chord)
    const nonRootLowFret = { frets: [-1, -1, 0, -1], fingers: [0, 0, 0, 0], baseFret: 1, barres: [] };
    // Bass MIDI: 64 (E, 1st inversion for C chord)
    const i = canonicalPositionIndex([rootHighFret, nonRootLowFret], uke, {
      instrument: "ukulele",
      rootPc: 0,
    });
    expect(i).toBe(1); // lowest baseFret wins despite non-root inversion
  });

  it("never picks a duplicate voicing", () => {
    const i = canonicalPositionIndex([{ ...OPEN_C }, OPEN_C, BARRE_C8], guitar, {
      instrument: "guitar",
      rootPc: 0,
    });
    expect(i).toBe(0);
  });
});
