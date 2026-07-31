/**
 * React hook: drive a {@link SequenceFollower} from the live mic stream.
 *
 * Connects the pipeline the pure pieces already provide —
 *   ChordListener (mic → stable chord) → toChordSymbol → SequenceFollower →
 *   cursor / page —
 * and exposes the follow state (status, active index, current page) for a
 * page-turning UI. The follower is forward-only and treats a non-matching
 * detection as "stay put", so stray chords never throw the cursor around.
 *
 * The mic listener is injectable (`createListener`) so the wiring can be tested
 * without real audio.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChordListener, SequenceFollower, toChordSymbol } from "@pepperhorn/chordl-listen";
import type { ChordCandidate } from "@pepperhorn/chordl-listen";
import { pageCount, sequenceFromChords } from "./sequenceFromChords";

export type FollowStatus = "idle" | "listening" | "denied" | "error";

/** Minimal surface the hook needs from a mic listener — real or faked. */
export interface FollowListener {
  start(): Promise<void>;
  stop(): void;
}

export interface UseFollowAlongOptions {
  /** Ordered chordl chord strings that make up the score. */
  chords: string[];
  /** Chords per page (default 4). */
  perPage?: number;
  /** Whether the follower is live (mic on). */
  active: boolean;
  /** Chords ahead of the cursor to search (default 3). */
  lookahead?: number;
  /** Agreeing detections before advancing (default 2). */
  confirmFrames?: number;
  /** Inject a listener (tests); defaults to a real {@link ChordListener}. */
  createListener?: (
    onChord: (c: ChordCandidate) => void,
    onError: (e: Error) => void,
  ) => FollowListener;
}

export interface FollowAlongState {
  status: FollowStatus;
  /** Cursor position in the sequence (0-based). */
  activeIndex: number;
  /** Current page (1-based). */
  page: number;
  /** Total pages. */
  pages: number;
  /** Last error message, if any. */
  errorMsg: string;
}

function defaultListener(
  onChord: (c: ChordCandidate) => void,
  onError: (e: Error) => void,
): FollowListener {
  return new ChordListener({ confirmFrames: 3, minConfidence: 0.86, onChord, onError });
}

export function useFollowAlong({
  chords,
  perPage = 4,
  active,
  lookahead = 3,
  confirmFrames = 2,
  createListener = defaultListener,
}: UseFollowAlongOptions): FollowAlongState {
  const sequence = useMemo(() => sequenceFromChords(chords, perPage), [chords, perPage]);
  const pages = pageCount(chords.length, perPage);

  const [status, setStatus] = useState<FollowStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

  // Re-key the effect when the sequence identity changes, so editing the score
  // rebuilds the follower from the top.
  const seqKey = useMemo(() => sequence.map((e) => `${e.chord}@${e.page}`).join("|"), [sequence]);

  // Latest callbacks kept in refs so the listener closure isn't rebuilt per render.
  const createRef = useRef(createListener);
  createRef.current = createListener;

  useEffect(() => {
    if (!active) return;
    const follower = new SequenceFollower({ sequence, lookahead, confirmFrames });
    setStatus("idle");
    setActiveIndex(0);
    setPage(sequence[0]?.page ?? 1);
    setErrorMsg("");

    let cancelled = false;
    const listener = createRef.current(
      (cand) => {
        if (cancelled) return;
        const res = follower.onChordDetected(toChordSymbol(cand));
        if (res.advanced) {
          setActiveIndex(follower.position);
          if (res.page != null) setPage(res.page);
        }
      },
      (err) => {
        if (cancelled) return;
        const denied = /denied|not allowed|permission/i.test(err.message);
        setStatus(denied ? "denied" : "error");
        setErrorMsg(err.message);
      },
    );

    listener
      .start()
      .then(() => { if (!cancelled) setStatus("listening"); })
      .catch(() => { /* onError already handled */ });

    return () => {
      cancelled = true;
      listener.stop();
      follower.reset();
    };
    // seqKey stands in for `sequence`; lookahead/confirmFrames are primitives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, seqKey, lookahead, confirmFrames]);

  return { status, activeIndex, page, pages, errorMsg };
}
