import { useState } from "react";
import type { ProgressionResult } from "@better-chord/core";
import type { Format, ColorTheme } from "../types";
import type { UIThemeMode } from "../config";
import { ChordGroup } from "./ChordGroup";
import { resolveUITheme, UIThemeProvider } from "../ui-theme";

export type GroupMode = "by-progression" | "by-chord";

export interface ProgressionViewProps {
  result: ProgressionResult;
  format?: Format;
  theme?: ColorTheme | string;
  highlightColor?: string;
  showPlayback?: boolean;
  defaultGroupMode?: GroupMode;
  /** UI chrome theme: "light" (default) or "dark". */
  uiTheme?: UIThemeMode;
}

const SCALE_OPTIONS = [
  { label: "50%", value: 0.5 },
  { label: "60%", value: 0.6 },
  { label: "70%", value: 0.7 },
  { label: "80%", value: 0.8 },
  { label: "90%", value: 0.9 },
  { label: "100%", value: 1.0 },
];

export function ProgressionView({
  result,
  format,
  theme,
  highlightColor,
  showPlayback = true,
  defaultGroupMode = "by-progression",
  uiTheme,
}: ProgressionViewProps) {
  const uiCtx = resolveUITheme(uiTheme);
  const ui = uiCtx.tokens;
  const [groupMode, setGroupMode] = useState<GroupMode>(defaultGroupMode);
  const [keyFormat, setKeyFormat] = useState<Format>("compact");
  const [scale, setScale] = useState(0.5);

  const pillGroupStyle = {
    display: "inline-flex" as const,
    background: ui.btnBg,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  };

  const pillBtnStyle = (active: boolean) => ({
    fontFamily: "inherit",
    fontSize: "0.8rem",
    fontWeight: active ? 600 : 500,
    padding: "6px 14px",
    border: "none",
    borderRadius: 8,
    background: active ? ui.btnBgActive : "transparent",
    color: active ? ui.btnTextActive : ui.btnText,
    cursor: "pointer" as const,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap" as const,
    letterSpacing: "0.01em",
    boxShadow: active ? `0 1px 4px rgba(0,0,0,0.15)` : "none",
  });

  return (
    <UIThemeProvider value={uiCtx}>
    <div className="bc-progression" data-bc-theme={uiCtx.mode} style={{ width: "100%", maxWidth: "100vw", color: ui.text }}>
      <div className="bc-progression__controls" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}>
        <span className="bc-progression__title" style={{ fontWeight: 700, fontSize: 16 }}>
          {result.progressionName} in {result.key}
        </span>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <div className="bc-progression__group-toggle" style={pillGroupStyle}>
            <button
              className="bc-progression__btn"
              style={pillBtnStyle(groupMode === "by-progression")}
              onClick={() => setGroupMode("by-progression")}
            >
              By Progression
            </button>
            <button
              className="bc-progression__btn"
              style={pillBtnStyle(groupMode === "by-chord")}
              onClick={() => setGroupMode("by-chord")}
            >
              By Chord
            </button>
          </div>
          <div className="bc-progression__format-toggle" style={pillGroupStyle}>
            <button
              className="bc-progression__btn"
              style={pillBtnStyle(keyFormat === "compact")}
              onClick={() => setKeyFormat("compact")}
            >
              Compact
            </button>
            <button
              className="bc-progression__btn"
              style={pillBtnStyle(keyFormat === "exact")}
              onClick={() => setKeyFormat("exact")}
            >
              Full
            </button>
          </div>
          <div className="bc-progression__scale-toggle" style={pillGroupStyle}>
            {SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="bc-progression__btn"
                style={pillBtnStyle(scale === opt.value)}
                onClick={() => setScale(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {groupMode === "by-progression" ? (
        // Each example is a row of chords
        result.examples.map((example, i) => (
          <ChordGroup
            key={i}
            chords={example.chords}
            label={example.label}
            format={format ?? keyFormat}
            theme={theme}
            highlightColor={highlightColor}
            showPlayback={showPlayback}
            scale={scale}
          />
        ))
      ) : (
        // Group by chord position — all example 1 first chords, then all second chords, etc.
        renderByChord(result, format ?? keyFormat, theme, highlightColor, showPlayback, scale)
      )}
    </div>
    </UIThemeProvider>
  );
}

function renderByChord(
  result: ProgressionResult,
  format?: Format,
  theme?: ColorTheme | string,
  highlightColor?: string,
  showPlayback?: boolean,
  scale?: number,
) {
  if (result.examples.length === 0) return null;

  const numChords = result.examples[0].chords.length;
  const groups: Array<{ symbol: string; chords: Array<{ chord: typeof result.examples[0]["chords"][0]; style: string }> }> = [];

  for (let chordIdx = 0; chordIdx < numChords; chordIdx++) {
    const symbol = result.examples[0].chords[chordIdx].symbol;
    const chords = result.examples.map((ex) => ({
      chord: ex.chords[chordIdx],
      style: ex.label,
    }));
    groups.push({ symbol, chords });
  }

  return groups.map((group, i) => (
    <ChordGroup
      key={i}
      chords={group.chords.map((c) => c.chord)}
      label={`${group.symbol} — ${group.chords.length} voicings`}
      format={format}
      theme={theme}
      highlightColor={highlightColor}
      showPlayback={showPlayback}
      scale={scale}
    />
  ));
}
