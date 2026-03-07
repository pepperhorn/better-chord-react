import { describe, it, expect } from "vitest";
import {
  resolveProgression,
  resolveProgressionRequest,
  isProgressionRequest, parseProgressionRequest,
} from "@better-chord/core";

describe("progression stress tests — full pipeline end-to-end", () => {
  // These simulate real user prompts parsed through the full pipeline

  const runPrompt = (input: string) => {
    const parsed = parseProgressionRequest(input);
    return resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
      styleHint: parsed.styleHint,
    });
  };

  it("ii-V-I in all flat keys", () => {
    for (const key of ["F", "Bb", "Eb", "Ab", "Db", "Gb"]) {
      const result = runPrompt(`ii-V-I in ${key}`);
      expect(result.examples.length).toBe(3);
      for (const ex of result.examples) {
        expect(ex.chords.length).toBe(3);
        // ii should be minor, V should be dom, I should be major
        expect(ex.chords[0].symbol).toMatch(/m7$/);
        expect(ex.chords[1].symbol).toMatch(/7$/);
        expect(ex.chords[2].symbol).toMatch(/maj7$/);
      }
    }
  });

  it("ii-V-I in all sharp keys", () => {
    for (const key of ["G", "D", "A", "E", "B", "F#"]) {
      const result = runPrompt(`ii-V-I in ${key}`);
      expect(result.examples.length).toBe(3);
      for (const ex of result.examples) {
        expect(ex.chords.length).toBe(3);
        expect(ex.chords[0].symbol).toMatch(/m7$/);
        expect(ex.chords[1].symbol).toMatch(/7$/);
        expect(ex.chords[2].symbol).toMatch(/maj7$/);
      }
    }
  });

  it("minor ii-V-i in Ab", () => {
    const result = runPrompt("minor ii-V-i in Ab");
    const chords = result.examples[0].chords;
    expect(chords[0].symbol).toBe("Bbm7b5");
    expect(chords[1].symbol).toBe("Eb7");
    expect(chords[2].symbol).toBe("Abm7");
  });

  it("minor ii-V-i in F#", () => {
    const result = runPrompt("minor ii-V-i in F#");
    const chords = result.examples[0].chords;
    expect(chords[0].symbol).toBe("G#m7b5");
    expect(chords[1].symbol).toBe("C#7");
    expect(chords[2].symbol).toBe("F#m7");
  });

  it("blues in every key resolves every chord", () => {
    const keys = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    for (const key of keys) {
      const result = runPrompt(`blues in ${key}`);
      expect(result.examples[0].chords.length).toBe(12);
      for (const chord of result.examples[0].chords) {
        expect(chord.notes.length).toBeGreaterThan(0);
      }
    }
  });

  it("rhythm changes in B (tricky key)", () => {
    const result = runPrompt("rhythm changes in B");
    expect(result.examples[0].chords[0].symbol).toBe("Bmaj7");
    // vi in B = G#m7
    expect(result.examples[0].chords[1].symbol).toBe("G#m7");
  });

  it("tritone sub in E", () => {
    const result = runPrompt("tritone sub in E");
    const chords = result.examples[0].chords;
    // ii7 in E = F#m7, bII7 = F7, Imaj7 = Emaj7
    expect(chords[0].symbol).toBe("F#m7");
    expect(chords[1].symbol).toBe("F7");
    expect(chords[2].symbol).toBe("Emaj7");
  });

  it("backdoor ii-V in A", () => {
    const result = runPrompt("backdoor in A");
    const chords = result.examples[0].chords;
    // iv7 = Dm7, bVII7 = G7, Imaj7 = Amaj7
    expect(chords[0].symbol).toBe("Dm7");
    expect(chords[1].symbol).toBe("G7");
    expect(chords[2].symbol).toBe("Amaj7");
  });

  it("each voicing style produces different notes for same chord", () => {
    const result = runPrompt("3 examples of ii-V-I in C");
    // The three examples should have different voicing styles
    const firstChordNotes = result.examples.map((ex) =>
      ex.chords[0].notes.join(",")
    );
    // At least some should differ
    const unique = new Set(firstChordNotes);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("style hint 'drop 2' applies to all chords", () => {
    const result = runPrompt("ii-V-I in C drop 2");
    // First example should use Drop 2
    expect(result.examples[0].label).toContain("Drop 2");
  });

  it("style hint 'nestico' applies to all chords", () => {
    const result = runPrompt("ii-V-I in G nestico");
    expect(result.examples[0].label).toContain("4-Note Closed");
  });

  it("style hint 'bebop' applies to all chords", () => {
    const result = runPrompt("ii-V-I in F bebop");
    expect(result.examples[0].label).toContain("Shell");
  });

  it("3 examples of jazz blues in Bb", () => {
    const result = runPrompt("3 examples of jazz blues in Bb");
    expect(result.examples.length).toBe(3);
    expect(result.progressionName).toBe("Jazz Blues");
  });

  it("modal vamp in all keys", () => {
    const keys = ["C", "D", "Eb", "F", "G", "A", "Bb"];
    for (const key of keys) {
      const result = runPrompt(`modal vamp in ${key}`);
      expect(result.examples[0].chords.length).toBe(2);
    }
  });

  it("I-vi-ii-V turnaround in Db", () => {
    const result = runPrompt("turnaround in Db");
    const chords = result.examples[0].chords;
    expect(chords[0].symbol).toBe("Dbmaj7");
    expect(chords[1].symbol).toBe("Bbm7");
    expect(chords[2].symbol).toBe("Ebm7");
    expect(chords[3].symbol).toBe("Ab7");
  });
});

