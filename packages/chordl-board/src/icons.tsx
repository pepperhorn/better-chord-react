/**
 * Board icons — inline SVG, authored here, with no webfont and no icon package.
 *
 * The board design doc reached for SMuFL glyphs in Bravura. That works in the
 * dev app and nowhere else: the @font-face lives in the *host's* HTML and points
 * at /fonts/Bravura.woff2, so any other host renders tofu, and the bundled file
 * is a six-codepoint subset besides. A webfont is also the worst thing to put in
 * front of html2canvas, which captures whatever the DOM shows at that instant —
 * a font still in flight exports as a blank card. Path data has none of those
 * failure modes: it ships with the library, it is in the DOM before first paint,
 * and it rasterises identically in every host.
 *
 * Sources and licences
 * - `music:` outlines come from Bravura (Steinberg), SIL OFL 1.1, via the verovio
 *   glyph data already vendored in this repo at
 *   packages/chordl-react/fonts/verovio/Bravura.zip. Each was converted from the
 *   font's 1000-unit em into the shared viewBox below (y flipped, curves kept).
 *   Two are composites rather than single glyphs, because SMuFL has no glyph for
 *   them: a repeat sign is *drawn* from barlines and dots, and a beamed pair is a
 *   pair of noteheads plus stems and a beam. Both are built from Bravura parts.
 * - `obj:` glyphs are hand-authored for this file. They follow Lucide's
 *   conventions — 24x24, no fill, round caps and joins — because that is the
 *   house style for a stroke icon, but no Lucide path data is copied.
 */
import type { ReactElement } from "react";
import { BOARD_ICON_PREFIXES } from "./types.js";

/** Stable icon id, e.g. "music:trebleClef". Ids survive a redraw; path data does not. */
export type BoardIconId = string;

// The prefix list lives in types.ts, beside the `BoardItem.icon` field the
// importer validates, and is re-exported here so anyone reaching for the icon
// set gets it too. One definition, so the registry below and the import
// validator cannot disagree about what a well-formed id looks like.
export { BOARD_ICON_PREFIXES };

/** Ordered list for a picker: id, human label, and category. */
export interface BoardIconDef {
  id: BoardIconId;
  label: string;
  category: "music" | "obj";
}

/**
 * One viewBox for every glyph, which is most of what makes a set look like a
 * set. The rest is optical sizing, and it is the part that bites: a treble clef
 * is 1:5 tall-and-narrow while a fermata is 2:1 wide-and-short, so fitting both
 * to the same box would make the fermata twice the ink of the clef. Each music
 * glyph is therefore scaled to fit 20x21 *and* capped on its geometric mean
 * (sqrt(w*h) <= 17.5), so tall glyphs run the full height, wide ones are held
 * back, and no glyph out-masses its neighbours. The hand-drawn obj glyphs were
 * then drawn to the same optical box and checked against the music set at 24,
 * 32 and 48px rather than trusted to arithmetic.
 */
const VIEW_BOX = "0 0 24 24";

/**
 * Filled and stroked glyphs have to be talked into matching. A filled outline
 * reads heavier than a stroked one of the same member width, so the stroke set
 * runs a little under Lucide's 2 and the filled set gets a hairline stroke that
 * fattens its thinnest strokes (a clef's tail is well under 1px at 24px and
 * would otherwise fade out). These two numbers were picked by eye, side by side.
 */
const MUSIC_STROKE = 0.35;
const OBJ_STROKE = 1.85;

interface Glyph {
  label: string;
  category: "music" | "obj";
  /** `solid` opts a shape out of its category's treatment — the filled parts of
   *  an otherwise stroked glyph (piano keys, the metronome's bob). */
  shapes: readonly { d: string; solid?: boolean }[];
}

