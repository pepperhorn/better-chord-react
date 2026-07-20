// SMuFL (Standard Music Font Layout) glyph sets.
//
// Notation is now engraved by Verovio (see chordl-react/src/verovio.ts), which
// resolves glyphs itself from the bundled Bravura/Petaluma font zips. These
// descriptors are retained as the public identity of each font — the `name`
// selects the Verovio font — and the codepoint/brace fields remain for any
// consumer still doing its own SMuFL text rendering.

export interface StaffGlyphSet {
  name: string;
  fontFamily: string;
  glyphs: {
    trebleClef: string;
    bassClef: string;
    sharp: string;
    flat: string;
    natural: string;
    wholeNote: string;
  };
  brace: (height: number) => string;
}

const SMUFL = {
  gClef: "",
  fClef: "",
  noteheadWhole: "",
  accidentalSharp: "",
  accidentalFlat: "",
  accidentalNatural: "",
} as const;

function synthesizedBrace(curl: number) {
  return (height: number) => {
    const mid = height / 2;
    const q = height / 4;
    return `M ${curl} 0 C ${curl - 4} ${q} 0 ${mid - 4} 0 ${mid} C 0 ${mid + 4} ${curl - 4} ${mid + q} ${curl} ${height}`;
  };
}

export const BRAVURA_GLYPHS: StaffGlyphSet = {
  name: "Bravura",
  fontFamily: "PHBravura, Bravura, serif",
  glyphs: {
    trebleClef: SMUFL.gClef,
    bassClef: SMUFL.fClef,
    sharp: SMUFL.accidentalSharp,
    flat: SMUFL.accidentalFlat,
    natural: SMUFL.accidentalNatural,
    wholeNote: SMUFL.noteheadWhole,
  },
  brace: synthesizedBrace(6),
};

export const PETALUMA_GLYPHS: StaffGlyphSet = {
  name: "Petaluma",
  fontFamily: "PHPetaluma, Petaluma, serif",
  glyphs: {
    trebleClef: SMUFL.gClef,
    bassClef: SMUFL.fClef,
    sharp: SMUFL.accidentalSharp,
    flat: SMUFL.accidentalFlat,
    natural: SMUFL.accidentalNatural,
    wholeNote: SMUFL.noteheadWhole,
  },
  brace: synthesizedBrace(6),
};

let _defaultGlyphs: StaffGlyphSet = BRAVURA_GLYPHS;

export function getDefaultGlyphs(): StaffGlyphSet {
  return _defaultGlyphs;
}

export function setDefaultGlyphs(glyphs: StaffGlyphSet): void {
  _defaultGlyphs = glyphs;
}
