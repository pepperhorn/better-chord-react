import { describe, it, expect } from "vitest";
import {
  resolveProgression, tokenizeProgression,
  findTemplate, FORM_TEMPLATES,
  resolveProgressionRequest,
  isProgressionRequest, parseProgressionRequest,
} from "@better-chord/core";

describe("tokenizeProgression", () => {
  it("splits on hyphens", () => {
    expect(tokenizeProgression("ii-V-I")).toEqual(["ii", "V", "I"]);
  });

  it("splits on spaces", () => {
    expect(tokenizeProgression("ii V7 Imaj7")).toEqual(["ii", "V7", "Imaj7"]);
  });

  it("splits on arrows", () => {
    expect(tokenizeProgression("ii→V→I")).toEqual(["ii", "V", "I"]);
  });
});

describe("resolveProgression", () => {
  it("resolves ii-V-I in C", () => {
    const result = resolveProgression(["ii7", "V7", "Imaj7"], "C");
    expect(result.map((c) => c.symbol)).toEqual(["Dm7", "G7", "Cmaj7"]);
  });

  it("resolves ii-V-I in G", () => {
    const result = resolveProgression(["ii7", "V7", "Imaj7"], "G");
    expect(result.map((c) => c.symbol)).toEqual(["Am7", "D7", "Gmaj7"]);
  });

  it("resolves ii-V-I in Db (flat key)", () => {
    const result = resolveProgression(["ii7", "V7", "Imaj7"], "Db");
    expect(result.map((c) => c.symbol)).toEqual(["Ebm7", "Ab7", "Dbmaj7"]);
  });

  it("resolves ii-V-I in F#", () => {
    const result = resolveProgression(["ii7", "V7", "Imaj7"], "F#");
    expect(result.map((c) => c.symbol)).toEqual(["G#m7", "C#7", "F#maj7"]);
  });

  it("resolves minor ii-V-i in C", () => {
    const result = resolveProgression(["iiø7", "V7", "i7"], "C");
    expect(result.map((c) => c.symbol)).toEqual(["Dm7b5", "G7", "Cm7"]);
  });

  it("resolves I-vi-ii-V in Bb", () => {
    const result = resolveProgression(["Imaj7", "vi7", "ii7", "V7"], "Bb");
    expect(result.map((c) => c.symbol)).toEqual(["Bbmaj7", "Gm7", "Cm7", "F7"]);
  });

  it("resolves bVII7", () => {
    const result = resolveProgression(["bVII7"], "C");
    expect(result[0].symbol).toBe("Bb7");
  });

  it("resolves bII7 (tritone sub)", () => {
    const result = resolveProgression(["bII7"], "C");
    expect(result[0].symbol).toBe("Db7");
  });

  it("resolves blues I7-IV7-V7 in Bb", () => {
    const result = resolveProgression(["I7", "IV7", "V7"], "Bb");
    expect(result.map((c) => c.symbol)).toEqual(["Bb7", "Eb7", "F7"]);
  });
});

describe("findTemplate", () => {
  it("finds ii-V-I template", () => {
    const t = findTemplate("ii-V-I");
    expect(t).toBeDefined();
    expect(t!.numerals).toEqual(["ii7", "V7", "Imaj7"]);
  });

  it("finds blues template", () => {
    const t = findTemplate("blues");
    expect(t).toBeDefined();
    expect(t!.id).toBe("blues");
  });

  it("finds rhythm changes", () => {
    const t = findTemplate("rhythm changes");
    expect(t).toBeDefined();
  });

  it("finds minor ii-V-i", () => {
    const t = findTemplate("minor ii-V-i");
    expect(t).toBeDefined();
  });
});

describe("isProgressionRequest", () => {
  it("detects roman numeral progression", () => {
    expect(isProgressionRequest("ii-V-I in G")).toBe(true);
  });

  it("detects form template name", () => {
    expect(isProgressionRequest("show me a blues in Bb")).toBe(true);
  });

  it("detects rhythm changes", () => {
    expect(isProgressionRequest("rhythm changes in F")).toBe(true);
  });

  it("does not detect single chord", () => {
    expect(isProgressionRequest("Cmaj7")).toBe(false);
  });

  it("does not detect chord with style", () => {
    expect(isProgressionRequest("Dm7 in the style of Bill Evans")).toBe(false);
  });

  it("detects 'progression' keyword", () => {
    expect(isProgressionRequest("show me a jazz progression in G")).toBe(true);
  });
});

