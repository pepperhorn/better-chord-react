/**
 * MEI builder — turns a chordl note list into an MEI document that Verovio
 * engraves. This keeps pitch/octave/clef decisions in the core (theory) layer,
 * mirroring the semantics the legacy hand-rolled `computeStaffLayout` used so
 * the switch to Verovio doesn't change which clef a chord lands on.
 *
 * A single whole-note "measure" is produced: RH notes stack into one chord on
 * the treble staff, LH notes into a chord on the bass staff. When notes aren't
 * explicitly split, a treble/bass-predominance test picks a single staff.
 *
 * Unlike the keyboard (which needs sharp positions), MEI spells notes as given
 * — a "Bb" chord engraves with flats, "C#" with sharps — so the notation matches
 * the chord's own spelling instead of forcing everything to sharps.
 */

export interface MeiBuildOptions {
  lhNotes?: string[];
  rhOctave?: number;
  lhOctave?: number;
  /** Pre-resolved octave-qualified notes ("C:4", "G#:5") — bypasses
   *  internal octave assignment for exact pitch matching. */
  octaveQualifiedNotes?: string[];
}

export interface MeiBuildResult {
  mei: string;
  staffMode: "treble" | "bass" | "grand";
}

const DIATONIC_INDEX: Record<string, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

const CHROMATIC_BASE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

interface PitchedNote {
  letter: string; // "C".."B"
  accid: "s" | "f" | null;
  octave: number;
}

function toPitched(note: string, octave: number): PitchedNote {
  const letter = note.charAt(0).toUpperCase();
  const accid = note.includes("#") ? "s" : note.slice(1).includes("b") ? "f" : null;
  return { letter, accid, octave };
}

function noteToMidi(n: PitchedNote): number {
  const base = CHROMATIC_BASE[n.letter] ?? 0;
  const acc = n.accid === "s" ? 1 : n.accid === "f" ? -1 : 0;
  return (n.octave + 1) * 12 + base + acc;
}

/** Ascending octave assignment: a note that doesn't rise diatonically bumps up. */
function assignOctaves(notes: string[], baseOctave: number): PitchedNote[] {
  const result: PitchedNote[] = [];
  let octave = baseOctave;
  let prevDiatonic = -1;
  for (const note of notes) {
    const letter = note.charAt(0).toUpperCase();
    const diatonic = DIATONIC_INDEX[letter] ?? 0;
    if (prevDiatonic >= 0 && diatonic <= prevDiatonic) octave++;
    prevDiatonic = diatonic;
    result.push(toPitched(note, octave));
  }
  return result;
}

function parseOctaveQualified(notes: string[]): PitchedNote[] {
  return notes.map((n) => {
    const [pc, oct] = n.split(":");
    return toPitched(pc, parseInt(oct, 10));
  });
}

function noteXml(n: PitchedNote): string {
  const accid = n.accid ? ` accid="${n.accid}"` : "";
  return `<note pname="${n.letter.toLowerCase()}" oct="${n.octave}"${accid}/>`;
}

/** Wrap one staff's notes as a chord / single note / whole rest. */
function layerXml(notes: PitchedNote[]): string {
  if (notes.length === 0) return `<layer n="1"><mRest/></layer>`;
  if (notes.length === 1) {
    const n = notes[0];
    const accid = n.accid ? ` accid="${n.accid}"` : "";
    return `<layer n="1"><note dur="1" pname="${n.letter.toLowerCase()}" oct="${n.octave}"${accid}/></layer>`;
  }
  return `<layer n="1"><chord dur="1">${notes.map(noteXml).join("")}</chord></layer>`;
}

export function buildMei(notes: string[], options: MeiBuildOptions = {}): MeiBuildResult {
  const { lhNotes, rhOctave = 4, lhOctave = 3, octaveQualifiedNotes } = options;
  const hasExplicitSplit = Boolean(lhNotes && lhNotes.length > 0);
  // Membership by chroma (pitch class mod 12) so "Bb" and "A#" match regardless
  // of spelling — the octave-qualified path may hand us either.
  const lhChroma = new Set((lhNotes ?? []).map((n) => chromaOf(toPitched(n, 0))));

  let all: PitchedNote[];
  let lhResolved: PitchedNote[];
  let rhResolved: PitchedNote[];

  if (octaveQualifiedNotes) {
    all = parseOctaveQualified(octaveQualifiedNotes);
    // Split by pitch class membership in lhNotes (octave-qualified path
    // carries LH+RH together, LH first — same as computeStaffLayout).
    lhResolved = all.filter((n) => lhChroma.has(chromaOf(n)));
    rhResolved = all.filter((n) => !lhChroma.has(chromaOf(n)));
  } else {
    const rhInput = lhNotes ? notes.filter((n) => !lhNotes.includes(n)) : notes;
    rhResolved = assignOctaves(rhInput, rhOctave);
    lhResolved = assignOctaves(lhNotes ?? [], lhOctave);
    all = [...lhResolved, ...rhResolved];
  }

  // Clef mode: explicit split → grand; otherwise treble/bass predominance
  // around A3 (MIDI 57), matching the legacy layout engine.
  const midpoint = 57;
  const trebleCount = all.filter((n) => noteToMidi(n) > midpoint).length;
  const bassCount = all.filter((n) => noteToMidi(n) <= midpoint).length;

  let staffMode: "treble" | "bass" | "grand";
  if (hasExplicitSplit) staffMode = "grand";
  else if (trebleCount > 0 && bassCount > 0) staffMode = trebleCount >= bassCount ? "treble" : "bass";
  else if (trebleCount > 0) staffMode = "treble";
  else staffMode = "bass";

  let scoreDef: string;
  let staves: string;

  if (staffMode === "grand") {
    scoreDef =
      `<scoreDef><staffGrp symbol="brace" bar.thru="true">` +
      `<staffDef n="1" lines="5" clef.shape="G" clef.line="2"/>` +
      `<staffDef n="2" lines="5" clef.shape="F" clef.line="4"/>` +
      `</staffGrp></scoreDef>`;
    // Grand staff is only chosen for an explicit LH/RH split, so RH → treble,
    // LH → bass.
    staves =
      `<staff n="1">${layerXml(rhResolved)}</staff>` +
      `<staff n="2">${layerXml(lhResolved)}</staff>`;
  } else {
    const clef = staffMode === "treble"
      ? `clef.shape="G" clef.line="2"`
      : `clef.shape="F" clef.line="4"`;
    scoreDef =
      `<scoreDef><staffGrp><staffDef n="1" lines="5" ${clef}/></staffGrp></scoreDef>`;
    staves = `<staff n="1">${layerXml(all)}</staff>`;
  }

  const mei =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0">` +
    `<music><body><mdiv><score>` +
    scoreDef +
    `<section><measure n="1" right="invis">${staves}</measure></section>` +
    `</score></mdiv></body></music></mei>`;

  return { mei, staffMode };
}

function chromaOf(n: PitchedNote): number {
  const base = CHROMATIC_BASE[n.letter] ?? 0;
  const acc = n.accid === "s" ? 1 : n.accid === "f" ? -1 : 0;
  return ((base + acc) % 12 + 12) % 12;
}
