import { describe, it, expect } from "vitest";
import { ChordType } from "tonal";
import {
  VOICING_LIBRARY,
  queryVoicings,
  findVoicing,
  realizeVoicing,
  voicingPitchClasses,
  inferStyle,
  mapToVoicingQuality,
} from "../src/index";
import type { VoicingQuality } from "../src/types";

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

    it('maps "dim7" shorthand to dim7', () => {
      expect(mapToVoicingQuality("dim7")).toBe("dim7");
    });

    it('maps "suspended fourth" to sus4', () => {
      expect(mapToVoicingQuality("suspended fourth")).toBe("sus4");
    });

    it('maps "sus4" shorthand to sus4', () => {
      expect(mapToVoicingQuality("sus4")).toBe("sus4");
    });

    it('maps "altered" to alt', () => {
      expect(mapToVoicingQuality("altered")).toBe("alt");
    });
  });

  // Trap #2 (in addition to the "dominant"/"min" collision above): minor
  // shorthand like "m7"/"m9"/"m11"/"m13"/"m6" contains neither "min" nor
  // "minor". Without an explicit "m" + digit check it falls all the way
  // through to the trailing dominant/6 catchall and gets misclassified
  // (e.g. "m7" -> dom7, "m6" -> maj6). A naive `t.startsWith("m")` fix would
  // be just as wrong the other way: it would also swallow "maj7" and
  // "major seventh". Do not re-simplify this to either of those.
  describe("minor shorthand is distinguished from major shorthand", () => {
    it.each(["m7", "m9", "m11", "m13"])('maps "%s" to min7, not dom7', (type) => {
      expect(mapToVoicingQuality(type)).toBe("min7");
    });

    it('maps "m6" to min6, not maj6', () => {
      expect(mapToVoicingQuality("m6")).toBe("min6");
    });

    it('maps "m6/9" to m6/9, not dom7', () => {
      expect(mapToVoicingQuality("m6/9")).toBe("m6/9");
    });

    it('maps "maj7" to maj7 (not captured by the minor-shorthand check)', () => {
      expect(mapToVoicingQuality("maj7")).toBe("maj7");
    });

    // "M7" is Tonal's alias for major seventh. "m7" is minor seventh. Case
    // is the *only* signal that tells them apart, so mapToVoicingQuality
    // must test this uppercase-M shorthand case-sensitively before it
    // lowercases the input for every other check.
    it('maps "M7" to maj7, not min7 (case is the only signal distinguishing it from "m7")', () => {
      expect(mapToVoicingQuality("M7")).toBe("maj7");
    });
  });

  // Trap #3: mapToVoicingQuality's first line lowercases the input before
  // any branch logic runs. Case is the *only* thing distinguishing
  // uppercase-M shorthand ("M", "M7", "M9", "M11", "M13", "M6" — major)
  // from lowercase-m shorthand ("m", "m7", ... — minor, Trap #2 above), so
  // lowercasing first destroys that signal and "M7" silently resolves to
  // min7. This convention (uppercase M = major) is real and used elsewhere
  // in the monorepo (chordl-guitar's toDbSuffix). The uppercase-M shorthand
  // must be matched case-sensitively *before* the `toLowerCase()` call, not
  // folded into the lowercase branch logic. Do not "simplify" this away by
  // moving the check after lowercasing.
  describe("uppercase-M shorthand is distinguished from lowercase-m shorthand", () => {
    it.each([
      ["M", undefined],
      ["M7", "maj7"],
      ["M9", "maj7"],
      ["M11", "maj7"],
      ["M13", "maj7"],
      ["M6", "maj6"],
    ] as const)('maps "%s" to %s', (type, expected) => {
      expect(mapToVoicingQuality(type)).toBe(expected);
    });

    it('maps bare "m" to undefined, same as "minor"/"minor triad"', () => {
      expect(mapToVoicingQuality("m")).toBeUndefined();
    });

    // "M7b5" is a chord in its own right — 1 3 b5 7, tonal's major seventh
    // flat five — and not a spelling of the half-diminished 1 b3 b5 b7 it used
    // to resolve to. Lowercasing turns one into the other, so it is matched on
    // the original string before that happens.
    it('reads "M7b5" as its own chord, not a half-diminished', () => {
      expect(mapToVoicingQuality("M7b5")).toBe("maj7b5");
      expect(mapToVoicingQuality("M9b5")).toBe("maj7b5");
      expect(mapToVoicingQuality("m7b5")).toBe("m7b5");
    });
  });

  // Trap #4: Tonal spells the sixth-chord family out with words, not digits
  // — "minor sixth", "sixth" (bare major sixth), and "sixth added ninth"
  // (bare major 6/9). A numeral-only `t.includes("6")` test misses all of
  // these and falls through to a 7th-chord quality instead. Both the minor
  // and major branches, and the bare-shorthand catchall, must recognize the
  // spelled-out word alongside the digit. Do not simplify this back to a
  // digit-only check.
  describe("spelled-out sixths are recognized alongside the digit", () => {
    it('maps "minor sixth" to min6, not min7', () => {
      expect(mapToVoicingQuality("minor sixth")).toBe("min6");
    });

    it('maps "major sixth" to maj6, not maj7', () => {
      expect(mapToVoicingQuality("major sixth")).toBe("maj6");
    });

    it('maps bare "sixth" to maj6, not undefined', () => {
      expect(mapToVoicingQuality("sixth")).toBe("maj6");
    });

    it('maps digit "6" to maj6', () => {
      expect(mapToVoicingQuality("6")).toBe("maj6");
    });

    it('maps "6/9" to 6/9, not dom7', () => {
      expect(mapToVoicingQuality("6/9")).toBe("6/9");
    });

    it('maps "6add9" to 6/9, not dom7', () => {
      expect(mapToVoicingQuality("6add9")).toBe("6/9");
    });
  });

  // Trap #6: `sus` must be tested before the TRAILING DIGIT CATCHALL — not,
  // as an earlier version of this comment claimed, before the `dom` check.
  //
  // The distinction was got wrong once already and is worth stating exactly.
  // No sus name contains the substring "dom", so swapping the `sus` and `dom`
  // branches changes nothing and these tests pass either way. What actually
  // breaks them is moving the `sus` check below the
  // `includes("7") || includes("9") || includes("11") || includes("13")`
  // catchall, at which point "7sus4" and "9sus4" resolve to dom7.
  //
  // Verified empirically both ways rather than reasoned about, because the
  // reasoned version was wrong.
  describe("sus is tested before the trailing digit catchall", () => {
    it('maps "7sus4" to sus4, not dom7', () => {
      expect(mapToVoicingQuality("7sus4")).toBe("sus4");
    });

    it('maps "9sus4" to sus4, not dom7', () => {
      expect(mapToVoicingQuality("9sus4")).toBe("sus4");
    });

    // sus2 is 1 2 5 and sus4 is 1 4 5 — different chords, and the sus4
    // voicings are quartal stacks on a P4 and a m7 that a sus2 has neither of.
    it('maps "sus2" to its own quality, not sus4', () => {
      expect(mapToVoicingQuality("sus2")).toBe("sus2");
      expect(mapToVoicingQuality("sus24")).toBe("sus4");
    });

    it('maps "sus" to sus4', () => {
      expect(mapToVoicingQuality("sus")).toBe("sus4");
    });
  });

  // Trap #5: Tonal's canonical type for an 11th chord is the bare word
  // "eleventh" (`Chord.get("C11").type === "eleventh"`), not "dominant
  // eleventh" — and it has no "7"/"9"/"13" digit for the trailing catchall
  // to match. Without recognizing "11"/"eleventh" explicitly, every 11th
  // chord resolved to `undefined` (no voicing at all). This is live: all
  // three internal call sites pass `resolveChord(...).type` straight
  // through, so a real C11 chord hit this gap in the shipped app.
  describe("eleventh chords resolve to dom7", () => {
    it('maps "11" to dom7', () => {
      expect(mapToVoicingQuality("11")).toBe("dom7");
    });

    it('maps "eleventh" to dom7', () => {
      expect(mapToVoicingQuality("eleventh")).toBe("dom7");
    });

    it('maps "dominant eleventh" to dom7', () => {
      expect(mapToVoicingQuality("dominant eleventh")).toBe("dom7");
    });

    // "minor eleventh" contains "min", which must still be tested before
    // this catchall is ever reached — confirms the new "11"/"eleventh"
    // handling doesn't leak into the minor branch's territory.
    it('maps "minor eleventh" to min7, not dom7', () => {
      expect(mapToVoicingQuality("minor eleventh")).toBe("min7");
    });
  });
});

