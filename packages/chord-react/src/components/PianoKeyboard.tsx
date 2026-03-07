import type { KeyboardProps, HandBracket, TextSize } from "../types";
import {
  computeKeyboard, computeSvgDimensions,
  mapHighlights, normalizeNote,
  WHITE_KEY_RY, BLACK_KEY_RY,
  WHITE_KEY_WIDTH, BLACK_KEY_WIDTH,
  DEFAULT_STROKE, DEFAULT_STROKE_WIDTH,
  resolveTheme,
} from "@better-chord/core";
import { SHOW_NOTE_NAMES } from "../config";
import { PlaybackControls } from "./PlaybackControls";
import { useUITheme, resolveUITheme, UIThemeProvider } from "../ui-theme";

function renderBracket(
  keys: { note: string; octave: number; isBlack: boolean; x: number; width: number; height: number }[],
  bracket: HandBracket,
  y: number,
  bracketColor: string,
) {
  if (bracket.keyIndices.length === 0) return null;

  // Find leftmost and rightmost x positions
  const bracketKeys = bracket.keyIndices.map((i) => keys[i]).filter(Boolean);
  if (bracketKeys.length === 0) return null;

  const leftKey = bracketKeys.reduce((a, b) => (a.x < b.x ? a : b));
  const rightKey = bracketKeys.reduce((a, b) => (a.x + a.width > b.x + b.width ? a : b));

  const x1 = leftKey.x + (leftKey.isBlack ? 0 : 2);
  const x2 = rightKey.x + rightKey.width - (rightKey.isBlack ? 0 : 2);
  const midX = (x1 + x2) / 2;
  const tickH = 4;

  return (
    <g key={bracket.label}>
      {/* Horizontal beam */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={bracketColor} strokeWidth={1.5} />
      {/* Left tick */}
      <line x1={x1} y1={y - tickH} x2={x1} y2={y} stroke={bracketColor} strokeWidth={1.5} />
      {/* Right tick */}
      <line x1={x2} y1={y - tickH} x2={x2} y2={y} stroke={bracketColor} strokeWidth={1.5} />
      {/* Label */}
      <text
        x={midX}
        y={y + 11}
        textAnchor="middle"
        fontSize={10}
        fontWeight={500}
        fill={bracketColor}
        fontFamily="system-ui, sans-serif"
      >
        {bracket.label}
      </text>
    </g>
  );
}

/** Multipliers relative to the base font size (WHITE_KEY_WIDTH * 0.48, capped at 11). */
const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  base: 1,
  lg: 1.25,
  xl: 1.5,
  "2xl": 1.875,
};

function resolveAnnotationFontSize(size: TextSize = "base"): number {
  const base = Math.min(WHITE_KEY_WIDTH * 0.48, 11);
  return base * TEXT_SIZE_SCALE[size];
}

function annotationRowHeight(size: TextSize = "base"): number {
  return resolveAnnotationFontSize(size) + 3;
}

function renderAnnotations(
  keys: { note: string; octave: number; isBlack: boolean; x: number; width: number }[],
  highlightKeys: string[],
  fingering: number[] | undefined,
  hasNoteNames: boolean,
  hasFingering: boolean,
  noteNameSize: TextSize,
  fingeringSize: TextSize,
  noteNamesRowH: number,
  y: number,
  uiTokens: { text: string; textMuted: string },
) {
  const highlighted: Array<{ x: number; width: number; note: string; index: number }> = [];
  const remaining = highlightKeys.map((h, i) => {
    const colonIdx = h.indexOf(":");
    const note = colonIdx !== -1 ? normalizeNote(h.slice(0, colonIdx)) : normalizeNote(h);
    return { note, idx: i, matched: false };
  });

  for (const key of keys) {
    const keyNote = normalizeNote(key.note);
    const matchIdx = remaining.findIndex((h) => {
      if (h.matched || h.note !== keyNote) return false;
      const orig = highlightKeys[h.idx];
      if (orig.includes(":")) {
        const oct = parseInt(orig.split(":")[1], 10);
        if (oct !== key.octave) return false;
      }
      return true;
    });
    if (matchIdx !== -1) {
      remaining[matchIdx].matched = true;
      highlighted.push({
        x: key.x,
        width: key.isBlack ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH,
        note: remaining[matchIdx].note,
        index: remaining[matchIdx].idx,
      });
    }
  }

  const nameFontSize = resolveAnnotationFontSize(noteNameSize);
  const fingerFontSize = resolveAnnotationFontSize(fingeringSize);

  return (
    <g transform={`translate(0, ${y})`}>
      {hasNoteNames && highlighted.map((h, i) => (
        <text
          key={`name-${i}`}
          x={h.x + h.width / 2}
          y={nameFontSize}
          textAnchor="middle"
          fontSize={nameFontSize}
          fontWeight={600}
          fill={uiTokens.text}
          fontFamily="system-ui, sans-serif"
        >
          {h.note}
        </text>
      ))}
      {hasFingering && highlighted.map((h, i) => {
        const finger = fingering![h.index];
        if (finger == null) return null;
        return (
          <text
            key={`finger-${i}`}
            x={h.x + h.width / 2}
            y={noteNamesRowH + fingerFontSize}
            textAnchor="middle"
            fontSize={fingerFontSize}
            fontWeight={500}
            fill={uiTokens.textMuted}
            fontFamily="system-ui, sans-serif"
          >
            {finger}
          </text>
        );
      })}
    </g>
  );
}

