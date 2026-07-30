import { describe, it, expect } from "vitest";
import { lookupGuitarChord, hasGuitarChord, dbPositionToChord } from "../src";

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
