import { useEffect, useRef, useState, useCallback } from "react";
import { ChordListener, toChordSymbol } from "@pepperhorn/chordl-listen";
import type { ChordCandidate } from "@pepperhorn/chordl-listen";
import type { UIThemeMode } from "../config";
import { PianoChord } from "./PianoChord";

export interface ListenOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Add one identified chord (chordl chord string) to the board. */
  onSaveChord: (nl: string) => void;
  /** Add many identified chords at once (record mode → one card each). */
  onAddChords: (nls: string[]) => void;
  uiTheme?: UIThemeMode;
}

const MAX_RECORD_MS = 60_000;

type Status = "idle" | "listening" | "denied" | "error";

export function ListenOverlay({ open, onClose, onSaveChord, onAddChords, uiTheme }: ListenOverlayProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState<ChordCandidate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Record mode
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const listenerRef = useRef<ChordListener | null>(null);
  const recordingRef = useRef(false);
  const recordedRef = useRef<Set<string>>(new Set());
  const recordStartRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecordTimer = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // Finish a recording session and push the unique chords to the board.
  const finishRecording = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    stopRecordTimer();
    const chords = [...recordedRef.current];
    if (chords.length > 0) onAddChords(chords);
  }, [onAddChords, stopRecordTimer]);

  const handleChord = useCallback((chord: ChordCandidate) => {
    setCurrent(chord);
    if (recordingRef.current) {
      const sym = toChordSymbol(chord);
      if (!recordedRef.current.has(sym)) {
        recordedRef.current.add(sym);
        setRecorded([...recordedRef.current]);
      }
    }
  }, []);

  // Start/stop the microphone with the overlay's open state.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const listener = new ChordListener({
      confirmFrames: 3,
      minConfidence: 0.86,
      onChord: handleChord,
      onError: (err) => {
        if (cancelled) return;
        const denied = /denied|not allowed|permission/i.test(err.message);
        setStatus(denied ? "denied" : "error");
        setErrorMsg(err.message);
      },
    });
    listenerRef.current = listener;
    setStatus("idle");
    setCurrent(null);
    listener.start().then(() => {
      if (!cancelled) setStatus("listening");
    }).catch(() => { /* onError already handled */ });

    return () => {
      cancelled = true;
      stopRecordTimer();
      recordingRef.current = false;
      listener.stop();
      listenerRef.current = null;
    };
  }, [open, handleChord, stopRecordTimer]);

  const startRecording = useCallback(() => {
    recordedRef.current = new Set();
    setRecorded([]);
    setElapsed(0);
    recordStartRef.current = Date.now();
    recordingRef.current = true;
    setRecording(true);
    // Seed with the currently-held chord so it isn't missed.
    if (current) {
      const sym = toChordSymbol(current);
      recordedRef.current.add(sym);
      setRecorded([sym]);
    }
    stopRecordTimer();
    tickRef.current = setInterval(() => {
      const ms = Date.now() - recordStartRef.current;
      setElapsed(ms);
      if (ms >= MAX_RECORD_MS) finishRecording();
    }, 200);
  }, [current, finishRecording, stopRecordTimer]);

  if (!open) return null;

  const currentSymbol = current ? toChordSymbol(current) : null;
  const remaining = Math.max(0, MAX_RECORD_MS - elapsed);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Listen for chords"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        data-bc-theme={uiTheme}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560, borderRadius: 20,
          background: "var(--input-floating-bg, #fff)", color: "var(--text, #111)",
          border: "1px solid var(--btn-border, #e2e8f0)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MicGlyph />
            <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>Listen for chords</span>
            {status === "listening" && <LiveDot recording={recording} />}
          </div>
          <button onClick={onClose} aria-label="Close" style={iconButton}>✕</button>
        </div>

        {status === "denied" && (
          <Notice tone="error">
            Microphone access was blocked. Allow mic access in your browser and reopen this panel.
          </Notice>
        )}
        {status === "error" && (
          <Notice tone="error">Couldn't start the microphone: {errorMsg}</Notice>
        )}
        {status === "idle" && (
          <Notice tone="muted">Requesting microphone…</Notice>
        )}

        {status === "listening" && (
          <>
            {/* Currently identified chord — stays until a new chord is heard. */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              padding: "10px 0",
            }}>
              {currentSymbol ? (
                <>
                  <div style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                    {currentSymbol}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>
                    {current!.label} · {(current!.confidence * 100).toFixed(0)}% match
                  </div>
                  <div style={{ width: "100%", maxWidth: 360, pointerEvents: "none" }}>
                    <PianoChord chord={currentSymbol} scale={0.5} showPlayback={false} uiTheme={uiTheme} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "1rem", color: "var(--text-muted, #64748b)", padding: "24px 0" }}>
                  Play a chord…
                </div>
              )}
            </div>

            {/* Actions */}
            {!recording ? (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => currentSymbol && onSaveChord(currentSymbol)}
                  disabled={!currentSymbol}
                  style={{ ...primaryButton, opacity: currentSymbol ? 1 : 0.5, cursor: currentSymbol ? "pointer" : "default" }}
                >
                  + Save to board
                </button>
                <button onClick={startRecording} style={secondaryButton}>
                  ● Record up to 60s
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    Recording… {(remaining / 1000).toFixed(0)}s left
                  </span>
                  <button onClick={finishRecording} style={primaryButton}>
                    Stop &amp; build board ({recorded.length})
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 28 }}>
                  {recorded.length === 0 && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)" }}>
                      Unique chords will appear here as they're heard…
                    </span>
                  )}
                  {recorded.map((sym) => (
                    <span key={sym} style={chip}>{sym}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)", textAlign: "center" }}>
          Single instrument works best. Identification is octave-agnostic — inversions and slash chords aren't distinguished.
        </div>
      </div>
    </div>
  );
}

const iconButton: React.CSSProperties = {
  border: "none", background: "transparent", color: "var(--text-muted, #64748b)",
  fontSize: "1rem", cursor: "pointer", padding: 4, lineHeight: 1,
};
const primaryButton: React.CSSProperties = {
  padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, fontFamily: "inherit",
  border: "none", borderRadius: 20, background: "var(--pill-active-bg, #0ea5e9)",
  color: "var(--pill-active-text, #fff)", cursor: "pointer",
};
const secondaryButton: React.CSSProperties = {
  padding: "8px 16px", fontSize: "0.85rem", fontWeight: 500, fontFamily: "inherit",
  border: "1px solid var(--btn-border, #e2e8f0)", borderRadius: 20,
  background: "var(--pill-bg, #f1f5f9)", color: "var(--text, #111)", cursor: "pointer",
};
const chip: React.CSSProperties = {
  fontSize: "0.8rem", fontWeight: 600, padding: "3px 10px", borderRadius: 8,
  background: "var(--tag-bg, #e0f2fe)", color: "var(--tag-text, #0369a1)",
};

function Notice({ tone, children }: { tone: "error" | "muted"; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "0.85rem", textAlign: "center", padding: "16px 12px",
      color: tone === "error" ? "#b91c1c" : "var(--text-muted, #64748b)",
    }}>
      {children}
    </div>
  );
}

function LiveDot({ recording }: { recording: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: recording ? "#ef4444" : "#22c55e",
      boxShadow: `0 0 0 0 ${recording ? "rgba(239,68,68,0.6)" : "rgba(34,197,94,0.6)"}`,
      animation: "bc-listen-pulse 1.2s ease-in-out infinite",
    }} />
  );
}

/** Inline mic icon so the overlay has no asset dependency. */
function MicGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
