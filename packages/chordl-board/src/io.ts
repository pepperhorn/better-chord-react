import { BOARD_DISPLAY_MODES } from "./types";
import type { BoardDisplayMode, BoardItem, BoardMeta, BoardState } from "./types";

export interface BoardItemJsonV1 extends BoardItem {
  /** sha256 cache key from ph-chordl computeCacheKey; carried for future lookup. */
  cacheKey?: string;
  /** Snapshot of the render config that produced `cacheKey`. */
  renderConfig?: Record<string, unknown>;
}

export interface BoardJsonV1 {
  schema: "chordl.board/v1";
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
        cacheKey = await computeCacheKey({ user_string: it.nl, render_config: renderConfig });
      } catch {
        // crypto.subtle unavailable (non-secure context) — skip the hash.
      }
      return { ...it, cacheKey, renderConfig };
    }),
  );
  const payload: BoardJsonV1 = {
    schema: "chordl.board/v1",
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

export function importBoardJson(text: string): BoardState {
  const parsed = JSON.parse(text) as Partial<BoardJsonV1>;
  if (!parsed || parsed.schema !== "chordl.board/v1") {
    throw new Error("Unsupported board JSON: expected schema 'chordl.board/v1'");
  }
  if (!Array.isArray(parsed.items)) {
    throw new Error("Invalid board JSON: 'items' must be an array");
  }
  const items: BoardItem[] = parsed.items.map((raw) => {
    if (!raw || typeof raw.nl !== "string") {
      throw new Error("Invalid board JSON: each item requires an 'nl' string");
    }
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `chord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      nl: raw.nl,
      title: raw.title,
      subheading: raw.subheading,
      footerText: raw.footerText,
      display: parseDisplayMode(raw.display),
      instrument: typeof raw.instrument === "string" && raw.instrument ? raw.instrument : undefined,
      position: parsePosition(raw.position),
    };
  });
  return { items, meta: parsed.meta ?? {} };
}