const GLYPHS: Record<BoardIconId, Glyph> = {
  "music:trebleClef": {
    label: "Treble clef",
    category: "music",
    shapes: [
      { d: "M12.48 9.67L12.78 11.4C12.82 11.62 12.82 11.62 13.13 11.62C14.89 11.62 16.01 12.97 16.01 14.5C16.01 15.85 15.21 16.87 14 17.35C13.84 17.42 13.82 17.41 13.85 17.55C13.98 18.29 14.19 19.43 14.19 20.11C14.19 22.14 12.64 22.5 11.84 22.5C10.03 22.5 9.57 21.33 9.57 20.55C9.57 19.81 10.04 19.18 10.85 19.18C11.58 19.18 11.99 19.74 11.99 20.4C11.99 21.09 11.56 21.41 11.19 21.52C10.92 21.6 10.81 21.64 10.81 21.72C10.81 21.88 11.12 22.07 11.77 22.07C12.47 22.07 13.67 21.85 13.67 20.08C13.67 19.52 13.49 18.48 13.35 17.68C13.32 17.54 13.3 17.55 13.17 17.57C12.93 17.62 12.62 17.64 12.34 17.64C9.41 17.64 7.99 15.67 7.99 13.59C7.99 11.17 9.82 9.46 11.54 8.04C11.68 7.92 11.67 7.9 11.65 7.75C11.56 7.26 11.48 6.49 11.48 5.79C11.48 4.55 11.77 3.05 12.65 2.07C12.89 1.81 13.26 1.5 13.43 1.5C13.56 1.5 13.87 1.83 14.05 2.1C14.54 2.82 14.83 3.84 14.83 4.88C14.83 6.71 13.85 8.23 12.56 9.44C12.48 9.51 12.46 9.52 12.48 9.67ZM13.61 3.35C12.88 3.35 12.02 4.5 12.02 6.37C12.02 6.75 12.04 7.16 12.09 7.47C12.11 7.62 12.16 7.63 12.25 7.56C13.19 6.74 14.33 5.66 14.33 4.33C14.33 3.68 14 3.35 13.61 3.35ZM12.3 11.5L12.05 9.97C12.03 9.84 12.01 9.82 11.89 9.92C11.32 10.37 10.77 10.82 10.06 11.62C9.06 12.74 8.94 13.69 8.94 14.39C8.94 16.05 10.3 17.21 12.39 17.21C12.63 17.21 12.87 17.19 13.06 17.15C13.24 17.12 13.25 17.12 13.23 16.99L12.63 13.42C12.6 13.29 12.58 13.28 12.39 13.33C11.66 13.53 11.19 14.04 11.19 14.73C11.19 15.28 11.55 15.79 12.05 16.01C12.14 16.04 12.23 16.08 12.23 16.16C12.23 16.23 12.19 16.29 12.09 16.29C12.01 16.29 11.86 16.26 11.77 16.22C10.95 15.95 10.39 15.18 10.39 14.1C10.39 13.09 11.07 12.14 12.13 11.78C12.34 11.71 12.34 11.72 12.3 11.5ZM13.13 13.4L13.72 16.81C13.74 16.95 13.76 16.95 13.91 16.88C14.58 16.54 15.03 15.93 15.03 15.18C15.03 14.13 14.23 13.32 13.26 13.23C13.12 13.22 13.11 13.26 13.13 13.4Z" },
    ],
  },
  "music:bassClef": {
    label: "Bass clef",
    category: "music",
    shapes: [
      { d: "M10.05 2.02C13.9 2.02 16.26 4.6 16.26 8.47C16.26 15.24 10.48 19.2 5 21.87C4.87 21.94 4.73 21.98 4.62 21.98C4.42 21.98 4.33 21.85 4.33 21.72C4.33 21.54 4.46 21.43 4.67 21.32C9.85 18.36 12.92 14.88 12.92 8.67C12.92 5.18 11.9 2.86 9.54 2.86C7.27 2.86 5.93 4.49 5.93 5.38C5.93 5.6 6 5.78 6.29 5.78C6.58 5.78 6.8 5.62 7.4 5.62C8.49 5.62 9.54 6.51 9.54 7.94C9.54 9.32 8.58 10.3 7.18 10.3C5.38 10.3 4.44 8.76 4.44 6.98C4.44 4.84 6.18 2.02 10.05 2.02ZM18.44 3.84C19.13 3.84 19.67 4.38 19.67 5.07C19.67 5.76 19.13 6.29 18.44 6.29C17.75 6.29 17.22 5.76 17.22 5.07C17.22 4.38 17.75 3.84 18.44 3.84ZM18.47 9.43C19.16 9.43 19.67 9.94 19.67 10.63C19.67 11.32 19.16 11.83 18.47 11.83C17.78 11.83 17.26 11.32 17.26 10.63C17.26 9.94 17.78 9.43 18.47 9.43Z" },
    ],
  },
  "music:sharp": {
    label: "Sharp",
    category: "music",
    shapes: [
      { d: "M15.38 8.48L14.6 8.78C14.36 8.87 14.21 9.44 14.21 9.65L14.21 12.45C14.21 12.81 14.42 12.99 14.6 12.99L15.38 12.69C15.44 12.66 15.47 12.66 15.54 12.66C15.66 12.66 15.75 12.75 15.75 12.9L15.75 15.04C15.75 15.22 15.6 15.46 15.38 15.55C15.38 15.55 14.75 15.79 14.54 15.88C14.33 15.97 14.21 16.33 14.21 16.57L14.21 20.85C14.21 21.03 14.03 21.18 13.7 21.18C13.49 21.18 13.31 21.03 13.31 20.85L13.31 17.08C13.31 16.9 13.16 16.54 12.89 16.54L12.83 16.57L12.8 16.57L10.96 17.33C10.81 17.39 10.66 17.6 10.66 17.99L10.66 22.17C10.66 22.35 10.45 22.5 10.15 22.5C9.94 22.5 9.76 22.35 9.76 22.17L9.76 18.47C9.76 18.32 9.61 17.99 9.4 17.99C9.37 17.99 9.34 17.99 9.31 18.02C9.04 18.11 8.62 18.29 8.59 18.29L8.53 18.32C8.34 18.32 8.25 18.23 8.25 18.05L8.25 15.91C8.25 15.73 8.4 15.49 8.62 15.43C8.62 15.43 9.25 15.16 9.43 15.1C9.61 15.01 9.76 14.74 9.76 14.41L9.76 11.43C9.76 11.19 9.58 10.89 9.34 10.89L9.31 10.92C9.07 11.04 8.62 11.22 8.59 11.22L8.53 11.25C8.34 11.25 8.25 11.16 8.25 10.98L8.25 8.84C8.25 8.66 8.4 8.42 8.62 8.36C8.62 8.36 9.22 8.12 9.4 8.03C9.58 7.94 9.76 7.64 9.76 7.22L9.76 3.15C9.76 2.97 9.94 2.82 10.24 2.82C10.45 2.82 10.66 2.97 10.66 3.15L10.66 6.77C10.66 7.01 10.75 7.37 11.02 7.37C11.53 7.25 12.56 6.83 12.92 6.61C13.19 6.43 13.28 6.04 13.31 5.74L13.31 1.83C13.31 1.65 13.49 1.5 13.79 1.5C14.03 1.5 14.21 1.65 14.21 1.83L14.21 5.5C14.21 5.74 14.42 5.89 14.63 5.89C14.78 5.86 15.38 5.62 15.38 5.62C15.44 5.59 15.47 5.59 15.54 5.59C15.66 5.59 15.75 5.68 15.75 5.83L15.75 7.97C15.75 8.15 15.6 8.39 15.38 8.48ZM13.31 13.38C13.37 13.11 13.43 12.27 13.43 11.46C13.43 10.65 13.37 9.89 13.31 9.74C13.25 9.62 13.07 9.56 12.86 9.56C12.11 9.56 10.72 10.19 10.66 10.71C10.6 10.95 10.57 12 10.57 12.93C10.57 13.65 10.6 14.32 10.66 14.44C10.69 14.53 10.84 14.59 11.02 14.59C11.71 14.59 13.13 13.99 13.31 13.38Z" },
    ],
  },
  "music:flat": {
    label: "Flat",
    category: "music",
    shapes: [
      { d: "M8.55 22.33C8.27 21.99 8.14 2.46 8.14 2.46C8.17 1.84 8.72 1.5 9.2 1.5C9.54 1.5 9.85 1.71 9.85 2.08C9.85 2.77 9.64 10.97 9.61 11.73C9.61 11.97 9.74 12.21 9.98 12.31C10.05 12.34 10.08 12.34 10.15 12.34C10.32 12.34 10.7 12.03 10.91 11.86C11.38 11.56 12.21 11.28 12.79 11.28C14.36 11.38 15.86 12.62 15.86 14.57C15.86 16.14 14.8 18.22 11.76 20.35C10.91 20.93 10.08 21.85 9.06 22.43C9.06 22.43 8.96 22.5 8.85 22.5C8.75 22.5 8.65 22.47 8.55 22.33ZM9.74 19.29C9.74 19.46 9.81 19.8 10.12 19.8C10.22 19.8 10.32 19.76 10.46 19.7C11.93 18.77 13.5 16.93 13.5 15.08C13.5 14.22 13.09 13.09 12.1 13.09C11.32 13.09 9.95 14.09 9.71 14.77C9.67 14.91 9.64 15.32 9.64 15.86C9.64 17.23 9.74 19.29 9.74 19.29Z" },
    ],
  },
  "music:natural": {
    label: "Natural",
    category: "music",
    shapes: [
      { d: "M13.77 6.47L14.24 6.32C14.27 6.28 14.33 6.28 14.36 6.28C14.49 6.28 14.61 6.38 14.61 6.53L14.61 22.13C14.61 22.34 14.42 22.5 14.24 22.5L13.83 22.5C13.62 22.5 13.46 22.34 13.46 22.13L13.46 17.5C13.46 17.25 13.24 17.16 12.93 17.16C12.03 17.16 10.29 17.9 9.86 18.09C9.83 18.12 9.76 18.12 9.73 18.12L9.67 18.15C9.48 18.15 9.39 18.06 9.39 17.87L9.39 1.87C9.39 1.66 9.55 1.5 9.76 1.5L10.17 1.5C10.35 1.5 10.54 1.66 10.54 1.87L10.54 7.06C10.54 7.18 10.66 7.22 10.85 7.22C11.66 7.22 13.65 6.5 13.65 6.5C13.68 6.5 13.71 6.47 13.77 6.47ZM10.54 10.88L10.54 14.08C10.54 14.21 10.7 14.27 10.91 14.27C11.69 14.27 13.46 13.55 13.46 12.99L13.46 9.79C13.46 9.67 13.37 9.64 13.18 9.64C12.43 9.64 10.54 10.45 10.54 10.88Z" },
    ],
  },
  "music:repeatSign": {
    label: "Repeat sign",
    category: "music",
    shapes: [
      { d: "M7.1 1.5H9.9V22.5H7.1ZM11.3 1.5H12.3V22.5H11.3ZM15.5 7.6A1.4 1.4 0 1 0 15.5 10.4A1.4 1.4 0 1 0 15.5 7.6ZM15.5 13.6A1.4 1.4 0 1 0 15.5 16.4A1.4 1.4 0 1 0 15.5 13.6Z" },
    ],
  },
  "music:fermata": {
    label: "Fermata",
    category: "music",
    shapes: [
      { d: "M11.93 10.07C5.09 10.07 3.59 15.16 3.2 16.52C3.16 16.65 3.13 16.78 3.1 16.82C2.9 17.28 2.73 17.51 2.43 17.51C2.17 17.51 2 17.42 2 17.08C2 16.98 2 16.85 2.03 16.72C4.06 6.55 10.94 6.49 12 6.49C12.96 6.49 19.91 6.55 21.97 16.72C22 16.85 22 16.95 22 17.05C22 17.38 21.83 17.51 21.53 17.51C21.2 17.51 21.07 17.28 20.84 16.82C20.8 16.78 20.8 16.68 20.77 16.58C20.44 15.32 19.01 10.07 11.93 10.07ZM13.79 15.69C13.79 16.68 12.96 17.51 11.97 17.51C11 17.51 10.17 16.68 10.17 15.69C10.17 14.72 11 13.89 11.97 13.89C12.96 13.89 13.79 14.72 13.79 15.69Z" },
    ],
  },
  "music:coda": {
    label: "Coda",
    category: "music",
    shapes: [
      { d: "M20.03 11.48C20.27 11.48 20.34 11.67 20.34 11.9C20.34 12.12 20.27 12.31 20.03 12.31L17.96 12.31C17.78 15.56 15.35 18.21 12.53 18.43L12.53 20.87C12.53 21.11 12.34 21.18 12.11 21.18C11.89 21.18 11.7 21.11 11.7 20.87L11.7 18.43C8.88 18.21 6.46 15.56 6.27 12.31L3.97 12.31C3.73 12.31 3.66 12.12 3.66 11.9C3.66 11.67 3.73 11.48 3.97 11.48L6.27 11.48C6.46 8.19 8.88 5.58 11.7 5.36L11.7 3.11C11.7 2.89 11.89 2.82 12.11 2.82C12.34 2.82 12.53 2.89 12.53 3.11L12.53 5.36C15.35 5.58 17.78 8.21 17.96 11.48L20.03 11.48ZM15.09 11.48C15.09 8.66 14.96 6.54 12.53 6.33L12.53 11.48L15.09 11.48ZM11.7 6.33C9.23 6.54 9.23 8.66 9.23 11.48L11.7 11.48L11.7 6.33ZM9.23 12.31C9.24 14.99 9.45 17.34 11.7 17.6L11.7 12.31L9.23 12.31ZM12.53 17.6C14.7 17.34 15.03 14.97 15.09 12.31L12.53 12.31L12.53 17.6Z" },
    ],
  },
  "music:segno": {
    label: "Segno",
    category: "music",
    shapes: [
      { d: "M8.21 4.01L8.05 4.01C6.92 4.2 6.6 4.95 6.6 5.67C6.6 6.23 6.82 6.79 6.98 7.08C7.67 8.29 11.71 9.84 11.95 9.92C12.05 9.97 12.13 10 12.21 10C12.32 10 12.37 9.92 12.45 9.78C12.61 9.54 16.86 1.88 16.86 1.88C17 1.64 17.26 1.5 17.53 1.5C17.93 1.5 18.28 1.82 18.28 2.25C18.28 2.38 18.25 2.49 18.17 2.62C18.17 2.62 14.03 10.08 13.9 10.29C13.87 10.34 13.84 10.4 13.84 10.45C13.84 10.58 13.98 10.69 14.3 10.88C14.62 11.04 18.84 13.42 19.24 16.35C19.27 16.62 19.29 16.89 19.29 17.13C19.29 19.35 17.88 21.08 15.74 21.8C15.34 21.94 14.97 21.99 14.62 21.99C13.04 21.99 11.39 20.58 11.39 18.95C11.39 17.88 12.29 17.45 13.28 17.21C13.39 17.18 13.5 17.16 13.6 17.16C14.35 17.16 15.02 17.9 15.02 18.92L15.02 19.21C15.02 20.04 15.47 20.41 16.03 20.41L16.11 20.39C17.02 20.25 17.66 19.56 17.66 18.52C17.66 15.98 12.32 14.4 11.92 14.32C11.81 14.32 11.6 14.48 11.6 14.46C11.52 14.62 7.38 22.1 7.38 22.1C7.25 22.34 6.98 22.5 6.71 22.5C6.28 22.5 5.96 22.15 5.96 21.72C5.96 21.62 5.99 21.48 6.04 21.38C6.04 21.38 9.89 14.46 10.08 14.08C10.18 13.9 10.24 13.76 10.24 13.66C10.24 13.55 10.18 13.5 10.08 13.44C9.86 13.36 5.99 10.98 5.13 9.03C4.84 8.37 4.71 7.7 4.71 7.06C4.71 4.41 6.82 2.12 8.69 2.12C10.05 2.12 11.84 2.57 12.27 3.8C12.4 4.23 12.48 4.65 12.48 5.05C12.48 6.2 11.73 6.84 10.64 6.84C9.28 6.84 8.87 5.27 8.69 4.55L8.63 4.36C8.55 4.07 8.37 4.01 8.21 4.01ZM15.69 9.33C15.69 8.47 16.38 7.81 17.21 7.81C18.06 7.81 18.73 8.47 18.73 9.33C18.73 10.16 18.06 10.85 17.21 10.85C16.38 10.85 15.69 10.16 15.69 9.33ZM8.34 14.72C8.34 15.58 7.67 16.25 6.82 16.25C5.99 16.25 5.29 15.58 5.29 14.72C5.29 13.9 5.99 13.2 6.82 13.2C7.67 13.2 8.34 13.9 8.34 14.72Z" },
    ],
  },
  "music:quarterNote": {
    label: "Quarter note",
    category: "music",
    shapes: [
      { d: "M14.81 17.21L14.81 1.5L15.43 1.5L15.43 18.61C15.43 20.58 12.89 22.5 10.82 22.5C9.56 22.5 8.57 21.78 8.57 20.56C8.57 18.55 10.62 16.67 13.16 16.67C13.84 16.67 14.42 16.86 14.81 17.21Z" },
    ],
  },
  "music:eighthNotePair": {
    label: "Eighth-note pair",
    category: "music",
    shapes: [
      { d: "M6.35 22.16C5.3 22.16 4.46 21.56 4.46 20.55C4.46 18.87 6.18 17.3 8.31 17.3C9.42 17.3 10.2 17.92 10.2 18.91C10.2 20.57 8.08 22.16 6.35 22.16ZM15.69 19.05C14.63 19.05 13.8 18.45 13.8 17.44C13.8 15.76 15.51 14.19 17.65 14.19C18.76 14.19 19.54 14.81 19.54 15.8C19.54 17.45 17.42 19.05 15.69 19.05ZM9.62 4.95L10.2 4.95L10.2 19.73L9.62 19.73ZM18.95 1.84L19.54 1.84L19.54 16.62L18.95 16.62ZM9.62 4.95L19.54 1.84L19.54 4.27L9.62 7.38Z" },
    ],
  },
  "obj:guitar": {
    label: "Guitar",
    category: "obj",
    shapes: [
      { d: "M12 10.2C14.2 10.2 15.9 11.3 15.9 13C15.9 14.2 14.4 14.4 14.4 15.6C14.4 16.9 17.3 16.7 17.3 19C17.3 21.1 15 22.4 12 22.4C9 22.4 6.7 21.1 6.7 19C6.7 16.7 9.6 16.9 9.6 15.6C9.6 14.4 8.1 14.2 8.1 13C8.1 11.3 9.8 10.2 12 10.2Z" },
      { d: "M9.7 1.9H14.3V4.4H9.7Z" },
      { d: "M10.8 4.4V10.3M13.2 4.4V10.3" },
      { d: "M12 15.95A1.25 1.25 0 1 0 12 18.45A1.25 1.25 0 1 0 12 15.95Z" },
    ],
  },
  "obj:piano": {
    label: "Piano",
    category: "obj",
    shapes: [
      { d: "M3 7H21V17.4H3Z" },
      { d: "M5.6 7H7.8V13.2H5.6ZM9.4 7H11.6V13.2H9.4ZM16 7H18.2V13.2H16Z", solid: true },
    ],
  },
  "obj:microphone": {
    label: "Microphone",
    category: "obj",
    shapes: [
      { d: "M12 2.4A2.8 2.8 0 0 0 9.2 5.2V11.4A2.8 2.8 0 0 0 14.8 11.4V5.2A2.8 2.8 0 0 0 12 2.4Z" },
      { d: "M6.3 11V12.1A5.7 5.7 0 0 0 17.7 12.1V11" },
      { d: "M12 17.8V21.4M8.6 21.4H15.4" },
    ],
  },
  "obj:metronome": {
    label: "Metronome",
    category: "obj",
    shapes: [
      { d: "M5.8 21.4L9.9 3.2H14.1L18.2 21.4Z" },
      { d: "M12 20.2L13.6 10" },
      { d: "M13.8 7.6A1.2 1.2 0 1 0 13.8 10A1.2 1.2 0 1 0 13.8 7.6Z", solid: true },
    ],
  },
  "obj:tuningFork": {
    label: "Tuning fork",
    category: "obj",
    shapes: [
      { d: "M8.2 2.4V11.4A3.8 3.8 0 0 0 15.8 11.4V2.4" },
      { d: "M12 15.2V21.2" },
      { d: "M9.6 21.2H14.4" },
    ],
  },
};

