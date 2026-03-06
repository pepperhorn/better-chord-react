import type { KeyboardProps } from "../types";
import { computeKeyboard, computeSvgDimensions } from "../engine/keyboard-layout";
import { mapHighlights } from "../engine/highlight-mapper";
import { resolveTheme } from "../themes";
import {
  WHITE_KEY_RY,
  BLACK_KEY_RY,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
} from "../engine/svg-constants";
import { PlaybackControls } from "./PlaybackControls";

export function PianoKeyboard({
  format = "compact",
  size = 8,
  startFrom = "C",
  highlightKeys = [],
  theme,
  highlightColor,
  showPlayback = true,
  chordLabel,
  className,
  style,
}: KeyboardProps) {
  const keys = computeKeyboard(startFrom, size, format);
  const resolvedTheme = resolveTheme(theme, highlightColor);
  const fills = mapHighlights(keys, highlightKeys, resolvedTheme);
  const { width, height: keyboardHeight } = computeSvgDimensions(size, format);
  const hasPlayback = showPlayback && highlightKeys.length > 0;
  const controlsHeight = hasPlayback ? 30 : 0;
  const height = keyboardHeight + controlsHeight;
  const keysOffsetY = controlsHeight;

  const whiteKeys = keys
    .map((k, i) => ({ key: k, fill: fills[i], index: i }))
    .filter(({ key }) => !key.isBlack);
  const blackKeys = keys
    .map((k, i) => ({ key: k, fill: fills[i], index: i }))
    .filter(({ key }) => key.isBlack);

  // Position controls in top-right
  const controlsX = width - 78; // 3 buttons * 22px + 2 gaps * 4px = 74, plus margin
  const controlsY = 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ maxWidth: width, ...style }}
      role="img"
      aria-label="Piano keyboard"
    >
      {hasPlayback && (
        <PlaybackControls
          notes={highlightKeys}
          chordName={chordLabel ?? highlightKeys.join("-")}
          x={controlsX}
          y={controlsY}
        />
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
    </svg>
  );
}
