import type { ChordProps, KeyboardProps } from "../types";
import { PianoKeyboard } from "./PianoKeyboard";
import { parseChordDescription } from "../parser/natural-language";
import { resolveChord } from "../resolver/chord-resolver";
import { calculateLayout } from "../resolver/auto-layout";
import type { WhiteNote } from "../types";

function isChordProps(props: ChordProps | KeyboardProps): props is ChordProps {
  return "chord" in props;
}

export function PianoChord(props: ChordProps | KeyboardProps) {
  if (!isChordProps(props)) {
    return <PianoKeyboard {...props} />;
  }

  const { chord, format, theme, highlightColor, padding, className, style } =
    props;

  const parsed = parseChordDescription(chord);
  const resolved = resolveChord(parsed.chordName, parsed.inversion);
  let { notes } = resolved;

  // Reorder notes if bass note/degree is specified ("with the 5th in the bottom")
  if (parsed.bassDegree != null) {
    const idx = parsed.bassDegree - 1;
    if (idx > 0 && idx < notes.length) {
      notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }
  } else if (parsed.bassNote) {
    const bassNorm = parsed.bassNote;
    const idx = notes.indexOf(bassNorm);
    if (idx > 0) {
      notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }
  }

  // Resolve startingDegree to a note name (1-indexed into chord notes)
  let startingNote = parsed.startingNote;
  if (!startingNote && parsed.startingDegree != null) {
    const degreeIdx = parsed.startingDegree - 1;
    if (degreeIdx >= 0 && degreeIdx < notes.length) {
      startingNote = notes[degreeIdx];
    }
  }

  const layout = calculateLayout(notes, {
    padding: padding ?? 1,
    startingNote,
    spanFrom: parsed.spanFrom,
    spanTo: parsed.spanTo,
  });

  return (
    <PianoKeyboard
      format={parsed.format ?? format}
      size={layout.size}
      startFrom={layout.startFrom as WhiteNote}
      highlightKeys={notes}
      theme={theme}
      highlightColor={highlightColor}
      className={className}
      style={style}
    />
  );
}