describe("parseProgressionRequest", () => {
  it("parses 'ii-V-I in G'", () => {
    const result = parseProgressionRequest("ii-V-I in G");
    expect(result.progression).toBe("ii-V-I");
    expect(result.key).toBe("G");
  });

  it("parses '3 examples of ii V I in Db'", () => {
    const result = parseProgressionRequest("3 examples of ii V I in Db");
    expect(result.numExamples).toBe(3);
    expect(result.key).toBe("Db");
  });

  it("parses 'blues in Bb Herbie style'", () => {
    const result = parseProgressionRequest("blues in Bb Herbie Hancock style");
    expect(result.progression).toBe("blues");
    expect(result.key).toBe("Bb");
  });

  it("parses 'show me 2 examples of a ii-V-I in F# like Bill Evans'", () => {
    const result = parseProgressionRequest("show me 2 examples of a ii-V-I in F# like Bill Evans");
    expect(result.numExamples).toBe(2);
    expect(result.key).toBe("F#");
    expect(result.progression).toBe("ii-V-I");
  });

  it("parses style keyword 'drop 2'", () => {
    const result = parseProgressionRequest("ii-V-I in C drop 2");
    expect(result.styleHint).toBe("drop 2");
  });

  it("defaults to C and 3 examples", () => {
    const result = parseProgressionRequest("ii-V-I");
    expect(result.key).toBe("C");
    expect(result.numExamples).toBe(3);
  });
});

describe("resolveProgressionRequest", () => {
  it("resolves ii-V-I in G with 3 examples", () => {
    const result = resolveProgressionRequest({
      progression: "ii-V-I",
      key: "G",
      numExamples: 3,
    });
    expect(result.examples.length).toBe(3);
    expect(result.key).toBe("G");
    // Each example should have 3 chords (ii, V, I)
    for (const ex of result.examples) {
      expect(ex.chords.length).toBe(3);
    }
  });

  it("uses different styles for each example when no style hint", () => {
    const result = resolveProgressionRequest({
      progression: "ii-V-I",
      key: "C",
      numExamples: 3,
    });
    const styleLabels = result.examples.map((e) => e.label);
    // All should be different
    const unique = new Set(styleLabels);
    expect(unique.size).toBe(3);
  });

  it("resolves blues template", () => {
    const result = resolveProgressionRequest({
      progression: "blues",
      key: "Bb",
      numExamples: 1,
    });
    expect(result.progressionName).toBe("12-Bar Blues");
    expect(result.examples[0].chords.length).toBe(12);
  });

  it("resolves with style hint", () => {
    const result = resolveProgressionRequest({
      progression: "ii-V-I",
      key: "C",
      numExamples: 2,
      styleHint: "Bill Evans",
    });
    expect(result.examples.length).toBe(2);
    // First example should use Rootless Type A (Evans' primary style)
    expect(result.examples[0].label).toContain("Rootless Type A");
  });

  it("each chord has notes", () => {
    const result = resolveProgressionRequest({
      progression: "ii-V-I",
      key: "G",
      numExamples: 1,
    });
    for (const chord of result.examples[0].chords) {
      expect(chord.notes.length).toBeGreaterThan(0);
      expect(chord.symbol).toBeTruthy();
      expect(chord.root).toBeTruthy();
    }
  });
});

// ========== 10 User Prompt Scenarios ==========

describe("progression resolver - user prompt scenarios", () => {
  it("1. 'show me 3 examples of a ii-V-I in G'", () => {
    const parsed = parseProgressionRequest("show me 3 examples of a ii-V-I in G");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
      styleHint: parsed.styleHint,
    });
    expect(result.examples.length).toBe(3);
    // ii in G = Am7, V = D7, I = Gmaj7
    for (const ex of result.examples) {
      expect(ex.chords[0].symbol).toBe("Am7");
      expect(ex.chords[1].symbol).toBe("D7");
      expect(ex.chords[2].symbol).toBe("Gmaj7");
    }
  });

  it("2. 'blues in Bb'", () => {
    const parsed = parseProgressionRequest("blues in Bb");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
    });
    expect(result.progressionName).toBe("12-Bar Blues");
    expect(result.examples[0].chords[0].symbol).toBe("Bb7");
    expect(result.examples[0].chords[1].symbol).toBe("Eb7");
  });

  it("3. 'ii V I in Db in the style of Herbie Hancock'", () => {
    const parsed = parseProgressionRequest("ii V I in Db in the style of Herbie Hancock");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
      styleHint: parsed.styleHint,
    });
    expect(result.examples[0].chords[0].symbol).toBe("Ebm7");
    // Herbie = Upper Structure as primary style
  });

  it("4. 'minor ii-V-i in A'", () => {
    const parsed = parseProgressionRequest("minor ii-V-i in A");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
    });
    // Minor ii-V-i in A: Bm7b5 - E7 - Am7
    expect(result.examples[0].chords[0].symbol).toBe("Bm7b5");
    expect(result.examples[0].chords[1].symbol).toBe("E7");
    expect(result.examples[0].chords[2].symbol).toBe("Am7");
  });

  it("5. 'rhythm changes in F'", () => {
    const parsed = parseProgressionRequest("rhythm changes in F");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
    });
    expect(result.progressionName).toBe("Rhythm Changes (A)");
    expect(result.examples[0].chords[0].symbol).toBe("Fmaj7");
  });

  it("6. '2 examples of I vi ii V in Eb drop 2'", () => {
    const parsed = parseProgressionRequest("2 examples of I vi ii V in Eb drop 2");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
      styleHint: parsed.styleHint,
    });
    expect(result.examples.length).toBe(2);
  });

  it("7. 'modal vamp in D'", () => {
    const parsed = parseProgressionRequest("modal vamp in D");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
    });
    expect(result.progressionName).toBe("Modal Vamp");
    // i7 in D = Dm7, bVII7 = C7
    expect(result.examples[0].chords[0].symbol).toBe("Dm7");
    expect(result.examples[0].chords[1].symbol).toBe("C7");
  });

  it("8. 'jazz blues in F'", () => {
    const parsed = parseProgressionRequest("jazz blues in F");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
    });
    expect(result.progressionName).toBe("Jazz Blues");
    expect(result.examples[0].chords[0].symbol).toBe("F7");
  });

  it("9. 'tritone sub in Ab'", () => {
    const parsed = parseProgressionRequest("tritone sub in Ab");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
    });
    // bII7 in Ab = A7 (Bbb → A via enharmonic)
    expect(result.examples[0].chords.length).toBe(3);
  });

  it("10. 'iii-vi-ii-V in C# like McCoy Tyner'", () => {
    const parsed = parseProgressionRequest("iii-vi-ii-V in C# like McCoy Tyner");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
      styleHint: parsed.styleHint,
    });
    expect(result.examples[0].chords.length).toBe(4);
  });
});

