import type { ColorTheme } from "../types.js";
import { boomwhackerTheme } from "./boomwhacker.js";
import { crfTheme } from "./crf.js";
import { createSimpleTheme } from "./simple.js";

const themeRegistry: Record<string, ColorTheme> = {
  boomwhacker: boomwhackerTheme,
  crf: crfTheme,
  simple: createSimpleTheme(),
};

export function getTheme(name: string): ColorTheme | undefined {
  return themeRegistry[name];
}

export function resolveTheme(
  theme: ColorTheme | string | undefined,
  highlightColor?: string
): ColorTheme | undefined {
  if (!theme && !highlightColor) return undefined;
  if (!theme && highlightColor) return createSimpleTheme(highlightColor);
  if (typeof theme === "string") {
    if (theme === "simple" && highlightColor) {
      return createSimpleTheme(highlightColor);
    }
    return themeRegistry[theme];
  }
  return theme;
}
