import type { ColorTheme } from "../types.js";
import { DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL } from "../engine/svg-constants.js";

/**
 * Creative Ranges Foundation piano keyboard colors.
 *
 * Each pitch has a screen color (hex/sRGB) for SVG rendering and a CMYK
 * reference for print pipelines. The hex values are derived from the CMYK
 * spec, so SVGs render true to the print intent — but if a downstream tool
 * needs CMYK directly (Illustrator, InDesign, PDF/X export), use
 * `CRF_PITCH_PALETTE[note].cmyk` rather than re-converting from hex.
 */
export interface CrfPitchEntry {
  hex: string;
  /** [C, M, Y, K] in 0–100. */
  cmyk: [number, number, number, number];
}

export const CRF_PITCH_PALETTE: Record<string, CrfPitchEntry> = {
  C:    { hex: "#f86e6e", cmyk: [0, 56, 56, 3] },
  "C#": { hex: "#f58841", cmyk: [0, 44, 73, 4] },
  D:    { hex: "#ffbc57", cmyk: [0, 26, 66, 0] },
  "D#": { hex: "#b8a334", cmyk: [0, 11, 72, 28] },
  E:    { hex: "#fff56d", cmyk: [0, 4, 57, 0] },
  F:    { hex: "#b3f888", cmyk: [28, 0, 45, 3] },
  "F#": { hex: "#93d154", cmyk: [30, 0, 60, 18] },
  G:    { hex: "#6bc6a0", cmyk: [46, 0, 19, 22] },
  "G#": { hex: "#7ee8df", cmyk: [46, 0, 4, 9] },
  A:    { hex: "#88a7f8", cmyk: [45, 33, 0, 3] },
  "A#": { hex: "#cc97e8", cmyk: [12, 35, 0, 9] },
  B:    { hex: "#e277b1", cmyk: [0, 47, 22, 11] },
};

/** Format a CMYK tuple as a CSS-style string for metadata (`"cmyk(0%, 56%, 56%, 3%)"`). */
export function formatCmyk(cmyk: [number, number, number, number]): string {
  const [c, m, y, k] = cmyk;
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

export const crfTheme: ColorTheme = {
  name: "crf",
  whiteKey: (note, highlighted) => {
    if (!highlighted) return DEFAULT_WHITE_FILL;
    return CRF_PITCH_PALETTE[note]?.hex ?? DEFAULT_WHITE_FILL;
  },
  blackKey: (note, highlighted) => {
    if (!highlighted) return DEFAULT_BLACK_FILL;
    return CRF_PITCH_PALETTE[note]?.hex ?? DEFAULT_BLACK_FILL;
  },
};
