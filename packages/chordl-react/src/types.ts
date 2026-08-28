import type { CSSProperties, ReactNode } from "react";
import type { UIThemeMode } from "./config";
// Re-export shared types from core
export type {
  Format, TextSize, NoteNameMode, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket,
  DisplayMode, DisplayDefaults, ChordData, SectionData, ChordSheetData,
} from "@pepperhorn/chordl-core";
// Import for use in local types
import type { Format, ColorTheme, TextSize, NoteNameMode, WhiteNote, NoteName, HandBracket, DisplayMode, ChordSheetData } from "@pepperhorn/chordl-core";

export interface KeyboardProps {
  format?: Format;
  size?: number;
  startFrom?: WhiteNote;
  highlightKeys?: NoteName[];
  /** All notes for playback (e.g. LH bass + RH chord). Falls back to highlightKeys. */
  allNotes?: NoteName[];
  /** Left-hand bass notes (for MIDI export with separate clefs). */
  lhNotes?: NoteName[];
  /** Right-hand playback octave (default 4). */
  rhOctave?: number;
  /** Left-hand bass playback octave (default 3). */
  lhOctave?: number;
  theme?: ColorTheme | string;
  highlightColor?: string;
  showPlayback?: boolean;
  chordLabel?: string;
  /** Show chord/scale name as a heading above the keyboard. */
  showHeading?: boolean;
  /**
   * Always render the resolved chord/scale name, regardless of `showHeading`.
   * Chord cards set this — a card is identified by its chord, so the name is
   * not optional there the way it is in a bare embedded diagram.
   */
  showChordName?: boolean;
  /**
   * User-supplied descriptive label ("bar 1 — turnaround"). It leads, and the
   * chord name renders beneath it: `title` describes the card, it does not
   * replace the chord's identity. With no title, the name leads on its own.
   */
  title?: string;
  /** Subheading rendered directly below the title (smaller, muted). */
  subheading?: string;
  /** Footer text rendered below all annotations (note names, fingering, degrees). */
  footerText?: string;
  /** Bracket annotations below the keyboard (e.g. L.H. / R.H.) */
  handBrackets?: HandBracket[];
  /** Display scale factor (0.5 = 50%, 1 = 100%). Controls maxWidth of the SVG. */
  scale?: number;
  /** Show note names (capital letters) below highlighted keys. */
  showNoteNames?: boolean;
  /** Display-friendly note names aligned with highlightKeys (e.g. "Bb" instead of "A#").
   *  When omitted, names are derived from highlightKeys (sharp-normalized). */
  displayNoteNames?: string[];
  /** Text size for note name labels (default "base"). */
  noteNameSize?: TextSize;
  /** Note name display mode: "pitch-class" (default, e.g. "C") or "midi" (e.g. "C4"). */
  noteNameMode?: NoteNameMode;
  /** Base MIDI octave for the keyboard's first octave (default 4). Used when noteNameMode="midi". */
  midiBaseOctave?: number;
  /** Fingering values to display below keys (and below note names if present).
   *  Array aligned with highlightKeys — numbers 1–5, extra symbols (0, -, x), or "?" for invalid. */
  fingering?: (number | string)[];
  /** Text size for fingering numbers (default "base"). */
  fingeringSize?: TextSize;
  /** Jazz roman numeral degree labels aligned with highlightKeys (e.g. ["I","III","#V","bVII"]). */
  degreeLabels?: string[];
  /**
   * Text size for the degree row. Its own size because the two are asked for
   * separately — "note names in xl with degrees in lg". Falls back to
   * `noteNameSize` when absent, which is what every caller did before it
   * existed.
   */
  degreeSize?: TextSize;
  /** UI chrome theme: "light" (default) or "dark". */
  uiTheme?: UIThemeMode;
  /** Crop half a white key on the left edge (black-key context padding). */
  clipLeft?: boolean;
  /** Crop half a white key on the right edge (black-key context padding). */
  clipRight?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface ChordProps {
  chord: string;
  format?: Format;
  theme?: ColorTheme | string;
  highlightColor?: string;
  padding?: number;
  /** Display scale factor (0.5 = 50%, 1 = 100%). Controls maxWidth of the SVG. */
  scale?: number;
  /** Display mode: keyboard (default), staff notation, or both side-by-side. */
  display?: DisplayMode;
  /**
   * Always render the resolved chord/scale name. Chord cards set this — a card
   * is identified by its chord, so the name is not opt-in there the way it is
   * in a bare embedded diagram (NL "with heading").
   */
  showChordName?: boolean;
  /** UI chrome theme: "light" (default) or "dark". */
  uiTheme?: UIThemeMode;
  /** Show the inline play/copy/download controls. Default true. Set false for static export. */
  showPlayback?: boolean;
  /** Title above the keyboard. Defaults to the resolved chord/scale name. */
  title?: string;
  /** Subheading directly below the title (smaller, muted). */
  subheading?: string;
  /** Footer text below all annotations (note names, fingering, degrees). */
  footerText?: string;
  className?: string;
  style?: CSSProperties;
  /** Called after each render with a snapshot of the rendered variation. */
  onVariation?: OnVariation;
  /** Render extra UI as a sibling to the SVG (e.g. rating buttons). */
  renderVariationExtras?: RenderVariationExtras;
  /** Voicing identifier reported in VariationContext; defaults to "default". */
  voicingId?: string;
  /** Position in a progression; defaults to 0. */
  chordIndex?: number;
}

export type PianoChordProps = ChordProps | KeyboardProps;

export interface ChordSheetProps {
  data: ChordSheetData;
  /** Hide chord reference IDs (for print / PDF). */
  printMode?: boolean;
  /** UI chrome theme: "light" (default) or "dark". */
  uiTheme?: UIThemeMode;
  className?: string;
  style?: CSSProperties;
  /** Called after each chord renders with a snapshot of the rendered variation. */
  onVariation?: OnVariation;
  /** Render extra UI as a sibling to each chord's SVG (e.g. rating buttons). */
  renderVariationExtras?: RenderVariationExtras;
}

/**
 * Description of a single rendered (chord, voicing) cell.
 * Surfaced via `renderVariationExtras` and `onVariation` so consumers
 * can attach per-variation overlays (rating UI, telemetry, etc.).
 */
export interface VariationContext {
  /** Chord symbol as rendered, e.g. "Cmaj7#5" */
  chordSymbol: string;
  /** Position in a progression; 0 for a single-chord render */
  chordIndex: number;
  /** Voicing identifier, e.g. "closed" / "drop2" / "open" / "default" */
  voicingId: string;
  /** Notes used in this variation (note-name strings as rendered) */
  notes: string[];
  /** Inline SVG markup of the rendered variation */
  svgString: string;
}

export type RenderVariationExtras = (ctx: VariationContext) => ReactNode;
export type OnVariation = (ctx: VariationContext) => void;
