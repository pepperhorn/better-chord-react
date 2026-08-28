import { useMemo } from "react";
import type { CSSProperties } from "react";
import { parseChordDescription, isProgressionRequest } from "@pepperhorn/chordl-core";

/**
 * The seven qualities a learner meets first, ordered by how often they meet
 * them rather than by theory. Triads and sevenths deliberately mix: this is a
 * shortcut, not a taxonomy, and typing still reaches everything the resolver
 * supports.
 */
export const QUALITY_SHORTCUTS = ["m", "7", "maj7", "m7", "dim", "aug", "sus4"] as const;

export type QualityShortcut = (typeof QUALITY_SHORTCUTS)[number];

export interface ChordQualityPickerProps {
  /** The current editor input, verbatim. */
  input: string;
  /** Called with the rewritten input when a quality is picked. */
  onPick: (nextInput: string) => void;
  /** Extra classes on the strip, for hosts that lay it out themselves. */
  className?: string;
}

/** A bare root: a letter and an optional accidental, nothing else. */
const BARE_ROOT = /^[A-G][#b]?$/;

/** A standalone note token anywhere in the raw input. */
const NOTE_TOKEN = /(?:^|[\s,])([A-Ga-g][#b]?)(?=[\s,]|$)/g;

/**
 * Write the quality onto the root where it stands, keeping the rest of what the
 * user typed.
 *
 * Replacing the whole input with `root + quality` was simpler and wrong: "C in
 * second inversion" parses to a bare root, so the strip shows, and one click
 * threw the inversion away. Anything the picker cannot locate falls back to the
 * plain chord — better a bare chord than a mangled sentence.
 */
export function applyQuality(input: string, root: string, quality: string): string {
  const escaped = root.replace(/[#]/g, "\\#");
  const token = new RegExp(`(^|[^A-Za-z#b])(${escaped})(?![A-Za-z#b])`, "g");
  let last: RegExpExecArray | null = null;
  for (let m = token.exec(input); m; m = token.exec(input)) last = m;
  if (!last) return `${root}${quality}`;
  const at = last.index + last[1].length;
  return input.slice(0, at) + root + quality + input.slice(at + root.length);
}

/**
 * Decide whether a bare-root shortcut applies to this input.
 *
 * The check is on the *parsed* chord name, not the raw text, so "show me an A"
 * gets the same strip as "A". The one thing the parse cannot settle is a note
 * list: `parseChordDescription("C E G")` reports a chord name of "C", which
 * looks exactly like a bare root. Counting the standalone note tokens in the
 * raw input is what separates them.
 */
export function bareRootOf(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (isProgressionRequest(raw)) return null;

  let parsed;
  try {
    parsed = parseChordDescription(raw);
  } catch {
    return null;
  }
  if (parsed.isScale) return null;
  if (!parsed.chordName || !BARE_ROOT.test(parsed.chordName)) return null;

  const noteTokens = raw.match(NOTE_TOKEN) ?? [];
  if (noteTokens.length > 1) return null;

  return parsed.chordName;
}

/**
 * Quality shortcuts for a bare root.
 *
 * Renders nothing unless the input resolves to a bare root — a chord that
 * already names its quality needs no shortcut, and a scale, progression or note
 * list is not a chord at all. Picking rewrites the editor input rather than
 * rendering in place, so add-to-board, annotations, octave shift and board
 * editing all keep working with no new plumbing.
 */
export function ChordQualityPicker({ input, onPick, className }: ChordQualityPickerProps) {
  const root = useMemo(() => bareRootOf(input), [input]);
  if (!root) return null;

  const btnStyle: CSSProperties = {
    padding: "4px 12px",
    fontSize: "0.8rem",
    fontFamily: "inherit",
    border: "1px solid var(--btn-border, #ddd)",
    borderRadius: 14,
    background: "var(--pill-bg, #fff)",
    color: "inherit",
    cursor: "pointer",
  };

  return (
    <div
      className={`chord-quality-strip ${className ?? ""}`.trim()}
      role="group"
      aria-label={`Chord qualities for ${root}`}
      style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}
    >
      {QUALITY_SHORTCUTS.map((quality) => (
        <button
          key={quality}
          type="button"
          className="btn-quality"
          style={btnStyle}
          onClick={() => onPick(applyQuality(input, root, quality))}
          title={`${root}${quality}`}
        >
          {quality}
        </button>
      ))}
    </div>
  );
}
