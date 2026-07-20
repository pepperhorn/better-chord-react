import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { SVGuitarChord } from "svguitar";
import type { Chord, ChordSettings } from "svguitar";
import { useUITheme } from "../ui-theme";

export interface GuitarChordProps {
  /** An svguitar Chord (from chordl-guitar's lookupGuitarChord shapes). */
  chord: Chord;
  /** Number of frets to draw (default 5). */
  frets?: number;
  /** Extra svguitar settings (merged last). */
  settings?: ChordSettings;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Render a single guitar chord diagram (fretboard "frame") with svguitar.
 *
 * svguitar draws imperatively into a DOM node, so we render into a ref'd div in
 * an effect and clear it on unmount — the same pattern the Verovio staff uses.
 * Colors come from the UI theme so the diagram stays visible in dark mode.
 */
export function GuitarChord({
  chord,
  frets = 5,
  settings,
  scale = 1,
  className,
  style,
}: GuitarChordProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { tokens: ui } = useUITheme();
  const color = ui.text ?? "#0a0a0a";

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";
    try {
      new SVGuitarChord(el)
        .configure({
          frets,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color,
          backgroundColor: "transparent",
          strokeWidth: 2,
          fretLabelColor: color,
          tuningsColor: color,
          ...settings,
        })
        .chord(chord)
        .draw();
    } catch {
      el.innerHTML = "";
    }
    return () => { el.innerHTML = ""; };
  }, [chord, frets, settings, color]);

  return (
    <div
      ref={containerRef}
      className={`bc-guitar-chord ${className ?? ""}`.trim()}
      style={{ width: "100%", maxWidth: 260 * scale, ...style }}
    />
  );
}
