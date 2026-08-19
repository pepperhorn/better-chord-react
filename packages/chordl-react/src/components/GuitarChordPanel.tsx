import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { parseChordDescription } from "@pepperhorn/chordl-core";
import { lookupGuitarChord, INSTRUMENTS } from "@pepperhorn/chordl-guitar";
import type { InstrumentId } from "@pepperhorn/chordl-guitar";
import type { UIThemeMode } from "../config";
import { resolveUITheme, UIThemeProvider } from "../ui-theme";
import { GuitarChord } from "./GuitarChord";
import { CardHeading, CardFooter } from "./CardHeading";

export interface GuitarChordPanelProps {
  /** NL chord string (same input the piano view takes). */
  chord: string;
  instrument?: InstrumentId;
  /** Fires when the user picks a different instrument, so hosts can persist it. */
  onInstrumentChange?: (instrument: InstrumentId) => void;
  /**
   * Index of the fret position to show. Like `instrument`, this seeds internal
   * state and re-syncs whenever the prop changes, so a host can either leave it
   * alone or drive it. Out-of-range values clamp to the last available shape.
   */
  position?: number;
  /** Fires when the user picks a different fret position. */
  onPositionChange?: (position: number) => void;
  /**
   * Show the instrument and A/B/C position toggles. Default true; board cards
   * render one fixed shape and pass false.
   */
  showControls?: boolean;
  scale?: number;
  uiTheme?: UIThemeMode;
  title?: string;
  subheading?: string;
  footerText?: string;
  className?: string;
  style?: CSSProperties;
}

const POSITION_LABELS = "ABCDEFGH";

/**
 * Instruments that can actually return a shape, in the order a player is most
 * likely to reach for them. `bass4`/`bass5` are deliberately absent: chords-db
 * ships no bass library, so they can only ever answer "no shape found", and an
 * instrument that only disappoints is worse than an absent one.
 */
const INSTRUMENT_ORDER: InstrumentId[] = ["guitar", "guitar-top3", "ukulele"];

/**
 * Guitar view for a chord: resolves the chord label, looks up its shapes, and
 * renders the selected fret position with an A/B/C toggle for the alternate
 * placements. Chord-only (scales / note lists fall back to a hint).
 */
