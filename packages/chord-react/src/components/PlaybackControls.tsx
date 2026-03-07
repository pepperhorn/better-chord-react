import { useState, useCallback } from "react";
import { playBlock, playArpeggiated } from "../audio/playback";
import { downloadMidi } from "../audio/midi-export";
import { downloadSvg, downloadPng } from "../audio/svg-export";
import { useUITheme } from "../ui-theme";

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

export function PlaybackControls({ notes, lhNotes, rhOctave, lhOctave, chordName, x, y }: PlaybackControlsProps) {
  const { tokens: ui } = useUITheme();
  const [playing, setPlaying] = useState<"block" | "arp" | null>(null);

  // Tag LH notes with lhOctave (default 3), RH with rhOctave (default 4)
  const lhCount = lhNotes?.length ?? 0;
  const lhOct = lhOctave ?? 3;
  const rhOct = rhOctave ?? 4;
  // Strip octave-qualifier colon format ("C#:0" → "C#") before building playable notes
  const cleanNotes = notes.map((n) => n.replace(/:.*$/, ""));
  const playableNotes = lhCount > 0
    ? cleanNotes.map((n, i) => {
        if (/[0-9]$/.test(n)) return n;
        return i < lhCount ? `${n}${lhOct}` : `${n}${rhOct}`;
      })
    : cleanNotes.map((n) => (/[0-9]$/.test(n) ? n : `${n}${rhOct}`));

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
      await playArpeggiated(playableNotes);
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

  return (
    <g>
      {/* Block chord button (speaker icon) */}
      <g
        transform={`translate(${x}, ${y})`}
        onClick={handleBlock}
        style={btnStyle}
        role="button"
        aria-label="Play block chord"
      >
        <rect
          width={BTN_SIZE}
          height={BTN_SIZE}
          rx={4}
          fill={playing === "block" ? ui.playbackActive : ui.playbackBg}
          opacity={0.8}
        />
        <g transform={`translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`}>
          {/* Speaker icon */}
          <polygon points="2,5 5,5 9,2 9,14 5,11 2,11" fill={ui.iconFill} />
          <path
            d="M11,5.5 C12.5,6.5 12.5,9.5 11,10.5"
            stroke={ui.iconFill}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M12.5,3.5 C15,5.5 15,10.5 12.5,12.5"
            stroke={ui.iconFill}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Arpeggiate button (up arrow icon) */}
      <g
        transform={`translate(${x + BTN_SIZE + GAP}, ${y})`}
        onClick={handleArp}
        style={btnStyle}
        role="button"
        aria-label="Play arpeggiated"
      >
        <rect
          width={BTN_SIZE}
          height={BTN_SIZE}
          rx={4}
          fill={playing === "arp" ? ui.playbackActive : ui.playbackBg}
          opacity={0.8}
        />
        <g transform={`translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`}>
          {/* Wavy up arrow (arpeggio symbol) */}
          <path
            d="M8,14 C6,11 10,9 8,7 C6,5 10,3 8,1"
            stroke={ui.iconFill}
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <polygon points="5,3 8,0 11,3" fill={ui.iconFill} />
        </g>
      </g>

      {/* MIDI download button */}
      <g
        transform={`translate(${x + 2 * (BTN_SIZE + GAP)}, ${y})`}
        onClick={handleMidi}
        style={{ cursor: "pointer" }}
        role="button"
        aria-label="Download MIDI file"
      >
        <rect
          width={BTN_SIZE}
          height={BTN_SIZE}
          rx={4}
          fill={ui.playbackBg}
          opacity={0.8}
        />
        <g transform={`translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`}>
          {/* Download arrow icon */}
          <line x1="8" y1="1" x2="8" y2="10" stroke={ui.iconFill} strokeWidth="1.8" strokeLinecap="round" />
          <polyline points="4,7 8,11 12,7" stroke={ui.iconFill} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="2" y1="14" x2="14" y2="14" stroke={ui.iconFill} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>

      {/* SVG download button */}
      <g
        transform={`translate(${x + 3 * (BTN_SIZE + GAP)}, ${y})`}
        onClick={handleSvgDownload}
        style={{ cursor: "pointer" }}
        role="button"
        aria-label="Download SVG"
      >
        <rect
          width={BTN_SIZE}
          height={BTN_SIZE}
          rx={4}
          fill={ui.playbackBg}
          opacity={0.8}
        />
        <text
          x={BTN_SIZE / 2}
          y={BTN_SIZE / 2 + 3}
          textAnchor="middle"
          fontSize={7}
          fontWeight="bold"
          fill={ui.iconFill}
          fontFamily="system-ui, sans-serif"
        >
          SVG
        </text>
      </g>

      {/* PNG download button */}
      <g
        transform={`translate(${x + 4 * (BTN_SIZE + GAP)}, ${y})`}
        onClick={handlePngDownload}
        style={{ cursor: "pointer" }}
        role="button"
        aria-label="Download PNG"
      >
        <rect
          width={BTN_SIZE}
          height={BTN_SIZE}
          rx={4}
          fill={ui.playbackBg}
          opacity={0.8}
        />
        <text
          x={BTN_SIZE / 2}
          y={BTN_SIZE / 2 + 3}
          textAnchor="middle"
          fontSize={7}
          fontWeight="bold"
          fill={ui.iconFill}
          fontFamily="system-ui, sans-serif"
        >
          PNG
        </text>
      </g>
    </g>
  );
}
