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

/**
 * What a card is. Absent means `"chord"` — every card saved before text cards
 * existed, so the discriminator needs no migration pass over stored boards.
 */
export type BoardItemKind = "chord" | "text";

export const BOARD_ITEM_KINDS: readonly BoardItemKind[] = ["chord", "text"];

/**
 * Prefixes an `icon` id may carry: `music:` for notation glyphs, `obj:` for
 * object icons. Shared with the icon module so the registry and the import
 * validator cannot drift apart.
 */
export const BOARD_ICON_PREFIXES: readonly string[] = ["music:", "obj:"];

/**
 * How much room a card takes, and how big it draws. `"rg"` is one column of the
 * board's grid — the size every card was before this existed, and the size a
 * card with no `size` still is.
 */
export type BoardCardSize = "sm" | "md" | "rg" | "lg" | "xl" | "2xl";

export const BOARD_CARD_SIZES: readonly BoardCardSize[] = ["sm", "md", "rg", "lg", "xl", "2xl"];

/**
 * Width of each size as a fraction of one column, which is also the factor its
 * diagram is drawn at — a card that takes twice the room draws twice the size,
 * or the extra width would be empty paper.
 *
 * The values are eighths and quarters on purpose: see `GRID_TRACKS`, which is
 * chosen so every one of them lands on a whole track at every column count the
 * board offers.
 */
export const BOARD_CARD_SIZE_FACTORS: Record<BoardCardSize, number> = {
  sm: 0.5,
  md: 0.75,
  rg: 1,
  lg: 1.5,
  xl: 2,
  "2xl": 3,
};

/** A single card on the board — a chord diagram, or text with an icon/image. */
export interface BoardItem {
  /** Stable identifier for keys and drag-drop. */
  id: string;
  /** What this card is. Absent means `"chord"`. */
  kind?: BoardItemKind;
  /**
   * NL chord string — required to render a chord card, and absent on a text
   * card, which has no chord at all. Optional in the type only so a text card
   * is constructible: consumers branch on `kind` first and never reach the
   * chord path for a text card, rather than null-checking `nl` everywhere.
   */
  nl?: string;
  /** How much room this card takes and how big it draws. Absent means `"rg"`. */
  size?: BoardCardSize;
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
  /** Icon id (e.g. `"music:trebleClef"`) shown above the text. Text cards only. */
  icon?: string;
  /**
   * Uploaded image as a data URI, so a JSON export stays a complete backup.
   * Text cards only, and mutually exclusive with `icon`.
   */
  image?: string;
  /**
   * Start a new row after this card. Layout only — it stays out of the render
   * cache key, since a break changes nothing about the card's image.
   */
  breakAfter?: boolean;
}

/** A card is a chord unless it explicitly says otherwise. */
export function isTextCard(item: BoardItem): boolean {
  return item.kind === "text";
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
 *
 * `save` never throws: a board that cannot be persisted must keep working in
 * memory. An adapter that drops a write is expected to surface it some other
 * way (see `localStorageAdapter`'s `onError`) — losing work silently is worse
 * than an editing session that carries on.
 */
export interface StorageAdapter {
  load(): Promise<BoardState | BoardItem[]> | BoardState | BoardItem[];
  save(state: BoardState): Promise<void> | void;
}
