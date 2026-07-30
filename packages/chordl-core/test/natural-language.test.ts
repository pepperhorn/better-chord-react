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
