import { normalizeToSharps } from "./note-spelling.js";
import {
  STAFF_LINE_SPACING,
  HALF_STAFF_SPACING,
  STAFF_WIDTH,
  STAFF_GAP,
  STAFF_TOP_MARGIN,
  STAFF_BOTTOM_MARGIN,
  NOTE_COLUMN_X,
  NOTE_HEAD_RX,
  ACCIDENTAL_OFFSET,
  SECOND_OFFSET,
  ACCIDENTAL_COL_WIDTH,
} from "./staff-constants.js";

export interface StaffNote {
  pitchClass: string;
  octave: number;
  staff: "treble" | "bass";
  y: number;
  noteX: number; // X center of notehead (may be offset for seconds)
  accidental: "sharp" | "flat" | null;
  accidentalX: number;
  ledgerLines: number[];
  diatonicPos: number; // absolute diatonic position (for collision detection)
}

export interface StaffLayoutResult {
  notes: StaffNote[];
  staffMode: "treble" | "bass" | "grand";
  totalHeight: number;
  totalWidth: number;
  trebleTopY: number;
  bassTopY: number;
}

export interface StaffLayoutOptions {
  lhNotes?: string[];
  rhOctave?: number;
  lhOctave?: number;
  /** Pre-resolved octave-qualified notes (e.g. from keyboard layout).
   *  Format: "C:4", "G#:5". Bypasses internal octave assignment. */
  octaveQualifiedNotes?: string[];
}

function parseOctaveQualified(
  notes: string[],
): Array<{ pitchClass: string; octave: number }> {
  return notes.map((n) => {
    const [pc, oct] = n.split(":");
    return { pitchClass: normalizePitchClass(pc), octave: parseInt(oct, 10) };
  });
}

const DIATONIC_INDEX: Record<string, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

const TREBLE_BOTTOM_LINE_POS = 30; // E4
const BASS_BOTTOM_LINE_POS = 18;   // G2

function normalizePitchClass(note: string): string {
  return normalizeToSharps(note);
}

function letterFromPitchClass(pc: string): string {
  return pc.replace("#", "").replace("b", "");
}

function noteToMidi(pitchClass: string, octave: number): number {
  const letter = letterFromPitchClass(pitchClass);
  const chromaticBase: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const base = chromaticBase[letter] ?? 0;
  const acc = pitchClass.includes("#") ? 1 : pitchClass.includes("b") ? -1 : 0;
  return (octave + 1) * 12 + base + acc;
}

function absoluteDiatonicPos(pitchClass: string, octave: number): number {
  const letter = letterFromPitchClass(pitchClass);
  return octave * 7 + (DIATONIC_INDEX[letter] ?? 0);
}

function computeY(absolutePos: number, staffBottomLineY: number, refPos: number): number {
  return staffBottomLineY - (absolutePos - refPos) * HALF_STAFF_SPACING;
}

function computeLedgerLines(
  absolutePos: number,
  staffBottomLinePos: number,
  staffBottomLineY: number,
): number[] {
  const staffTopLinePos = staffBottomLinePos + 8;
  const ledgers: number[] = [];

  if (absolutePos < staffBottomLinePos) {
    for (let pos = staffBottomLinePos - 2; pos >= absolutePos; pos -= 2) {
      ledgers.push(computeY(pos, staffBottomLineY, staffBottomLinePos));
    }
  } else if (absolutePos > staffTopLinePos) {
    for (let pos = staffTopLinePos + 2; pos <= absolutePos; pos += 2) {
      ledgers.push(computeY(pos, staffBottomLineY, staffBottomLinePos));
    }
  }
  return ledgers;
}

function assignOctaves(
  notes: string[],
  baseOctave: number,
): Array<{ pitchClass: string; octave: number }> {
  const result: Array<{ pitchClass: string; octave: number }> = [];
  let currentOctave = baseOctave;
  let prevDiatonic = -1;

  for (const note of notes) {
    const pc = normalizePitchClass(note);
    const letter = letterFromPitchClass(pc);
    const diatonic = DIATONIC_INDEX[letter] ?? 0;

    if (prevDiatonic >= 0 && diatonic <= prevDiatonic) {
      currentOctave++;
    }
    prevDiatonic = diatonic;
    result.push({ pitchClass: pc, octave: currentOctave });
  }
  return result;
}

