import type { ExpectedChord, FollowerConfig, FollowResult } from "./types";

/**
 * Forward-only sequence follower for automatic page turning.
 *
 * Design rationale (preserved from the handover):
 * - **Forward-only window search** prevents wild jumps from a single misread or
 *   passing tone — we only look at the current position plus a few chords ahead.
 * - **No match in the window is not an error** — the cursor just stays put; a
 *   spurious detection is ignored rather than treated as a fault.
 * - **`confirmFrames` gate** prevents one glitchy detection from turning a page.
 * - **A page is emitted only when the cursor crosses a page boundary**, since the
 *   viewer only cares about page changes, not every chord match.
 *
 * The page-turning consumer is `FollowAlongOverlay` in `@pepperhorn/chordl-react`,
 * which drives this core from the live mic stream.
 */
export class SequenceFollower {
  private cursor = 0;
  private pendingMatch: { index: number; count: number } | null = null;

  constructor(private readonly config: FollowerConfig) {}

  /** Current position in the sequence. */
  get position(): number {
    return this.cursor;
  }

  onChordDetected(chord: string): FollowResult {
    const { sequence, lookahead = 3, confirmFrames = 2 } = this.config;

    // Search the current position plus a small forward window.
    const window = sequence.slice(this.cursor, this.cursor + 1 + lookahead);
    const matchOffset = window.findIndex((e) => e.chord === chord);

    if (matchOffset <= 0) {
      // No match, or it matches the current position — no advance.
      this.pendingMatch = null;
      return { advanced: false };
    }

    const targetIndex = this.cursor + matchOffset;
    if (this.pendingMatch?.index === targetIndex) {
      this.pendingMatch.count++;
    } else {
      this.pendingMatch = { index: targetIndex, count: 1 };
    }

    if (this.pendingMatch.count >= confirmFrames) {
      const prevPage = sequence[this.cursor].page;
      this.cursor = targetIndex;
      this.pendingMatch = null;
      const newPage = sequence[this.cursor].page;
      return { advanced: true, page: newPage !== prevPage ? newPage : undefined };
    }

    return { advanced: false };
  }

  /** Reset to the start of the sequence. */
  reset(): void {
    this.cursor = 0;
    this.pendingMatch = null;
  }
}

export type { ExpectedChord, FollowerConfig, FollowResult };
