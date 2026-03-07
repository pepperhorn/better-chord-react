import { useState, useCallback } from "react";
import { playBlock, playArpeggiated, toAscendingNotes } from "../audio/playback";
import { downloadMidi } from "@better-chord/core";
import { downloadSvg, downloadPng } from "../audio/svg-export";
import { useUITheme } from "../ui-theme";
import { arpeggioDelayMs } from "../config";

interface PlaybackControlsProps {
  notes: string[];
  /** Left-hand bass notes (for MIDI export with separate clefs). */
  lhNotes?: string[];
  /** Right-hand playback octave (default 4). */
  rhOctave?: number;
  /** Left-hand bass playback octave (default 3). */
  lhOctave?: number;
  chordName: string;
  x: number;
  y: number;
}

const ICON_SIZE = 16;
const BTN_SIZE = 22;
const GAP = 4;
const SECTION_GAP = 10;

export function PlaybackControls({ notes, lhNotes, rhOctave, lhOctave, chordName, x, y }: PlaybackControlsProps) {
  const { tokens: ui } = useUITheme();
  const [playing, setPlaying] = useState<"block" | "arp" | null>(null);

  const lhCount = lhNotes?.length ?? 0;
  const lhOct = lhOctave ?? 2;
  const rhOct = rhOctave ?? 3;
  // Strip octave-qualifier colon format ("C#:0" → "C#") to get pure pitch classes
  const cleanNotes = notes.map((n) => n.replace(/:.*$/, ""));
  // Build playable notes: assign ascending octaves per hand so notes rise properly
  // e.g. G#, B, E with base octave 4 → G#4, B4, E5 (not E4)
  const playableNotes = (() => {
    if (lhCount > 0) {
      const lhPCs = cleanNotes.slice(0, lhCount);
      const rhPCs = cleanNotes.slice(lhCount);
      return [...toAscendingNotes(lhPCs, lhOct), ...toAscendingNotes(rhPCs, rhOct)];
    }
    return toAscendingNotes(cleanNotes, rhOct);
  })();

  const handleBlock = useCallback(async () => {
    if (playing) return;
    setPlaying("block");
    try {
      await playBlock(playableNotes);
      setTimeout(() => setPlaying(null), 1500);
    } catch {
      setPlaying(null);
    }
  }, [playableNotes, playing]);

  const handleArp = useCallback(async () => {
    if (playing) return;
    setPlaying("arp");
    try {
      await playArpeggiated(playableNotes, 4, arpeggioDelayMs());
      setTimeout(() => setPlaying(null), 1500);
    } catch {
      setPlaying(null);
    }
  }, [playableNotes, playing]);

  const handleMidi = useCallback(() => {
    downloadMidi(notes, chordName, rhOct, lhNotes, lhOct);
  }, [notes, chordName, rhOct, lhNotes, lhOct]);

  const findParentSvg = useCallback((e: React.MouseEvent) => {
    return (e.currentTarget as SVGElement).closest("svg") as SVGSVGElement | null;
  }, []);

  const handleSvgDownload = useCallback((e: React.MouseEvent) => {
    const svg = findParentSvg(e);
    if (svg) downloadSvg(svg, chordName);
  }, [chordName, findParentSvg]);

  const handlePngDownload = useCallback((e: React.MouseEvent) => {
    const svg = findParentSvg(e);
    if (svg) downloadPng(svg, chordName);
  }, [chordName, findParentSvg]);

  const btnStyle = {
    cursor: "pointer" as const,
    opacity: playing ? 0.5 : 1,
  };

  // Button positions
  const audioGroupW = 2 * BTN_SIZE + GAP;
  const downloadGroupW = 3 * BTN_SIZE + 2 * GAP;
  const totalW = audioGroupW + SECTION_GAP + downloadGroupW;

  const renderBtn = (
    bx: number,
    fill: string,
    onClick: (e: React.MouseEvent) => void,
    label: string,
    style: React.CSSProperties,
    children: React.ReactNode,
    isActive = false,
  ) => (
    <g
      transform={`translate(${bx}, ${y})`}
      onClick={onClick}
      style={style}
      role="button"
      aria-label={label}
    >
      {/* Base fill */}
      <rect
        width={BTN_SIZE}
        height={BTN_SIZE}
        rx={5}
        fill={fill}
        stroke={ui.playbackBtnBorder}
        strokeWidth={0.5}
      />
      {/* Glass gradient overlay */}
      <rect
        width={BTN_SIZE}
        height={BTN_SIZE}
        rx={5}
        fill={`url(#${isActive ? activeGlassId : glassId})`}
      />
      {/* Top edge shine */}
      <line
        x1={6}
        y1={1.5}
        x2={BTN_SIZE - 6}
        y2={1.5}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={0.5}
        strokeLinecap="round"
      />
      {children}
    </g>
  );

  const iconOffset = `translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`;

  // Unique gradient IDs to avoid collisions when multiple chords render
  const glassId = `btn-glass-${x}-${y}`;
  const activeGlassId = `btn-glass-active-${x}-${y}`;

  return (
    <g className="bc-playback-controls">
      {/* Button glass gradients */}
      <defs>
        <linearGradient id={glassId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.02)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
        </linearGradient>
        <linearGradient id={activeGlassId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
        </linearGradient>
      </defs>


      {/* Block chord button */}
      {renderBtn(
        x,
        playing === "block" ? ui.playbackActive : ui.playbackBg,
        handleBlock,
        "Play block chord",
        btnStyle,
        <g transform={iconOffset}>
          <polygon points="2,5 5,5 9,2 9,14 5,11 2,11" fill={ui.iconFill} />
          <path d="M11,5.5 C12.5,6.5 12.5,9.5 11,10.5" stroke={ui.iconFill} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M12.5,3.5 C15,5.5 15,10.5 12.5,12.5" stroke={ui.iconFill} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>,
        playing === "block",
      )}

      {/* Arpeggiate button */}
      {renderBtn(
        x + BTN_SIZE + GAP,
        playing === "arp" ? ui.playbackActive : ui.playbackBg,
        handleArp,
        "Play arpeggiated",
        btnStyle,
        <g transform={iconOffset}>
          <path d="M8,14 C6,11 10,9 8,7 C6,5 10,3 8,1" stroke={ui.iconFill} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <polygon points="5,3 8,0 11,3" fill={ui.iconFill} />
        </g>,
        playing === "arp",
      )}

      {/* MIDI download button */}
      {renderBtn(
        x + audioGroupW + SECTION_GAP,
        ui.playbackBg,
        handleMidi,
        "Download MIDI file",
        { cursor: "pointer" },
        <text x={BTN_SIZE / 2} y={BTN_SIZE / 2 + 3} textAnchor="middle" fontSize={6} fontWeight="bold" fill={ui.iconFill} fontFamily="system-ui, sans-serif">MIDI</text>,
      )}

      {/* SVG download button */}
      {renderBtn(
        x + audioGroupW + SECTION_GAP + BTN_SIZE + GAP,
        ui.playbackBg,
        handleSvgDownload,
        "Download SVG",
        { cursor: "pointer" },
        <text x={BTN_SIZE / 2} y={BTN_SIZE / 2 + 3} textAnchor="middle" fontSize={7} fontWeight="bold" fill={ui.iconFill} fontFamily="system-ui, sans-serif">SVG</text>,
      )}

      {/* PNG download button */}
      {renderBtn(
        x + audioGroupW + SECTION_GAP + 2 * (BTN_SIZE + GAP),
        ui.playbackBg,
        handlePngDownload,
        "Download PNG",
        { cursor: "pointer" },
        <text x={BTN_SIZE / 2} y={BTN_SIZE / 2 + 3} textAnchor="middle" fontSize={7} fontWeight="bold" fill={ui.iconFill} fontFamily="system-ui, sans-serif">PNG</text>,
      )}
    </g>
  );
}
