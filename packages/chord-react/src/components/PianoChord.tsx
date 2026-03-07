import { Note } from "tonal";
import type { ChordProps, KeyboardProps, HandBracket } from "../types";
import { PianoKeyboard } from "./PianoKeyboard";
import { parseChordDescription } from "../parser/natural-language";
import { resolveChord } from "../resolver/chord-resolver";
import { calculateLayout } from "../resolver/auto-layout";
import { computeKeyboard } from "../engine/keyboard-layout";
import { normalizeNote } from "../engine/highlight-mapper";
import { FLAT_TO_SHARP, WHITE_NOTE_ORDER } from "../engine/svg-constants";
import { findVoicing, voicingPitchClasses, mapToVoicingQuality } from "@better-chord/voicings";
import { autoFingering } from "../engine/auto-fingering";
import type { WhiteNote } from "../types";
import type { ProgressionChord } from "../progression";
import { ChordGroup } from "./ChordGroup";
import { resolveUITheme, UIThemeProvider } from "../ui-theme";

/**
 * Map semitones (mod 12) from root to a scale degree number.
 * Handles both major and minor variants of each degree.
 */
function semitonesToDegree(semitones: number): number {
  const s = ((semitones % 12) + 12) % 12;
  if (s === 0) return 1;
  if (s <= 2) return 2;   // m2=1, M2=2 (also 9th)
  if (s <= 4) return 3;   // m3=3, M3=4
  if (s === 5) return 4;  // P4=5 (also 11th)
  if (s <= 7) return 5;   // d5=6, P5=7
  if (s <= 9) return 6;   // m6=8, M6=9 (also 13th)
  return 7;               // m7=10, M7=11
}

const DEGREE_NAMES: Record<number, string> = {
  1: "root", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th",
  9: "9th", 11: "11th", 13: "13th",
};

/**
 * Find the chord tone matching a musical degree, regardless of quality.
 * e.g. degree 3 finds Eb in Cm7 and E in Cmaj7.
 */
function degreeToNote(root: string, degree: number, notes: string[]): string | undefined {
  const rootMidi = Note.midi(`${root}4`);
  if (rootMidi == null) return undefined;

  // Normalize compound degrees: 9→2, 11→4, 13→6
  const simpleDegree = degree > 7 ? degree - 7 : degree;

  for (const note of notes) {
    const noteMidi = Note.midi(`${note}4`);
    if (noteMidi == null) continue;
    const semitones = ((noteMidi - rootMidi) % 12 + 12) % 12;
    if (semitonesToDegree(semitones) === simpleDegree) return note;
  }

  return undefined;
}

/** Format the available degrees for error messages */
function describeAvailableDegrees(root: string, notes: string[]): string {
  const rootMidi = Note.midi(`${root}4`);
  if (rootMidi == null) return notes.join(", ");

  const degrees: string[] = [];
  for (const note of notes) {
    const noteMidi = Note.midi(`${note}4`);
    if (noteMidi == null) continue;
    const semitones = ((noteMidi - rootMidi) % 12 + 12) % 12;
    const deg = semitonesToDegree(semitones);
    const name = DEGREE_NAMES[deg] ?? `${deg}th`;
    degrees.push(`${name} (${note})`);
  }
  return degrees.join(", ");
}

function isChordProps(props: ChordProps | KeyboardProps): props is ChordProps {
  return "chord" in props;
}