export function PianoKeyboard({
  format = "compact",
  size = 8,
  startFrom = "C",
  highlightKeys = [],
  allNotes,
  lhNotes,
  rhOctave,
  lhOctave,
  theme,
  highlightColor,
  showPlayback = true,
  chordLabel,
  handBrackets,
  scale = 0.5,
  showNoteNames,
  noteNameSize = "base",
  fingering,
  fingeringSize = "base",
  uiTheme,
  className,
  style,
}: KeyboardProps) {
  const parentCtx = useUITheme();
  const ctx = uiTheme ? resolveUITheme(uiTheme) : parentCtx;
  const uiTokens = ctx.tokens;
  const keys = computeKeyboard(startFrom, size, format);
  const resolvedTheme = resolveTheme(theme, highlightColor);
  const fills = mapHighlights(keys, highlightKeys, resolvedTheme);
  const { width, height: keyboardHeight } = computeSvgDimensions(size, format);
  const hasPlayback = showPlayback && highlightKeys.length > 0;
  const hasBrackets = handBrackets && handBrackets.length > 0;
  const controlsHeight = hasPlayback ? 30 : 0;
  const bracketsHeight = hasBrackets ? 24 : 0;
  const resolvedShowNoteNames = showNoteNames ?? SHOW_NOTE_NAMES;
  const hasNoteNames = resolvedShowNoteNames && highlightKeys.length > 0;
  const hasFingering = fingering && fingering.length > 0;
  const noteNamesRowH = hasNoteNames ? annotationRowHeight(noteNameSize) : 0;
  const fingeringRowH = hasFingering ? annotationRowHeight(fingeringSize) : 0;
  const annotationsHeight = noteNamesRowH + fingeringRowH;
  const height = keyboardHeight + controlsHeight + bracketsHeight + annotationsHeight;
  const keysOffsetY = controlsHeight;

  const whiteKeys = keys
    .map((k, i) => ({ key: k, fill: fills[i], index: i }))
    .filter(({ key }) => !key.isBlack);
  const blackKeys = keys
    .map((k, i) => ({ key: k, fill: fills[i], index: i }))
    .filter(({ key }) => key.isBlack);

  // Position controls in top-right
  const controlsX = width - 134; // 5 buttons * 22px + 4 gaps * 4px = 126, plus margin
  const controlsY = 4;

  const svg = (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`bc-keyboard ${className ?? ""}`.trim()}
      style={{ width: "100%", maxWidth: width * scale * 2, ...style }}
      role="img"
      aria-label="Piano keyboard"
    >
      {hasPlayback && (
        <g data-controls="">
          <PlaybackControls
            notes={allNotes ?? highlightKeys}
            lhNotes={lhNotes}
            rhOctave={rhOctave}
            lhOctave={lhOctave}
            chordName={chordLabel ?? highlightKeys.join("-")}
            x={controlsX}
            y={controlsY}
          />
        </g>
      )}
      <g transform={`translate(0, ${keysOffsetY})`}>
        {whiteKeys.map(({ key, fill, index }) => (
          <rect
            key={`white-${index}`}
            x={key.x}
            y={key.y}
            width={key.width}
            height={key.height}
            rx={WHITE_KEY_RY}
            ry={WHITE_KEY_RY}
            fill={fill}
            stroke={DEFAULT_STROKE}
            strokeWidth={DEFAULT_STROKE_WIDTH}
          />
        ))}
        {blackKeys.map(({ key, fill, index }) => (
          <rect
            key={`black-${index}`}
            x={key.x}
            y={key.y}
            width={key.width}
            height={key.height}
            rx={BLACK_KEY_RY}
            ry={BLACK_KEY_RY}
            fill={fill}
            stroke={DEFAULT_STROKE}
            strokeWidth={DEFAULT_STROKE_WIDTH}
          />
        ))}
      </g>
      {hasBrackets && (
        <g transform={`translate(0, ${keysOffsetY + keyboardHeight + 6})`}>
          {handBrackets!.map((b) => renderBracket(keys, b, 0, uiTokens.bracketColor))}
        </g>
      )}
      {(hasNoteNames || hasFingering) && renderAnnotations(
        keys, highlightKeys, fingering, hasNoteNames, !!hasFingering,
        noteNameSize, fingeringSize, noteNamesRowH,
        keysOffsetY + keyboardHeight + bracketsHeight + 2,
        uiTokens,
      )}
    </svg>
  );

  return uiTheme ? <UIThemeProvider value={ctx}>{svg}</UIThemeProvider> : svg;
}
