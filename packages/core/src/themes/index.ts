import type { ColorTheme } from "../types";
import { boomwhackerTheme } from "./boomwhacker";
import { crfTheme } from "./crf";
import { createSimpleTheme } from "./simple";

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