export function PianoChord(props: ChordProps | KeyboardProps) {
  if (!isChordProps(props)) {
    return <PianoKeyboard {...props} />;
  }

  const { chord, format, theme, highlightColor, padding, scale, uiTheme, className, style } =
    props;
  const uiCtx = resolveUITheme(uiTheme);

  const parsed = parseChordDescription(chord);
  const resolved = resolveChord(parsed.chordName, parsed.inversion);

  // All inversions: render a ChordGroup with root position + each inversion
  if (parsed.allInversions) {
    const numNotes = resolved.notes.length;
    const INVERSION_LABELS = ["Root position", "1st inversion", "2nd inversion", "3rd inversion", "4th inversion"];
    const chords: ProgressionChord[] = [];
    for (let inv = 0; inv < numNotes; inv++) {
      const invNotes = [...resolved.notes.slice(inv), ...resolved.notes.slice(0, inv)];
      chords.push({
        symbol: INVERSION_LABELS[inv] ?? `${inv}th inversion`,
        root: resolved.root,
        notes: invNotes,
      });
    }
    const resolvedFormat = parsed.format ?? format;
    return (
      <UIThemeProvider value={uiCtx}>
        <ChordGroup
          chords={chords}
          label={parsed.chordName}
          format={resolvedFormat}
          theme={theme}
          highlightColor={highlightColor}
          showPlayback
          scale={scale}
        />
      </UIThemeProvider>
    );
  }

  let { notes } = resolved;

  // If a style hint is present, try the voicing library for richer voicings
  if (parsed.styleHint) {
    const quality = mapToVoicingQuality(resolved.type, resolved.notes);
    if (quality) {
      const voicing = findVoicing(quality, parsed.styleHint);
      if (voicing) {
        const pitchClasses = voicingPitchClasses(resolved.root, voicing);
        if (pitchClasses.length > 0) {
          notes = pitchClasses;
        }
      }
    }
  }

  // Resolve bass note for "over X" / "with X in the bass" → separate LH keyboard
  let lhBassNote: string | undefined;
  if (parsed.bassDegree != null) {
    const available = describeAvailableDegrees(resolved.root, notes);
    const bassNote = degreeToNote(resolved.root, parsed.bassDegree, notes);
    if (!bassNote) {
      const name = DEGREE_NAMES[parsed.bassDegree] ?? `${parsed.bassDegree}th`;
      throw new Error(
        `${parsed.chordName} doesn't have a ${name} — try: ${available}`
      );
    }
    lhBassNote = bassNote;
  } else if (parsed.bassNote) {
    lhBassNote = FLAT_TO_SHARP[parsed.bassNote] ?? parsed.bassNote;
  }

  // Resolve startingDegree/startingNote: rotate voicing so that note is lowest
  let startingNote = parsed.startingNote;
  if (!startingNote && parsed.startingDegree != null) {
    const available = describeAvailableDegrees(resolved.root, notes);
    startingNote = degreeToNote(resolved.root, parsed.startingDegree, notes);
    if (!startingNote) {
      const name = DEGREE_NAMES[parsed.startingDegree] ?? `${parsed.startingDegree}th`;
      throw new Error(
        `${parsed.chordName} doesn't have a ${name} — try: ${available}`
      );
    }
  }
  if (startingNote) {
    const norm = FLAT_TO_SHARP[startingNote] ?? startingNote;
    const idx = notes.indexOf(norm);
    if (idx < 0) {
      const available = describeAvailableDegrees(resolved.root, notes);
      throw new Error(
        `${startingNote} isn't in ${parsed.chordName} — the notes are: ${available}`
      );
    }
    if (idx > 0) {
      notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }
  }

  const layoutPadding = parsed.padding ?? padding ?? 1;
  const resolvedFormat = parsed.format ?? format;

  // Resolve fingering: explicit numbers take priority, then auto if requested
  let resolvedFingering = parsed.fingering;
  if (!resolvedFingering && parsed.autoFingering) {
    if (lhBassNote) {
      // LH gets one finger, RH gets auto-fingered
      const lhFinger = autoFingering([lhBassNote], "lh");
      const rhFinger = autoFingering(notes, "rh");
      resolvedFingering = [...lhFinger, ...rhFinger];
    } else {
      resolvedFingering = autoFingering(notes, "rh");
    }
  }

  // Single continuous keyboard with LH + RH brackets
  if (lhBassNote) {
    const lhNorm = normalizeNote(lhBassNote);
    const lhWhiteKey = lhNorm.replace("#", "") as WhiteNote;
    const lhWhiteIdx = WHITE_NOTE_ORDER.indexOf(lhWhiteKey);

    // RH note positions relative to LH
    // Default: one full octave above LH. Shifts adjust this.
    // "chord down" reduces gap, "bass up" also reduces gap (from the other side)
    const octaveGap = 1 + (parsed.chordOctaveShift ?? 0) - (parsed.bassOctaveShift ?? 0);
    const rhOctaveOffset = Math.max(octaveGap, 0) * 7; // in white keys (0 = adjacent)
    const rhOffsets = notes.map((n) => {
      const norm = normalizeNote(n);
      const whiteKey = norm.replace("#", "") as WhiteNote;
      const whiteIdx = WHITE_NOTE_ORDER.indexOf(whiteKey);
      let offset = whiteIdx - lhWhiteIdx;
      if (offset <= 0) offset += 7; // wrap within octave
      return offset + rhOctaveOffset;
    });
    const maxRhOffset = Math.max(...rhOffsets);

    // Keyboard start: one padding step below LH note
    const startIdx = ((lhWhiteIdx - layoutPadding) % 7 + 7) % 7;
    const startNote = WHITE_NOTE_ORDER[startIdx] as WhiteNote;
    const lhPositionOnKb = ((lhWhiteIdx - startIdx) % 7 + 7) % 7;
    const kbSize = Math.max(lhPositionOnKb + maxRhOffset + layoutPadding + 1, 10);

    // Compute the keyboard to get octave info for each key
    const tempKeys = computeKeyboard(startNote, kbSize, resolvedFormat);

    // Find the LH key index and its relative octave
    const lhKeyIdx = tempKeys.findIndex((k) => normalizeNote(k.note) === lhNorm);
    const lhOctave = lhKeyIdx >= 0 ? tempKeys[lhKeyIdx].octave : 0;
    // RH octave relative to LH, adjusted by chordOctaveShift
    const rhBaseOctave = lhOctave + Math.max(octaveGap, 0);

    const lhHighlights = [`${lhNorm}:${lhOctave}`];
    const rhHighlights = notes.map((n) => {
      const norm = normalizeNote(n);
      const whiteKey = norm.replace("#", "") as WhiteNote;
      const whiteIdx = WHITE_NOTE_ORDER.indexOf(whiteKey);
      // Notes above LH in pitch class order (before the next C) are in rhBaseOctave;
      // notes at or below LH (wrapped past C) are in rhBaseOctave + 1
      const isAboveLhBeforeC = whiteIdx > lhWhiteIdx;
      const noteOctave = isAboveLhBeforeC ? rhBaseOctave : rhBaseOctave + 1;
      return `${norm}:${noteOctave}`;
    });
    const allHighlights = [...lhHighlights, ...rhHighlights];

    // Find key indices for bracket annotations
    const lhKeyIndices: number[] = [];
    const rhKeyIndices: number[] = [];
    const remaining = allHighlights.map((h, i) => {
      const [note, oct] = h.split(":");
      return { note, octave: parseInt(oct, 10), isLH: i < lhHighlights.length, matched: false };
    });

    for (let ki = 0; ki < tempKeys.length; ki++) {
      const keyNote = normalizeNote(tempKeys[ki].note);
      const keyOctave = tempKeys[ki].octave;
      const matchIdx = remaining.findIndex(
        (h) => !h.matched && h.note === keyNote && h.octave === keyOctave
      );
      if (matchIdx !== -1) {
        remaining[matchIdx].matched = true;
        (remaining[matchIdx].isLH ? lhKeyIndices : rhKeyIndices).push(ki);
      }
    }

    const handBrackets: HandBracket[] = [
      { label: "L.H.", keyIndices: lhKeyIndices },
      { label: "R.H.", keyIndices: rhKeyIndices },
    ];

    // Playback octaves: LH default 3, RH default 4, adjusted by shifts
    const lhPlaybackOctave = 3 + (parsed.bassOctaveShift ?? 0);
    const rhPlaybackOctave = 4 + (parsed.chordOctaveShift ?? 0);

    return (
      <UIThemeProvider value={uiCtx}>
        <PianoKeyboard
          format={resolvedFormat}
          size={kbSize}
          startFrom={startNote}
          highlightKeys={allHighlights}
          allNotes={[lhBassNote, ...notes]}
          lhNotes={[lhBassNote]}
          lhOctave={lhPlaybackOctave}
          rhOctave={rhPlaybackOctave}
          theme={theme}
          highlightColor={highlightColor}
          chordLabel={parsed.chordName}
          handBrackets={handBrackets}
          scale={scale}
          showNoteNames={parsed.showNoteNames}
          noteNameSize={parsed.noteNameSize}
          fingering={resolvedFingering}
          fingeringSize={parsed.fingeringSize}
          className={className}
          style={style}
        />
      </UIThemeProvider>
    );
  }

  const layout = calculateLayout(notes, {
    padding: layoutPadding,
    startingNote,
    spanFrom: parsed.spanFrom,
    spanTo: parsed.spanTo,
  });

  // When padding pushes notes into a higher octave region, use octave-qualified
  // highlights to avoid greedy matching against duplicate notes in the padding zone.
  let highlightKeys: string[] = notes;
  if (layout.chordOctave > 0) {
    let octave = layout.chordOctave;
    const firstNorm = normalizeNote(notes[0]);
    const firstWhiteIdx = WHITE_NOTE_ORDER.indexOf(
      firstNorm.replace("#", "") as WhiteNote
    );
    let prevWhiteIdx = firstWhiteIdx;

    highlightKeys = notes.map((n, i) => {
      const norm = normalizeNote(n);
      const whiteKey = norm.replace("#", "") as WhiteNote;
      const whiteIdx = WHITE_NOTE_ORDER.indexOf(whiteKey);
      if (i > 0 && whiteIdx <= prevWhiteIdx) {
        octave++;
      }
      prevWhiteIdx = whiteIdx;
      return `${norm}:${octave}`;
    });
  }

  return (
    <UIThemeProvider value={uiCtx}>
      <PianoKeyboard
        format={resolvedFormat}
        size={layout.size}
        startFrom={layout.startFrom as WhiteNote}
        highlightKeys={highlightKeys}
        theme={theme}
        highlightColor={highlightColor}
        chordLabel={parsed.chordName}
        scale={scale}
        showNoteNames={parsed.showNoteNames}
        noteNameSize={parsed.noteNameSize}
        fingering={resolvedFingering}
        fingeringSize={parsed.fingeringSize}
        className={className}
        style={style}
      />
    </UIThemeProvider>
  );
}
