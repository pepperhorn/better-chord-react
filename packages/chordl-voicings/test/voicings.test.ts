import { describe, it, expect } from "vitest";
import {
  VOICING_LIBRARY,
  queryVoicings,
  findVoicing,
  realizeVoicing,
  voicingPitchClasses,
  inferStyle,
  mapToVoicingQuality,
} from "../src/index";

describe("VOICING_LIBRARY", () => {
  it("contains entries from all 8 categories", () => {
    const styles = new Set(VOICING_LIBRARY.map((v) => v.tags.style));
    expect(styles.has("Shell")).toBe(true);
    expect(styles.has("Rootless Type A")).toBe(true);
    expect(styles.has("Rootless Type B")).toBe(true);
    expect(styles.has("Quartal")).toBe(true);
    expect(styles.has("Upper Structure")).toBe(true);
    expect(styles.has("Drop 2")).toBe(true);
    expect(styles.has("Drop 2+4")).toBe(true);
    expect(styles.has("Spread")).toBe(true);
    expect(styles.has("4-Note Closed")).toBe(true);
  });

  it("has unique IDs", () => {
    const ids = VOICING_LIBRARY.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("queryVoicings", () => {
  it("filters by quality", () => {
    const results = queryVoicings({ quality: "maj7" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.quality === "maj7")).toBe(true);
  });

  it("filters by style", () => {
    const results = queryVoicings({ style: "Shell" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.tags.style === "Shell")).toBe(true);
  });

  it("filters by quality + style", () => {
    const results = queryVoicings({ quality: "min7", style: "Rootless Type A" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("rootless-min7-a");
  });
});

describe("inferStyle", () => {
  it("maps 'Bill Evans' to Rootless Type A", () => {
    expect(inferStyle("Bill Evans")).toBe("Rootless Type A");
  });

  it("maps 'McCoy Tyner' to Quartal", () => {
    expect(inferStyle("McCoy Tyner")).toBe("Quartal");
  });

  it("maps 'bebop' to Shell", () => {
    expect(inferStyle("bebop")).toBe("Shell");
  });

  it("maps 'Herbie Hancock' to Upper Structure", () => {
    expect(inferStyle("Herbie Hancock")).toBe("Upper Structure");
  });

  it("returns undefined for unknown styles", () => {
    expect(inferStyle("unknown pianist")).toBeUndefined();
  });

  it("maps 'Count Basie' to Shell", () => {
    expect(inferStyle("Count Basie")).toBe("Shell");
  });

  it("maps 'basie' to Shell", () => {
    expect(inferStyle("basie")).toBe("Shell");
  });

  it("maps 'Duke Ellington' to Drop 2", () => {
    expect(inferStyle("Duke Ellington")).toBe("Drop 2");
  });

  it("maps 'nestico' to 4-Note Closed", () => {
    expect(inferStyle("nestico")).toBe("4-Note Closed");
  });

  it("maps 'spread' to Spread", () => {
    expect(inferStyle("spread")).toBe("Spread");
  });

  it("maps 'drop 2+4' to Drop 2+4", () => {
    expect(inferStyle("drop 2+4")).toBe("Drop 2+4");
  });
});

describe("findVoicing", () => {
  it("finds a rootless min7 for Bill Evans style", () => {
    const v = findVoicing("min7", "Bill Evans");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Rootless Type A");
  });

  it("finds a shell for bebop style", () => {
    const v = findVoicing("dom7", "bebop");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Shell");
  });

  it("finds quartal for McCoy Tyner", () => {
    const v = findVoicing("min7", "McCoy Tyner");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Quartal");
  });

  it("falls back to any voicing when no style matches", () => {
    const v = findVoicing("maj7");
    expect(v).toBeDefined();
  });

  it("finds drop 2 voicing", () => {
    const v = findVoicing("dom7", "drop 2");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Drop 2");
  });

  it("finds drop 2+4 voicing", () => {
    const v = findVoicing("dom7", "drop 2+4");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Drop 2+4");
  });

  it("finds spread voicing", () => {
    const v = findVoicing("dom7", "spread");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Spread");
  });

  it("finds 4-note closed voicing for Nestico", () => {
    const v = findVoicing("dom7", "Sammy Nestico");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("4-Note Closed");
  });

  it("finds shell voicing for Basie", () => {
    const v = findVoicing("dom7", "Count Basie");
    expect(v).toBeDefined();
    expect(v!.tags.style).toBe("Shell");
  });
});

describe("realizeVoicing", () => {
  it("realizes rootless min7 Type A in C", () => {
    const v = findVoicing("min7", "Bill Evans")!;
    const notes = realizeVoicing("C", v, 3);
    // Rootless min7 Type A: b3=Eb, 5=G, b7=Bb, 9=D
    // C3 + [3,7,10,14] = Eb3, G3, Bb3, D4
    expect(notes).toEqual(["Eb3", "G3", "Bb3", "D4"]);
  });

  it("realizes shell dom7 in G", () => {
    const v = queryVoicings({ quality: "dom7", style: "Shell" })[0];
    const notes = realizeVoicing("G", v, 3);
    // Shell dom7 Root+b7: G3 + [0,10] = G3, F4
    expect(notes).toEqual(["G3", "F4"]);
  });
});

describe("voicingPitchClasses", () => {
  it("returns pitch classes without octaves for keyboard highlighting", () => {
    const v = findVoicing("min7", "Bill Evans")!;
    const pcs = voicingPitchClasses("C", v, 3);
    // Eb3, G3, Bb3, D4 → D#, G, A#, D
    expect(pcs).toContain("D#");
    expect(pcs).toContain("G");
    expect(pcs).toContain("A#");
    expect(pcs).toContain("D");
  });
});

describe("mapToVoicingQuality", () => {
  // Regression guard: "dominant" contains the substring "min" (do-MIN-ant),
  // so the "dom" check must be tested before the "min" check. Reordering
  // these two branches back to a bare min-before-dom test will silently
  // route every dominant chord to min7 again. Do not "simplify" this away.
  describe("dominant types resolve to dom7", () => {
    it.each([
      "dominant seventh",
      "dominant ninth",
      "dominant thirteenth",
    ])('maps "%s" to dom7', (type) => {
      expect(mapToVoicingQuality(type)).toBe("dom7");
    });

    it('maps "altered dominant" to alt, not dom7 (alt must still win)', () => {
      expect(mapToVoicingQuality("altered dominant")).toBe("alt");
    });
  });

  describe("minor and major types are unaffected by the dom/min reorder", () => {
    it('maps "minor seventh" to min7', () => {
      expect(mapToVoicingQuality("minor seventh")).toBe("min7");
    });

    it('maps "major seventh" to maj7', () => {
      expect(mapToVoicingQuality("major seventh")).toBe("maj7");
    });

    it('maps bare "minor" triad to undefined', () => {
      expect(mapToVoicingQuality("minor")).toBeUndefined();
    });

    it('maps bare "major" triad to undefined', () => {
      expect(mapToVoicingQuality("major")).toBeUndefined();
    });

    it('maps "min7" shorthand to min7', () => {
      expect(mapToVoicingQuality("min7")).toBe("min7");
    });
  });

  describe("other specific qualities still win over the general checks", () => {
    it('maps "m7b5" to m7b5', () => {
      expect(mapToVoicingQuality("m7b5")).toBe("m7b5");
    });

    it('maps "half-diminished" to m7b5', () => {
      expect(mapToVoicingQuality("half-diminished")).toBe("m7b5");
    });

    it('maps "diminished seventh" to dim7', () => {
      expect(mapToVoicingQuality("diminished seventh")).toBe("dim7");
    });

    it('maps "suspended fourth" to sus4', () => {
      expect(mapToVoicingQuality("suspended fourth")).toBe("sus4");
    });

    it('maps "altered" to alt', () => {
      expect(mapToVoicingQuality("altered")).toBe("alt");
    });
  });
});
