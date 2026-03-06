import { useState, useCallback } from "react";
import { playBlock, playArpeggiated } from "../audio/playback";
import { downloadMidi } from "../audio/midi-export";

interface PlaybackControlsProps {
  notes: string[];
  chordName: string;
  x: number;
  y: number;
}

const ICON_SIZE = 16;
const BTN_SIZE = 22;
const GAP = 4;

export function PlaybackControls({ notes, chordName, x, y }: PlaybackControlsProps) {
  const [playing, setPlaying] = useState<"block" | "arp" | null>(null);

  const handleBlock = useCallback(async () => {
    if (playing) return;
    setPlaying("block");
    await playBlock(notes);
    setTimeout(() => setPlaying(null), 1500);
  }, [notes, playing]);

  const handleArp = useCallback(async () => {
    if (playing) return;
    setPlaying("arp");
    await playArpeggiated(notes);
    setTimeout(() => setPlaying(null), 1500);
  }, [notes, playing]);

  const handleMidi = useCallback(() => {
    downloadMidi(notes, chordName);
  }, [notes, chordName]);

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
          fill={playing === "block" ? "#4a90d9" : "#333"}
          opacity={0.8}
        />
        <g transform={`translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`}>
          {/* Speaker icon */}
          <polygon points="2,5 5,5 9,2 9,14 5,11 2,11" fill="#fff" />
          <path
            d="M11,5.5 C12.5,6.5 12.5,9.5 11,10.5"
            stroke="#fff"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M12.5,3.5 C15,5.5 15,10.5 12.5,12.5"
            stroke="#fff"
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
          fill={playing === "arp" ? "#4a90d9" : "#333"}
          opacity={0.8}
        />
        <g transform={`translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`}>
          {/* Wavy up arrow (arpeggio symbol) */}
          <path
            d="M8,14 C6,11 10,9 8,7 C6,5 10,3 8,1"
            stroke="#fff"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <polygon points="5,3 8,0 11,3" fill="#fff" />
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
          fill="#333"
          opacity={0.8}
        />
        <g transform={`translate(${(BTN_SIZE - ICON_SIZE) / 2}, ${(BTN_SIZE - ICON_SIZE) / 2})`}>
          {/* Download arrow icon */}
          <line x1="8" y1="1" x2="8" y2="10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <polyline points="4,7 8,11 12,7" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="2" y1="14" x2="14" y2="14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}
