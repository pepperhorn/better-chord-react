import { useEffect, useRef, type ReactNode } from "react";
import type { Format, ColorTheme, WhiteNote, DisplayMode, TextSize, NoteNameMode, OnVariation, RenderVariationExtras, VariationContext } from "../types";
import { PianoKeyboard } from "./PianoKeyboard";
import { ascendingOctaves } from "../diatonic-step";
import { StaffNotation } from "./StaffNotation";
import { calculateLayout, normalizeNote, WHITE_NOTE_ORDER, autoFingering } from "@pepperhorn/chordl-core";
import type { ProgressionChord } from "@pepperhorn/chordl-core";
import { useUITheme } from "../ui-theme";

export interface ChordGroupProps {
  chords: ProgressionChord[];
  label?: string;
  format?: Format;
  theme?: ColorTheme | string;
  highlightColor?: string;
  showPlayback?: boolean;
  scale?: number;
  display?: DisplayMode;
  showNoteNames?: boolean;
  noteNameMode?: NoteNameMode;
  noteNameSize?: TextSize;
  showFingering?: boolean;
  fingeringSize?: TextSize;
  onVariation?: OnVariation;
  renderVariationExtras?: RenderVariationExtras;
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
  display = "keyboard",
  showNoteNames,
  noteNameMode,
  noteNameSize,
  showFingering,
  fingeringSize,
  onVariation,
  renderVariationExtras,
}: ChordGroupProps) {
  const { tokens: ui } = useUITheme();
  // Calculate all layouts, then use the max size for uniform keyboards
  const layouts = chords.map((chord) => calculateLayout(chord.notes, { padding: 1 }));
  const uniformSize = Math.max(...layouts.map((l) => l.size), 8);
  const perRow = chordsPerRow(chords.length);

  return (
    <div className="bc-chord-group" style={{ marginBottom: 16, width: "100%" }}>
      {label && (
        <div className="bc-chord-group__label" style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
          {label}
        </div>
      )}
      <div
        className="bc-chord-group__grid"
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
            const octaves = ascendingOctaves(chord.notes, layouts[i].chordOctave);
            highlightKeys = chord.notes.map(
              (n, j) => `${normalizeNote(n)}:${octaves[j]}`,
            );
          }

          return (
          <ChordGroupCell
            key={i}
            chord={chord}
            index={i}
            perRow={perRow}
            onVariation={onVariation}
            renderVariationExtras={renderVariationExtras}
          >
            <div className="bc-chord-group__symbol" style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              {chord.symbol}
            </div>
            {display === "staff" ? (
              <StaffNotation
                notes={chord.notes}
                chordLabel={chord.symbol}
                showPlayback={showPlayback}
                scale={scale}
              />
            ) : display === "both" ? (
              <div className="bc-display-both" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <StaffNotation
                  notes={chord.notes}
                  chordLabel={chord.symbol}
                  showPlayback={false}
                  scale={scale}
                />
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
                  showNoteNames={showNoteNames}
                  noteNameMode={noteNameMode}
                  noteNameSize={noteNameSize}
                  displayNoteNames={chord.notes}
                  fingering={showFingering ? autoFingering(chord.notes) : undefined}
                  fingeringSize={fingeringSize}
                />
              </div>
            ) : (
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
                showNoteNames={showNoteNames}
                noteNameMode={noteNameMode}
                noteNameSize={noteNameSize}
                displayNoteNames={chord.notes}
                fingering={showFingering ? autoFingering(chord.notes) : undefined}
                fingeringSize={fingeringSize}
              />
            )}
            {chord.voicingStyle && (
              <div className="bc-chord-group__voicing-style" style={{ fontSize: 10, color: ui.textSubtle, marginTop: 2 }}>
                {chord.voicingStyle}
              </div>
            )}
          </ChordGroupCell>
          );
        })}
      </div>
    </div>
  );
}

interface ChordGroupCellProps {
  chord: ProgressionChord;
  index: number;
  perRow: number;
  onVariation?: OnVariation;
  renderVariationExtras?: RenderVariationExtras;
  children: ReactNode;
}

function ChordGroupCell({ chord, index, perRow, onVariation, renderVariationExtras, children }: ChordGroupCellProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastFingerprintRef = useRef<string>("");

  const buildSnapshot = (): VariationContext => ({
    chordSymbol: chord.symbol,
    chordIndex: index,
    voicingId: "default",
    notes: chord.notes,
    svgString: ref.current?.querySelector("svg")?.outerHTML ?? "",
  });

  useEffect(() => {
    if (!onVariation) return;
    const snap = buildSnapshot();
    const fp = `${snap.chordSymbol}|${snap.voicingId}|${snap.chordIndex}|${snap.notes.join(",")}|${snap.svgString.length}`;
    if (fp === lastFingerprintRef.current) return;
    lastFingerprintRef.current = fp;
    onVariation(snap);
  });

  return (
    <div
      ref={ref}
      className="bc-chord-group__item"
      style={{
        textAlign: "center",
        flex: `0 1 calc(${100 / perRow}% - ${((perRow - 1) * 12) / perRow}px)`,
        minWidth: 0,
      }}
    >
      {children}
      {renderVariationExtras?.(buildSnapshot())}
    </div>
  );
}
