import { useEffect, useMemo, useState } from "react";
import { parseChordDescription } from "@pepperhorn/chordl-core";
import type { UIThemeMode } from "../config";
import { useFollowAlong } from "../follow/useFollowAlong";
import type { FollowListener } from "../follow/useFollowAlong";
import type { ChordCandidate } from "@pepperhorn/chordl-listen";

export interface FollowAlongOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Ordered chordl chord strings — the score to follow. */
  chords: string[];
  /** Chords shown per page (default 4). */
  perPage?: number;
  uiTheme?: UIThemeMode;
  /** Fires when the follower's cursor moves (index into `chords`). */
  onActiveChange?: (index: number) => void;
  /** Fires when the active page changes. */
  onPageChange?: (page: number) => void;
  /** Inject a mic listener (tests); defaults to a real ChordListener. */
  createListener?: (
    onChord: (c: ChordCandidate) => void,
    onError: (e: Error) => void,
  ) => FollowListener;
}

/**
 * Follow-along page turner. Listens to the mic, matches what's played against
 * an expected chord sequence, and advances a highlighted cursor — turning the
 * page automatically when the cursor crosses a page boundary. Forward-only, so
 * a stray chord never jumps backwards; the reader can also page manually.
 */
export function FollowAlongOverlay({
  open,
  onClose,
  chords,
  perPage = 4,
  uiTheme,
  onActiveChange,
  onPageChange,
  createListener,
}: FollowAlongOverlayProps) {
  const { status, activeIndex, page, pages, errorMsg } = useFollowAlong({
    chords,
    perPage,
    active: open,
    createListener,
  });

  // The page on screen. Auto-follows the follower, but the reader can nudge it.
  const [viewPage, setViewPage] = useState(1);
  useEffect(() => { setViewPage(page); }, [page]);
  useEffect(() => { if (open) onPageChange?.(page); }, [page, open, onPageChange]);
  useEffect(() => { if (open) onActiveChange?.(activeIndex); }, [activeIndex, open, onActiveChange]);

  // Display labels: resolved chord name, falling back to the raw string.
  const labels = useMemo(
    () => chords.map((nl) => {
      try { return parseChordDescription(nl).chordName || nl; } catch { return nl; }
    }),
    [chords],
  );

  if (!open) return null;

  const per = Math.max(1, Math.floor(perPage));
  const activePage = Math.floor(activeIndex / per) + 1;
  const start = (viewPage - 1) * per;
  const pageItems = labels
    .map((label, index) => ({ label, index }))
    .slice(start, start + per);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Follow along"
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
            <ScoreGlyph />
            <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>Follow along</span>
            {status === "listening" && <LiveDot />}
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

        {/* Page of chords — the active one is highlighted. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            data-testid="follow-page"
            style={{
              display: "grid", gap: 10,
              gridTemplateColumns: `repeat(${Math.min(per, 4)}, minmax(0, 1fr))`,
            }}
          >
            {pageItems.map(({ label, index }) => {
              const isActive = index === activeIndex && activePage === viewPage;
              return (
                <div
                  key={index}
                  data-active={isActive}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minHeight: 64, padding: "10px 8px", borderRadius: 12,
                    fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em",
                    border: isActive ? "2px solid var(--pill-active-bg, #0ea5e9)" : "1px solid var(--btn-border, #e2e8f0)",
                    background: isActive ? "var(--pill-active-bg, #0ea5e9)" : "var(--pill-bg, #f8fafc)",
                    color: isActive ? "var(--pill-active-text, #fff)" : "var(--text, #111)",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Page controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => setViewPage((p) => Math.max(1, p - 1))}
              disabled={viewPage <= 1}
              style={{ ...secondaryButton, opacity: viewPage <= 1 ? 0.5 : 1 }}
            >
              ‹ Prev
            </button>
            <span data-testid="follow-page-indicator" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              Page {viewPage} of {pages}
              {activePage !== viewPage && status === "listening" && (
                <button
                  onClick={() => setViewPage(activePage)}
                  style={{ ...linkButton, marginLeft: 8 }}
                >
                  jump to playing ›
                </button>
              )}
            </span>
            <button
              onClick={() => setViewPage((p) => Math.min(pages, p + 1))}
              disabled={viewPage >= pages}
              style={{ ...secondaryButton, opacity: viewPage >= pages ? 0.5 : 1 }}
            >
              Next ›
            </button>
          </div>
        </div>

        <div style={{ fontSize: "0.7rem", color: "var(--text-muted, #64748b)", textAlign: "center" }}>
          Forward-only: pages turn as you play through the chords. Single instrument works best.
        </div>
      </div>
    </div>
  );
}

const iconButton: React.CSSProperties = {
  border: "none", background: "transparent", color: "var(--text-muted, #64748b)",
  fontSize: "1rem", cursor: "pointer", padding: 4, lineHeight: 1,
};
const secondaryButton: React.CSSProperties = {
  padding: "6px 14px", fontSize: "0.85rem", fontWeight: 500, fontFamily: "inherit",
  border: "1px solid var(--btn-border, #e2e8f0)", borderRadius: 20,
  background: "var(--pill-bg, #f1f5f9)", color: "var(--text, #111)", cursor: "pointer",
};
const linkButton: React.CSSProperties = {
  border: "none", background: "transparent", color: "var(--pill-active-bg, #0ea5e9)",
  fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", padding: 0,
};

function Notice({ tone, children }: { tone: "error" | "muted"; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "0.85rem", textAlign: "center", padding: "8px 12px",
      color: tone === "error" ? "#b91c1c" : "var(--text-muted, #64748b)",
    }}>
      {children}
    </div>
  );
}

function LiveDot() {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: "#22c55e",
      boxShadow: "0 0 0 0 rgba(34,197,94,0.6)",
      animation: "bc-listen-pulse 1.2s ease-in-out infinite",
    }} />
  );
}

/** Inline score/pages icon so the overlay has no asset dependency. */
function ScoreGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h9a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-3a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h3z" />
    </svg>
  );
}
