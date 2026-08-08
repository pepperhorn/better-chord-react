import { describe, it, expect } from "vitest";
import { positionFacts, duplicateVoicingMap } from "../src/voicingFacts";
import { INSTRUMENTS } from "../src/instruments";

const guitar = INSTRUMENTS.guitar.openMidi;

// C major, chords-db positions 0-3.
const OPEN_C = { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [] };
const BARRE_C3 = { frets: [1, 1, 3, 3, 3, 1], fingers: [1, 1, 2, 3, 4, 1], baseFret: 3, barres: [1] };
const BARRE_C8 = { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8, barres: [1] };

describe("positionFacts", () => {
  it("reads the open C as a root-position open shape", () => {
    const f = positionFacts(OPEN_C, guitar, 0);
    expect(f.midi).toEqual([48, 52, 55, 60, 64]);
    expect(f.bassMidi).toBe(48);
    expect(f.inversion).toBe("root");
    expect(f.noteCount).toBe(5);
    expect(f.pitchClasses).toEqual([0, 4, 7]);
    expect(f.doubledCount).toBe(2);
    expect(f.hasBarre).toBe(false);
    expect(f.isOpenShape).toBe(true);
    expect(f.baseFret).toBe(1);
  });

  it("reads the 3rd-fret barre C as a 2nd inversion barre shape", () => {
    const f = positionFacts(BARRE_C3, guitar, 0);
    expect(f.bassMidi).toBe(43);
    expect(f.inversion).toBe("2nd");
    expect(f.hasBarre).toBe(true);
    expect(f.isOpenShape).toBe(false);
  });

  it("reads the 8th-fret barre C as root position", () => {
    expect(positionFacts(BARRE_C8, guitar, 0).inversion).toBe("root");
  });

  it("classifies a 7th in the bass as 3rd inversion", () => {
    // Synthetic: F2 in the bass against a G root — a 10-semitone interval.
    const pos = { frets: [1, -1, -1, -1, -1, -1], fingers: [1, 0, 0, 0, 0, 0], baseFret: 1, barres: [] };
    expect(positionFacts(pos, guitar, 7).inversion).toBe("3rd");
  });

  it("reports 'other' when the root pitch class is unknown", () => {
    expect(positionFacts(OPEN_C, guitar, null).inversion).toBe("other");
  });
});

describe("duplicateVoicingMap", () => {
  it("marks a later position that sounds identical to an earlier one", () => {
    const map = duplicateVoicingMap([OPEN_C, BARRE_C3, { ...OPEN_C }], guitar);
    expect(map).toEqual([null, null, 0]);
  });

  it("marks nothing when every voicing differs", () => {
    expect(duplicateVoicingMap([OPEN_C, BARRE_C3, BARRE_C8], guitar)).toEqual([null, null, null]);
  });
});
