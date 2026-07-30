import { Component, useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties, ReactNode, SVGProps } from "react";
import { PianoChord } from "@pepperhorn/chordl-react";
import type { UIThemeMode } from "@pepperhorn/chordl-react";
import type { BoardItem, BoardMeta, BoardState, StorageAdapter } from "./types";
import { localStorageAdapter } from "./storage";
import { exportBoardJson, importBoardJson } from "./io";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
.chordl-board-title { margin: 0; font-size: 1.75rem; font-weight: 600; color: #111; font-family: Poppins, system-ui, sans-serif; line-height: 1.2; }
.chordl-board-subtitle { margin: 4px 0 0 0; font-size: 1.05rem; font-weight: 400; color: #555; font-family: Poppins, system-ui, sans-serif; }
`;

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
    const next: BoardItem = { id: item.id ?? newId(), nl: item.nl, title: item.title, subheading: item.subheading, footerText: item.footerText };
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

export interface ChordBoardProps {
  items: BoardItem[];
  clipboard?: BoardItem | null;
  /** Board-level metadata: title/subtitle/footer/columns. */
  meta?: BoardMeta;
  onMetaChange?: (patch: Partial<BoardMeta>) => void;
  onEdit?: (item: BoardItem) => void;
  onCopy?: (id: string) => void;
  onCut?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onPaste?: () => void;
  onClearClipboard?: () => void;
  onReorder?: (fromId: string, toId: string) => void;
  /** Currently selected card — gets a sticky ring and visible chrome. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onClearSelection?: () => void;
  /** Called with the parsed BoardState when a user imports JSON. */
  onImport?: (state: BoardState) => void;
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
  onCopy,
  onCut,
  onDelete,
  onDuplicate,
  onPaste,
  onClearClipboard,
  onReorder,
  selectedId,
  onSelect,
  onClearSelection,
  onImport,
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

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const state = importBoardJson(text);
      if (items.length > 0 && !window.confirm(`Replace current board with ${state.items.length} chord(s) from ${file.name}?`)) {
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

  const cardStyle: CSSProperties = {
    position: "relative",
    border: "1px solid var(--btn-border, #ddd)",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    minWidth: 240,
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

  const columns = safeMeta.columns;
  const useGrid = typeof columns === "number" && columns > 0;
  const gridStyle: CSSProperties = useGrid
    ? { display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12, alignItems: "flex-start" }
    : { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "center" };

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

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button type="button" style={actionBtnStyle} onClick={handleDownloadPng} disabled={!!exporting} title="Download as PNG">
            {exporting === "png" ? "…" : "PNG"}
          </button>
          <button type="button" style={actionBtnStyle} onClick={handleDownloadPdf} disabled={!!exporting} title="Download as PDF">
            {exporting === "pdf" ? "…" : "PDF"}
          </button>
          <button type="button" style={actionBtnStyle} onClick={handleExportJson} disabled={!!exporting} title="Export board as JSON">
            JSON
          </button>
          <button type="button" style={actionBtnStyle} onClick={handleImportClick} disabled={!!exporting} title="Import board from JSON">
            Import
          </button>
          <input
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
            No chords yet — click the add button to capture the current chord.
          </div>
        )}
        {items.map((item) => {
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
            <div
              key={item.id}
              data-board-id={item.id}
              data-selected={isSelected ? "true" : "false"}
              className={cardClass}
              style={{ ...cardStyle, opacity: isDragging ? 0.7 : 1 }}
              draggable={armedDragId === item.id}
              onClick={() => onSelect?.(item.id)}
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
              <CardErrorBoundary key={item.nl} label={item.nl}>
                <PianoChord
                  chord={item.nl}
                  title={item.title}
                  subheading={item.subheading}
                  footerText={item.footerText}
                  scale={scale}
                  uiTheme={uiTheme}
                  showPlayback={false}
                />
              </CardErrorBoundary>
              {!isExporting && (
                <div
                  className="chordl-board-actions"
                  style={{
                    display: "flex",
                    gap: 4,
                    justifyContent: "flex-end",
                    marginTop: 2,
                    borderTop: "1px solid var(--btn-border, #eee)",
                    paddingTop: 6,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button style={iconBtnStyle} onClick={() => onEdit?.(item)} title="Edit">edit</button>
                  <button style={iconBtnStyle} onClick={() => onCopy?.(item.id)} title="Copy">copy</button>
                  <button style={iconBtnStyle} onClick={() => onCut?.(item.id)} title="Cut">cut</button>
                  <button style={iconBtnStyle} onClick={() => onDuplicate?.(item.id)} title="Repeat (duplicate)">repeat</button>
                  <button style={iconBtnStyle} onClick={() => onDelete?.(item.id)} title="Delete">delete</button>
                </div>
              )}
            </div>
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
        <div style={{
          marginTop: 12,
          padding: "6px 12px",
          fontSize: "0.78rem",
          color: "var(--text-muted, #888)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          clipboard: <code>{clipboard.nl}</code>
          <button style={iconBtnStyle} onClick={() => onPaste?.()}>paste</button>
          <button style={iconBtnStyle} onClick={() => onClearClipboard?.()}>clear</button>
        </div>
      )}
    </div>
  );
}