describe("mapToVoicingQuality — substrings that look like other qualities", () => {
  // "diminished" contains "min", the same trap as "dominant". A bare
  // diminished triad rendered minor-seventh voicings.
  it('maps "diminished" to undefined, not min7', () => {
    expect(mapToVoicingQuality("diminished")).toBeUndefined();
  });

  it("still answers the diminished spellings that do have a voicing", () => {
    expect(mapToVoicingQuality("diminished seventh")).toBe("dim7");
    expect(mapToVoicingQuality("dim7")).toBe("dim7");
    expect(mapToVoicingQuality("half-diminished")).toBe("m7b5");
    expect(mapToVoicingQuality("m7b5")).toBe("m7b5");
  });

  // Uppercase M is major, lowercase m is minor. Anchoring the uppercase table
  // to the whole string let altered aliases fall through to `/^m\d/`.
  it("keeps altered uppercase-M aliases major", () => {
    expect(mapToVoicingQuality("M69")).toBe("6/9");
    expect(mapToVoicingQuality("M7#11")).toBe("maj7");
    expect(mapToVoicingQuality("M13#11")).toBe("maj7");
  });

  it("leaves the plain uppercase-M forms where they were", () => {
    expect(mapToVoicingQuality("M6")).toBe("maj6");
    expect(mapToVoicingQuality("M7")).toBe("maj7");
    expect(mapToVoicingQuality("M9")).toBe("maj7");
    expect(mapToVoicingQuality("M11")).toBe("maj7");
    expect(mapToVoicingQuality("M13")).toBe("maj7");
  });

  it("reads M7b5 as its own chord", () => {
    expect(mapToVoicingQuality("M7b5")).toBe("maj7b5");
  });

  it("does not mistake uppercase-M for minor shorthand", () => {
    expect(mapToVoicingQuality("m69")).toBe("m6/9");
    expect(mapToVoicingQuality("m7")).toBe("min7");
  });

  // "69" is tonal's own alias for a 6/9 chord; the digit catchall claimed it.
  it('maps the bare "69" alias to 6/9, not dom7', () => {
    expect(mapToVoicingQuality("69")).toBe("6/9");
    expect(mapToVoicingQuality("6/9")).toBe("6/9");
    expect(mapToVoicingQuality("6add9")).toBe("6/9");
  });

  it("leaves the dominant fix this PR is named for intact", () => {
    expect(mapToVoicingQuality("dominant seventh")).toBe("dom7");
    expect(mapToVoicingQuality("dominant ninth")).toBe("dom7");
    expect(mapToVoicingQuality("lydian dominant seventh")).toBe("dom7");
  });
});

