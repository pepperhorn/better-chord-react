/**
 * Types for forward-only score follow-along (page turning).
 *
 * This is the second, not-yet-wired consumer described in the design handover:
 * match a live-detected chord stream against a known expected sequence to drive
 * automatic page turns. It is sequence alignment, NOT beat tracking — no tempo,
 * no beat grid, just "which chord in the known list did we just play."
 */

export interface ExpectedChord {
  /** Canonical chord symbol from chordl's resolver, e.g. "Dm7". */
  chord: string;
  /** Page this chord appears on. */
  page: number;
  /** Optional measure, for debugging/display only. */
  measure?: number;
}

export interface FollowerConfig {
  sequence: ExpectedChord[];
  /** Chords ahead of the cursor to search for a match (default 3). */
  lookahead?: number;
  /** Consecutive agreeing detections before advancing (default 2). */
  confirmFrames?: number;
}

export interface FollowResult {
  /** True when the cursor advanced to a new position. */
  advanced: boolean;
  /** New page — only set when the advance crossed a page boundary. */
  page?: number;
}
