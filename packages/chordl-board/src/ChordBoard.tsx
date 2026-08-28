import { Component, Fragment, useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import { PianoChord, GuitarChordPanel, CardHeading, CardFooter, resolveUITheme } from "@pepperhorn/chordl-react";
import type { InstrumentId, UIThemeMode } from "@pepperhorn/chordl-react";
import type { BoardItem, BoardMeta, BoardState, StorageAdapter } from "./types.js";
import { isTextCard } from "./types.js";
import { BoardIcon } from "./icons.js";
import { localStorageAdapter } from "./storage.js";
import { exportBoardJson, importBoardJson } from "./io.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Imported eagerly on purpose. A lazy() here bought nothing — chordl-react ships
// as one bundle, so PianoChord already drags svguitar and chords-db in — while
// its Suspense fallback could be what html2canvas captured during a PNG/PDF
// export. Splitting the guitar renderer out has to happen in chordl-react's
// build (a separate entry point) before a dynamic import here means anything.

/** Compensates for GuitarChord's fixed 260*scale cap. See BoardCardContent. */
const GUITAR_CARD_SCALE = 1.6;

/**
 * A text card's contents: an optional icon or image, then the same title /
 * subheading / footer stack a chord card draws. Deliberately not a new layout —
 * a text card is a card with the text and no diagram, so it has to agree on
 * type with the chord card sitting next to it.
 *
 * That agreement is the shared `CardHeading`/`CardFooter`, not a copy of their
 * numbers: a restated type scale drifts the moment either side is touched, and
 * the drift shows up as two cards on one board disagreeing about what a title
 * looks like. `chordName` stays unset — a text card has no chord to be.
 */
function BoardCardText({ item, uiTheme }: { item: BoardItem; uiTheme?: UIThemeMode }) {
  const { tokens } = resolveUITheme(uiTheme);
  const media = item.image ? (
    // SECURITY: `image` is a data URI off an untrusted imported board, and
    // io.ts admits `data:image/svg+xml`. An <img> renders SVG inert — scripts,
    // event handlers and external fetches inside it never run. The same bytes
    // in <object>, <iframe> or <embed>, or injected as inline markup, execute.
    // This must stay an <img>; there is no "better" element for it.
    <img
      className="chordl-board-card-image"
      src={item.image}
      alt={item.title ?? ""}
      style={{ maxWidth: "100%", maxHeight: 140, objectFit: "contain", marginBottom: 6 }}
    />
  ) : item.icon ? (
    <BoardIcon
      className="chordl-board-card-icon"
      id={item.icon}
      size={40}
      color={tokens.text}
      // Decorative when the card has its own title — the title already names it.
      title={item.title ? undefined : item.subheading}
    />
  ) : null;

  return (
    <div
      className="chordl-board-card-text"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // A chord card's diagram gives it height; a text card has only its text,
        // so it needs padding to sit at a comparable size beside one.
        padding: "12px 4px",
      }}
    >
      {media}
      <CardHeading
        title={item.title}
        subheading={item.subheading}
        tokens={tokens}
        variant="board-text"
        classNames={{
          heading: "chordl-board-card-text-title",
          subheading: "chordl-board-card-text-subheading",
        }}
      />
      <CardFooter
        text={item.footerText}
        tokens={tokens}
        variant="board-text"
        className="chordl-board-card-text-footer"
      />
    </div>
  );
}

/**
 * One card's contents. `kind` picks what a card even is, and is checked first:
 * a text card has no `nl` and must never reach a chord renderer. For a chord,
 * `display` picks the renderer — the piano component already handles
 * keyboard/staff/both via its own prop, and "guitar" routes to the fretboard
 * panel with its toggles off, so a board card shows the exact shape that was
 * chosen in the editor, not a picker.
 */
