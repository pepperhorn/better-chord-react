/**
 * How a card draws itself. The first three map straight onto `PianoChord`'s
 * `display` prop; `"guitar"` selects the fretboard renderer instead.
 * Omitted means `"keyboard"` — which is what every pre-existing card is.
 */
export type BoardDisplayMode = "keyboard" | "staff" | "both" | "guitar";

export const BOARD_DISPLAY_MODES: readonly BoardDisplayMode[] = [
  "keyboard",
  "staff",
  "both",
  "guitar",
];

/** A single chord card on the board. */
export interface BoardItem {
  /** Stable identifier for keys and drag-drop. */
  id: string;
  /** NL chord string — the only field required to render. */
  nl: string;
  /** Optional title override (defaults to the resolved chord name). */
  title?: string;
  /** Optional muted subheading below the title. */
  subheading?: string;
  /** Optional footer text below all annotations. */
  footerText?: string;
  /** Renderer for this card. Defaults to `"keyboard"` when absent. */
  display?: BoardDisplayMode;
  /**
   * Fretted instrument for `display: "guitar"` — an `InstrumentId` from
   * chordl-guitar. Typed loosely so the board carries no runtime dependency
   * on that package's union; an unknown id falls back to the panel default.
   */
  instrument?: string;
  /**
   * Index into the chord's shape list for `display: "guitar"` — the A/B/C
   * position the user picked. Clamped at render time if the shape list is
   * shorter (e.g. after a chords-db update).
   */
  position?: number;
}

/** Board-level metadata — title/subtitle/footer rendered around the chord grid. */
export interface BoardMeta {
  title?: string;
  subtitle?: string;
  footer?: string;
  /** Items per row. `undefined` (or "auto") falls back to flex-wrap. */
  columns?: number | "auto";
}

/** Persistence envelope — items plus board-level meta. */
export interface BoardState {
  items: BoardItem[];
  meta: BoardMeta;
}

/**
 * Persistence layer for a board. Default implementation uses localStorage;
 * callers can swap in any adapter (remote API, IndexedDB, etc.).
 *
 * `load` may return either the new envelope shape or a bare items array
 * (legacy schema); the hook normalizes both.
 */
export interface StorageAdapter {
  load(): Promise<BoardState | BoardItem[]> | BoardState | BoardItem[];
  save(state: BoardState): Promise<void> | void;
}
