import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { parseChordDescription } from "@pepperhorn/chordl-core";
import { lookupGuitarChord, INSTRUMENTS } from "@pepperhorn/chordl-guitar";
import type { InstrumentId } from "@pepperhorn/chordl-guitar";
import type { UIThemeMode } from "../config";
import { resolveUITheme, UIThemeProvider } from "../ui-theme";
import { GuitarChord } from "./GuitarChord";

export interface GuitarChordPanelProps {
  /** NL chord string (same input the piano view takes). */
  chord: string;
  instrument?: InstrumentId;
  scale?: number;
  uiTheme?: UIThemeMode;
  title?: string;
  subheading?: string;
  footerText?: string;
  className?: string;
  style?: CSSProperties;
}

const POSITION_LABELS = "ABCDEFGH";
const INSTRUMENT_ORDER: InstrumentId[] = ["guitar", "ukulele"];

/**
 * Guitar view for a chord: resolves the chord label, looks up its shapes in
 * chords-db, and renders the selected fret position with an A/B/C toggle for
 * the alternate placements. Chord-only (scales / note lists fall back to a hint).
 */
export function GuitarChordPanel({
  chord,
  instrument: instrumentProp = "guitar",
  scale = 1,
  uiTheme,
  title,
  subheading,
  footerText,
  className,
  style,
}: GuitarChordPanelProps) {
  const uiCtx = resolveUITheme(uiTheme);
  const muted = uiCtx.tokens.textMuted ?? "#888";
  const text = uiCtx.tokens.text ?? "#111";

  const [instrument, setInstrument] = useState<InstrumentId>(instrumentProp);
  // Follow the prop if the host switches instruments.
  const [prevProp, setPrevProp] = useState(instrumentProp);
  if (instrumentProp !== prevProp) { setPrevProp(instrumentProp); setInstrument(instrumentProp); }

  const parsed = useMemo(() => {
    try { return parseChordDescription(chord); } catch { return null; }
  }, [chord]);

  const label = parsed?.chordName ?? "";
  const result = useMemo(
    () => (label ? lookupGuitarChord(label, instrument) : null),
    [label, instrument],
  );
  // Stable settings object so GuitarChord (which re-draws when `settings`
  // changes identity) only redraws when the instrument actually changes.
  const guitarSettings = useMemo(
    () => ({ strings: INSTRUMENTS[instrument].strings, tuning: INSTRUMENTS[instrument].tuning }),
    [instrument],
  );

  const [active, setActive] = useState(0);
  // Reset the selected position when the chord identity or instrument changes.
  const [prevKey, setPrevKey] = useState(`${label}|${instrument}`);
  if (`${label}|${instrument}` !== prevKey) { setPrevKey(`${label}|${instrument}`); setActive(0); }

  const notice = (msg: string) => (
    <div className={`bc-guitar-panel ${className ?? ""}`.trim()}
      style={{ textAlign: "center", color: muted, fontSize: "0.85rem", padding: "24px 0", ...style }}>
      {msg}
    </div>
  );

  const instrumentToggle = (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {INSTRUMENT_ORDER.map((id) => {
        const on = id === instrument;
        return (
          <button
            key={id}
            onClick={() => setInstrument(id)}
            data-active={on}
            style={{
              padding: "4px 14px", borderRadius: 999, cursor: "pointer",
              border: on ? "1px solid transparent" : "1px solid var(--btn-border, #ddd)",
              background: on ? "var(--pill-active-bg, #0ea5e9)" : "var(--pill-bg, #f1f5f9)",
              color: on ? "var(--pill-active-text, #fff)" : "var(--text-muted, #64748b)",
              fontFamily: "system-ui, sans-serif", fontSize: "0.8rem", fontWeight: on ? 600 : 500,
            }}
          >
            {INSTRUMENTS[id].label}
          </button>
        );
      })}
    </div>
  );

  if (parsed?.isScale) return notice("Guitar view shows chords — switch off scale mode.");
  if (!label) return notice("Enter a chord to see its guitar shapes.");
  if (!result) {
    return (
      <UIThemeProvider value={uiCtx}>
        <div
          className={`bc-guitar-panel ${className ?? ""}`.trim()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...style }}
        >
          {instrumentToggle}
          <div style={{ textAlign: "center", color: muted, fontSize: "0.85rem", padding: "12px 0" }}>
            No {INSTRUMENTS[instrument].label.toLowerCase()} shape found for “{label}”.
          </div>
        </div>
      </UIThemeProvider>
    );
  }

  const idx = Math.min(active, result.shapes.length - 1);
  const heading = title || label;
  const cfg = INSTRUMENTS[instrument];

  return (
    <UIThemeProvider value={uiCtx}>
      <div
        className={`bc-guitar-panel ${className ?? ""}`.trim()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...style }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: text, fontFamily: "system-ui, sans-serif" }}>
            {heading}
          </div>
          {subheading && (
            <div style={{ fontSize: 11, color: muted, fontFamily: "system-ui, sans-serif" }}>{subheading}</div>
          )}
        </div>

        {instrumentToggle}

        <GuitarChord
          chord={result.shapes[idx]}
          scale={scale}
          frets={cfg.frets}
          settings={guitarSettings}
        />

        {/* Alternate placements */}
        {result.shapes.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {result.shapes.map((_, i) => {
              const baseFret = result.positions[i].baseFret;
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  data-active={i === idx}
                  title={`Position ${i + 1} (fret ${baseFret})`}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                    border: i === idx ? "1px solid transparent" : "1px solid var(--btn-border, #ddd)",
                    background: i === idx ? "var(--pill-active-bg, #0ea5e9)" : "var(--pill-bg, #f1f5f9)",
                    color: i === idx ? "var(--pill-active-text, #fff)" : "var(--text-muted, #64748b)",
                    fontFamily: "inherit", fontSize: "0.9rem", fontWeight: i === idx ? 600 : 500,
                    minWidth: 40,
                  }}
                >
                  <span>{POSITION_LABELS[i] ?? i + 1}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 400 }}>fret {baseFret}</span>
                </button>
              );
            })}
          </div>
        )}

        {footerText && (
          <div style={{ fontSize: 11, color: muted, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
            {footerText}
          </div>
        )}
      </div>
    </UIThemeProvider>
  );
}