export function GuitarChordPanel({
  chord,
  instrument: instrumentProp = "guitar",
  onInstrumentChange,
  position: positionProp,
  onPositionChange,
  showControls = true,
  scale = 1,
  uiTheme,
  title,
  subheading,
  footerText,
  className,
  style,
}: GuitarChordPanelProps) {
  const uiCtx = resolveUITheme(uiTheme);
  const muted = uiCtx.tokens.textMuted ?? "#888";
  const text = uiCtx.tokens.text ?? "#111";

  const [instrument, setInstrument] = useState<InstrumentId>(instrumentProp);
  // Follow the prop if the host switches instruments.
  const [prevProp, setPrevProp] = useState(instrumentProp);
  if (instrumentProp !== prevProp) { setPrevProp(instrumentProp); setInstrument(instrumentProp); }

  // A persisted board card can name an instrument this build doesn't have (an
  // older export, a hand-edited file). Resolve it once here and use the
  // resolved id everywhere below, so an unknown id degrades to guitar instead
  // of throwing on `INSTRUMENTS[id].strings` or silently finding no shapes.
  const resolved: InstrumentId = Object.prototype.hasOwnProperty.call(INSTRUMENTS, instrument)
    ? instrument
    : "guitar";
  const cfg = INSTRUMENTS[resolved];

  const parsed = useMemo(() => {
    try { return parseChordDescription(chord); } catch { return null; }
  }, [chord]);

  const label = parsed?.chordName ?? "";
  const result = useMemo(
    () => (label ? lookupGuitarChord(label, resolved) : null),
    [label, resolved],
  );
  // Stable settings object so GuitarChord (which re-draws when `settings`
  // changes identity) only redraws when the instrument actually changes.
  const guitarSettings = useMemo(
    () => ({ strings: cfg.strings, tuning: cfg.tuning }),
    [cfg],
  );

  const [active, setActive] = useState(positionProp ?? 0);
  // Follow the prop if the host drives the position.
  const [prevPos, setPrevPos] = useState(positionProp);
  if (positionProp !== prevPos) {
    setPrevPos(positionProp);
    if (positionProp !== undefined) setActive(positionProp);
  }

  // Reset the selected position when the chord identity or instrument changes.
  const identity = `${label}|${resolved}`;
  const [prevKey, setPrevKey] = useState(identity);
  if (identity !== prevKey) { setPrevKey(identity); setActive(0); }

  // Tell the host about that reset, so a stored position can't drift from what
  // is on screen. In an effect because the setter belongs to the parent, and
  // ref-guarded so the mount render doesn't clobber a restored position.
  const notifiedIdentity = useRef(identity);
  useEffect(() => {
    if (notifiedIdentity.current === identity) return;
    notifiedIdentity.current = identity;
    onPositionChange?.(0);
  }, [identity, onPositionChange]);

  const selectPosition = (i: number) => { setActive(i); onPositionChange?.(i); };
  const selectInstrument = (id: InstrumentId) => { setInstrument(id); onInstrumentChange?.(id); };

  // Barre filtering hides shapes; it never changes what was looked up. Indices
  // stay indices into the full list, so a host that persists one (a board card
  // stores `position`) is never handed a number that means something different
  // once the filter changes.
  const [hideBarres, setHideBarres] = useState(false);

  const notice = (msg: string) => (
    <UIThemeProvider value={uiCtx}>
      <div className={`bc-guitar-panel bc-guitar-notice ${className ?? ""}`.trim()}
        style={{ textAlign: "center", color: muted, fontSize: "0.85rem", padding: "24px 0", ...style }}>
        {msg}
      </div>
    </UIThemeProvider>
  );

  const instrumentToggle = !showControls ? null : (
    <div className="bc-guitar-instrument-toggle" style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {INSTRUMENT_ORDER.map((id) => {
        const on = id === resolved;
        return (
          <button
            key={id}
            className="bc-guitar-instrument-btn"
            onClick={() => selectInstrument(id)}
            data-active={on}
            style={{
              padding: "4px 14px", borderRadius: 999, cursor: "pointer",
              border: on ? "1px solid transparent" : "1px solid var(--btn-border, #ddd)",
              background: on ? "var(--pill-active-bg, #0ea5e9)" : "var(--pill-bg, #f1f5f9)",
              color: on ? "var(--pill-active-text, #fff)" : "var(--text-muted, #64748b)",
              fontFamily: "system-ui, sans-serif", fontSize: "0.8rem", fontWeight: on ? 600 : 500,
            }}
          >
            {INSTRUMENTS[id].label}
          </button>
        );
      })}
    </div>
  );

  if (parsed?.isScale) return notice("Guitar view shows chords — switch off scale mode.");
  if (!label) return notice("Enter a chord to see its guitar shapes.");
  if (!result) {
    return (
      <UIThemeProvider value={uiCtx}>
        <div
          className={`bc-guitar-panel ${className ?? ""}`.trim()}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...style }}
        >
          {instrumentToggle}
          <div className="bc-guitar-notice" style={{ textAlign: "center", color: muted, fontSize: "0.85rem", padding: "12px 0" }}>
            No {cfg.label.toLowerCase()} shape found for “{label}”.
          </div>
        </div>
      </UIThemeProvider>
    );
  }

  // Visible placements, each carrying its index into the full list so a click
  // reports the same number whether or not the filter is on.
  const allPlacements = result.shapes.map((_, i) => i);
  const barreFree = allPlacements.filter((i) => result.positions[i].barres.length === 0);
  // A chord whose every shape is a barre (F, Bm — exactly the chords a beginner
  // wants this switch for) would otherwise render an empty frame. Show them and
  // say why instead.
  const onlyBarres = hideBarres && barreFree.length === 0;
  const visible = hideBarres && !onlyBarres ? barreFree : allPlacements;

  const idx = visible.includes(active)
    ? active
    : visible[0] ?? Math.max(0, Math.min(active, result.shapes.length - 1));
  // chordLookup bakes the chord name into the shape as svguitar's diagram title.
  // The panel renders the name itself (in the same type as the keyboard and
  // staff cards), so drop the SVG's copy rather than showing it twice in a font
  // svguitar sizes independently of the DOM.
  const { title: _shapeTitle, ...diagram } = result.shapes[idx];

  return (
    <UIThemeProvider value={uiCtx}>
      <div
        className={`bc-guitar-panel ${className ?? ""}`.trim()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...style }}
      >
        {/* Shared with the keyboard and staff renderers so a mixed board agrees
            on type: the descriptive title leads, the chord name sits beneath.
            The wrapper is conditional: CardHeading returns null when it has
            nothing to say, but an empty div is still a flex item and was
            spending a `gap: 10` above the diagram on nothing. The condition
            mirrors CardHeading's own `title ?? chordName` — with `||` an empty
            string title would fall through to the label here while CardHeading
            still returned null, leaving the very gap this removes. */}
        {((title ?? label) || subheading) && (
          <div className="bc-guitar-titles" style={{ width: "100%" }}>
            <CardHeading
              title={title}
              chordName={label}
              subheading={subheading}
              tokens={uiCtx.tokens}
              variant="guitar"
            />
          </div>
        )}

        {instrumentToggle}

        {/* Only offered when it would change something — a chord with no barre
            shapes doesn't need a switch that does nothing. */}
        {showControls && barreFree.length < allPlacements.length && (
          <label
            className="bc-guitar-barre-toggle"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              fontFamily: "system-ui, sans-serif", fontSize: "0.8rem", color: muted,
            }}
          >
            <input
              type="checkbox"
              className="bc-guitar-barre-checkbox"
              checked={hideBarres}
              onChange={(e) => setHideBarres(e.target.checked)}
            />
            Hide barre shapes
          </label>
        )}

        {onlyBarres && (
          <div className="bc-guitar-notice" style={{ textAlign: "center", color: muted, fontSize: "0.8rem" }}>
            Every {label} shape needs a barre — showing them anyway.
          </div>
        )}

        <GuitarChord
          chord={diagram}
          scale={scale}
          frets={cfg.frets}
          settings={guitarSettings}
        />

        {/* Alternate placements. Labelled by visible order so the row reads
            A/B/C even when the barre filter has removed shapes between them,
            while the click still reports the underlying index. */}
        {showControls && visible.length > 1 && (
          <div className="bc-guitar-position-toggle" style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {visible.map((i, shown) => {
              const baseFret = result.positions[i].baseFret;
              return (
                <button
                  key={i}
                  className="bc-guitar-position-btn"
                  onClick={() => selectPosition(i)}
                  data-active={i === idx}
                  title={`Position ${shown + 1} (fret ${baseFret})`}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                    border: i === idx ? "1px solid transparent" : "1px solid var(--btn-border, #ddd)",
                    background: i === idx ? "var(--pill-active-bg, #0ea5e9)" : "var(--pill-bg, #f1f5f9)",
                    color: i === idx ? "var(--pill-active-text, #fff)" : "var(--text-muted, #64748b)",
                    fontFamily: "inherit", fontSize: "0.9rem", fontWeight: i === idx ? 600 : 500,
                    minWidth: 40,
                  }}
                >
                  <span>{POSITION_LABELS[shown] ?? shown + 1}</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 400 }}>fret {baseFret}</span>
                </button>
              );
            })}
          </div>
        )}

        <CardFooter text={footerText} tokens={uiCtx.tokens} variant="guitar" />
      </div>
    </UIThemeProvider>
  );
}
