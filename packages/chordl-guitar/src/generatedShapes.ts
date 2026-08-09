/**
 * Generated (not stored) shapes: bass root-fifth-octave patterns and violin
 * first-position placements.
 *
 * chords-db covers guitar and ukulele only, and neither instrument here wants
 * a database anyway:
 *
 * - A bass line is built from patterns, not strummed chords. The teachable
 *   unit is the root-fifth-octave shape, which is the same movable pattern
 *   for every root — so it is computed from the root, and the computation IS
 *   the lesson.
 * - Violin chord tones in first position are fully determined by the tuning
 *   and the first-position reach (open + four fingers ≈ 0-7 semitones above
 *   the open string). Given a chord's pitch classes, each string's nearest
 *   chord tone is arithmetic, not curation.
 *
 * Both return svguitar `Chord` objects so they render through exactly the
 * same pipeline as the chords-db shapes.
 */

import type { Chord } from "svguitar";

const PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

/**
 * Bass root-fifth-octave shape for one root.
 *
 * The root goes on the E string when it lies within the first four frets
 * (E, F, F#, G, G#), otherwise on the A string, and the diagram window
 * slides to the root when the pattern would not fit against the nut
 * (chords-db convention, matching `dbPositionToChord`: `position` is the
 * window's first fret and finger frets are window-relative). That is also
 * how the pattern is taught: find the root, walk the same two-string
 * triangle from it — D at the 5th fret is the same shape as F at the 1st.
 *
 * svguitar strings are numbered from the highest pitch: 1=G, 2=D, 3=A, 4=E.
 * Fingers carry the conventional one-finger-per-fret labels (root 1,
 * fifth 3, octave 4); an open root leaves the marker label off, since
 * svguitar renders fret 0 as a nut ring with no text.
 */
export function bassShapeFor(root: string): Chord | null {
  const pc = PC[root];
  if (pc === undefined) return null;

  const fretOnE = (pc - PC.E + 12) % 12;
  const onEString = fretOnE <= 4;
  const rootFret = onEString ? fretOnE : (pc - PC.A + 12) % 12;

  // [rootString, fifthString, octaveString] in svguitar numbering.
  const [rootS, fifthS, octaveS] = onEString ? [4, 3, 2] : [3, 2, 1];
  const mutedS = onEString ? 1 : 4;

  // Fits against the nut? Draw absolute. Otherwise slide the window to the
  // root fret and speak window-relative, like every chords-db position.
  const slide = rootFret + 2 > 6;
  const position = slide ? rootFret : 1;
  const rel = (abs: number): number => (slide ? abs - rootFret + 1 : abs);

  const finger = (s: number, f: number, label: string): Chord["fingers"][number] =>
    f === 0 ? [s, 0] : [s, f, label];

  return {
    fingers: [
      finger(rootS, rel(rootFret), "1"),
      finger(fifthS, rel(rootFret + 2), "3"),
      finger(octaveS, rel(rootFret + 2), "4"),
      [mutedS, "x"],
    ],
    barres: [],
    position,
  };
}

/**
 * First-position reach: how far above the open string each violin finger
 * falls, in semitones. Low/high placements share a finger — offset 1 or 2 is
 * first finger, 3 or 4 second, and so on — which is exactly how first
 * position is named on a fingering chart.
 */
function violinFingerFor(offset: number): string | null {
  if (offset === 0) return null; // open string: nut ring, no label
  if (offset <= 2) return "1";
  if (offset <= 4) return "2";
  if (offset <= 6) return "3";
  return "4"; // offset 7 — fourth finger, the octave of the next string down
}

const FIRST_POSITION_REACH = 7;

/**
 * Violin first-position shape for a chord's pitch classes.
 *
 * For each string (G, D, A, E), take the chord tone with the smallest
 * semitone offset within first position. Every triad this library handles
 * has its largest pitch-class gap under the 8-semitone reach, so each string
 * always finds a tone — the null return is for an unknown pitch class, not a
 * missing placement. The result is one sounded chord tone per string, which
 * is how a chord is realised on a bowed instrument (as double-stop pairs in
 * practice, but the card teaches where the tones live).
 *
 * The diagram's "fret" axis is semitones above the open string; markers are
 * labelled with VIOLIN finger numbers via `violinFingerFor`, not guitar
 * fingerings.
 */
export function violinShapeFor(pitchClasses: string[]): Chord | null {
  const tones = pitchClasses.map((p) => PC[p]);
  if (tones.some((t) => t === undefined) || tones.length === 0) return null;

  // Low to high: G D A E; svguitar numbering: 4=G, 3=D, 2=A, 1=E.
  const strings: Array<{ svguitarString: number; openPc: number }> = [
    { svguitarString: 4, openPc: PC.G },
    { svguitarString: 3, openPc: PC.D },
    { svguitarString: 2, openPc: PC.A },
    { svguitarString: 1, openPc: PC.E },
  ];

  const fingers: Chord["fingers"] = [];
  for (const { svguitarString, openPc } of strings) {
    let best: number | null = null;
    for (const tone of tones) {
      const offset = (tone - openPc + 12) % 12;
      if (offset <= FIRST_POSITION_REACH && (best === null || offset < best)) {
        best = offset;
      }
    }
    if (best === null) {
      // No chord tone reachable on this string in first position; mark it
      // silent rather than inventing a placement outside the position.
      fingers.push([svguitarString, "x"]);
      continue;
    }
    const label = violinFingerFor(best);
    fingers.push(label ? [svguitarString, best, label] : [svguitarString, best]);
  }

  return { fingers, barres: [] };
}
