import type { ProgressionChord } from "../progression";
import type { Format, ColorTheme, WhiteNote } from "../types";
import { PianoKeyboard } from "./PianoKeyboard";
import { calculateLayout, normalizeNote, WHITE_NOTE_ORDER } from "@better-chord/core";
import { useUITheme } from "../ui-theme";

export interface ChordGroupProps {
  chords: ProgressionChord[];
  label?: string;
  format?: Format;
  theme?: ColorTheme | string;
  highlightColor?: string;
  showPlayback?: boolean;
  scale?: number;
}

/**
 * Determine how many chords per row: 1, 2, or 4 (multiples of 2).
 * Uses the count to pick the best grid fit.
 */
function chordsPerRow(count: number): number {
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 3) return 2; // 3 chords → 2 per row (2 + 1)
  return 4; // 4+ chords → 4 per row
}

export function ChordGroup({
  chords,
  label,
  format,
  theme,
  highlightColor,
  showPlayback = true,
  scale,
}: ChordGroupProps) {
  const { tokens: ui } = useUITheme();
  // Calculate all layouts, then use the max size for uniform keyboards
  const layouts = chords.map((chord) => calculateLayout(chord.notes, { padding: 1 }));
  const uniformSize = Math.max(...layouts.map((l) => l.size), 8);
  const perRow = chordsPerRow(chords.length);

  return (
    <div style={{ marginBottom: 16, width: "100%" }}>
      {label && (
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
          {label}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-start",
          width: "100%",
        }}
      >
        {chords.map((chord, i) => {
          // Use octave-qualified highlights when padding creates duplicate notes
          let highlightKeys: string[] = chord.notes;
          if (layouts[i].chordOctave > 0) {
            let octave = layouts[i].chordOctave;
            const firstNorm = normalizeNote(chord.notes[0]);
            const firstWhiteIdx = WHITE_NOTE_ORDER.indexOf(
              firstNorm.replace("#", "") as WhiteNote
            );
            let prevWhiteIdx = firstWhiteIdx;

            highlightKeys = chord.notes.map((n, j) => {
              const norm = normalizeNote(n);
              const whiteKey = norm.replace("#", "") as WhiteNote;
              const whiteIdx = WHITE_NOTE_ORDER.indexOf(whiteKey);
              if (j > 0 && whiteIdx <= prevWhiteIdx) octave++;
              prevWhiteIdx = whiteIdx;
              return `${norm}:${octave}`;
            });
          }

          return (
          <div
            key={i}
            style={{
              textAlign: "center",
              flex: `0 1 calc(${100 / perRow}% - ${((perRow - 1) * 12) / perRow}px)`,
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              {chord.symbol}
            </div>
            <PianoKeyboard
              format={format}
              size={uniformSize}
              startFrom={layouts[i].startFrom as WhiteNote}
              highlightKeys={highlightKeys}
              theme={theme}
              highlightColor={highlightColor}
              showPlayback={showPlayback}
              chordLabel={chord.symbol}
              scale={scale}
            />
            {chord.voicingStyle && (
              <div style={{ fontSize: 10, color: ui.textSubtle, marginTop: 2 }}>
                {chord.voicingStyle}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
