import type { Format, WhiteNote, KeyDescriptor } from "../types";
import {
  WHITE_KEY_WIDTH,
  WHITE_KEY_WIDTH_EXACT,
  WHITE_KEY_HEIGHT_COMPACT,
  WHITE_KEY_HEIGHT_EXACT,
  BLACK_KEY_WIDTH,
  BLACK_KEY_WIDTH_EXACT,
  BLACK_KEY_HEIGHT_COMPACT,
  BLACK_KEY_HEIGHT_EXACT,
  BLACK_KEY_OFFSETS,
  BLACK_KEY_OFFSETS_EXACT,
  WHITE_NOTES_WITH_SHARPS,
  WHITE_NOTE_ORDER,
} from "./svg-constants";

const SHARP_SUFFIX: Record<string, string> = {
  C: "C#",
  D: "D#",
  F: "F#",
  G: "G#",
  A: "A#",
};

export function computeKeyboard(
  startFrom: WhiteNote = "C",
  size: number = 8,
  format: Format = "compact"
): KeyDescriptor[] {
  const isExact = format === "exact";
  const whiteHeight = isExact ? WHITE_KEY_HEIGHT_EXACT : WHITE_KEY_HEIGHT_COMPACT;
  const blackHeight = isExact ? BLACK_KEY_HEIGHT_EXACT : BLACK_KEY_HEIGHT_COMPACT;
  const whiteW = isExact ? WHITE_KEY_WIDTH_EXACT : WHITE_KEY_WIDTH;
  const blackW = isExact ? BLACK_KEY_WIDTH_EXACT : BLACK_KEY_WIDTH;
  const offsets = isExact ? BLACK_KEY_OFFSETS_EXACT : BLACK_KEY_OFFSETS;

  const keys: KeyDescriptor[] = [];
  const startIndex = WHITE_NOTE_ORDER.indexOf(startFrom);
  let whiteX = 0;
  let relativeOctave = 0;

  for (let i = 0; i < size; i++) {
    const noteIndex = (startIndex + i) % 7;
    const whiteNote = WHITE_NOTE_ORDER[noteIndex];

    // Octave increments each time we cross C
    if (i > 0 && whiteNote === "C") {
      relativeOctave++;
    }

    // Add white key
    keys.push({
      note: whiteNote,
      octave: relativeOctave,
      isBlack: false,
      x: whiteX,
      y: 0,
      width: whiteW,
      height: whiteHeight,
    });

    // Add black key if this white note has one
    if (WHITE_NOTES_WITH_SHARPS.has(whiteNote)) {
      const offset = offsets[whiteNote];
      keys.push({
        note: SHARP_SUFFIX[whiteNote],
        octave: relativeOctave,
        isBlack: true,
        x: whiteX + offset,
        y: 0,
        width: blackW,
        height: blackHeight,
      });
    }

    whiteX += whiteW;
  }

  return keys;
}

export function computeSvgDimensions(
  size: number,
  format: Format = "compact"
): { width: number; height: number } {
  const isExact = format === "exact";
  const height = isExact ? WHITE_KEY_HEIGHT_EXACT : WHITE_KEY_HEIGHT_COMPACT;
  const whiteW = isExact ? WHITE_KEY_WIDTH_EXACT : WHITE_KEY_WIDTH;
  return {
    width: size * whiteW,
    height,
  };
}
