/**
 * Debounce a noisy per-frame chord stream into stable "chord changed" events.
 *
 * A raw detector emits a best-guess candidate every audio frame; those flicker.
 * The stabilizer only emits a chord once the same candidate has held for
 * `confirmFrames` consecutive frames above `minConfidence`, and only when it
 * differs from the last emitted chord — so a held chord fires once, not every
 * frame, and passing/misread frames are ignored.
 */
import type { ChordCandidate } from "./templateMatch.js";

export interface StabilizerConfig {
  /** Consecutive agreeing frames required before emitting (default 3). */
  confirmFrames?: number;
  /** Minimum candidate confidence to count a frame (default 0.85). */
  minConfidence?: number;
}

export interface StabilizerResult {
  /** The currently-held stable chord (persists across frames), or null. */
  stable: ChordCandidate | null;
  /** True on the frame a *new* stable chord is first confirmed. */
  changed: boolean;
}

function keyOf(c: ChordCandidate): string {
  return `${c.rootName}:${c.quality}`;
}

export class ChordStabilizer {
  private readonly confirmFrames: number;
  private readonly minConfidence: number;

  private pendingKey: string | null = null;
  private pendingCount = 0;
  private emitted: ChordCandidate | null = null;

  constructor(config: StabilizerConfig = {}) {
    this.confirmFrames = config.confirmFrames ?? 3;
    this.minConfidence = config.minConfidence ?? 0.85;
  }

  /** Feed one frame's best candidate (or null for silence/low-confidence). */
  update(candidate: ChordCandidate | null): StabilizerResult {
    if (!candidate || candidate.confidence < this.minConfidence) {
      // Silence / uncertain frame: interrupt the run toward a new chord but
      // keep the last confirmed chord on screen.
      this.pendingKey = null;
      this.pendingCount = 0;
      return { stable: this.emitted, changed: false };
    }

    const key = keyOf(candidate);
    if (key === this.pendingKey) {
      this.pendingCount++;
    } else {
      this.pendingKey = key;
      this.pendingCount = 1;
    }

    const confirmed = this.pendingCount >= this.confirmFrames;
    const isNew = confirmed && (this.emitted === null || keyOf(this.emitted) !== key);
    if (isNew) {
      this.emitted = candidate;
      return { stable: candidate, changed: true };
    }
    return { stable: this.emitted, changed: false };
  }

  /** Current held chord without feeding a frame. */
  current(): ChordCandidate | null {
    return this.emitted;
  }

  /** Forget history (e.g. when restarting a listen session). */
  reset(): void {
    this.pendingKey = null;
    this.pendingCount = 0;
    this.emitted = null;
  }
}