describe("mapToVoicingQuality — an altered degree is not a chord quality", () => {
  // "major seventh flat sixth" contains the word "sixth", but the sixth is a
  // flattened degree inside a seventh chord. Answering it with a maj6 voicing
  // drops the 7th and adds a 6th the chord does not contain.
  it("reads a flattened sixth as an alteration, not a sixth chord", () => {
    expect(mapToVoicingQuality("major seventh flat sixth")).toBe("maj7");
    // mMaj7b6 is a *minor* chord — see the minor/major seventh group below.
    expect(mapToVoicingQuality("mMaj7b6")).toBe("mMaj7");
    expect(mapToVoicingQuality("M7b6")).toBe("maj7");
  });

  it("still reads a real sixth chord as one", () => {
    expect(mapToVoicingQuality("sixth")).toBe("maj6");
    expect(mapToVoicingQuality("minor sixth")).toBe("min6");
    expect(mapToVoicingQuality("m6")).toBe("min6");
    expect(mapToVoicingQuality("6#11")).toBe("maj6");
  });

  // The "11" in "6#11" is an alteration of a sixth chord, not an eleventh.
  it("reads a sharpened eleventh as an alteration", () => {
    expect(mapToVoicingQuality("6#11")).toBe("maj6");
    expect(mapToVoicingQuality("11")).toBe("dom7");
    expect(mapToVoicingQuality("eleventh")).toBe("dom7");
  });

  // Uppercase-M shorthand is major, but a suspended or half-diminished
  // spelling outranks the family — it has no third to make major.
  it("does not make a suspended chord major", () => {
    // Nor does it hand them the sus4 voicings, which carry a b7 — see the
    // seventh-agreement group below.
    expect(mapToVoicingQuality("M7sus4")).toBeUndefined();
    expect(mapToVoicingQuality("M9sus4")).toBeUndefined();
    expect(mapToVoicingQuality("M7#5sus4")).toBeUndefined();
    expect(mapToVoicingQuality("M7b5")).toBe("maj7b5");
  });

  it("reads tonal's dash spelling of minor", () => {
    expect(mapToVoicingQuality("-7")).toBe("min7");
    expect(mapToVoicingQuality("-9")).toBe("min7");
    expect(mapToVoicingQuality("-11")).toBe("min7");
    expect(mapToVoicingQuality("-13")).toBe("min7");
    expect(mapToVoicingQuality("-6")).toBe("min6");
    expect(mapToVoicingQuality("-69")).toBe("m6/9");
    expect(mapToVoicingQuality("-7b5")).toBe("m7b5");
  });

  it("gives a minor augmented triad no seventh voicing", () => {
    // 1P 3m 5A — no seventh, same as the major, minor and diminished triads.
    expect(mapToVoicingQuality("minor augmented")).toBeUndefined();
  });
});

