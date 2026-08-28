/**
 * Chroma -> chord candidates via template correlation.
 *
 * Correlates a 12-bin chroma vector against every (root x quality) template by
 * cosine similarity and returns the best matches. Cosine similarity (rather than
 * raw dot product) keeps larger templates from being unfairly favored: a clean
 * major triad scores higher against the 3-note major template than the 4-note
 * maj7 template, so triads stay triads.
 */
import { CHORD_TEMPLATES, PITCH_CLASSES, templateVector } from "./templates.js";

export interface ChordCandidate {
  /** Root pitch class 0..11. */
  root: number;
  /** Root name, sharp spelling ("C", "C#", ...). */
  rootName: string;
  /** Quality id (see templates.ts). */
  quality: string;
  /** Human label, e.g. "minor 7th". */
  label: string;
  /** Chord-symbol suffix ("", "m", "m7", ...). */
  symbolSuffix: string;
  /** Cosine similarity in [0, 1]. */
  confidence: number;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < 12; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Rank chord candidates for a chroma vector, best first.
 * @param chroma - 12-bin chroma (any non-negative scale; need not be normalized)
 * @param topN - how many candidates to return (default 3)
 */
export function matchChord(chroma: number[], topN = 3): ChordCandidate[] {
  const candidates: Array<ChordCandidate & { _tpl: number }> = [];
  for (let root = 0; root < 12; root++) {
    CHORD_TEMPLATES.forEach((tpl, tplIndex) => {
      const score = cosine(chroma, templateVector(tpl.offsets, root));
      candidates.push({
        root,
        rootName: PITCH_CLASSES[root],
        quality: tpl.quality,
        label: tpl.label,
        symbolSuffix: tpl.symbolSuffix,
        confidence: score,
        _tpl: tplIndex,
      });
    });
  }
  // Rank by confidence; on a tie prefer the simpler/more-common quality
  // (earlier template). Many pitch-class sets are genuinely ambiguous — a rootless
  // Am7 and C6 share all four notes — so this tiebreak picks the conventional
  // reading (m7 over 6, m7b5 over m6) rather than an arbitrary root.
  candidates.sort((a, b) => b.confidence - a.confidence || a._tpl - b._tpl || a.root - b.root);
  return candidates.slice(0, topN).map(({ _tpl, ...c }) => c);
}