/**
 * Derived from GLYPHS rather than written out again, so a picker can never
 * offer an id that does not render.
 */
export const BOARD_ICONS: readonly BoardIconDef[] = Object.entries(GLYPHS).map(
  ([id, g]) => ({ id, label: g.label, category: g.category }),
);

/**
 * Shape check, not an existence check — deliberately. An id from a newer chordl
 * should survive a round-trip through an older one rather than be silently
 * dropped on import; it renders as nothing until the glyph exists here.
 */
export function isBoardIconId(value: unknown): value is BoardIconId {
  return typeof value === "string" && BOARD_ICON_PREFIXES.some((p) => value.startsWith(p));
}

export interface BoardIconProps {
  id: BoardIconId;
  /** Rendered edge length in px. */
  size?: number;
  /** Defaults to currentColor so a card's text colour flows through. */
  color?: string;
  className?: string;
  /** Accessible name. Without one the glyph is decorative and hidden. */
  title?: string;
}

/** Renders the glyph, or null for an unknown id — never throws. */
export function BoardIcon({
  id,
  size = 32,
  color = "currentColor",
  className,
  title,
}: BoardIconProps): ReactElement | null {
  const glyph = GLYPHS[id];
  // An imported board is untrusted and may carry a stale or bogus id. Rendering
  // nothing keeps the card intact; throwing would trip its error boundary.
  if (!glyph) return null;
  const filled = glyph.category === "music";
  return (
    <svg
      className={["chordl-board-icon", `chordl-board-icon--${glyph.category}`, className]
        .filter(Boolean)
        .join(" ")}
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={filled ? MUSIC_STROKE : OBJ_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {glyph.shapes.map((shape, i) => (
        <path key={i} d={shape.d} {...(shape.solid ? { fill: color, stroke: "none" } : null)} />
      ))}
    </svg>
  );
}
