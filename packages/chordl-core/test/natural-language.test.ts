import { describe, it, expect } from "vitest";
import { parseChordDescription } from "@pepperhorn/chordl-core";

describe("parseChordDescription", () => {
  it("parses 'Cmaj7#5 starting on G#'", () => {
    const result = parseChordDescription("Cmaj7#5 starting on G#");
    expect(result.chordName).toBe("Cmaj7#5");
    expect(result.startingNote).toBe("G#");
  });

  it("parses 'show me a D minor seventh in first inversion'", () => {
    const result = parseChordDescription(
      "show me a D minor seventh in first inversion"
    );
    expect(result.chordName).toBe("Dm7");
    expect(result.inversion).toBe(1);
  });

  it("parses 'G sharp augmented'", () => {
    const result = parseChordDescription("G sharp augmented");
    expect(result.chordName).toBe("G#aug");
  });

  it("parses '2nd inversion'", () => {
    const result = parseChordDescription("C 2nd inversion");
    expect(result.inversion).toBe(2);
  });

  it("parses 'compact' format", () => {
    const result = parseChordDescription("Cmaj7 compact");
    expect(result.format).toBe("compact");
  });

  it("parses spanning", () => {
    const result = parseChordDescription(
      "a C triad in the 2nd inversion, spanning E to E, compact layout"
    );
    expect(result.chordName).toBe("C");
    expect(result.inversion).toBe(2);
    expect(result.spanFrom).toBe("E");
    expect(result.spanTo).toBe("E");
    expect(result.format).toBe("compact");
  });

  it("parses root position", () => {
    const result = parseChordDescription("C root position");
    expect(result.inversion).toBe(0);
  });

  it("parses 'Cmaj7 in the style of Bill Evans'", () => {
    const result = parseChordDescription("Cmaj7 in the style of Bill Evans");
    expect(result.chordName).toBe("Cmaj7");
    expect(result.styleHint).toBe("Bill Evans");
  });

  it("parses 'Dm7 like McCoy Tyner'", () => {
    const result = parseChordDescription("Dm7 like McCoy Tyner");
    expect(result.chordName).toBe("Dm7");
    expect(result.styleHint).toBe("McCoy Tyner");
  });

  it("parses 'C7 bebop'", () => {
    const result = parseChordDescription("C7 bebop");
    expect(result.chordName).toBe("C7");
    expect(result.styleHint).toBe("bebop");
  });

  it("parses 'Cmaj7#5#9 in the style of Bill Evans starting on G'", () => {
    const result = parseChordDescription(
      "Cmaj7#5#9 in the style of Bill Evans starting on G"
    );
    expect(result.chordName).toBe("Cmaj7#5#9");
    expect(result.styleHint).toBe("Bill Evans");
    expect(result.startingNote).toBe("G");
  });

  // Padding
  it("parses 'Cmaj7 with 3 notes on either side'", () => {
    const result = parseChordDescription("Cmaj7 with 3 notes on either side");
    expect(result.chordName).toBe("Cmaj7");
    expect(result.padding).toBe(3);
  });

  // Bass note via "over"
  it("parses 'C6/9 over D'", () => {
    const result = parseChordDescription("C6/9 over D");
    expect(result.chordName).toBe("C6/9");
    expect(result.bassNote).toBe("D");
  });

  it("parses 'Cmaj7 over E in the bass'", () => {
    const result = parseChordDescription("Cmaj7 over E in the bass");
    expect(result.chordName).toBe("Cmaj7");
    expect(result.bassNote).toBe("E");
  });

  // Bass degree
  it("parses 'Cmaj7 with the 5th in the bass'", () => {
    const result = parseChordDescription("Cmaj7 with the 5th in the bass");
    expect(result.chordName).toBe("Cmaj7");
    expect(result.bassDegree).toBe(5);
  });

  // Starting degree
  it("parses 'Dbmaj9 starting on the 9th'", () => {
    const result = parseChordDescription("Dbmaj9 starting on the 9th");
    expect(result.chordName).toBe("Dbmaj9");
    expect(result.startingDegree).toBe(9);
  });

  // Style keywords - new ones
  it("parses 'G7 drop 2'", () => {
    const result = parseChordDescription("G7 drop 2");
    expect(result.chordName).toBe("G7");
    expect(result.styleHint).toBe("drop 2");
  });

  it("parses 'G7 drop 2+4'", () => {
    const result = parseChordDescription("G7 drop 2+4");
    expect(result.chordName).toBe("G7");
    expect(result.styleHint).toBe("drop 2+4");
  });

  it("parses 'Cmaj7 spread'", () => {
    const result = parseChordDescription("Cmaj7 spread");
    expect(result.chordName).toBe("Cmaj7");
    expect(result.styleHint).toBe("spread");
  });

  it("parses 'G7 nestico'", () => {
    const result = parseChordDescription("G7 nestico");
    expect(result.chordName).toBe("G7");
    expect(result.styleHint).toBe("nestico");
  });

  it("parses 'Dm7 basie'", () => {
    const result = parseChordDescription("Dm7 basie");
    expect(result.chordName).toBe("Dm7");
    expect(result.styleHint).toBe("basie");
  });

  it("parses 'C7 ellington'", () => {
    const result = parseChordDescription("C7 ellington");
    expect(result.chordName).toBe("C7");
    expect(result.styleHint).toBe("ellington");
  });

  // Explicit notes list
  it("parses 'with notes C E G'", () => {
    const result = parseChordDescription("with notes C E G");
    expect(result.notesGroups).toEqual([{ notes: ["C", "E", "G"] }]);
  });

  it("parses 'with notes E4 G4 C5' with explicit octaves", () => {
    const result = parseChordDescription("with notes E4 G4 C5");
    expect(result.notesGroups?.[0].notes).toEqual(["E4", "G4", "C5"]);
  });

  it("parses 'notes C E G in lh'", () => {
    const result = parseChordDescription("notes C E G in lh");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G"], hand: "lh" },
    ]);
  });

  it("parses 'notes E G B in right hand'", () => {
    const result = parseChordDescription("notes E G B in right hand");
    expect(result.notesGroups?.[0].hand).toBe("rh");
  });

  it("parses 'notes C E G in bottom hand' (alias for lh)", () => {
    const result = parseChordDescription("notes C E G in bottom hand");
    expect(result.notesGroups?.[0].hand).toBe("lh");
  });

  it("parses 'notes E G B in top hand' (alias for rh)", () => {
    const result = parseChordDescription("notes E G B in top hand");
    expect(result.notesGroups?.[0].hand).toBe("rh");
  });

  it("parses prefix form 'notes in lh Eb Gb Bb'", () => {
    const result = parseChordDescription("notes in lh Eb Gb Bb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
    ]);
  });

  it("parses paired prefix form 'notes in lh ... notes in rh ...'", () => {
    const result = parseChordDescription(
      "notes in lh eb gb bb notes in rh db eb f gb",
    );
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  it("parses bare form 'Eb Gb Bb in lh and Db Eb F and Gb in rh'", () => {
    const result = parseChordDescription(
      "eb gb bb in lh and db eb f and gb in rh",
    );
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  it("parses bare form 'C E G in bass clef' (no 'notes' keyword)", () => {
    const result = parseChordDescription("C E G in bass clef");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G"], hand: "lh", clef: "bass" },
    ]);
  });

  it("doesn't treat 'G7 in lh' as a notes list (single token)", () => {
    const result = parseChordDescription("G7 in lh");
    expect(result.chordName).toBe("G7");
    expect(result.notesGroups).toBeUndefined();
  });

  it("parses single-note hand assignments — 'bb in lh, d f bb in rh'", () => {
    const result = parseChordDescription("bb in lh, d f bb in rh");
    expect(result.notesGroups).toEqual([
      { notes: ["D", "F", "Bb"], hand: "rh" },
      { notes: ["Bb"], hand: "lh" },
    ]);
    expect(result.chordName).toBe("");
  });

  it("parses 'lh: Bb rh: D F Bb' (hand-prefix single + multi)", () => {
    const result = parseChordDescription("lh: Bb rh: D F Bb");
    expect(result.notesGroups).toEqual([
      { notes: ["D", "F", "Bb"], hand: "rh" },
      { notes: ["Bb"], hand: "lh" },
    ]);
    expect(result.chordName).toBe("");
  });

  it("parses 'left Bb right D F Bb' (long-form hands, mixed)", () => {
    const result = parseChordDescription("left Bb right D F Bb");
    expect(result.notesGroups).toEqual([
      { notes: ["D", "F", "Bb"], hand: "rh" },
      { notes: ["Bb"], hand: "lh" },
    ]);
    expect(result.chordName).toBe("");
  });

  it("still treats 'Bb7 in lh' as a chord symbol, not a single note", () => {
    const result = parseChordDescription("Bb7 in lh");
    expect(result.chordName).toBe("Bb7");
    expect(result.notesGroups).toBeUndefined();
  });

  it("keeps both hands in 'Rh c d e LH c e'", () => {
    const result = parseChordDescription("Rh c d e LH c e");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "D", "E"], hand: "rh" },
      { notes: ["C", "E"], hand: "lh" },
    ]);
  });

  it("keeps both hands whichever hand comes first", () => {
    const result = parseChordDescription("LH c e Rh c d e");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E"], hand: "lh" },
      { notes: ["C", "D", "E"], hand: "rh" },
    ]);
  });

  it("parses a chord symbol after a hand — 'rh Cmaj7 lh Dm7'", () => {
    const result = parseChordDescription("rh Cmaj7 lh Dm7");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G", "B"], hand: "rh", chord: "Cmaj7" },
      { notes: ["D", "F", "A", "C"], hand: "lh", chord: "Dm7" },
    ]);
    expect(result.chordName).toBe("");
  });

  it("takes the first chord when two follow a hand — 'rh Cmaj7 Dm7 lh C'", () => {
    const result = parseChordDescription("rh Cmaj7 Dm7 lh C");
    expect(result.notesGroups).toEqual([
      { notes: ["C"], hand: "lh" },
      { notes: ["C", "E", "G", "B"], hand: "rh", chord: "Cmaj7" },
    ]);
    expect(result.chordName).toBe("");
  });

  it("mixes a hand chord with a hand note list — 'rh c d e lh Am'", () => {
    const result = parseChordDescription("rh c d e lh Am");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "D", "E"], hand: "rh" },
      { notes: ["A", "C", "E"], hand: "lh", chord: "Am" },
    ]);
  });

  it("reads a digit-bearing hand chord as a chord — 'lh G7'", () => {
    const result = parseChordDescription("lh G7");
    expect(result.notesGroups).toEqual([
      { notes: ["G", "B", "D", "F"], hand: "lh", chord: "G7" },
    ]);
  });

  it("still treats 'lh Bb' as a single note, not a Bb chord", () => {
    const result = parseChordDescription("lh Bb");
    expect(result.notesGroups).toEqual([{ notes: ["Bb"], hand: "lh" }]);
  });

  it("leaves a non-chord after a hand alone — 'rh Cq'", () => {
    const result = parseChordDescription("rh Cq");
    expect(result.notesGroups).toBeUndefined();
  });

  it("parses a chord after a clef — 'bass clef G7'", () => {
    const result = parseChordDescription("bass clef G7");
    expect(result.notesGroups).toEqual([
      { notes: ["G", "B", "D", "F"], hand: "lh", clef: "bass", chord: "G7" },
    ]);
  });

  it("parses prefix form with bass clef 'notes in bass clef C E G'", () => {
    const result = parseChordDescription("notes in bass clef C E G");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G"], hand: "lh", clef: "bass" },
    ]);
  });

  it("parses 'with notes Bb Eb Ab' (flats)", () => {
    const result = parseChordDescription("with notes Bb Eb Ab");
    expect(result.notesGroups?.[0].notes).toEqual(["Bb", "Eb", "Ab"]);
  });

  it("parses 'with notes C E G' alongside chord ('Cmaj7 with notes E G B C')", () => {
    const result = parseChordDescription("Cmaj7 with notes E G B C");
    expect(result.chordName).toBe("Cmaj7");
    expect(result.notesGroups?.[0].notes).toEqual(["E", "G", "B", "C"]);
  });

  it("doesn't confuse 'with note names' with notes list", () => {
    const result = parseChordDescription("Cmaj7 with note names");
    expect(result.showNoteNames).toBe(true);
    expect(result.notesGroups).toBeUndefined();
  });

  it("parses 'notes C E G' followed by 'compact' (terminator)", () => {
    const result = parseChordDescription("with notes C E G compact");
    expect(result.notesGroups?.[0].notes).toEqual(["C", "E", "G"]);
    expect(result.format).toBe("compact");
  });

  // Clefs
  it("parses 'with notes C E G in the bass clef' (LH + bass octave hint)", () => {
    const result = parseChordDescription("with notes C E G in the bass clef");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G"], hand: "lh", clef: "bass" },
    ]);
  });

  it("parses 'notes E G B in the treble clef' (RH + treble octave hint)", () => {
    const result = parseChordDescription("notes E G B in the treble clef");
    expect(result.notesGroups).toEqual([
      { notes: ["E", "G", "B"], hand: "rh", clef: "treble" },
    ]);
  });

  // Paired clefs — two groups
  it("parses paired clefs: 'notes C E G in the bass clef and notes B D F in the treble clef'", () => {
    const result = parseChordDescription(
      "notes C E G in the bass clef and notes B D F in the treble clef",
    );
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G"], hand: "lh", clef: "bass" },
      { notes: ["B", "D", "F"], hand: "rh", clef: "treble" },
    ]);
  });

  it("parses paired without 'and': 'with notes C E G in bass clef with notes B D F in treble clef'", () => {
    const result = parseChordDescription(
      "with notes C E G in bass clef with notes B D F in treble clef",
    );
    expect(result.notesGroups?.length).toBe(2);
    expect(result.notesGroups?.[0].clef).toBe("bass");
    expect(result.notesGroups?.[1].clef).toBe("treble");
  });

  // Hand-prefix bare (no "notes" keyword)
  it("parses 'lh: Eb Gb Bb rh: Db Eb F Gb' (colon-prefixed hands)", () => {
    const result = parseChordDescription("lh: Eb Gb Bb rh: Db Eb F Gb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  it("parses 'lh Eb Gb Bb rh Db Eb F Gb' (no colons)", () => {
    const result = parseChordDescription("lh Eb Gb Bb rh Db Eb F Gb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  it("parses 'left Eb Gb Bb right Db Eb F Gb' (long-form hand words)", () => {
    const result = parseChordDescription("left Eb Gb Bb right Db Eb F Gb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  it("parses 'bottom Eb Gb Bb top Db Eb F Gb'", () => {
    const result = parseChordDescription("bottom Eb Gb Bb top Db Eb F Gb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  it("parses 'bass C E G treble B D F' (clef words)", () => {
    const result = parseChordDescription("bass C E G treble B D F");
    expect(result.notesGroups).toEqual([
      { notes: ["C", "E", "G"], hand: "lh", clef: "bass" },
      { notes: ["B", "D", "F"], hand: "rh", clef: "treble" },
    ]);
  });

  // Polychord-style "//"
  it("parses 'Eb Gb Bb // Db Eb F Gb' as polychord (rh over lh)", () => {
    const result = parseChordDescription("Eb Gb Bb // Db Eb F Gb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "rh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "lh" },
    ]);
  });

  // Semicolon separator
  it("parses 'Eb Gb Bb; Db Eb F Gb' as lh then rh (reading order)", () => {
    const result = parseChordDescription("Eb Gb Bb; Db Eb F Gb");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  // Parens + hand suffix
  it("parses '(Eb Gb Bb) lh (Db Eb F Gb) rh' (parenthesized + hand suffix)", () => {
    const result = parseChordDescription("(Eb Gb Bb) lh (Db Eb F Gb) rh");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  // Hand suffix without "in"
  it("parses 'Eb Gb Bb lh, Db Eb F Gb rh' (no 'in')", () => {
    const result = parseChordDescription("Eb Gb Bb lh, Db Eb F Gb rh");
    expect(result.notesGroups).toEqual([
      { notes: ["Eb", "Gb", "Bb"], hand: "lh" },
      { notes: ["Db", "Eb", "F", "Gb"], hand: "rh" },
    ]);
  });

  // Stacking note names + degrees + fingering — flexible phrasing
  it("stacks names+degrees+fingering: 'with note names and degrees and fingering'", () => {
    const r = parseChordDescription("Cmaj7 with note names and degrees and fingering");
    expect(r.showNoteNames).toBe(true);
    expect(r.noteNameMode).toBe("pitch-class+degree");
    expect(r.autoFingering).toBe(true);
  });

  it("stacks names+degrees+fingering: 'with note names with degrees with fingering'", () => {
    const r = parseChordDescription("Cmaj7 with note names with degrees with fingering");
    expect(r.showNoteNames).toBe(true);
    expect(r.noteNameMode).toBe("pitch-class+degree");
    expect(r.autoFingering).toBe(true);
  });

  it("stacks names+degrees+fingering: 'note names, degrees, fingering' (commas, no 'with')", () => {
    const r = parseChordDescription("Cmaj7 note names, degrees, fingering");
    expect(r.showNoteNames).toBe(true);
    expect(r.noteNameMode).toBe("pitch-class+degree");
    expect(r.autoFingering).toBe(true);
  });

  it("'show degrees' (no 'with') → degree-only mode", () => {
    const r = parseChordDescription("Cmaj7 show degrees");
    expect(r.showNoteNames).toBe(true);
    expect(r.noteNameMode).toBe("degree");
  });
});

describe("scale shorthand", () => {
  const scaleOf = (input: string) => {
    const r = parseChordDescription(input);
    return r.isScale ? r.scaleName : null;
  };

  it("reads a minor scale from chord shorthand", () => {
    expect(scaleOf("dm scale")).toBe("D minor");
    expect(scaleOf("dmin scale")).toBe("D minor");
    expect(scaleOf("d min scale")).toBe("D minor");
  });

  it("reads a major scale from chord shorthand", () => {
    expect(scaleOf("d maj scale")).toBe("D major");
    expect(scaleOf("dmaj scale")).toBe("D major");
  });

  it("treats a bare root as major", () => {
    expect(scaleOf("d scale")).toBe("D major");
    expect(scaleOf("D SCALE")).toBe("D major");
  });

  it("tells the case-sensitive M and m markers apart", () => {
    expect(scaleOf("dM scale")).toBe("D major");
    expect(scaleOf("dm scale")).toBe("D minor");
  });

  it("handles accidental roots", () => {
    expect(scaleOf("f#m scale")).toBe("F# minor");
    expect(scaleOf("bb scale")).toBe("Bb major");
    expect(scaleOf("c# maj scale")).toBe("C# major");
  });

  it("still honours the spelled-out forms", () => {
    expect(scaleOf("d minor scale")).toBe("D minor");
    expect(scaleOf("d major scale")).toBe("D major");
    expect(scaleOf("d dorian")).toBe("D dorian");
  });

  it("keeps the octave count", () => {
    const r = parseChordDescription("dm scale 2 octaves");
    expect(r.scaleName).toBe("D minor");
    expect(r.scaleOctaves).toBe(2);
  });

  it("defaults to one octave", () => {
    expect(parseChordDescription("dm scale").scaleOctaves).toBe(1);
  });

  it("does not read a root out of the middle of a scale-type word", () => {
    // The trailing "c" of "harmonic"/"melodic" used to be taken as the root,
    // so "dm harmonic minor" resolved to C minor.
    expect(scaleOf("dm harmonic minor")).toBe("D harmonic minor");
    expect(scaleOf("dm harmonic minor scale")).toBe("D harmonic minor");
    expect(scaleOf("dm melodic minor")).toBe("D melodic minor");
    expect(scaleOf("d harmonic minor")).toBe("D harmonic minor");
  });

  it("accepts a chord-shorthand root in front of a named scale type", () => {
    expect(scaleOf("f#m harmonic minor")).toBe("F# harmonic minor");
    expect(scaleOf("bbm melodic minor")).toBe("Bb melodic minor");
    expect(scaleOf("dm natural minor")).toBe("D natural minor");
    expect(scaleOf("dm dorian")).toBe("D dorian");
    expect(scaleOf("dmaj lydian")).toBe("D lydian");
  });

  it("leaves the existing named scales untouched", () => {
    expect(scaleOf("c blues")).toBe("C blues");
    expect(scaleOf("g mixolydian")).toBe("G mixolydian");
    expect(scaleOf("a minor pentatonic")).toBe("A minor pentatonic");
    expect(scaleOf("c major pentatonic")).toBe("C major pentatonic");
    expect(scaleOf("eb whole tone")).toBe("Eb whole tone");
    expect(scaleOf("c diminished")).toBe("C diminished");
  });

  it("leaves chords alone without the word 'scale'", () => {
    for (const chord of ["Dm", "D", "Cmaj7", "dm7", "F#m"]) {
      const r = parseChordDescription(chord);
      expect(r.isScale).toBeFalsy();
      expect(r.chordName).toBe(chord === "dm7" ? "Dm7" : chord);
    }
  });
});

/**
 * FILLER_WORDS strips the English article "a". Because the note A is also a
 * single letter, the two are indistinguishable to a `\b`-delimited match
 * whenever what follows the A is a non-word character — `#`, `/`, or the end
 * of the string. Every case below was silently wrong before the fix, and the
 * A#/slash ones were worse than the bare-A error: they rendered a real but
 * *different* chord with no complaint.
 */
describe("root note A vs. the article \"a\"", () => {
  const nameOf = (input: string) => parseChordDescription(input).chordName;

  it("keeps a bare A as a chord rather than eating it as an article", () => {
    expect(nameOf("A")).toBe("A");
  });

  it("keeps A# and Ab roots", () => {
    expect(nameOf("A#")).toBe("A#");
    expect(nameOf("Ab")).toBe("Ab");
  });

  it("no longer resolves A#dim to D", () => {
    expect(nameOf("A#dim")).toBe("A#dim");
  });

  it("no longer resolves A#maj7 to A", () => {
    expect(nameOf("A#maj7")).toBe("A#maj7");
  });

  it("keeps qualities that already worked", () => {
    expect(nameOf("Am")).toBe("Am");
    expect(nameOf("Amaj7")).toBe("Amaj7");
  });

  it("still strips the article when it really is one", () => {
    expect(nameOf("show me a C")).toBe("C");
    expect(nameOf("please draw an E")).toBe("E");
    expect(nameOf("show me a D minor")).toBe("Dm");
  });
});

/**
 * CHORD_RE folded the slash into the same character class as the flat symbol
 * `b`, so a bass note only survived when it happened to be B or Bb.
 */
describe("slash-chord bass notes", () => {
  const nameOf = (input: string) => parseChordDescription(input).chordName;

  it("keeps a bass note of any letter", () => {
    expect(nameOf("C/E")).toBe("C/E");
    expect(nameOf("G/F")).toBe("G/F");
    expect(nameOf("D/C")).toBe("D/C");
    expect(nameOf("A/C#")).toBe("A/C#");
  });

  it("keeps the bass note that already worked", () => {
    expect(nameOf("C/B")).toBe("C/B");
    expect(nameOf("C/Bb")).toBe("C/Bb");
  });

  it("uppercases a lowercase bass note", () => {
    expect(nameOf("C/e")).toBe("C/E");
  });

  // A slash followed by digits is a chord type (6/9), not a bass note. Giving
  // the bass its own capture group stopped the quality group from consuming
  // "/9" and truncated this to "C6", so the two rules have to stay in step.
  it("treats a digit after the slash as quality, not a bass note", () => {
    expect(nameOf("C6/9")).toBe("C6/9");
  });
});

/**
 * `MIDI_NAMES_RE` was read for its size and mode but never stripped from the
 * residual, so the word "midi" reached the chord extractor. There it is not
 * inert: CHORD_RE's quality class contains `m`, so "C midi" parsed as Cm — and
 * where the root was the article-shaped A, FILLER_WORDS took the A and left the
 * extractor to find its root in the `d` of "midi", turning "A" into D.
 *
 * Every one of these rendered a real but different chord, with no error.
 */
describe("midi note names are not part of the chord", () => {
  const nameOf = (input: string) => parseChordDescription(input).chordName;

  it("no longer appends the m of \"midi\" to the root", () => {
    expect(nameOf("C with midi note names")).toBe("C");
    expect(nameOf("G with midi note names")).toBe("G");
    expect(nameOf("D with midi note names")).toBe("D");
    expect(nameOf("E midi note names")).toBe("E");
    expect(nameOf("F midi names")).toBe("F");
  });

  it("no longer finds a root inside the word \"midi\"", () => {
    expect(nameOf("A with midi note names")).toBe("A");
  });

  it("leaves a chord that already has a quality alone", () => {
    expect(nameOf("Cmaj7 with midi note names")).toBe("Cmaj7");
    expect(nameOf("Am7 midi note names")).toBe("Am7");
  });

  it("strips a bare \"midi\" too, since that alone asks for midi names", () => {
    // The parser treats a loose "midi" as the request, so it must not also
    // leave the word behind for the chord extractor.
    expect(nameOf("C midi")).toBe("C");
    expect(parseChordDescription("C midi").noteNameMode).toBe("midi");
  });

  it("still reads the mode and size it was asked for", () => {
    const parsed = parseChordDescription("C with midi note names in xl");
    expect(parsed.showNoteNames).toBe(true);
    expect(parsed.noteNameMode).toBe("midi");
    expect(parsed.noteNameSize).toBe("xl");
  });

  it("keeps the other modifiers on the same string working", () => {
    const parsed = parseChordDescription("G7 with midi note names starting on B");
    expect(parsed.chordName).toBe("G7");
    expect(parsed.startingNote).toBe("B");
    expect(parsed.noteNameMode).toBe("midi");
  });
})

/**
 * The article guard tested for the true end of the string, but FILLER_WORDS
 * runs after every modifier has been cut out — so a bare A carrying any
 * modifier reached it as "A " and was eaten as an article. The end of what is
 * left is what matters, trailing space included.
 */
describe("root note A with a modifier after it", () => {
  const nameOf = (input: string) => parseChordDescription(input).chordName;

  it("survives a modifier that was stripped from behind it", () => {
    expect(nameOf("A with note names")).toBe("A");
    expect(nameOf("A in second inversion")).toBe("A");
    expect(nameOf("A with fingering")).toBe("A");
    expect(nameOf("A compact")).toBe("A");
  });

  it("survives modifiers on both sides", () => {
    expect(nameOf("show me an A with note names")).toBe("A");
  });

  it("keeps reading the modifier it carried", () => {
    const parsed = parseChordDescription("A in second inversion");
    expect(parsed.chordName).toBe("A");
    expect(parsed.inversion).toBe(2);
  });

  it("still strips a real article", () => {
    // "a" here introduces a noun, not a chord — the guard must not keep it.
    expect(nameOf("show me a Cmaj7")).toBe("Cmaj7");
    expect(nameOf("draw an Em")).toBe("Em");
  });

  /**
   * The trap in fixing the above: filler is stripped last, so an article whose
   * noun was already deleted is left trailing and looks exactly like a bare A.
   * "in a compact layout" and "A with note names" arrive here as the same "A ".
   * Deciding on the capital letter and the original input is what tells them
   * apart — a phantom A chord on a note-list card truncates its fingering row
   * and makes follow-along emit a chord symbol for a card that has none.
   */
  it("does not invent a chord from an article whose noun was stripped", () => {
    for (const input of [
      "in a compact layout",
      "show me a full layout",
      "a compact",
      "a fingering",
      "with a theme",
      "a left hand C E G",
      "notes C E G B in a compact layout",
    ]) {
      expect(nameOf(input), input).toBe("");
    }
  });

  it("leaves a scale request without a phantom chord", () => {
    const parsed = parseChordDescription("a C major scale");
    expect(parsed.isScale).toBe(true);
    expect(parsed.chordName).toBe("");
  });

  it("keeps a note list free of a chord name", () => {
    const parsed = parseChordDescription("notes C E G B in a compact layout");
    expect(parsed.notesGroups?.[0].notes).toEqual(["C", "E", "G", "B"]);
    expect(parsed.chordName).toBe("");
  });

  it("still reads a lone lowercase \"a\" as the note", () => {
    // The article that ends the input has no noun to introduce.
    expect(nameOf("a")).toBe("A");
  });

  /**
   * The other half of the family: where the word after the A is not strippable
   * filler, the descriptive path never saw the root because the article pass
   * had already eaten it. "A minor" resolved to nothing at all, and "A minor
   * seventh" to E.
   */
  it("reads a spelled-out quality after the root", () => {
    expect(nameOf("A minor")).toBe("Am");
    expect(nameOf("A minor seventh")).toBe("Am7");
    expect(nameOf("an A minor")).toBe("Am");
    expect(nameOf("show me A minor")).toBe("Am");
  });

  it("reads a spelled-out accidental after the root", () => {
    expect(nameOf("A flat")).toBe("Ab");
    expect(nameOf("A sharp")).toBe("A#");
  });
})

/**
 * Note names and degrees are asked for separately — "note names in xl with
 * degrees in lg" is one request carrying two sizes. Both were written to
 * `noteNameSize`, so the second overwrote the first and the note names came out
 * silently demoted to the degrees' size.
 */
describe("note-name and degree sizes are independent", () => {
  it("keeps both sizes when both are asked for", () => {
    const parsed = parseChordDescription("C note names in xl with degrees in lg");
    expect(parsed.noteNameSize).toBe("xl");
    expect(parsed.degreeSize).toBe("lg");
    expect(parsed.noteNameMode).toBe("pitch-class+degree");
  });

  it("does not care which order they were written in", () => {
    const parsed = parseChordDescription("C with degrees in base note names in 2xl");
    expect(parsed.noteNameSize).toBe("2xl");
    expect(parsed.degreeSize).toBe("base");
  });

  it("leaves the note-name size alone when only degrees are sized", () => {
    const parsed = parseChordDescription("C with degrees in lg");
    expect(parsed.degreeSize).toBe("lg");
    expect(parsed.noteNameSize).toBeUndefined();
  });

  it("leaves the degree size unset when only note names are sized", () => {
    const parsed = parseChordDescription("C note names in xl");
    expect(parsed.noteNameSize).toBe("xl");
    expect(parsed.degreeSize).toBeUndefined();
  });
})

/**
 * The guard has to run both ways. `NOTE_NAMES_RE` accepts a size before its
 * keyword ("xl note names") and the degrees clause accepts one after its own
 * ("degrees xl"), so a bare size sitting between them can be claimed by either.
 * It belongs to the keyword it precedes; only the explicit "degrees in xl" form
 * binds it to the degrees.
 */
describe("a size between the two clauses", () => {
  it("goes to the note names it sits in front of", () => {
    for (const input of ["C with degrees 2xl note names", "C degrees 2xl note names"]) {
      const parsed = parseChordDescription(input);
      expect(parsed.noteNameSize, input).toBe("2xl");
      expect(parsed.degreeSize, input).toBeUndefined();
    }
  });

  it("stays with the degrees when they name it explicitly", () => {
    const parsed = parseChordDescription("C with degrees in 2xl note names");
    expect(parsed.degreeSize).toBe("2xl");
    expect(parsed.noteNameSize).toBeUndefined();
  });

  it("still reads a trailing bare size as the degrees'", () => {
    // Nothing follows it to claim it.
    expect(parseChordDescription("C with degrees xl").degreeSize).toBe("xl");
  });
})

/**
 * "midi note names with degrees" is one request for two rows: the midi names on
 * top and the degrees under them. The degrees clause used to be skipped
 * outright whenever midi names were active, so the user asked for degrees and
 * got silence — no mode change, no `degreeSize`, nothing drawn.
 */
describe("midi note names combine with degrees", () => {
  it("keeps both the midi names and the degrees, each with its own size", () => {
    const parsed = parseChordDescription("C midi note names with degrees in xl");
    expect(parsed.showNoteNames).toBe(true);
    expect(parsed.noteNameMode).toBe("midi+degree");
    expect(parsed.degreeSize).toBe("xl");
  });

  it("reads the degrees even when no size is named for them", () => {
    const parsed = parseChordDescription("C with midi note names and degrees");
    expect(parsed.showNoteNames).toBe(true);
    expect(parsed.noteNameMode).toBe("midi+degree");
    expect(parsed.degreeSize).toBeUndefined();
  });

  it("still reads a size for each clause separately", () => {
    const parsed = parseChordDescription("C midi note names in 2xl with degrees in base");
    expect(parsed.noteNameMode).toBe("midi+degree");
    expect(parsed.noteNameSize).toBe("2xl");
    expect(parsed.degreeSize).toBe("base");
  });

  it("does not turn plain midi note names into a degree mode", () => {
    const parsed = parseChordDescription("C midi note names");
    expect(parsed.showNoteNames).toBe(true);
    expect(parsed.noteNameMode).toBe("midi");
    expect(parsed.degreeSize).toBeUndefined();
  });

  it("leaves the chord itself alone", () => {
    expect(parseChordDescription("Cmaj7 midi note names with degrees in xl").chordName).toBe("Cmaj7");
  });
})
