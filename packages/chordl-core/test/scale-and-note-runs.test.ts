import { describe, it, expect } from "vitest";
import {
  parseChordDescription,
  resolveScale,
  processChordRequest,
} from "@pepperhorn/chordl-core";

describe("scale parsing", () => {
  it("parses 'c major scale' as a one-octave scale from the root", () => {
    const result = parseChordDescription("c major scale");
    expect(result.isScale).toBe(true);
    expect(result.scaleName).toBe("C major");
    expect(result.scaleOctaves).toBe(1);
  });

  it("parses 'c major scale 2 octaves'", () => {
    const result = parseChordDescription("c major scale 2 octaves");
    expect(result.isScale).toBe(true);
    expect(result.scaleOctaves).toBe(2);
  });

  it("parses 'c major scale starting on G'", () => {
    const result = parseChordDescription("c major scale starting on G");
    expect(result.isScale).toBe(true);
    expect(result.scaleName).toBe("C major");
    expect(result.startingNote).toBe("G");
  });
});

describe("resolveScale rotation", () => {
  it("defaults to one octave from the root", () => {
    const s = resolveScale("C", "major");
    expect(s.notes).toEqual(["C", "D", "E", "F", "G", "A", "B", "C"]);
    expect(s.startIndex).toBe(0);
  });

  it("rotates to a custom starting note", () => {
    const s = resolveScale("C", "major", undefined, 1, "G");
    expect(s.notes).toEqual(["G", "A", "B", "C", "D", "E", "F", "G"]);
    expect(s.startIndex).toBe(4);
    // Degree intervals rotate with the notes so labels stay aligned
    expect(s.intervals[0]).toBe("5P");
  });

  it("matches enharmonic starting notes", () => {
    const s = resolveScale("Db", "major", undefined, 1, "C#");
    expect(s.startIndex).toBe(0);
  });

  it("throws a friendly error for a note outside the scale", () => {
    expect(() => resolveScale("C", "major", undefined, 1, "F#")).toThrow(
      /F# isn't in C major/,
    );
  });

  it("expands rotated scales across octaves", () => {
    const s = resolveScale("C", "major", undefined, 2, "G");
    expect(s.notes.length).toBe(15);
    expect(s.notes[0]).toBe("G");
    expect(s.notes[14]).toBe("G");
  });
});

describe("processChordRequest scale support", () => {
  it("processes 'c major scale' instead of erroring", () => {
    const result = processChordRequest({ input: "c major scale" });
    expect(result.success).toBe(true);
    expect(result.chordName).toBe("C major scale");
    // one octave from the root: C D E F G A B C, ascending
    expect(result.notes.map((n) => n.replace(/\d/g, ""))).toEqual([
      "C", "D", "E", "F", "G", "A", "B", "C",
    ]);
    const first = parseInt(result.notes[0].slice(-1), 10);
    const last = parseInt(result.notes[7].slice(-1), 10);
    expect(last).toBe(first + 1);
  });

  it("processes a 2-octave scale without span folding", () => {
    const result = processChordRequest({ input: "d minor scale 2 octaves" });
    expect(result.success).toBe(true);
    expect(result.notes.length).toBe(15);
    // strictly ascending
    const octaves = result.notes.map((n) => parseInt(n.slice(-1), 10));
    for (let i = 1; i < octaves.length; i++) {
      expect(octaves[i]).toBeGreaterThanOrEqual(octaves[i - 1]);
    }
  });

  it("processes a scale starting on a note", () => {
    const result = processChordRequest({ input: "c major scale starting on G" });
    expect(result.success).toBe(true);
    expect(result.notes.map((n) => n.replace(/\d/g, ""))).toEqual([
      "G", "A", "B", "C", "D", "E", "F", "G",
    ]);
  });
});

describe("contiguous note runs after 'notes'", () => {
  it("parses 'notes cdefgabc' as individual notes", () => {
    const result = parseChordDescription("notes cdefgabc");
    expect(result.notesGroups).toHaveLength(1);
    expect(result.notesGroups![0].notes).toEqual([
      "C", "D", "E", "F", "G", "A", "B", "C",
    ]);
  });

  it("binds flats after uppercase letters in runs", () => {
    const result = parseChordDescription("notes EbGbBb in lh");
    expect(result.notesGroups![0].notes).toEqual(["Eb", "Gb", "Bb"]);
    expect(result.notesGroups![0].hand).toBe("lh");
  });

  it("keeps every lowercase letter a note in runs (b stays B)", () => {
    const result = parseChordDescription("notes gabc");
    expect(result.notesGroups![0].notes).toEqual(["G", "A", "B", "C"]);
  });

  it("parses octave-qualified runs", () => {
    const result = parseChordDescription("notes E4G4C5");
    expect(result.notesGroups![0].notes).toEqual(["E4", "G4", "C5"]);
  });

  it("parses sharp runs", () => {
    const result = parseChordDescription("notes C#F#G#");
    expect(result.notesGroups![0].notes).toEqual(["C#", "F#", "G#"]);
  });

  it("still parses spaced tokens exactly as before", () => {
    const result = parseChordDescription("with notes C E G in the bass clef");
    expect(result.notesGroups![0].notes).toEqual(["C", "E", "G"]);
    expect(result.notesGroups![0].clef).toBe("bass");
  });

  it("keeps single lowercase flat tokens intact ('eb5' → Eb5)", () => {
    const result = parseChordDescription("notes eb5 g5 bb5");
    expect(result.notesGroups![0].notes).toEqual(["Eb5", "G5", "Bb5"]);
  });

  it("does not swallow following words", () => {
    const result = parseChordDescription("notes cdefgabc with note names");
    expect(result.notesGroups![0].notes).toEqual([
      "C", "D", "E", "F", "G", "A", "B", "C",
    ]);
    expect(result.showNoteNames).toBe(true);
  });
});

describe("custom fingering strings", () => {
  it("keeps '-' placeholders in comma lists aligned", () => {
    const result = parseChordDescription('Cmaj7 custom fingering "1,-,3,-" in lg');
    expect(result.customFingering).toEqual(["1", "-", "3", "-"]);
  });

  it("accepts free-form labels like violin fingerings", () => {
    const result = parseChordDescription('C custom fingering "D2-D1-D0-D1"');
    expect(result.customFingering).toEqual(["D2", "D1", "D0", "D1"]);
  });

  it("accepts comma-separated alpha labels", () => {
    const result = parseChordDescription('C custom fingering "D1,A1,2,3" in xl');
    expect(result.customFingering).toEqual(["D1", "A1", "2", "3"]);
    expect(result.fingeringSize).toBe("xl");
  });
});
