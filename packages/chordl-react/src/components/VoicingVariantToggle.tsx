import { useState, useMemo, useRef, useCallback } from "react";
import type { DisplayMode, OnVariation, RenderVariationExtras } from "../types";
import type { UIThemeMode } from "../config";
import { PianoChord } from "./PianoChord";
import {
  parseChordDescription,
  resolveChord,
  FLAT_TO_SHARP,
} from "@pepperhorn/chordl-core";
import {
  generateVariants,
  mapToVoicingQuality,
} from "@pepperhorn/chordl-voicings";
import type { VoicingVariant } from "@pepperhorn/chordl-voicings";
import { exportSingleZip, exportAllZip, downloadBlob } from "../audio/zip-export";
import type { ZipVariant } from "../audio/zip-export";

export interface VoicingVariantToggleProps {
  chord: string;
  format?: "compact" | "exact";
  theme?: string;
  highlightColor?: string;
  scale?: number;
  display?: DisplayMode;
  uiTheme?: UIThemeMode;
  /** Called when zip export starts/finishes — drives the header animation */
  onExportStatus?: (status: "idle" | "preparing") => void;
  onVariation?: OnVariation;
  renderVariationExtras?: RenderVariationExtras;
  /** Position in progression, forwarded to PianoChord. Default 0. */
  chordIndex?: number;
  /** Chord-card metadata — forwarded to every variant. */
  title?: string;
  subheading?: string;
  footerText?: string;
}

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function VoicingVariantToggle({
  chord,
  format,
  theme,
  highlightColor,
  scale,
  display,
  uiTheme,
  onExportStatus,
  onVariation,
  renderVariationExtras,
  chordIndex,
  title,
  subheading,
  footerText,
}: VoicingVariantToggleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(3);
  const [zipMenu, setZipMenu] = useState(false);
  const chordOutputRef = useRef<HTMLDivElement>(null);

  // Parse and resolve chord to get root, quality, notes.
  // Apply "starting on" / inversion rotation so variants match what PianoChord renders.
  const resolved = useMemo(() => {
    try {
      const parsed = parseChordDescription(chord);
      // Scales don't have variants — render PianoChord directly
      if (parsed.isScale) return null;
      if (!parsed.chordName) return null;
      const res = resolveChord(parsed.chordName, parsed.inversion);
      let notes = res.notes;

      // Apply "starting on X" rotation (same logic as PianoChord)
      if (parsed.startingNote) {
        const norm = FLAT_TO_SHARP[parsed.startingNote] ?? parsed.startingNote;
        const idx = notes.indexOf(norm);
        if (idx > 0) {
          notes = [...notes.slice(idx), ...notes.slice(0, idx)];
        }
      }

      const quality = mapToVoicingQuality(res.type, res.intervals);
      return { parsed, root: res.root, quality, notes, type: res.type, styleHint: parsed.styleHint };
    } catch {
      return null;
    }
  }, [chord]);

  // Generate variants
  const variants = useMemo<VoicingVariant[]>(() => {
    if (!resolved) return [];
    return generateVariants(
      resolved.root,
      resolved.quality,
      resolved.notes,
      totalCount,
      { styleHint: resolved.styleHint },
    );
  }, [resolved, totalCount]);

  // Reset active index only when the actual chord identity changes
  // (root + notes), not when display modifiers (fingering, midi, etc.) change.
  const chordIdentity = resolved ? `${resolved.root}:${resolved.notes.join(",")}` : chord;
  const [prevIdentity, setPrevIdentity] = useState(chordIdentity);
  if (chordIdentity !== prevIdentity) {
    setPrevIdentity(chordIdentity);
    setActiveIndex(0);
    setTotalCount(3);
  }

  // If we couldn't resolve or only have 1 variant, just render PianoChord directly
  if (!resolved || variants.length <= 1) {
    return (
      <PianoChord
        chord={chord}
        format={format}
        theme={theme}
        highlightColor={highlightColor}
        scale={scale}
        display={display}
        uiTheme={uiTheme}
        title={title}
        subheading={subheading}
        footerText={footerText}
        onVariation={onVariation}
        renderVariationExtras={renderVariationExtras}
        voicingId="default"
        chordIndex={chordIndex ?? 0}
      />
    );
  }

  const active = variants[Math.min(activeIndex, variants.length - 1)];

  // Extract display modifiers from the original prompt so all variants
  // inherit them (midi note names, fingering, note name size, etc.).
  const displayModifiers = useMemo(() => {
    if (!resolved) return "";
    const parts: string[] = [];
    const p = resolved.parsed;
    /*
     * "degree" is degree-only: no name row at all. Emitting the literal "note
     * names" for every non-midi mode turned that card into a plain pitch-class
     * one on the first variant click. The degrees clause has to be written down
     * too, or the degree row and its size are dropped by the same rebuild.
     */
    const mode = p.noteNameMode ?? "pitch-class";
    const wantsDegrees =
      mode === "degree" || mode === "pitch-class+degree" || mode === "midi+degree";
    if (p.showNoteNames && mode !== "degree") {
      if (mode === "midi" || mode === "midi+degree") {
        parts.push("midi note names");
      } else {
        parts.push("note names");
      }
      if (p.noteNameSize && p.noteNameSize !== "base") {
        parts.push(`in ${p.noteNameSize}`);
      }
    }
    if (wantsDegrees) {
      // The explicit "in <size>" form: the bare-size form carries a negative
      // lookahead so it can't swallow a following note-names shape, and there
      // is no reason to go near that hazard here.
      parts.push(
        p.degreeSize && p.degreeSize !== "base"
          ? `degrees in ${p.degreeSize}`
          : "degrees",
      );
    }
    if (p.customFingering) {
      parts.push(`custom fingering "${p.customFingering.join(",")}"`);;
    } else if (p.autoFingering) {
      parts.push("with fingering");
    } else if (p.fingering) {
      parts.push(`fingering ${p.fingering.join("-")}`);
    }
    if (p.fingeringSize && p.fingeringSize !== "base") {
      parts.push(`fingering in ${p.fingeringSize}`);
    }
    if (p.colorTheme) {
      parts.push(p.colorTheme);
    }
    if (p.scale != null) {
      parts.push(`size ${Math.round(p.scale * 100)}`);
    }
    if (p.showHeading) {
      parts.push("heading");
    }
    return parts.length > 0 ? " " + parts.join(" ") : "";
  }, [resolved]);

  // Build the chord string for the active variant, preserving display modifiers.
  let chordString = chord;
  if (activeIndex > 0) {
    const baseChord = resolved.parsed.chordName ?? chord;
    if (active.source === "inversion") {
      // Use "starting on X" instead of inversion number to avoid
      // mismatch when the input already has a starting note rotation
      chordString = `${baseChord} starting on ${active.notes[0]}${displayModifiers}`;
    } else if (active.source === "library") {
      chordString = `${baseChord} ${active.label} style${displayModifiers}`;
    } else {
      chordString = `${baseChord}${displayModifiers}`;
    }
  }

  const getSvgElement = useCallback((): SVGSVGElement | null => {
    return chordOutputRef.current?.querySelector("svg") ?? null;
  }, []);

  const handleZipExport = useCallback(async (mode: "this" | "all") => {
    setZipMenu(false);
    onExportStatus?.("preparing");
    try {
      const chordName = resolved?.parsed.chordName ?? "chord";
      if (mode === "this") {
        const svg = getSvgElement();
        const zipVariant: ZipVariant = { label: active.label, notes: active.notes, svgElement: svg };
        const blob = await exportSingleZip(chordName, zipVariant);
        downloadBlob(blob, `${chordName.replace(/[^a-zA-Z0-9]/g, "_")}.zip`);
      } else {
        // Export all variants — render each one's SVG by temporarily switching
        // For now, use the current SVG for the active variant and notes-only for others
        const zipVariants: ZipVariant[] = variants.map((v, i) => ({
          label: v.label,
          notes: v.notes,
          svgElement: i === activeIndex ? getSvgElement() : null,
        }));
        const blob = await exportAllZip(chordName, zipVariants);
        downloadBlob(blob, `${chordName.replace(/[^a-zA-Z0-9]/g, "_")}_all.zip`);
      }
    } catch (e) {
      console.error("ZIP export failed:", e);
    } finally {
      onExportStatus?.("idle");
    }
  }, [resolved, active, activeIndex, variants, getSvgElement, onExportStatus]);

  return (
    <div className="voicing-variant-toggle" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
      {/* Chord output — allow horizontal overflow so keyboard isn't squished */}
      <div className="voicing-output-wrapper" ref={chordOutputRef} style={{ width: "100%", overflowX: "auto", display: "flex", justifyContent: "center" }}>
        <PianoChord
          chord={chordString}
          format={format}
          theme={theme}
          highlightColor={highlightColor}
          scale={scale}
          display={display}
          uiTheme={uiTheme}
          title={title}
          subheading={subheading}
          footerText={footerText}
          onVariation={onVariation}
          renderVariationExtras={renderVariationExtras}
          voicingId={variants[activeIndex]?.label ?? "default"}
          chordIndex={chordIndex ?? 0}
        />
      </div>

      {/* Variant toggle row */}
      <div className="variant-toggle-row" style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 6,
        justifyContent: "center",
      }}>
        {variants.map((v, i) => (
          <button
            key={v.id}
            className="variant-pill"
            data-active={i === activeIndex}
            onClick={() => setActiveIndex(i)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "12px 22px 10px",
              border: i === activeIndex ? "1px solid transparent" : "1px solid var(--btn-border)",
              borderRadius: 10,
              background: i === activeIndex ? "var(--pill-active-bg)" : "var(--pill-bg)",
              color: i === activeIndex ? "var(--pill-active-text)" : "var(--text-muted)",
              boxShadow: i === activeIndex ? "0 1px 6px var(--pill-active-shadow)" : "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "1.2rem",
              fontWeight: i === activeIndex ? 600 : 500,
              transition: "all 0.2s ease",
              minWidth: 64,
            }}
          >
            <span>{LABELS[i]}</span>
            <span className="variant-pill-label" style={{
              fontSize: "0.78rem",
              fontWeight: 400,
              color: "var(--text-dim)",
              whiteSpace: "nowrap",
              maxWidth: 80,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {v.label}
            </span>
          </button>
        ))}

        {/* + button — hide when all variants exhausted */}
        {variants.length >= totalCount && <button
          className="variant-pill-add"
          onClick={() => setTotalCount((c) => c + 3)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            border: "1px dashed var(--btn-border)",
            borderRadius: 10,
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "1.2rem",
            fontWeight: 400,
            transition: "all 0.2s ease",
            minWidth: 52,
            height: 52,
          }}
          title="Generate more voicing options"
        >
          +
        </button>}

        {/* ZIP export button with This/All popup */}
        <div className="zip-export-container" style={{ position: "relative" }}>
          <button
            className="variant-pill-zip"
            onClick={() => setZipMenu((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "12px 16px",
              border: "1px solid var(--btn-border)",
              borderRadius: 10,
              background: "var(--pill-bg)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.78rem",
              fontWeight: 500,
              transition: "all 0.2s ease",
              height: 52,
              whiteSpace: "nowrap",
            }}
            title="Download .zip package"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 0A1.5 1.5 0 002 1.5v13A1.5 1.5 0 003.5 16h9a1.5 1.5 0 001.5-1.5V4.707A1.5 1.5 0 0013.56 3.65L10.354.44A1.5 1.5 0 009.293 0H3.5zM7 3v1h2V3H7zm0 2v1h2V5H7zm0 2v1h2V7H7zm0 2h2v2H7V9z"/>
            </svg>
            .zip
          </button>
          {zipMenu && (
            <div
              className="zip-menu"
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginTop: 6,
                display: "flex",
                gap: 4,
                padding: 4,
                background: "var(--pill-active-bg)",
                border: "1px solid var(--btn-border)",
                borderRadius: 10,
                boxShadow: "0 4px 16px var(--glass-shadow)",
                zIndex: 10,
              }}
            >
              <button
                className="zip-menu-btn"
                onClick={() => handleZipExport("this")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
              >
                This
              </button>
              <button
                className="zip-menu-btn"
                onClick={() => handleZipExport("all")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
              >
                All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
