import type { ColorTheme } from "../types";
import { DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL } from "../engine/svg-constants";

const DEFAULT_HIGHLIGHT = "#a0c6e8";
const DEFAULT_BLACK_HIGHLIGHT = "#5a8ab5";

export function createSimpleTheme(highlightColor?: string): ColorTheme {
  const whiteHighlight = highlightColor ?? DEFAULT_HIGHLIGHT;
  const blackHighlight = highlightColor ?? DEFAULT_BLACK_HIGHLIGHT;

  return {
    name: "simple",
    whiteKey: (_note, highlighted) =>
      highlighted ? whiteHighlight : DEFAULT_WHITE_FILL,
    blackKey: (_note, highlighted) =>
      highlighted ? blackHighlight : DEFAULT_BLACK_FILL,
  };
}
