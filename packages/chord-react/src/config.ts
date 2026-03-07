/** Default: show note names below highlighted keys. */
export const SHOW_NOTE_NAMES = false;

export type UIThemeMode = "light" | "dark";

export interface UIThemeTokens {
  /** Primary text color */
  text: string;
  /** Muted text (labels, secondary info) */
  textMuted: string;
  /** Subtle text (voicing style, hints) */
  textSubtle: string;
  /** Border color for inputs and buttons */
  border: string;
  /** Button background (inactive) */
  btnBg: string;
  /** Button background (active/selected) */
  btnBgActive: string;
  /** Button text (inactive) */
  btnText: string;
  /** Button text (active/selected) */
  btnTextActive: string;
  /** Input/select background */
  inputBg: string;
  /** Input/select text */
  inputText: string;
  /** SVG icon fill for playback controls */
  iconFill: string;
  /** Playback button background */
  playbackBg: string;
  /** Playback button active/playing state */
  playbackActive: string;
  /** Bracket annotation color (L.H./R.H.) */
  bracketColor: string;
}

export const LIGHT_THEME: UIThemeTokens = {
  text: "#1a1a1a",
  textMuted: "#555",
  textSubtle: "#777",
  border: "#ccc",
  btnBg: "#e8e8e8",
  btnBgActive: "#333",
  btnText: "#333",
  btnTextActive: "#fff",
  inputBg: "#fff",
  inputText: "#333",
  iconFill: "#fff",
  playbackBg: "#888",
  playbackActive: "#4a90d9",
  bracketColor: "#888",
};

export const DARK_THEME: UIThemeTokens = {
  text: "#eee",
  textMuted: "#aaa",
  textSubtle: "#888",
  border: "#555",
  btnBg: "rgba(255, 255, 255, 0.08)",
  btnBgActive: "rgba(57, 51, 51, 0.89)",
  btnText: "#aab2c0",
  btnTextActive: "#eef0f4",
  inputBg: "#1e1e2e",
  inputText: "#eee",
  iconFill: "#fff",
  playbackBg: "#333",
  playbackActive: "#4a90d9",
  bracketColor: "#999",
};

/** Default UI theme mode. Change this to switch the library default. */
export const DEFAULT_UI_THEME: UIThemeMode = "light";

export function getUIThemeTokens(mode: UIThemeMode): UIThemeTokens {
  return mode === "dark" ? DARK_THEME : LIGHT_THEME;
}
