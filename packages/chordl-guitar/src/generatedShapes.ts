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
 * Bass root-fifth-octave shape for one root, placed where it sounds good.
 *
 * The root always lands FRETTED between the 3rd and 9th fret — never on an
 * open string and never crammed against the nut. Two reasons, both audible:
 * open-position roots boom and mud on a bass, and the whole point of the
 * pattern is that it is movable, which an open string breaks (you cannot
 * slide an open E up a tone). E string is preferred when its root fret sits
 * in the sweet range; otherwise the A string's does (every root lands in
 * 3-9 on one of the two).
 *
 * The window slides to the root (chords-db convention, matching
 * `dbPositionToChord`: `position` is the window's first fret, finger frets
 * window-relative) — D at the 5th fret is the same shape as G at the 3rd.
 *
 * svguitar strings are numbered from the highest pitch: 1=G, 2=D, 3=A, 4=E.
 * Fingers carry the conventional one-finger-per-fret labels: root 1,
 * fifth 3, octave 4.
 */
const BASS_SWEET_LOW = 3;
const BASS_SWEET_HIGH = 9;

export function bassShapeFor(root: string): Chord | null {
  const pc = PC[root];
  if (pc === undefined) return null;

  const fretOnE = (pc - PC.E + 12) % 12;
  const fretOnA = (pc - PC.A + 12) % 12;
  const sweet = (f: number) => f >= BASS_SWEET_LOW && f <= BASS_SWEET_HIGH;
  const onEString = sweet(fretOnE) || !sweet(fretOnA);
  const rootFret = onEString ? fretOnE : fretOnA;

  // [rootString, fifthString, octaveString] in svguitar numbering.
  const [rootS, fifthS, octaveS] = onEString ? [4, 3, 2] : [3, 2, 1];
  const mutedS = onEString ? 1 : 4;

  // Slide the window to the root whenever the pattern outgrows the nut view.
  const slide = rootFret + 2 > 6;
  const position = slide ? rootFret : 1;
  const rel = (abs: number): number => (slide ? abs - rootFret + 1 : abs);

  return {
    fingers: [
      [rootS, rel(rootFret), "1"],
      [fifthS, rel(rootFret + 2), "3"],
      [octaveS, rel(rootFret + 2), "4"],
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
 * The placement is chosen across all four strings at once, not string by
 * string. Picking each string's *nearest* chord tone independently is the
 * obvious approach and it is wrong: on A major the G string's nearest tone is
 * A, the D string's is E, and both open strings are already A and E, so the
 * card sounds A-E-A-E and the third never appears. That greedy version
 * silently dropped a chord tone in 32 of the 60 chords this library generates,
 * including the root of C7, B7 and F#7. A chord card that omits the third is
 * not teaching the chord.
 *
 * So: enumerate every assignment (each string plays one reachable chord tone
 * or is silent) and rank them by
 *   1. how many DISTINCT chord tones sound — the thing that was broken;
 *   2. how many strings sound at all — prefer a fuller chord;
 *   3. total semitone offset — prefer the lower, easier hand shape;
 *   4. the offsets read low-string-first, purely so the result is stable.
 * Four strings with at most five options each is 625 combinations at worst,
 * so the exhaustive search costs nothing and removes the whole class of bug.
 *
 * A tone can still be unreachable — with only 0-7 semitones above four fixed
 * open strings, not every chord fits — so criterion 1 maximises coverage
 * rather than guaranteeing it. `violinCoverage` reports what was achieved.
 *
 * The diagram's "fret" axis is semitones above the open string; markers are
 * labelled with VIOLIN finger numbers via `violinFingerFor`, not guitar
 * fingerings.
 */
export function violinShapeFor(pitchClasses: string[]): Chord | null {
  const tones = pitchClasses.map((p) => PC[p]);
  if (tones.some((t) => t === undefined) || tones.length === 0) return null;
  const wanted = [...new Set(tones)];

  // Low to high: G D A E; svguitar numbering: 4=G, 3=D, 2=A, 1=E.
  const strings: Array<{ svguitarString: number; openPc: number }> = [
    { svguitarString: 4, openPc: PC.G },
    { svguitarString: 3, openPc: PC.D },
    { svguitarString: 2, openPc: PC.A },
    { svguitarString: 1, openPc: PC.E },
  ];

  // Per string: every reachable chord tone, plus silence. Within a 0-7 window
  // a pitch class occurs at most once, so one offset per tone per string.
  const choices = strings.map(({ openPc }) => {
    const opts: Array<{ offset: number; tone: number } | null> = [];
    for (const tone of wanted) {
      const offset = (tone - openPc + 12) % 12;
      if (offset <= FIRST_POSITION_REACH) opts.push({ offset, tone });
    }
    opts.push(null); // silent — better than inventing a placement out of position
    return opts;
  });

  type Pick = { offset: number; tone: number } | null;

  // Cartesian product of the per-string options. Four strings, at most five
  // options each — 625 combinations at the absolute worst.
  let combos: Pick[][] = [[]];
  for (const opts of choices) {
    const next: Pick[][] = [];
    for (const combo of combos) for (const opt of opts) next.push([...combo, opt]);
    combos = next;
  }

  let best: { picks: Pick[]; score: number[] } | null = null;
  for (const picks of combos) {
    const sounded = picks.filter((p): p is NonNullable<Pick> => p !== null);
    const covered = new Set(sounded.map((p) => p.tone)).size;
    const total = sounded.reduce((n, p) => n + p.offset, 0);
    // Negated where higher is better, so the whole score compares smallest-first.
    const score = [
      -covered,
      -sounded.length,
      total,
      ...picks.map((p) => (p === null ? 99 : p.offset)),
    ];
    if (best === null || lessThan(score, best.score)) best = { picks, score };
  }
  if (best === null) return null;

  const fingers: Chord["fingers"] = best.picks.map((pick, i) => {
    const s = strings[i].svguitarString;
    if (pick === null) return [s, "x"];
    const label = violinFingerFor(pick.offset);
    return label ? [s, pick.offset, label] : [s, pick.offset];
  });

  return { fingers, barres: [] };
}

/**
 * Which of a chord's pitch classes the first-position shape actually sounds.
 *
 * Exists so callers and tests can assert coverage instead of trusting it —
 * the bug this replaced was invisible precisely because nothing measured it.
 */
export function violinCoverage(
  pitchClasses: string[],
): { sounded: number[]; missing: number[] } | null {
  const shape = violinShapeFor(pitchClasses);
  if (shape === null) return null;
  const wanted = [...new Set(pitchClasses.map((p) => PC[p]))];
  const openPcs = [PC.E, PC.A, PC.D, PC.G]; // svguitar string 1..4
  const sounded = new Set<number>();
  for (const f of shape.fingers) {
    if (f[1] === "x") continue;
    sounded.add((openPcs[Number(f[0]) - 1] + Number(f[1])) % 12);
  }
  return {
    sounded: [...sounded].sort((a, b) => a - b),
    missing: wanted.filter((t) => !sounded.has(t)).sort((a, b) => a - b),
  };
}

/** Lexicographic compare for the ranking tuple above. */
function lessThan(a: number[], b: number[]): boolean {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