// ========== Edge cases: tricky keys, alterations, enharmonics ==========

describe("progression edge cases", () => {
  it("ii-V-I in all 12 keys resolves without error", () => {
    const keys = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    for (const key of keys) {
      const result = resolveProgressionRequest({
        progression: "ii-V-I",
        key,
        numExamples: 1,
      });
      expect(result.examples[0].chords.length).toBe(3);
      // Every chord should have notes
      for (const chord of result.examples[0].chords) {
        expect(chord.notes.length).toBeGreaterThan(0);
      }
    }
  });

  it("blues in all 12 keys resolves without error", () => {
    const keys = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    for (const key of keys) {
      const result = resolveProgressionRequest({
        progression: "blues",
        key,
        numExamples: 1,
      });
      expect(result.examples[0].chords.length).toBe(12);
    }
  });

  it("minor ii-V-i in Eb produces correct chords", () => {
    const result = resolveProgression(["iiø7", "V7", "i7"], "Eb");
    expect(result.map((c) => c.symbol)).toEqual(["Fm7b5", "Bb7", "Ebm7"]);
  });

  it("backdoor ii-V resolves in Gb", () => {
    const result = resolveProgressionRequest({
      progression: "backdoor",
      key: "Gb",
      numExamples: 1,
    });
    // iv7 = Cbm7 (or Bm7 enharmonic), bVII7 = Fb7 (or E7), Imaj7 = Gbmaj7
    expect(result.examples[0].chords.length).toBe(3);
  });

  it("roman numeral with maj suffix: Imaj7 Vmaj7", () => {
    const result = resolveProgression(["Imaj7", "Vmaj7"], "C");
    expect(result[0].symbol).toBe("Cmaj7");
    expect(result[1].symbol).toBe("Gmaj7");
  });

  it("dim7 suffix: vii°7 in C", () => {
    const result = resolveProgression(["vii°7"], "C");
    expect(result[0].symbol).toBe("Bdim7");
  });

  it("all form templates resolve in C without error", () => {
    for (const template of FORM_TEMPLATES) {
      const result = resolveProgressionRequest({
        progression: template.id,
        key: "C",
        numExamples: 1,
      });
      expect(result.examples[0].chords.length).toBe(template.numerals.length);
    }
  });

  it("parsing preserves style through full pipeline", () => {
    const parsed = parseProgressionRequest("ii-V-I in G like Bill Evans");
    expect(parsed.styleHint).toBe("Bill Evans");
    const result = resolveProgressionRequest({
      progression: parsed.progression,
      key: parsed.key,
      numExamples: parsed.numExamples,
      styleHint: parsed.styleHint,
    });
    // Bill Evans → Rootless Type A
    expect(result.examples[0].label).toContain("Rootless Type A");
  });

  it("caps examples at MAX_EXAMPLES", () => {
    const parsed = parseProgressionRequest("10 examples of ii-V-I in C");
    expect(parsed.numExamples).toBe(3); // MAX_EXAMPLES = 3
  });

  it("isProgressionRequest rejects single chords", () => {
    const singles = [
      "Cmaj7", "Dm7 drop 2", "G7 in the style of Bill Evans",
      "Cmaj7#5 starting on G#", "F#m7b5",
    ];
    for (const s of singles) {
      expect(isProgressionRequest(s)).toBe(false);
    }
  });

  it("isProgressionRequest accepts progressions", () => {
    const progs = [
      "ii-V-I in G", "blues in Bb", "rhythm changes in F",
      "I vi ii V in Eb", "modal vamp in D", "show me a jazz progression",
    ];
    for (const p of progs) {
      expect(isProgressionRequest(p)).toBe(true);
    }
  });
});
