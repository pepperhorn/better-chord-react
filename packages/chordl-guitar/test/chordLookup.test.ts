import { describe, it, expect } from "vitest";
import { lookupGuitarChord, hasGuitarChord, dbPositionToChord, positionToMidi, INSTRUMENTS } from "../src";

describe("lookupGuitarChord", () => {
  it("finds an open A minor with multiple positions", () => {
    const res = lookupGuitarChord("Am");
    expect(res).not.toBeNull();
    expect(res!.positions.length).toBeGreaterThan(1); // alternate placements
    // Open Am: low E muted, A open, D=2, G=2, B=1, high E open
    expect(res!.positions[0].frets).toEqual([-1, 0, 2, 2, 1, 0]);
  });

  it("maps a bare major triad (C) to the 'major' suffix", () => {
    const res = lookupGuitarChord("C");
    expect(res).not.toBeNull();
    expect(res!.positions[0].frets.length).toBe(6);
  });

  it("resolves 7th / maj7 / m7 suffixes", () => {
    expect(hasGuitarChord("G7")).toBe(true);
    expect(hasGuitarChord("Cmaj7")).toBe(true);
    expect(hasGuitarChord("Dm7")).toBe(true);
  });

  it("resolves half-diminished via m7b5", () => {
    expect(hasGuitarChord("Bm7b5")).toBe(true);
  });

  it("handles sharp and flat roots enharmonically", () => {
    expect(hasGuitarChord("F#m")).toBe(true);
    expect(hasGuitarChord("Bb")).toBe(true);
    expect(hasGuitarChord("Db")).toBe(true); // → Csharp in chords-db
  });

  it("maps chordl suffixes that chords-db spells differently", () => {
    // chords-db has no bare "sus"/"7sus", no "°7", no "M7", and spells 6/9 as "69".
    expect(hasGuitarChord("Csus")).toBe(true);   // → sus4
    expect(hasGuitarChord("C7sus")).toBe(true);  // → 7sus4
    expect(hasGuitarChord("C°7")).toBe(true);    // → dim7
    expect(hasGuitarChord("CM7")).toBe(true);    // → maj7
    expect(hasGuitarChord("C6/9")).toBe(true);   // → 69
    expect(hasGuitarChord("Am6/9")).toBe(true);  // → m69
  });

  it("returns null for unknown chords", () => {
    expect(lookupGuitarChord("H7")).toBeNull();
    expect(lookupGuitarChord("")).toBeNull();
  });

  it("resolves ukulele shapes (4 strings)", () => {
    const res = lookupGuitarChord("Am", "ukulele");
    expect(res).not.toBeNull();
    expect(res!.instrument).toBe("ukulele");
    // Open Am on ukulele: A=2, C/E/A open → [2,0,0,0]
    expect(res!.positions[0].frets).toEqual([2, 0, 0, 0]);
    // 4-string shape: strings numbered 1..4, none is string 5/6
    expect(res!.shapes[0].fingers.every((f) => f[0] <= 4)).toBe(true);
  });

  it("resolves ukulele accidental roots despite flat spelling in that library", () => {
    // ukulele.json spells these Db/Gb (not Csharp/Fsharp like guitar).
    expect(hasGuitarChord("C#m", "ukulele")).toBe(true);
    expect(hasGuitarChord("F#", "ukulele")).toBe(true);
    expect(hasGuitarChord("Bb7", "ukulele")).toBe(true);
  });

  it("returns null for an unmodeled instrument", () => {
    // @ts-expect-error — not a valid InstrumentId
    expect(lookupGuitarChord("Am", "bass")).toBeNull();
  });

  it("produces one svguitar shape per position", () => {
    const res = lookupGuitarChord("Am")!;
    expect(res.shapes.length).toBe(res.positions.length);
    // Open Am shape: muted low E (string 6), open high E (string 1)
    const open = res.shapes[0];
    expect(open.fingers).toContainEqual([6, "x"]);
    expect(open.fingers).toContainEqual([1, 0]);
    expect(open.position).toBe(1);
  });
});

describe("dbPositionToChord", () => {
  it("converts barre chords into svguitar barres", () => {
    // F major open-position barre: barre at fret 1 across all 6 strings.
    const res = lookupGuitarChord("F")!;
    const barrePos = res.positions.find((p) => p.barres.length > 0);
    expect(barrePos).toBeDefined();
    const chord = dbPositionToChord(barrePos!, 6, "F");
    expect(chord.barres.length).toBeGreaterThan(0);
    expect(chord.barres[0]).toMatchObject({ fret: barrePos!.barres[0] });
  });

  it("numbers strings high→low (string 1 = high E)", () => {
    // chords-db lists low→high; string 6 should map to the first fret entry.
    const chord = dbPositionToChord(
      { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1, barres: [] },
      6,
    );
    expect(chord.fingers).toContainEqual([6, "x"]); // low E muted (first entry)
    expect(chord.fingers).toContainEqual([1, 0]);    // high E open (last entry)
  });
});

