import type { ColorTheme } from "../types";
import { DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL } from "@better-chord/core";

// Boomwhacker chromatic pitch-class colors
const PITCH_COLORS: Record<string, string> = {
  C: "#e81c1c",
  "C#": "#d44a1a",
  D: "#f09819",
  "D#": "#c8b816",
  E: "#f5e616",
  F: "#59b816",
  "F#": "#16a085",
  G: "#16a3b8",
  "G#": "#1670b8",
  A: "#5b16b8",
  "A#": "#8b16b8",
  B: "#b816a0",
};

// Muted versions for non-highlighted keys
const MUTED_ALPHA = "33"; // ~20% opacity in hex

function mute(hex: string): string {
  return hex + MUTED_ALPHA;
}

export const boomwhackerTheme: ColorTheme = {
  name: "boomwhacker",
  whiteKey: (note, highlighted) => {
    if (!highlighted) return DEFAULT_WHITE_FILL;
    return PITCH_COLORS[note] ?? DEFAULT_WHITE_FILL;
  },
  blackKey: (note, highlighted) => {
    if (!highlighted) return DEFAULT_BLACK_FILL;
    return PITCH_COLORS[note] ?? DEFAULT_BLACK_FILL;
  },
};