/**
 * Standard engraving: when two adjacent notes form a second (1 diatonic step),
 * the higher note shifts right so the noteheads sit side-by-side.
 *
 * Process bottom-to-top. When a note is exactly 1 diatonic step above
 * the previous, and the previous was NOT offset, offset this one right.
 * If the previous was already offset, don't offset this one (alternating pattern).
 */
function resolveNoteheadOffsets(notes: StaffNote[]): void {
  // Sort by diatonic position ascending (lowest first)
  const sorted = [...notes].sort((a, b) => a.diatonicPos - b.diatonicPos);

  const offsetSet = new Set<StaffNote>();

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].diatonicPos - sorted[i - 1].diatonicPos;
    if (gap === 1) {
      // Second interval — the upper note gets offset, unless the lower was already offset
      if (!offsetSet.has(sorted[i - 1])) {
        offsetSet.add(sorted[i]);
        sorted[i].noteX = NOTE_COLUMN_X + SECOND_OFFSET;
      }
      // If lower was offset, upper stays normal (alternating)
    }
  }
}

/**
 * Standard engraving accidental placement.
 *
 * Process notes top-to-bottom (highest pitch first). Each accidental
 * tries the closest column to the notehead first (column 0 = just left of note).
 * If that column is occupied by an accidental whose Y is too close (within
 * ~3 staff spaces), try the next column further left.
 *
 * Also: if a note's notehead is offset right (second), its accidental
 * must clear the offset notehead — so it starts from column 0 relative
 * to the LEFT notehead position (normal noteX).
 */
function resolveAccidentalPositions(notes: StaffNote[]): void {
  const accNotes = notes
    .filter((n) => n.accidental !== null)
    .sort((a, b) => a.y - b.y); // top-to-bottom (lower Y = higher on staff)

  if (accNotes.length === 0) return;

  // Track occupied columns: array of { column, y } entries
  const occupied: Array<{ col: number; y: number }> = [];

  // Minimum Y distance before two accidentals can share a column
  const minYGap = STAFF_LINE_SPACING * 2.5;

  for (const note of accNotes) {
    // Base X: just left of the notehead. If any note is offset right,
    // accidentals should clear it by starting further left.
    const hasOffsetNeighbor = notes.some(
      (n) => n.noteX > NOTE_COLUMN_X && Math.abs(n.y - note.y) < STAFF_LINE_SPACING * 2,
    );
    const startCol = hasOffsetNeighbor ? 1 : 0;

    let col = startCol;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const conflict = occupied.some(
        (o) => o.col === col && Math.abs(o.y - note.y) < minYGap,
      );
      if (!conflict) break;
      col++;
    }

    occupied.push({ col, y: note.y });
    note.accidentalX = NOTE_COLUMN_X - ACCIDENTAL_OFFSET - col * ACCIDENTAL_COL_WIDTH;
  }
}