describe("isProgressionRequest — false positive prevention", () => {
  it("rejects chords that happen to contain 'i' patterns", () => {
    const falsePositives = [
      "Cmaj7 in the style of Bill Evans",
      "Dm7 like McCoy Tyner",
      "G7 drop 2",
      "Cmaj7#5 starting on G#",
      "D minor seventh in first inversion",
      "G sharp augmented",
      "C7 in root position",
      "F#m7b5",
      "Bbmaj9",
      "Cmaj7 with 3 notes on either side",
    ];
    for (const input of falsePositives) {
      expect(isProgressionRequest(input)).toBe(false);
    }
  });

  it("accepts valid progressions", () => {
    const validProgs = [
      "ii-V-I in G",
      "ii V I in C",
      "blues in Bb",
      "rhythm changes in F",
      "jazz blues in F",
      "modal vamp in D",
      "tritone sub in Ab",
      "backdoor in C",
      "minor ii-V-i in A",
      "iii-vi-ii-V in C#",
      "I-vi-ii-V in Eb",
      "show me a jazz progression in G",
    ];
    for (const input of validProgs) {
      expect(isProgressionRequest(input)).toBe(true);
    }
  });
});

describe("roman numeral edge cases", () => {
  it("vii°7 produces dim7 quality", () => {
    const result = resolveProgression(["vii°7"], "C");
    expect(result[0].symbol).toBe("Bdim7");
  });

  it("iiø7 produces m7b5 quality", () => {
    const result = resolveProgression(["iiø7"], "C");
    expect(result[0].symbol).toBe("Dm7b5");
  });

  it("#iv produces sharp four chord", () => {
    const result = resolveProgression(["#iv"], "C");
    expect(result[0].symbol).toBe("F#m");
  });

  it("bVI in C major = Ab", () => {
    const result = resolveProgression(["bVI"], "C");
    expect(result[0].symbol).toBe("Ab");
  });

  it("bIII in C major = Eb", () => {
    const result = resolveProgression(["bIII"], "C");
    expect(result[0].symbol).toBe("Eb");
  });

  it("Imaj7 ii7 V7 I7 — mixed qualities", () => {
    const result = resolveProgression(["Imaj7", "ii7", "V7", "I7"], "Bb");
    expect(result[0].symbol).toBe("Bbmaj7");
    expect(result[1].symbol).toBe("Cm7");
    expect(result[2].symbol).toBe("F7");
    expect(result[3].symbol).toBe("Bb7");
  });
});
