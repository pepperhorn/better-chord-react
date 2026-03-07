import type { ColorTheme } from "../types";
import { DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL } from "@better-chord/core";

// Creative Ranges Foundation piano keyboard colors
const PITCH_COLORS: Record<string, string> = {
  C: "#f86e6e",
  "C#": "#f58841",
  D: "#ffbc57",
  "D#": "#b8a334",
  E: "#fff56d",
  F: "#b3f888",
  "F#": "#93d154",
  G: "#6bc6a0",
  "G#": "#7ee8df",
  A: "#88a7f8",
  "A#": "#cc97e8",
  B: "#e277b1",
};

export const crfTheme: ColorTheme = {
  name: "crf",
  whiteKey: (note, highlighted) => {
    if (!highlighted) return DEFAULT_WHITE_FILL;
    return PITCH_COLORS[note] ?? DEFAULT_WHITE_FILL;
  },
  blackKey: (note, highlighted) => {
    if (!highlighted) return DEFAULT_BLACK_FILL;
    return PITCH_COLORS[note] ?? DEFAULT_BLACK_FILL;
  },
};
