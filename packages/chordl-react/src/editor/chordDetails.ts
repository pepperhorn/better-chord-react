import type { NoteNameMode, TextSize } from "@pepperhorn/chordl-core";

/**
 * The annotation state an editor form holds, and the chord text it decorates.
 *
 * A chord card stores one string. The editor holds that string in two places at
 * once — the text the user typed, and the toggles that describe the rest — so
 * the two have to be exact inverses. Composing without a matching split is what
 * left the detail panel blank on edit and appended a second "note names in lg"
 * the first time a toggle was touched.
 */
export interface ChordDetailState {
  showNoteNames: boolean;
  noteNameMode: NoteNameMode;
  noteNameSize: TextSize;
  showDegrees: boolean;
  degreeSize: TextSize;
  fingeringMode: "none" | "auto" | "custom";
  fingeringValues: string[];
  fingeringSize: TextSize;
  octaveShift: number;
}

export const DEFAULT_CHORD_DETAILS: ChordDetailState = {
  showNoteNames: false,
  noteNameMode: "pitch-class",
  noteNameSize: "lg",
  showDegrees: false,
  degreeSize: "lg",
  fingeringMode: "none",
  fingeringValues: [],
  fingeringSize: "lg",
  octaveShift: 0,
};

const SIZE = "(base|lg|xl|2xl)";
/**
 * Custom fingering first: it also starts with the word "fingering". The quote
 * class matches the core parser's, so a card written with curly or single
 * quotes is read back as the custom fingering it is rather than falling through
 * to the auto branch.
 */
const CUSTOM_FINGERING = new RegExp(
  `\\s*(?:with\\s+)?custom\\s+fingering\\s+["\u201c\u201d']([^"\u201c\u201d']*)["\u201c\u201d'](?:\\s+in\\s+${SIZE})?`,
  "i",
);
/**
 * Auto fingering: the word on its own.
 *
 * The lookaheads are what keep it off a clause it does not own. `custom
 * fingering "1,3,5"` and the core's unquoted `fingering 1 3 5` both contain the
 * word, and matching either one stripped the values into the chord text and
 * silently called it auto — a card the user wrote by hand, corrupted the moment
 * it was opened for edit.
 */
const FINGERING = new RegExp(
  `\\s*(?:with\\s+)?(?<!custom\\s)fingering(?:\\s+in\\s+${SIZE})?(?!\\s*["\u201c\u201d'])(?!\\s+[\\dxX-])`,
  "i",
);
/** "midi" is part of the keyword, so the mode falls out of the same match. */
const NOTE_NAMES = new RegExp(`\\s*(?:with\\s+)?(midi\\s+)?note\\s+names(?:\\s+in\\s+${SIZE})?`, "i");
const DEGREES = new RegExp(`\\s*(?:with\\s+)?degrees(?:\\s+in\\s+${SIZE})?`, "i");
const OCTAVE = /\s*chord\s+(up|down)\s+(\d+)\s+octaves?/i;

const asSize = (raw: string | undefined, fallback: TextSize): TextSize =>
  raw === "base" || raw === "lg" || raw === "xl" || raw === "2xl" ? raw : fallback;

/** Serialise annotation state to the modifiers a chord string carries. */
export function composeChordDetails(state: ChordDetailState): string {
  const parts: string[] = [];
  if (state.showNoteNames) {
    const kw = state.noteNameMode === "midi" ? "midi note names" : "note names";
    parts.push(`${kw} in ${state.noteNameSize}`);
  }
  if (state.showDegrees) {
    parts.push(`with degrees in ${state.degreeSize}`);
  }
  if (state.fingeringMode === "auto") {
    parts.push(`with fingering in ${state.fingeringSize}`);
  } else if (state.fingeringMode === "custom") {
    // Quoted custom-fingering syntax treats every value as a free string ("D1"
    // for violin, "x" for skip). Comma separators keep "-" placeholders
    // positional.
    const cleaned = state.fingeringValues.map((v) => v.trim() || "-");
    if (cleaned.some((v) => v !== "-")) {
      parts.push(`custom fingering "${cleaned.join(",")}" in ${state.fingeringSize}`);
    }
  }
  return parts.length ? " " + parts.join(" ") : "";
}

/** Serialise an octave shift to the clause a chord string carries. */
export function composeOctaveShift(shift: number): string {
  if (shift === 0) return "";
  const n = Math.abs(shift);
  return ` chord ${shift > 0 ? "up" : "down"} ${n} octave${n > 1 ? "s" : ""}`;
}

/**
 * Split a stored chord string back into the text a user typed and the state the
 * form holds.
 *
 * A clause only sets its state if it was removed from the text: a toggle whose
 * words are still in the input would write them a second time on the next
 * change. Anything unrecognised stays in `input` — a hand-typed phrase this
 * does not know belongs to the user, not to the form.
 */
export function splitChordDetails(nl: string): ChordDetailState & { input: string } {
  let input = nl;
  const state: ChordDetailState = { ...DEFAULT_CHORD_DETAILS, fingeringValues: [] };

  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = input.match(re);
    if (!m) return null;
    input = (input.slice(0, m.index) + input.slice(m.index! + m[0].length));
    return m;
  };

  const custom = take(CUSTOM_FINGERING);
  if (custom) {
    state.fingeringMode = "custom";
    state.fingeringValues = custom[1].split(",").map((v) => v.trim());
    state.fingeringSize = asSize(custom[2], state.fingeringSize);
  } else {
    const auto = take(FINGERING);
    if (auto) {
      state.fingeringMode = "auto";
      state.fingeringSize = asSize(auto[1], state.fingeringSize);
    }
  }

  const names = take(NOTE_NAMES);
  if (names) {
    state.showNoteNames = true;
    state.noteNameMode = names[1] ? "midi" : "pitch-class";
    state.noteNameSize = asSize(names[2], state.noteNameSize);
  }

  const degrees = take(DEGREES);
  if (degrees) {
    state.showDegrees = true;
    state.degreeSize = asSize(degrees[1], state.degreeSize);
  }

  const octave = take(OCTAVE);
  if (octave) {
    state.octaveShift = (octave[1].toLowerCase() === "down" ? -1 : 1) * parseInt(octave[2], 10);
  }

  return { ...state, input: input.replace(/\s+/g, " ").trim() };
}