function BoardCardContent({
  item,
  scale,
  uiTheme,
}: {
  item: BoardItem;
  scale?: number;
  uiTheme?: UIThemeMode;
}) {
  if (isTextCard(item)) {
    return <BoardCardText item={item} uiTheme={uiTheme} />;
  }
  if (!item.nl) {
    // `nl` is optional on the type only so a text card is constructible, so a
    // chord card without one is malformed — importBoardJson rejects it, but a
    // hand-built item still gets here. Say so, rather than handing "" to a
    // renderer and failing somewhere less legible.
    return (
      <div
        className="chordl-board-card-missing-chord"
        style={{
          padding: "16px 10px",
          fontSize: "0.75rem",
          color: "var(--text-muted, #888)",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        no chord
      </div>
    );
  }
  if (item.display === "guitar") {
    return (
      <GuitarChordPanel
        className="chordl-board-card-guitar"
        chord={item.nl}
        instrument={item.instrument as InstrumentId | undefined}
        position={item.position}
        showControls={false}
        // A fretboard is a tall, narrow graphic and caps at 260*scale, so at the
        // board's scale it floats small beside a keyboard that fills its card.
        // Render it larger so the two land at comparable optical widths.
        scale={(scale ?? 1) * GUITAR_CARD_SCALE}
        uiTheme={uiTheme}
        title={item.title}
        subheading={item.subheading}
        footerText={item.footerText}
      />
    );
  }
  return (
    <PianoChord
      chord={item.nl}
      display={item.display}
      title={item.title}
      subheading={item.subheading}
      footerText={item.footerText}
      // A card is identified by its chord, so the name always shows — unlike a
      // bare embedded diagram, where it is opt-in via the NL "with heading".
      showChordName
      scale={scale}
      uiTheme={uiTheme}
      showPlayback={false}
    />
  );
}

const DRAG_GLOW = "rgba(56, 189, 248, 0.55)";
const DRAG_GLOW_SOFT = "rgba(56, 189, 248, 0.35)";
const EDIT_BORDER = "rgba(56, 189, 248, 0.7)";
const SELECT_BORDER = "rgba(56, 189, 248, 0.85)";

const BOARD_STYLES = `
@keyframes chordl-board-edit-pulse {
  0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
  35%  { transform: scale(1.035); box-shadow: 0 0 0 2px ${DRAG_GLOW_SOFT}, 0 0 28px 6px ${DRAG_GLOW}; }
  100% { transform: scale(1);    box-shadow: 0 0 0 1px ${DRAG_GLOW_SOFT}, 0 0 14px 2px ${DRAG_GLOW_SOFT}; }
}
.chordl-board-card { transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease; }
.chordl-board-card--dragging { box-shadow: 0 0 0 2px ${DRAG_GLOW_SOFT}, 0 0 24px 4px ${DRAG_GLOW} !important; }
.chordl-board-card--editing { border-color: ${EDIT_BORDER} !important; box-shadow: 0 0 0 1px ${DRAG_GLOW_SOFT}, 0 0 14px 2px ${DRAG_GLOW_SOFT}; }
.chordl-board-card--selected { border-color: ${SELECT_BORDER} !important; box-shadow: 0 0 0 2px ${DRAG_GLOW_SOFT}; }
.chordl-board-card--pulse { animation: chordl-board-edit-pulse 1.1s ease-out; }
.chordl-board-handle { color: rgba(0,0,0,0.4); transition: color 0.15s ease, transform 0.15s ease; cursor: grab; }
.chordl-board-handle:hover { color: rgba(56, 189, 248, 0.95); transform: scale(1.15); }
.chordl-board-handle:active { cursor: grabbing; }
.chordl-board-actions { transition: opacity 0.15s ease; opacity: 0; }
.chordl-board-card:hover .chordl-board-actions,
.chordl-board-card[data-selected="true"] .chordl-board-actions { opacity: 1; }

/* ── Capture styling ──────────────────────────────────────────────────────
   A card is styled for two different jobs. Editing chrome — the selection
   ring, the edit ring, the drag glow, the pulse — exists to tell you what
   you are working on, and must never reach a PNG or PDF. The card's own
   border is a print decision, and defaults to off: an exported chord sheet
   is a page of chords, not a page of boxes.

   Neutralised rather than removed so geometry is identical to the screen:
   a transparent border keeps its 1px width, so nothing reflows between what
   you see and what you get. A per-card border option (weight, style, colour)
   will opt back in here rather than removing this rule.                    */
.chordl-board-export--capturing .chordl-board-card,
.chordl-board-export--capturing .chordl-board-card--selected,
.chordl-board-export--capturing .chordl-board-card--editing,
.chordl-board-export--capturing .chordl-board-card--dragging {
  border-color: transparent !important;
  box-shadow: none !important;
  animation: none !important;
  transition: none !important;
}
.chordl-board-title { margin: 0; font-size: 1.75rem; font-weight: 600; color: #111; font-family: Poppins, system-ui, sans-serif; line-height: 1.2; }
.chordl-board-subtitle { margin: 4px 0 0 0; font-size: 1.05rem; font-weight: 400; color: #555; font-family: Poppins, system-ui, sans-serif; }
`;

/**
 * How to name a card in chrome that talks about it — an error message, the
 * clipboard strip. A chord card is its chord; a text card has no `nl` at all,
 * so its title is the next best handle and "text card" the last resort. Never
 * empty: these strings exist so a user can tell one card from another.
 */
function cardLabel(item: BoardItem): string {
  return item.nl ?? item.title ?? (isTextCard(item) ? "text card" : "card");
}

/**
 * Per-card error boundary — a card whose chord string fails to render shows
 * an inline message instead of unmounting the whole board (and app).
 * Keyed by the card's nl string upstream so edits re-attempt the render.
 */
class CardErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "16px 10px",
            fontSize: "0.75rem",
            color: "#b91c1c",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{this.props.label}</div>
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

function DragHandleIcon(props: SVGProps<SVGSVGElement>) {
  // 3-row x 2-col dot grid — the universal drag-to-reorder affordance.
  return (
    <svg width="14" height="20" viewBox="0 0 8 14" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="2" cy="2"  r="1.2" />
      <circle cx="6" cy="2"  r="1.2" />
      <circle cx="2" cy="7"  r="1.2" />
      <circle cx="6" cy="7"  r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="6" cy="12" r="1.2" />
    </svg>
  );
}

/** Stable-ish id without pulling in a uuid dep. */
export function newId(): string {
  return `chord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Stateful hook that owns the board items list + storage I/O + clipboard + selection.
 * Returned mutators are stable across renders.
 *
 * Pair with `<ChordBoard items={items} {...handlers} />` to render.
 */
export function useChordBoard(opts?: {
  initialItems?: BoardItem[];
  initialMeta?: BoardMeta;
  storage?: StorageAdapter;
  onChange?: (state: BoardState) => void;
}) {
  const { initialItems, initialMeta, storage, onChange } = opts ?? {};
  const adapterRef = useRef<StorageAdapter>(storage ?? localStorageAdapter());
  useEffect(() => { adapterRef.current = storage ?? localStorageAdapter(); }, [storage]);

  const [items, setItems] = useState<BoardItem[]>(() => initialItems ?? []);
  const [meta, setMetaState] = useState<BoardMeta>(() => initialMeta ?? {});
  const [clipboard, setClipboard] = useState<BoardItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate from storage once on mount.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    Promise.resolve(adapterRef.current.load()).then((loaded) => {
      if (!loaded) return;
      if (Array.isArray(loaded)) {
        if (loaded.length > 0) setItems(loaded);
      } else {
        if (loaded.items && loaded.items.length > 0) setItems(loaded.items);
        if (loaded.meta) setMetaState(loaded.meta);
      }
    });
  }, []);

  // Persist + notify on every change (skip the initial render).
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    const state: BoardState = { items, meta };
    adapterRef.current.save(state);
    onChange?.(state);
  }, [items, meta, onChange]);

  const setMeta = useCallback((patch: Partial<BoardMeta> | ((prev: BoardMeta) => BoardMeta)) => {
    setMetaState((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const addItem = useCallback((item: Omit<BoardItem, "id"> & { id?: string }) => {
    // Spread rather than field-by-field: a whitelist here silently drops any
    // card property added later (this is how `display` used to go missing).
    const next: BoardItem = { ...item, id: item.id ?? newId() };
    setItems((prev) => [...prev, next]);
    return next.id;
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<BoardItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId((sel) => (sel === id ? null : sel));
  }, []);

  const copyItem = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) setClipboard({ ...it });
      return prev;
    });
  }, []);

  const cutItem = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) setClipboard({ ...it });
      return prev.filter((x) => x.id !== id);
    });
    setSelectedId((sel) => (sel === id ? null : sel));
  }, []);

  const pasteItem = useCallback(() => {
    setClipboard((cb) => {
      if (cb) setItems((prev) => [...prev, { ...cb, id: newId() }]);
      return cb;
    });
  }, []);

  const duplicateItem = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx < 0) return prev;
      const clone: BoardItem = { ...prev[idx], id: newId() };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setItems((prev) => {
      const fromIdx = prev.findIndex((x) => x.id === fromId);
      const toIdx = prev.findIndex((x) => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const selectItem = useCallback((id: string | null) => setSelectedId(id), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  const replaceState = useCallback((state: BoardState) => {
    setItems(state.items ?? []);
    setMetaState(state.meta ?? {});
    setSelectedId(null);
  }, []);

  const clear = useCallback(() => { setItems([]); setSelectedId(null); }, []);
  const clearClipboard = useCallback(() => setClipboard(null), []);

  return {
    items, meta, clipboard, selectedId,
    setMeta,
    addItem, updateItem, removeItem,
    copyItem, cutItem, pasteItem, clearClipboard,
    duplicateItem,
    reorder, clear,
    selectItem, clearSelection,
    replaceState,
  };
}

// ── Stateless renderer ────────────────────────────────────────────

/**
 * Track count for the fixed-column grid.
 *
 * 120 is twice the lowest common multiple of 1 through 6 — every column count
 * the board offers. A card therefore spans a whole number of tracks at any
 * column count, and the doubling makes the *half* of a leftover column whole
 * too, which is what centres a short row exactly.
 */
const GRID_TRACKS = 120;

/** Half the 12px gutter, carried by each card. See `columnGap: 0` below. */
const CARD_GUTTER = 6;

export interface ChordBoardProps {
  items: BoardItem[];
  clipboard?: BoardItem | null;
  /** Board-level metadata: title/subtitle/footer/columns. */
  meta?: BoardMeta;
  onMetaChange?: (patch: Partial<BoardMeta>) => void;
  onEdit?: (item: BoardItem) => void;
  onCut?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onPaste?: () => void;
  onClearClipboard?: () => void;
  onReorder?: (fromId: string, toId: string) => void;
  /**
   * Appends a text card. The toolbar's "+ Text" button appears only when this
   * is wired — it is the only way to create a text card, so a visible one that
   * does nothing is a broken promise, unlike the per-card row where a missing
   * handler just makes an existing card's button inert.
   */
  onAddTextCard?: () => void;
  /** Toggles `breakAfter` on one card — the per-card "break" toggle. */
  onToggleBreak?: (id: string) => void;
  /** Currently selected card — gets a sticky ring and visible chrome. */
  selectedId?: string | null;
  /** Called with a card id to select it, or null when the user deselects. */
  onSelect?: (id: string | null) => void;
  onClearSelection?: () => void;
  /** Called with the parsed BoardState when a user imports JSON. */
  onImport?: (state: BoardState) => void;
  /**
   * Called when a user confirms starting a fresh board. The host resets its own
   * state — `useChordBoard`'s `replaceState` clears cards and meta together,
   * which is what "new board" means. The overlay that guards this lives here,
   * so a host only has to say what an empty board is.
   */
  onNew?: () => void;
  uiTheme?: UIThemeMode;
  /** Render scale forwarded to each card's PianoChord. */
  scale?: number;
  /** Highlights the card currently being edited (persistent blue ring). */
  editingId?: string | null;
  /** Increment to retrigger the edit-pulse animation on `editingId`. */
  editPulseKey?: number;
  className?: string;
  style?: CSSProperties;
}

export function ChordBoard({
  items,
  clipboard,
  meta,
  onMetaChange,
  onEdit,
  onCut,
  onDelete,
  onDuplicate,
  onPaste,
  onClearClipboard,
  onReorder,
  onAddTextCard,
  onToggleBreak,
  selectedId,
  onSelect,
  onClearSelection,
  onImport,
  onNew,
  uiTheme,
  scale = 0.6,
  editingId,
  editPulseKey,
  className,
  style,
}: ChordBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const newCancelRef = useRef<HTMLButtonElement>(null);
  const newOverlayRef = useRef<HTMLDivElement>(null);
  const lastPulseRef = useRef<number | undefined>(undefined);
  const exportRef = useRef<HTMLDivElement | null>(null);
  // Drag is armed when the user mousedowns on a card's handle. State (not ref)
  // so React re-renders with `draggable={true}` and the HTML5 drag actually fires.
  const [armedDragId, setArmedDragId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const safeMeta: BoardMeta = meta ?? {};
  const patchMeta = (patch: Partial<BoardMeta>) => onMetaChange?.(patch);

  const slugFilename = () => {
    const base = (safeMeta.title || "chord-board").trim();
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "chord-board";
  };

  const captureBoard = async (): Promise<HTMLCanvasElement | null> => {
    const node = exportRef.current;
    if (!node) return null;
    // Wait one frame so the exporting=true render commits before capture.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    return await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
  };

  const handleDownloadPng = async () => {
    if (exporting) return;
    setExporting("png");
    try {
      const canvas = await captureBoard();
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slugFilename()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (exporting) return;
    setExporting("pdf");
    try {
      const canvas = await captureBoard();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "px",
        format: [canvas.width, canvas.height],
        // jsPDF defaults this to false, which embeds the decoded bitmap with no
        // stream compression: a 12-card board measured 8.33MB without it and
        // 0.05MB with it, from the identical PNG. The image was never the
        // problem. Keep PNG rather than switching to JPEG — chord diagrams are
        // flat line art, which Flate compresses better than JPEG (0.05MB vs
        // 0.15MB measured) and without ringing around staff lines.
        compress: true,
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${slugFilename()}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJson = async () => {
    const text = await exportBoardJson({ items, meta: safeMeta });
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugFilename()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /**
   * Clearing is unrecoverable — no undo, and localStorage holds the only copy —
   * so every path to it goes through the overlay. `hasMeta` is why an empty but
   * titled board still offers the button: the title is board content too.
   */
  const hasTitles = Boolean(safeMeta.title || safeMeta.subtitle || safeMeta.footer);
  const hasLayout = safeMeta.columns !== undefined && safeMeta.columns !== "auto";
  const hasBoard = items.length > 0 || hasTitles || hasLayout;

  const handleSaveAndNew = async () => {
    // Save first: if the download throws, the board is still there to retry.
    await handleExportJson();
    setConfirmNew(false);
    onNew?.();
  };

  const handleClearWithoutSaving = () => {
    setConfirmNew(false);
    onNew?.();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const state = importBoardJson(text);
      if (items.length > 0 && !window.confirm(`Replace current board with ${state.items.length} card(s) from ${file.name}?`)) {
        return;
      }
      onImport?.(state);
    } catch (err) {
      window.alert(`Could not import board: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    if (editPulseKey === undefined) return;
    if (editPulseKey === lastPulseRef.current) return;
    lastPulseRef.current = editPulseKey;
    if (!editingId) return;
    setPulseId(editingId);
    const t = setTimeout(() => setPulseId(null), 1100);
    return () => clearTimeout(t);
  }, [editPulseKey, editingId]);

  const isExporting = exporting !== null;

  const columns = safeMeta.columns;
  const useGrid = typeof columns === "number" && columns > 0;

  const cardStyle: CSSProperties = {
    position: "relative",
    border: "1px solid var(--btn-border, #ddd)",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    // Only the wrapping layout needs a floor: there, a card with nothing to
    // push against would collapse to its content. In a grid the track already
    // sets the width, and a floor wider than the track makes every card spill
    // into its neighbour — visible as overlapping cards once a board is asked
    // for more columns than it has room for.
    minWidth: useGrid ? 0 : 240,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    cursor: "default",
    userSelect: "none",
  };

  const iconBtnStyle: CSSProperties = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "0.78rem",
    color: "var(--text-muted, #666)",
    fontFamily: "inherit",
    borderRadius: 4,
  };

  /** Pressed state for an action-row toggle — the same tint the column picker
   *  uses for its active choice, so "on" reads the same way board-wide. */
  const activeIconBtnStyle: CSSProperties = {
    ...iconBtnStyle,
    background: "rgba(56,189,248,0.12)",
    color: "inherit",
    fontWeight: 600,
  };

  const gridStyle: CSSProperties = useGrid
    ? {
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_TRACKS}, minmax(0, 1fr))`,
        // Column gutters live on the cards, not on the grid: 120 tracks means
        // 119 gutters, and at 12px each they would consume more than the board
        // is wide. Tracks stay pure width, so a span is exactly one column and
        // a centring offset is exact.
        columnGap: 0,
        rowGap: 12,
        alignItems: "flex-start",
      }
    : { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "center" };

  /**
   * Where each card sits on the track grid.
   *
   * Cards keep the width their column count gives them — a card is the same
   * size wherever it lands. A row holding fewer cards than the setting is
   * centred instead, with the leftover columns split evenly either side, so a
   * row cut short by a break reads as a deliberate short row rather than as a
   * full row missing its right-hand cards.
   */
  const span = useGrid ? GRID_TRACKS / (columns as number) : 0;
  const rowStarts: Record<number, number> = {};
  if (useGrid) {
    const perRow = columns as number;
    let rowStart = 0;
    for (let i = 0; i < items.length; i++) {
      const rowLength = i - rowStart + 1;
      const rowEnds = Boolean(items[i].breakAfter) || rowLength === perRow || i === items.length - 1;
      if (!rowEnds) continue;
      if (rowLength < perRow) {
        // Half the leftover columns, in tracks. Whole because GRID_TRACKS is
        // twice a multiple of every column count the board offers.
        rowStarts[rowStart] = ((perRow - rowLength) * span) / 2 + 1;
      }
      rowStart = i + 1;
    }
  }

  /**
   * A `breakAfter` card is followed by this: a rendered sibling that fills the
   * rest of the row, so the next card starts a fresh one. A sibling rather than
   * a layout mode is what makes a break on the *last* card harmless — it is
   * just an empty element with nothing after it.
   *
   * Zero height and no paint, so an export sees nothing where it sits.
   */
  const breakStyle: CSSProperties = useGrid
    ? { gridColumn: "1 / -1", height: 0 }
    : { flexBasis: "100%", height: 0 };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    border: "1px solid var(--btn-border, #ddd)",
    borderRadius: 6,
    background: "#fff",
    color: "inherit",
    outline: "none",
  };

  /**
   * Escape deselects. The pointer routes out of a selection are a second click
   * on the card and the board background around the grid; a keyboard user has
   * neither, and on a full board the background is a few pixels wide.
   *
   * Skipped while the new-board overlay is up: Escape there means "cancel that",
   * and the overlay handles it.
   */
  useEffect(() => {
    if (!selectedId || confirmNew) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClearSelection?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, confirmNew, onClearSelection]);

  /**
   * Cancel takes focus the moment the overlay opens, so an Enter left over from
   * typing lands on the harmless choice rather than on a clear.
   */
  useEffect(() => {
    if (confirmNew) newCancelRef.current?.focus();
  }, [confirmNew]);

  /* The count comes from the live list, so the sentence can never promise to
     clear a different board than the one on screen. */
  const cardPart = items.length === 1 ? "1 card" : `${items.length} cards`;
  /* Named separately because they are not the same loss: a title is content the
     user wrote, a column count is a setting. Saying "title" for a board that has
     none is the sentence promising something it cannot deliver. */
  const metaPart = hasTitles ? "the board title" : hasLayout ? "the board settings" : null;
  const clearedParts = [items.length > 0 ? cardPart : null, metaPart].filter(Boolean);
  const newBoardMessage = `This clears ${clearedParts.join(" and ")}. It can't be undone.`;

  const dialogBtnStyle: CSSProperties = {
    padding: "8px 14px",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    border: "1px solid var(--btn-border, #ddd)",
    borderRadius: 10,
    background: "#fff",
    color: "inherit",
    cursor: "pointer",
  };

  const actionBtnStyle: CSSProperties = {
    padding: "6px 12px",
    fontSize: "0.8rem",
    fontFamily: "inherit",
    border: "1px solid var(--btn-border, #ddd)",
    borderRadius: 16,
    background: "#fff",
    color: "inherit",
    cursor: exporting ? "wait" : "pointer",
    opacity: exporting ? 0.6 : 1,
  };

  return (
    <div className={`chordl-board ${className ?? ""}`.trim()} style={style}>
      <style>{BOARD_STYLES}</style>

      {confirmNew && (
        <div
          className="chordl-board-new-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chordl-board-new-heading"
          tabIndex={-1}
          ref={newOverlayRef}
          onKeyDown={(e) => { if (e.key === "Escape") setConfirmNew(false); }}
          // A click that reaches the backdrop itself never started inside the
          // dialog, so it is a click *away* — the same as Cancel.
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmNew(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, background: "rgba(15,23,42,0.45)",
          }}
        >
          <div
            className="chordl-board-new-dialog"
            style={{
              width: "100%", maxWidth: 380,
              padding: 20,
              borderRadius: 14,
              background: "#fff",
              color: "inherit",
              boxShadow: "0 18px 48px rgba(15,23,42,0.28)",
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <h2 id="chordl-board-new-heading" className="chordl-board-new-heading" style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
              Start a new board?
            </h2>
            <p className="chordl-board-new-message" style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "var(--text-muted, #666)" }}>
              {newBoardMessage}
            </p>
            <div className="chordl-board-new-actions" style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <button type="button" className="chordl-board-new-save" style={dialogBtnStyle} onClick={handleSaveAndNew}>
                Download JSON &amp; clear
              </button>
              <button type="button" className="chordl-board-new-clear" style={dialogBtnStyle} onClick={handleClearWithoutSaving}>
                Clear without saving
              </button>
              <button type="button" className="chordl-board-new-cancel" ref={newCancelRef} style={{ ...dialogBtnStyle, fontWeight: 600 }} onClick={() => setConfirmNew(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings + download toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <details style={{ flex: "1 1 auto", minWidth: 240 }}>
          <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted, #666)", padding: "4px 0", userSelect: "none" }}>
            Board settings
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 12px", alignItems: "center", marginTop: 8, padding: 12, border: "1px solid var(--btn-border, #eee)", borderRadius: 8, background: "#fff" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>Title</label>
            <input style={inputStyle} value={safeMeta.title ?? ""} onChange={(e) => patchMeta({ title: e.target.value })} placeholder="Optional board title" />

            <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>Subtitle</label>
            <input style={inputStyle} value={safeMeta.subtitle ?? ""} onChange={(e) => patchMeta({ subtitle: e.target.value })} placeholder="Optional subtitle" />

            <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>Footer</label>
            <input style={inputStyle} value={safeMeta.footer ?? ""} onChange={(e) => patchMeta({ footer: e.target.value })} placeholder="Optional footer text" />

            <label style={{ fontSize: "0.8rem", color: "var(--text-muted, #666)" }}>Per row</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["auto", 1, 2, 3, 4, 5, 6] as const).map((c) => {
                const active = (safeMeta.columns ?? "auto") === c;
                return (
                  <button
                    key={String(c)}
                    type="button"
                    onClick={() => patchMeta({ columns: c === "auto" ? "auto" : c })}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      border: `1px solid ${active ? "rgba(56,189,248,0.6)" : "var(--btn-border, #ddd)"}`,
                      borderRadius: 14,
                      background: active ? "rgba(56,189,248,0.12)" : "#fff",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </details>

        <div className="chordl-board-toolbar" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {onNew && (
            <button
              type="button"
              className="chordl-board-new"
              style={actionBtnStyle}
              onClick={() => setConfirmNew(true)}
              disabled={!!exporting || !hasBoard}
              title={hasBoard ? "Start a new board" : "The board is already empty"}
            >
              NEW
            </button>
          )}
          {onAddTextCard && (
            <button
              type="button"
              className="chordl-board-add-text"
              style={actionBtnStyle}
              onClick={onAddTextCard}
              disabled={!!exporting}
              title="Add a text card"
            >
              + Text
            </button>
          )}
          <button type="button" className="chordl-board-export-png" style={actionBtnStyle} onClick={handleDownloadPng} disabled={!!exporting} title="Download as PNG">
            {exporting === "png" ? "…" : "PNG"}
          </button>
          <button type="button" className="chordl-board-export-pdf" style={actionBtnStyle} onClick={handleDownloadPdf} disabled={!!exporting} title="Download as PDF">
            {exporting === "pdf" ? "…" : "PDF"}
          </button>
          <button type="button" className="chordl-board-export-json" style={actionBtnStyle} onClick={handleExportJson} disabled={!!exporting} title="Export board as JSON">
            JSON
          </button>
          <button type="button" className="chordl-board-import" style={actionBtnStyle} onClick={handleImportClick} disabled={!!exporting} title="Import board from JSON">
            Import
          </button>
          <input
            className="chordl-board-import-input"
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
      </div>

      {/* Exportable region: title + grid + footer */}
      <div
        ref={exportRef}
        className={`chordl-board-export${isExporting ? " chordl-board-export--capturing" : ""}`}
        style={{ background: "#fff", padding: 16, borderRadius: 12 }}
        onClick={(e) => {
          // Clicks that don't land inside a card clear the selection.
          if ((e.target as HTMLElement).closest("[data-board-id]")) return;
          onClearSelection?.();
        }}
      >
        {(safeMeta.title || safeMeta.subtitle) && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            {safeMeta.title && <h1 className="chordl-board-title">{safeMeta.title}</h1>}
            {safeMeta.subtitle && <h3 className="chordl-board-subtitle">{safeMeta.subtitle}</h3>}
          </div>
        )}

      <div style={gridStyle}>
        {items.length === 0 && (
          <div style={{
            padding: "16px 20px",
            color: "var(--text-muted, #888)",
            fontSize: "0.85rem",
            fontStyle: "italic",
          }}>
            {/* Only name the text card where there is a button for it — the
                "+ Text" control renders only when the host wires it up. */}
            {onAddTextCard
              ? "No cards yet — add the current chord, or start a section with a text card."
              : "No cards yet — click the add button to capture the current chord."}
          </div>
        )}
        {items.map((item, index) => {
          const isDragging = dragId === item.id;
          const isEditing = editingId === item.id;
          const isSelected = selectedId === item.id;
          const isPulsing = pulseId === item.id;
          const cardClass = [
            "chordl-board-card",
            isDragging && "chordl-board-card--dragging",
            isEditing && "chordl-board-card--editing",
            isSelected && "chordl-board-card--selected",
            isPulsing && "chordl-board-card--pulse",
          ].filter(Boolean).join(" ");
          return (
            <Fragment key={item.id}>
              <div
                data-board-id={item.id}
                data-selected={isSelected ? "true" : "false"}
                className={cardClass}
                style={{
                  ...cardStyle,
                  opacity: isDragging ? 0.7 : 1,
                  ...(useGrid
                    ? {
                        gridColumn: rowStarts[index] !== undefined
                          ? `${rowStarts[index]} / span ${span}`
                          : `span ${span}`,
                        marginLeft: CARD_GUTTER,
                        marginRight: CARD_GUTTER,
                      }
                    : null),
                }}
                draggable={armedDragId === item.id}
                // Clicking the selected card again deselects it. Without this
                // the only way out of a selection is the strip of board
                // background around the grid, which a full board barely has.
                onClick={() => onSelect?.(isSelected ? null : item.id)}
                onDragStart={(e) => {
                  if (armedDragId !== item.id) {
                    e.preventDefault();
                    return;
                  }
                  setDragId(item.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", item.id);
                }}
                onDragEnd={() => { setDragId(null); setArmedDragId(null); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = e.dataTransfer.getData("text/plain");
                  if (fromId && onReorder) onReorder(fromId, item.id);
                  setDragId(null);
                  setArmedDragId(null);
                }}
              >
                {!isExporting && (
                  <div
                    className="chordl-board-handle"
                    title="Drag to reorder"
                    aria-label="Drag handle"
                    onMouseDown={() => setArmedDragId(item.id)}
                    onMouseUp={() => {
                      // Only clear if a drag never actually started (e.g. plain click).
                      // onDragEnd handles the post-drag cleanup.
                      if (dragId === null) setArmedDragId(null);
                    }}
                    style={{
                      // A dedicated strip above the chord (flex row, not absolute)
                      // so the handle never overlaps the diagram or its label.
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 14,
                      marginBottom: 2,
                    }}
                  >
                    <DragHandleIcon style={{ transform: "rotate(90deg)" }} />
                  </div>
                )}
                {/* Remounts when what is rendered changes, so an edit re-attempts
                    a render that previously threw. `kind` is in the key because a
                    card can change what it is, not just what it says. */}
                <CardErrorBoundary
                  key={`${item.kind ?? "chord"}|${item.nl ?? item.title ?? ""}|${item.display ?? "keyboard"}`}
                  label={cardLabel(item)}
                >
                  <BoardCardContent item={item} scale={scale} uiTheme={uiTheme} />
                </CardErrorBoundary>
                {!isExporting && (
                  <div
                    className="chordl-board-actions"
                    style={{
                      display: "flex",
                      // Six controls are wider than a card at small scales and
                      // in a many-column layout. A flex row without this does
                      // not shrink to fit — it spills past the card border.
                      flexWrap: "wrap",
                      // Centred rather than right-aligned: once the row can
                      // wrap, a short second line hanging off one edge reads as
                      // a mistake.
                      justifyContent: "center",
                      gap: 4,
                      marginTop: 2,
                      borderTop: "1px solid var(--btn-border, #eee)",
                      paddingTop: 6,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="chordl-board-action-edit" style={iconBtnStyle} onClick={() => onEdit?.(item)} title="Edit">edit</button>
                    {/* One control, not two. "copy" put a card on a clipboard
                        the user then had to paste, and "repeat" did the whole
                        job in a click — so the clipboard round-trip was a
                        longer road to the same card. */}
                    <button className="chordl-board-action-duplicate" style={iconBtnStyle} onClick={() => onDuplicate?.(item.id)} title="Duplicate">duplicate</button>
                    <button className="chordl-board-action-cut" style={iconBtnStyle} onClick={() => onCut?.(item.id)} title="Cut">cut</button>
                    {/* The only card state in this row with a value to read back,
                        so it has to look different when on — a break is invisible
                        otherwise, and an invisible toggle gets pressed twice. */}
                    <button
                      className={`chordl-board-action-break${item.breakAfter ? " chordl-board-action-break--on" : ""}`}
                      style={item.breakAfter ? activeIconBtnStyle : iconBtnStyle}
                      aria-pressed={item.breakAfter ? "true" : "false"}
                      onClick={() => onToggleBreak?.(item.id)}
                      title={item.breakAfter ? "Break after this card (on)" : "Break after this card"}
                    >
                      break
                    </button>
                    <button className="chordl-board-action-delete" style={iconBtnStyle} onClick={() => onDelete?.(item.id)} title="Delete">delete</button>
                  </div>
                )}
              </div>
              {item.breakAfter && (
                <div className="chordl-board-break" data-break-after={item.id} aria-hidden="true" style={breakStyle} />
              )}
            </Fragment>
          );
        })}
      </div>

        {safeMeta.footer && (
          <div style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: "0.95rem",
            color: "#555",
            fontFamily: "Poppins, system-ui, sans-serif",
            fontStyle: "italic",
            whiteSpace: "pre-wrap",
          }}>
            {safeMeta.footer}
          </div>
        )}
      </div>

      {clipboard && (
        <div className="chordl-board-clipboard" style={{
          marginTop: 12,
          padding: "6px 12px",
          fontSize: "0.78rem",
          color: "var(--text-muted, #888)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          clipboard: <code className="chordl-board-clipboard-label">{cardLabel(clipboard)}</code>
          <button className="chordl-board-clipboard-paste" style={iconBtnStyle} onClick={() => onPaste?.()}>paste</button>
          <button className="chordl-board-clipboard-clear" style={iconBtnStyle} onClick={() => onClearClipboard?.()}>clear</button>
        </div>
      )}
    </div>
  );
}
