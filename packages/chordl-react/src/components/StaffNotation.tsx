import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { buildMei } from "@pepperhorn/chordl-core";
import type { StaffGlyphSet } from "@pepperhorn/chordl-core";
import { PlaybackControls } from "./PlaybackControls";
import { useUITheme } from "../ui-theme";
import { renderMeiToSvg } from "../verovio";
import type { VerovioFont } from "../verovio";
import { getDefaultGlyphs } from "@pepperhorn/chordl-core";

export interface StaffNotationProps {
  notes: string[];
  lhNotes?: string[];
  rhOctave?: number;
  lhOctave?: number;
  /** Pre-resolved octave-qualified notes (e.g. "C:4", "G#:5").
   *  When provided, bypasses internal octave assignment for exact matching. */
  octaveQualifiedNotes?: string[];
  chordLabel?: string;
  /**
   * Draw `chordLabel` inside the SVG. Default true. Card renderers pass false
   * and supply the name via the shared DOM heading instead, so a staff card's
   * type matches the keyboard card beside it. `chordLabel` is still used for
   * the accessible name and playback either way.
   */
  showLabel?: boolean;
  scale?: number;
  showPlayback?: boolean;
  /** Which SMuFL font to engrave with. `name` selects the Verovio font
   *  (Bravura / Petaluma); defaults to the app-wide glyph selection. */
  glyphs?: StaffGlyphSet;
  className?: string;
  style?: CSSProperties;
}

const CONTROLS_HEIGHT = 30;
const CONTROLS_WIDTH = 170;
const LABEL_HEIGHT = 18;

/** Map the app's SMuFL glyph set to a Verovio font name. */
function fontFor(glyphs: StaffGlyphSet | undefined): VerovioFont {
  const name = (glyphs ?? getDefaultGlyphs()).name;
  return name === "Petaluma" ? "Petaluma" : "Bravura";
}

/** Pull intrinsic pixel dimensions out of a Verovio SVG string. */
function parseSvgSize(svg: string): { width: number; height: number } {
  const w = svg.match(/\bwidth="([\d.]+)px"/);
  const h = svg.match(/\bheight="([\d.]+)px"/);
  if (w && h) return { width: parseFloat(w[1]), height: parseFloat(h[1]) };
  const vb = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
  if (vb) return { width: parseFloat(vb[1]), height: parseFloat(vb[2]) };
  return { width: 160, height: 120 };
}

export function StaffNotation({
  notes,
  lhNotes,
  rhOctave,
  lhOctave,
  octaveQualifiedNotes,
  chordLabel,
  showLabel = true,
  scale = 0.5,
  showPlayback = true,
  glyphs,
  className,
  style,
}: StaffNotationProps) {
  const { tokens: ui } = useUITheme();
  const font = fontFor(glyphs);

  const mei = useMemo(
    () => buildMei(notes, { lhNotes, rhOctave, lhOctave, octaveQualifiedNotes }).mei,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes.join(","), lhNotes?.join(","), rhOctave, lhOctave, octaveQualifiedNotes?.join(",")],
  );

  const [staffSvg, setStaffSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const nestRef = useRef<SVGGElement | null>(null);

  // Verovio scale is a percent; map the component's ~0.5 scale into its range.
  const verovioScale = Math.max(24, Math.round(scale * 80));

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    renderMeiToSvg(mei, { font, scale: verovioScale })
      .then((svg) => { if (!cancelled) setStaffSvg(svg); })
      // Clear the SVG on failure so a later retry of identical MEI still
      // changes state and re-fires the injection effect below.
      .catch(() => { if (!cancelled) { setStaffSvg(null); setFailed(true); } });
    return () => { cancelled = true; };
  }, [mei, font, verovioScale]);

  const size = staffSvg ? parseSvgSize(staffSvg) : { width: 160, height: 120 };
  const labelDrawn = Boolean(chordLabel && showLabel);
  const labelH = labelDrawn ? LABEL_HEIGHT : 0;
  const controlsH = showPlayback && notes.length > 0 ? CONTROLS_HEIGHT : 0;
  const totalWidth = Math.max(size.width, controlsH ? CONTROLS_WIDTH : 0, 120);
  // The playback controls force a minimum width, so the engraving is usually
  // stretched wider than Verovio drew it. Its height has to follow that scale:
  // reserving only `size.height` leaves a box taller than the engraving's own
  // aspect ratio, and a nested <svg> answers that with `xMidYMid meet` — it
  // centres itself in the surplus and pads the difference above the clef.
  const engScale = totalWidth / size.width;
  const engHeight = size.height * engScale;
  const totalHeight = engHeight + labelH + controlsH;

  // Inject the raw Verovio SVG into the nested <g> (imperatively, so React
  // doesn't try to reconcile Verovio's markup).
  useEffect(() => {
    const g = nestRef.current;
    if (!g) return;
    g.innerHTML = staffSvg ?? "";
    // Verovio runs with `svgViewBox: true`, so its root <svg> carries no
    // width/height and would otherwise resolve to 100% of the *outer* viewport
    // rather than the strip left for it below the label and controls.
    const inner = g.querySelector("svg");
    if (inner) {
      inner.setAttribute("width", String(totalWidth));
      inner.setAttribute("height", String(engHeight));
    }
  }, [staffSvg, totalWidth, engHeight]);

  const staffColor = ui.text ?? "#333";
  const controlsX = totalWidth - CONTROLS_WIDTH + 4;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`bc-staff ${className ?? ""}`.trim()}
      // Verovio glyphs use `currentColor`; set it to the theme text color so
      // the engraving stays visible in dark mode (not left to CSS inheritance).
      style={{ width: "100%", maxWidth: totalWidth * 1.6, color: staffColor, ...style }}
      role="img"
      aria-label={chordLabel ? `Staff notation: ${chordLabel}` : "Staff notation"}
    >
      {controlsH > 0 && (
        <g data-controls="">
          <PlaybackControls
            notes={notes}
            lhNotes={lhNotes}
            rhOctave={rhOctave}
            lhOctave={lhOctave}
            chordName={chordLabel ?? notes.join("-")}
            x={controlsX}
            y={4}
          />
        </g>
      )}

      {labelDrawn && (
        <text
          className="bc-staff__label"
          x={size.width / 2}
          y={controlsH + LABEL_HEIGHT - 5}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill={staffColor}
          fontFamily="system-ui, sans-serif"
        >
          {chordLabel}
        </text>
      )}

      {failed ? (
        <text
          x={totalWidth / 2}
          y={controlsH + labelH + 20}
          textAnchor="middle"
          fontSize={11}
          fill={ui.textMuted ?? "#888"}
          fontFamily="system-ui, sans-serif"
        >
          notation unavailable
        </text>
      ) : (
        // Verovio's SVG is injected here imperatively (see effect above).
        <g ref={nestRef} className="bc-staff__engraving" transform={`translate(0, ${controlsH + labelH})`} />
      )}
    </svg>
  );
}
