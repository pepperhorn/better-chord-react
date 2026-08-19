import { BOARD_DISPLAY_MODES, BOARD_ICON_PREFIXES, BOARD_ITEM_KINDS, isTextCard } from "./types";
import type {
  BoardDisplayMode,
  BoardItem,
  BoardItemKind,
  BoardMeta,
  BoardState,
} from "./types";

export interface BoardItemJsonV1 extends BoardItem {
  /** sha256 cache key from ph-chordl computeCacheKey; carried for future lookup. */
  cacheKey?: string;
  /** Snapshot of the render config that produced `cacheKey`. */
  renderConfig?: Record<string, unknown>;
}

/**
 * Schema `exportBoardJson` writes. v2 is the first version that can carry text
 * cards (`kind`, `icon`, `image`, `breakAfter`); a v1 reader rejects those
 * items one by one with no way to explain why, so the version says so up front.
 */
export const BOARD_SCHEMA = "chordl.board/v2";

/** Schemas `importBoardJson` accepts. v1 boards are chord-only and still read. */
export const READABLE_BOARD_SCHEMAS = ["chordl.board/v1", "chordl.board/v2"] as const;

export type BoardSchema = (typeof READABLE_BOARD_SCHEMAS)[number];

export interface BoardJsonV1 {
  schema: BoardSchema;
  exportedAt: string;
  meta: BoardMeta;
  items: BoardItemJsonV1[];
}

function normalizeRenderConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeRenderConfig);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = normalizeRenderConfig((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}

/** Port of ph-chordl/src/lib/cacheKey.ts — sha256 over normalized {user_string, render_config}. */
export async function computeCacheKey(input: {
  user_string: string;
  render_config?: Record<string, unknown>;
}): Promise<string> {
  const normalized = {
    user_string: input.user_string.trim().toLowerCase(),
    render_config: normalizeRenderConfig(input.render_config ?? {}),
  };
  const data = new TextEncoder().encode(JSON.stringify(normalized));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function exportBoardJson(state: BoardState): Promise<string> {
  const items: BoardItemJsonV1[] = await Promise.all(
    state.items.map(async (it) => {
      // A text card draws no chord, so there is nothing to cache and nothing a
      // renderer could be configured with — emitting an empty key/config would
      // invite a consumer to look one up.
      if (isTextCard(it)) return { ...it };
      const renderConfig: Record<string, unknown> = {};
      if (it.title !== undefined) renderConfig.title = it.title;
      if (it.subheading !== undefined) renderConfig.subheading = it.subheading;
      if (it.footerText !== undefined) renderConfig.footerText = it.footerText;
      // Renderer identity belongs in the cache key: the same `nl` drawn as a
      // guitar frame and as a keyboard are different images, and a key that
      // ignored `display` would serve one for the other.
      if (it.display !== undefined) renderConfig.display = it.display;
      if (it.instrument !== undefined) renderConfig.instrument = it.instrument;
      if (it.position !== undefined) renderConfig.position = it.position;
      let cacheKey: string | undefined;
      try {
        // `nl` is optional on the type so a text card is constructible; a chord
        // card that somehow lost it is malformed, not cacheable.
        if (it.nl !== undefined) {
          cacheKey = await computeCacheKey({ user_string: it.nl, render_config: renderConfig });
        }
      } catch {
        // crypto.subtle unavailable (non-secure context) — skip the hash.
      }
      return { ...it, cacheKey, renderConfig };
    }),
  );
  const payload: BoardJsonV1 = {
    schema: BOARD_SCHEMA,
    exportedAt: new Date().toISOString(),
    meta: state.meta,
    items,
  };
  return JSON.stringify(payload, null, 2);
}

/** Imported JSON is untrusted — an unrecognised mode degrades to the default. */
function parseDisplayMode(value: unknown): BoardDisplayMode | undefined {
  return BOARD_DISPLAY_MODES.includes(value as BoardDisplayMode)
    ? (value as BoardDisplayMode)
    : undefined;
}

function parsePosition(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function parseKind(value: unknown): BoardItemKind | undefined {
  return BOARD_ITEM_KINDS.includes(value as BoardItemKind) ? (value as BoardItemKind) : undefined;
}

/** Only a real boolean: truthy-coercing `"false"` or `0` invents a layout. */
function parseBreakAfter(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** An id, not a path or a glyph — anything outside the known namespaces is junk. */
function parseIcon(value: unknown): string | undefined {
  return typeof value === "string" && BOARD_ICON_PREFIXES.some((p) => value.startsWith(p))
    ? value
    : undefined;
}

/**
 * Security boundary: an imported board is untrusted and `image` ends up in a
 * `src`. Only an inline image passes — `data:text/html`, `javascript:` and
 * remote URLs are all ways to make a card fetch or execute something.
 */
function parseImage(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("data:image/") ? value : undefined;
}

export function importBoardJson(text: string): BoardState {
  const parsed = JSON.parse(text) as Partial<BoardJsonV1>;
  if (!parsed || !READABLE_BOARD_SCHEMAS.includes(parsed.schema as BoardSchema)) {
    throw new Error(
      `Unsupported board JSON: expected one of ${READABLE_BOARD_SCHEMAS.join(", ")}, got ` +
        `'${parsed?.schema}'. A board saved by a newer chordl needs a newer chordl to open it.`,
    );
  }
  if (!Array.isArray(parsed.items)) {
    throw new Error("Invalid board JSON: 'items' must be an array");
  }
  const items: BoardItem[] = parsed.items.map((raw) => {
    const kind = raw ? parseKind(raw.kind) : undefined;
    // A chord card is unrenderable without `nl`, so that stays fatal — but a
    // text card has no chord to require.
    if (!raw || (kind !== "text" && typeof raw.nl !== "string")) {
      throw new Error("Invalid board JSON: each item requires an 'nl' string");
    }
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `chord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      nl: typeof raw.nl === "string" ? raw.nl : undefined,
      title: raw.title,
      subheading: raw.subheading,
      footerText: raw.footerText,
      display: parseDisplayMode(raw.display),
      instrument: typeof raw.instrument === "string" && raw.instrument ? raw.instrument : undefined,
      position: parsePosition(raw.position),
      icon: parseIcon(raw.icon),
      image: parseImage(raw.image),
      breakAfter: parseBreakAfter(raw.breakAfter),
    };
  });
  return { items, meta: parsed.meta ?? {} };
}
