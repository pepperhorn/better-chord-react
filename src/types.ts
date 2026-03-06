import type { CSSProperties } from "react";

export type Format = "compact" | "exact";
export type WhiteNote = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type NoteName = string;

export interface ColorTheme {
  name: string;
  whiteKey: (note: string, highlighted: boolean) => string;
  blackKey: (note: string, highlighted: boolean) => string;
}

export interface KeyboardProps {
  format?: Format;
  size?: number;
  startFrom?: WhiteNote;
  highlightKeys?: NoteName[];
  theme?: ColorTheme | string;
  highlightColor?: string;
  className?: string;
  style?: CSSProperties;
}

export interface ChordProps {
  chord: string;
  format?: Format;
  theme?: ColorTheme | string;
  highlightColor?: string;
  padding?: number;
  className?: string;
  style?: CSSProperties;
}

export type PianoChordProps = ChordProps | KeyboardProps;

export interface ParsedChordRequest {
  chordName: string;
  inversion?: number;
  startingNote?: string;
  startingDegree?: number;
  spanFrom?: string;
  spanTo?: string;
  format?: Format;
}

export interface KeyDescriptor {
  note: string;
  isBlack: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}