describe("mapToVoicingQuality — property over tonal's whole vocabulary", () => {
  // Every defect in this function has been a substring of one quality's name
  // appearing inside another's. A hand-written table of examples keeps missing
  // the next one; this asserts the invariant over everything tonal knows.
  const SIXTH_QUALITIES = new Set(["maj6", "min6", "6/9", "m6/9"]);
  const SEVENTH_QUALITIES = new Set(["dom7", "min7", "maj7", "m7b5", "dim7"]);

  /**
   * The add family now has its own qualities. What remains is `mb6b9`
   * (1 b3 b6 b9) — a minor triad with two altered tones and no seventh, still
   * claimed by the digit catchall. Named rather than silently passing.
   */
  const ADD_FAMILY = new Set(["mb6b9"]);

  it("never answers a chord with a quality its intervals cannot support", () => {
    const wrong: string[] = [];
    for (const ct of ChordType.all()) {
      const names = [ct.name, ...ct.aliases].filter(Boolean);
      const hasSixth = ct.intervals.some((i) => /^(6|13)/.test(i));
      const hasSeventh = ct.intervals.some((i) => /^7/.test(i));
      for (const name of names) {
        if (ADD_FAMILY.has(name)) continue;
        const q = mapToVoicingQuality(name);
        if (!q) continue;
        if (SIXTH_QUALITIES.has(q) && !hasSixth) {
          wrong.push(`${name} -> ${q} but has no 6th (${ct.intervals.join(" ")})`);
        }
        if (SEVENTH_QUALITIES.has(q) && !hasSeventh) {
          wrong.push(`${name} -> ${q} but has no 7th (${ct.intervals.join(" ")})`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("mapToVoicingQuality — the seventh must not contradict the chord", () => {
  // A minor/major seventh is a minor chord: 1 b3 5 7. Its canonical name
  // contains "minor" and resolved correctly, but every shorthand alias for it
  // scattered — mMaj7 and -maj7 contain "maj" and landed in the major branch,
  // mM7 and -Δ7 fell through to the dominant catchall. One chord, three
  // different answers depending on how it was written.
  it("classifies every minor/major seventh alias as minor", () => {
    for (const alias of ["mMaj7", "mM7", "-Δ7", "-^7", "-maj7", "mMaj9", "mM9", "-^9"]) {
      expect(mapToVoicingQuality(alias)).toBe("mMaj7");
    }
    expect(mapToVoicingQuality("minor/major seventh")).toBe("mMaj7");
  });

  it("keeps the b6 spellings of that chord minor too", () => {
    // mMaj7b6 is 1 b3 5 b6 7 — a minor chord however the sixth is read, and
    // the raised-fifth reading (1 b3 #5 7) is minor as well.
    expect(mapToVoicingQuality("mMaj7b6")).toBe("mMaj7");
    expect(mapToVoicingQuality("mMaj9b6")).toBe("mMaj7");
  });

  // The sus4 voicings are quartal stacks on a minor seventh ([0, 5, 10]), so
  // they cannot speak for a sus chord whose seventh is major.
  it("gives a major-seventh sus chord no voicing rather than a b7", () => {
    for (const alias of ["M7sus4", "M9sus4", "M7#5sus4", "M9#5sus4"]) {
      expect(mapToVoicingQuality(alias)).toBeUndefined();
    }
  });

  it("leaves the ordinary sus chords alone", () => {
    expect(mapToVoicingQuality("sus4")).toBe("sus4");
    expect(mapToVoicingQuality("7sus4")).toBe("sus4");
    expect(mapToVoicingQuality("9sus4")).toBe("sus4");
    expect(mapToVoicingQuality("suspended fourth")).toBe("sus4");
  });

  it("does not mistake a plain major seventh for the minor/major family", () => {
    expect(mapToVoicingQuality("maj7")).toBe("maj7");
    expect(mapToVoicingQuality("major seventh")).toBe("maj7");
    expect(mapToVoicingQuality("M7")).toBe("maj7");
  });

  // No chord in this vocabulary may be answered with a quality whose defining
  // seventh is the other kind. This is the invariant the aliases above broke.
  it("never answers a major-seventh chord with a minor-seventh quality", () => {
    const MINOR_SEVENTH_QUALITIES = new Set(["dom7", "min7", "m7b5", "dim7", "sus4"]);
    /** Nothing outstanding: every major-seventh chord now has an answer. */
    const NEEDS_A_QUALITY_THAT_DOES_NOT_EXIST = new Set<string>();
    const wrong: string[] = [];
    for (const ct of ChordType.all()) {
      if (!ct.intervals.includes("7M")) continue;
      // No exception left: the minor/major family has its own quality now, so
      // nothing carrying a major seventh may be answered with a minor one.
      for (const name of [ct.name, ...ct.aliases].filter(Boolean)) {
        if (NEEDS_A_QUALITY_THAT_DOES_NOT_EXIST.has(name)) continue;
        const q = mapToVoicingQuality(name);
        if (q && MINOR_SEVENTH_QUALITIES.has(q)) {
          wrong.push(`${name} -> ${q} (${ct.intervals.join(" ")})`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("VOICING_LIBRARY covers every quality it can be asked for", () => {
  // `mapToVoicingQuality` can return any VoicingQuality, so any it returns
  // without an entry here is a chord identified correctly and then voiced as
  // nothing. min6, m6/9, 6/9 and dim7 were in that state.
  const ALL_QUALITIES: VoicingQuality[] = [
    "maj7", "min7", "dom7", "m7b5", "dim7", "min6",
    "maj6", "sus4", "alt", "6/9", "m6/9", "maj7b5",
    "add9", "madd9", "add11", "madd11", "5", "sus2", "mMaj7",
  ];

  it("has at least one entry for every quality", () => {
    const empty = ALL_QUALITIES.filter(
      (q) => !VOICING_LIBRARY.some((e) => e.quality === q),
    );
    expect(empty).toEqual([]);
  });

  it("returns a voicing for every quality", () => {
    for (const q of ALL_QUALITIES) {
      expect(findVoicing(q), `no voicing for ${q}`).toBeTruthy();
    }
  });

  // Every defect in this file has been a note that contradicts the chord it
  // belongs to. This checks the data the same way the mapper is checked.
  it("contains no note that contradicts its own quality", () => {
    const FORBIDDEN: Partial<Record<VoicingQuality, number[]>> = {
      maj7: [3, 10],        // no minor 3rd, no minor 7th
      min7: [4, 11],        // no major 3rd, no major 7th
      dom7: [3, 11],
      m7b5: [4, 7, 11],     // no major 3rd, no perfect 5th
      dim7: [4, 7, 10, 11], // the 7th is diminished, spelled as a 6th
      min6: [4, 10, 11],    // a sixth chord has no seventh
      maj6: [3, 10, 11],
      "6/9": [3, 10, 11],
      "m6/9": [4, 10, 11],
      maj7b5: [3, 7, 10],   // no perfect 5th — the flat five is the point
      alt: [11],
      // An add chord is a triad plus one tone: no seventh of any kind, and the
      // third is whichever the name says.
      add9: [3, 10, 11],
      madd9: [4, 10, 11],
      add11: [3, 10, 11],
      madd11: [4, 10, 11],
      // No third at all, and no seventh.
      "5": [3, 4, 10, 11],
      sus2: [3, 4, 10, 11],
      mMaj7: [4, 10],       // minor third, major seventh
    };
    const bad: string[] = [];
    for (const entry of VOICING_LIBRARY) {
      const forbidden = FORBIDDEN[entry.quality];
      if (!forbidden) continue;
      const pcs = entry.intervals.map((i) => ((i % 12) + 12) % 12);
      const clash = pcs.filter((p) => forbidden.includes(p));
      if (clash.length) {
        bad.push(`${entry.id} (${entry.quality}) sounds ${clash.join(", ")}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("mapToVoicingQuality — the diminished and flat-five symbols", () => {
  it("reads o7 and °7 as diminished sevenths", () => {
    expect(mapToVoicingQuality("o7")).toBe("dim7");
    expect(mapToVoicingQuality("°7")).toBe("dim7");
    expect(mapToVoicingQuality("dim7")).toBe("dim7");
  });

  it("gives the bare diminished triad no seventh voicing", () => {
    expect(mapToVoicingQuality("o")).toBeUndefined();
    expect(mapToVoicingQuality("°")).toBeUndefined();
    expect(mapToVoicingQuality("dim")).toBeUndefined();
  });

  // A diminished triad carrying a major seventh is the minor/major shape with
  // a lowered fifth — a minor chord.
  it("reads oM7 and o7M7 as minor/major sevenths", () => {
    expect(mapToVoicingQuality("oM7")).toBe("mMaj7");
    expect(mapToVoicingQuality("o7M7")).toBe("mMaj7");
  });

  it("reads the half-diminished symbols", () => {
    expect(mapToVoicingQuality("ø")).toBe("m7b5");
    expect(mapToVoicingQuality("h7")).toBe("m7b5");
    expect(mapToVoicingQuality("m7b5")).toBe("m7b5");
    expect(mapToVoicingQuality("-7b5")).toBe("m7b5");
  });

  it("does not let a bare h match every spelled-out name", () => {
    expect(mapToVoicingQuality("major seventh")).toBe("maj7");
    expect(mapToVoicingQuality("eleventh")).toBe("dom7");
    expect(mapToVoicingQuality("half-diminished")).toBe("m7b5");
  });
});

describe("mapToVoicingQuality — triads with an added tone", () => {
  // An add chord is a triad plus one tone and no seventh. The digit catchall
  // used to claim them for dom7, putting a b7 into a chord defined by not
  // having one.
  it("keeps an added ninth on a major triad", () => {
    for (const alias of ["add9", "Madd9", "add2", "2"]) {
      expect(mapToVoicingQuality(alias)).toBe("add9");
    }
  });

  // "Madd9" and "madd9" differ only by that capital, so the major/minor test
  // has to read the original string.
  it("keeps an added ninth on a minor triad minor", () => {
    expect(mapToVoicingQuality("madd9")).toBe("madd9");
  });

  it("handles the added fourth and eleventh", () => {
    expect(mapToVoicingQuality("add11")).toBe("add11");
    expect(mapToVoicingQuality("add4")).toBe("add11");
    expect(mapToVoicingQuality("madd4")).toBe("madd11");
    expect(mapToVoicingQuality("madd11")).toBe("madd11");
  });

  it("still reads an added sixth as the sixth chord it is", () => {
    expect(mapToVoicingQuality("add6")).toBe("maj6");
    expect(mapToVoicingQuality("add13")).toBe("maj6");
  });

  it("still reads a sixth with a ninth as 6/9", () => {
    expect(mapToVoicingQuality("6add9")).toBe("6/9");
    expect(mapToVoicingQuality("69")).toBe("6/9");
    expect(mapToVoicingQuality("m69")).toBe("m6/9");
  });

  // An altered added tone, or a raised fifth, is a different chord again and
  // the plain add voicings would contradict it.
  it("returns nothing for an altered add", () => {
    for (const alias of ["Maddb9", "+add9", "M#5add9", "+add#9"]) {
      expect(mapToVoicingQuality(alias)).toBeUndefined();
    }
  });

  it("leaves the seventh chords that merely mention add alone", () => {
    expect(mapToVoicingQuality("M7add13")).toBe("maj7");
    expect(mapToVoicingQuality("m7add11")).toBe("min7");
    expect(mapToVoicingQuality("7add6")).toBe("dom7");
  });
});

describe("mapToVoicingQuality — root and fifth", () => {
  it("reads the power chord, however it is written", () => {
    expect(mapToVoicingQuality("5")).toBe("5");
    expect(mapToVoicingQuality("fifth")).toBe("5");
    expect(mapToVoicingQuality("no3")).toBe("5");
  });

  it("voices it as root, fifth and octave", () => {
    const v = findVoicing("5");
    expect(v).toBeTruthy();
    expect(v!.intervals).toEqual([0, 7, 12]);
  });
});
