import { describe, it, expect } from "vitest";
import { matchesShapeClass, canonicalPositionIndex, selectVoicings } from "../src/voicingSelect";
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
    const i = canonicalPositionIndex(C_POSITIONS, { instrument: "guitar", rootPc: 0 });
    expect(i).toBe(0); // open C, root position
  });

  it("falls back to the first position when no shape is root position", () => {
    // Both are 2nd inversion for C.
    const i = canonicalPositionIndex([BARRE_C3, BARRE_C5], { instrument: "guitar", rootPc: 0 });
    expect(i).toBe(0);
  });

  it("prefers root position over a lower-fret inversion on guitar", () => {
    // BARRE_C3 is 2nd inversion at baseFret 3; BARRE_C8 is root position at
    // baseFret 8. A compactness rule would pick index 0 — on guitar the
    // inversion must win, which is what separates it from the ukulele rule.
    const i = canonicalPositionIndex([BARRE_C3, BARRE_C8], {
      instrument: "guitar",
      rootPc: 0,
    });
    expect(i).toBe(1);
  });

  it("ranks ukulele on compactness, not inversion", () => {
    // Root position (bass C at MIDI 60) with higher baseFret; ukulele should reject it
    // in favor of lower baseFret even though it's non-root (1st inversion, bass E at MIDI 64).
    const rootHighFret = { frets: [-1, 0, -1, -1], fingers: [0, 0, 0, 0], baseFret: 5, barres: [] };
    // Bass MIDI: 60 (C, root position for C chord)
    const nonRootLowFret = { frets: [-1, -1, 0, -1], fingers: [0, 0, 0, 0], baseFret: 1, barres: [] };
    // Bass MIDI: 64 (E, 1st inversion for C chord)
    const i = canonicalPositionIndex([rootHighFret, nonRootLowFret], {
      instrument: "ukulele",
      rootPc: 0,
    });
    expect(i).toBe(1); // lowest baseFret wins despite non-root inversion
  });

  it("never picks a duplicate voicing", () => {
    const i = canonicalPositionIndex([{ ...OPEN_C }, OPEN_C, BARRE_C8], {
      instrument: "guitar",
      rootPc: 0,
    });
    expect(i).toBe(0);
  });
});

describe("selectVoicings", () => {
  it("picks the canonical shape as primary", () => {
    const r = selectVoicings(C_POSITIONS, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    expect(r.primary.index).toBe(0);
    expect(r.primary.facts.isOpenShape).toBe(true);
  });

  it("avoids two same-profile alternates and surfaces the contrasting one", () => {
    // positions 1 and 2 are both 2nd-inversion barres; position 3 is a
    // root-position barre. Naive first-n takes 1 and 2 and never reaches 3.
    const r = selectVoicings(C_POSITIONS, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    const picked = r.alternates.map((a) => a.index);
    expect(picked).toContain(3);
    expect(picked).not.toEqual([1, 2]);
    expect(r.short).toBe(false);
  });

  it("never returns the same voicing twice", () => {
    const r = selectVoicings([OPEN_C, { ...OPEN_C }, BARRE_C8], {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    const chosen = [r.primary.index, ...r.alternates.map((a) => a.index)];
    expect(new Set(chosen).size).toBe(chosen.length);
    expect(r.alternates).toHaveLength(1);
    expect(r.short).toBe(true);
  });

  it("restricts candidates to the requested shape class", () => {
    const r = selectVoicings(C_POSITIONS, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
      shapeClass: "open",
    })!;
    expect(r.primary.facts.isOpenShape).toBe(true);
    expect(r.alternates).toHaveLength(0);
    expect(r.short).toBe(true);
  });

  it("widens by one rung when allowNextRung is set", () => {
    // Only the open C is barre-free, so "no-barre" alone yields no alternates;
    // widening to "any" brings the barre shapes into the pool.
    const narrow = selectVoicings(C_POSITIONS, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
      shapeClass: "no-barre",
    })!;
    expect(narrow.alternates).toHaveLength(0);

    const widened = selectVoicings(C_POSITIONS, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
      shapeClass: "no-barre",
      allowNextRung: true,
    })!;
    expect(widened.alternates).toHaveLength(2);
  });

  it("labels each choice from its facts", () => {
    const r = selectVoicings(C_POSITIONS, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    expect(r.primary.label).toBe("Open");
    expect(r.alternates.some((a) => a.label.startsWith("Barre, fret "))).toBe(true);
  });

  it("returns null for an empty position list", () => {
    expect(selectVoicings([], { instrument: "guitar", rootPc: 0, alternates: 2 })).toBeNull();
  });
});