describe("bass lookup", () => {
  it("returns null — chords-db ships no bass library, and we never invent shapes", () => {
    expect(lookupGuitarChord("C", "bass4")).toBeNull();
    expect(lookupGuitarChord("Am", "bass5")).toBeNull();
    expect(hasGuitarChord("C", "bass4")).toBe(false);
  });
});

/**
 * chords-db carries no "5" suffix, so power chords cannot be looked up — they
 * are generated instead. Routing that through lookupGuitarChord keeps one entry
 * point: a consumer asks for shapes and does not care where they came from.
 */
describe("power chords", () => {
  it("returns generated shapes for a bare fifth", () => {
    const res = lookupGuitarChord("D5");
    expect(res).not.toBeNull();
    expect(res!.shapes.length).toBeGreaterThan(0);
    expect(res!.label).toBe("D5");
  });

  it("offers the E-string and A-string placements", () => {
    const res = lookupGuitarChord("D5");
    // Root on the 6th string and on the 5th string are different placements,
    // which is exactly what the A/B/C position toggle is for.
    expect(res!.positions.length).toBe(2);
  });

  it("sounds root and fifth only — no third", () => {
    const res = lookupGuitarChord("A5");
    expect(res).not.toBeNull();
    const sounded = res!.positions[0].frets.filter((f) => f >= 0).length;
    // root + fifth + octave doubling
    expect(sounded).toBe(3);
  });

  it("generates a fifth for every root", () => {
    for (const label of ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "F#5", "Bb5"]) {
      expect(lookupGuitarChord(label), label).not.toBeNull();
    }
  });

  it("does not generate power chords for ukulele", () => {
    // Reentrant high-G tuning makes root+fifth a different problem; out of scope.
    expect(lookupGuitarChord("D5", "ukulele")).toBeNull();
  });

  it("leaves ordinary chords alone", () => {
    const d = lookupGuitarChord("D");
    expect(d!.positions[0].frets).not.toEqual(lookupGuitarChord("D5")!.positions[0].frets);
  });
});

/**
 * guitar-top3 is a hand-authored preset library, not a chords-db instrument.
 * Without routing, every lookup against it returned null.
 */
describe("top-3 string voicings", () => {
  it("returns a preset for a chord that has one", () => {
    const res = lookupGuitarChord("D", "guitar-top3");
    expect(res).not.toBeNull();
    expect(res!.instrument).toBe("guitar-top3");
  });

  it("mutes the three low strings", () => {
    const res = lookupGuitarChord("C", "guitar-top3");
    expect(res).not.toBeNull();
    // Strings 4, 5, 6 are muted in every top-3 voicing.
    const muted = res!.positions[0].frets.slice(0, 3);
    expect(muted).toEqual([-1, -1, -1]);
  });

  it("covers the suffixes the preset library uses", () => {
    for (const label of ["C", "Am", "G7", "Dm7", "Fmaj7"]) {
      expect(lookupGuitarChord(label, "guitar-top3"), label).not.toBeNull();
    }
  });

  it("returns null rather than falling back to a six-string shape", () => {
    // A six-string shape under a three-string label would be a lie.
    expect(lookupGuitarChord("C#dim7", "guitar-top3")).toBeNull();
  });
});

/**
 * A generated shape is only useful if it sounds the chord it claims. These
 * check pitch classes rather than fret patterns, the same way staticPresets
 * checks the hand-authored table — a wrong shape is unrecoverable once printed.
 */
describe("power chords sound correct", () => {
  const pcsOf = (label: string) =>
    lookupGuitarChord(label)!.positions.map((pos) =>
      new Set(positionToMidi(pos, INSTRUMENTS.guitar.openMidi).map((m) => m % 12)),
    );

  it("sounds exactly the root and the fifth", () => {
    // D5 = D (2) + A (9). No third — that is the whole point of a fifth.
    for (const pcs of pcsOf("D5")) {
      expect([...pcs].sort((a, b) => a - b)).toEqual([2, 9]);
    }
  });

  it("holds for every root", () => {
    const fifthOf = (pc: number) => (pc + 7) % 12;
    for (const [label, root] of [["C5", 0], ["E5", 4], ["G5", 7], ["Bb5", 10], ["F#5", 6]] as const) {
      for (const pcs of pcsOf(label)) {
        expect([...pcs].sort((a, b) => a - b), label).toEqual(
          [root, fifthOf(root)].sort((a, b) => a - b),
        );
      }
    }
  });
});