export function computeStaffLayout(
  notes: string[],
  options: StaffLayoutOptions = {},
): StaffLayoutResult {
  const { lhNotes, rhOctave = 4, lhOctave = 3, octaveQualifiedNotes } = options;

  let allWithOctaves: Array<{ pitchClass: string; octave: number }>;
  let lhNotesList: string[];

  if (octaveQualifiedNotes) {
    // Use pre-resolved octaves — bypass internal assignment
    allWithOctaves = parseOctaveQualified(octaveQualifiedNotes);
    lhNotesList = lhNotes ?? [];
  } else {
    const rhNotesList = lhNotes
      ? notes.filter((n) => !lhNotes.includes(n))
      : notes;
    lhNotesList = lhNotes ?? [];

    const rhWithOctaves = assignOctaves(rhNotesList, rhOctave);
    const lhWithOctaves = assignOctaves(lhNotesList, lhOctave);
    allWithOctaves = [...lhWithOctaves, ...rhWithOctaves];
  }

  // Determine clef based on where the majority of notes sit.
  // A3 = MIDI 57, C4 = MIDI 60.
  // If explicitly split (LH/RH), use grand staff.
  // Otherwise, use predominance: count notes above vs at-or-below the midpoint.
  const hasExplicitSplit = lhNotes && lhNotes.length > 0;
  const midpoint = 57; // A3 — notes above here lean treble, at/below lean bass

  const trebleCount = allWithOctaves.filter(
    (n) => noteToMidi(n.pitchClass, n.octave) > midpoint,
  ).length;
  const bassCount = allWithOctaves.filter(
    (n) => noteToMidi(n.pitchClass, n.octave) <= midpoint,
  ).length;

  let staffMode: "treble" | "bass" | "grand";
  if (hasExplicitSplit) {
    // Explicit LH/RH split → grand staff
    staffMode = "grand";
  } else if (trebleCount > 0 && bassCount > 0) {
    // Notes span both ranges — use predominance
    staffMode = trebleCount >= bassCount ? "treble" : "bass";
  } else if (trebleCount > 0) {
    staffMode = "treble";
  } else {
    staffMode = "bass";
  }

  const trebleBottomLineY = STAFF_TOP_MARGIN + STAFF_LINE_SPACING * 4;
  const bassTopLineY =
    staffMode === "grand"
      ? trebleBottomLineY + STAFF_GAP
      : staffMode === "bass"
        ? STAFF_TOP_MARGIN
        : -1;
  const bassBottomLineY =
    bassTopLineY >= 0 ? bassTopLineY + STAFF_LINE_SPACING * 4 : -1;

  const trebleTopY = staffMode !== "bass" ? STAFF_TOP_MARGIN : -1;
  const bassTopY = bassTopLineY;

  const staffNotes: StaffNote[] = allWithOctaves.map((n) => {
    const midi = noteToMidi(n.pitchClass, n.octave);
    const isLH = lhNotes
      ? lhNotesList.some((lh) => normalizePitchClass(lh) === n.pitchClass)
      : midi < 60;

    let staff: "treble" | "bass";
    let bottomLineY: number;
    let bottomLinePos: number;

    if (isLH && staffMode !== "treble") {
      staff = "bass";
      bottomLineY = bassBottomLineY;
      bottomLinePos = BASS_BOTTOM_LINE_POS;
    } else {
      staff = "treble";
      bottomLineY = trebleBottomLineY;
      bottomLinePos = TREBLE_BOTTOM_LINE_POS;
    }

    const diatonicPos = absoluteDiatonicPos(n.pitchClass, n.octave);
    const y = computeY(diatonicPos, bottomLineY, bottomLinePos);
    const ledgerLines = computeLedgerLines(diatonicPos, bottomLinePos, bottomLineY);

    const accidental: "sharp" | "flat" | null = n.pitchClass.includes("#")
      ? "sharp"
      : n.pitchClass.includes("b")
        ? "flat"
        : null;

    return {
      pitchClass: n.pitchClass,
      octave: n.octave,
      staff,
      y,
      noteX: NOTE_COLUMN_X,
      accidental,
      accidentalX: NOTE_COLUMN_X - ACCIDENTAL_OFFSET,
      ledgerLines,
      diatonicPos,
    };
  });

  // Resolve notehead offsets for seconds
  resolveNoteheadOffsets(staffNotes);

  // Resolve accidental column positions
  resolveAccidentalPositions(staffNotes);

  // Total height
  const lastLineY =
    staffMode === "bass" || staffMode === "grand"
      ? bassBottomLineY
      : trebleBottomLineY;
  const maxNoteY = Math.max(lastLineY, ...staffNotes.map((n) => n.y));
  const maxLedgerY = Math.max(
    lastLineY,
    ...staffNotes.flatMap((n) => n.ledgerLines),
  );

  const totalHeight =
    Math.max(maxNoteY, maxLedgerY) + STAFF_BOTTOM_MARGIN + HALF_STAFF_SPACING;

  return {
    notes: staffNotes,
    staffMode,
    totalHeight,
    totalWidth: STAFF_WIDTH,
    trebleTopY,
    bassTopY,
  };
}
