import type { BoardItem, BoardState, StorageAdapter } from "./types.js";

export interface LocalStorageAdapterOptions {
  /**
   * Called when a save is dropped, so the UI can tell the user their board is
   * no longer being persisted. Without it the adapter falls back to
   * `console.warn`: with images in a board the ~5MB budget is reachable, and a
   * quota failure is lost work.
   */
  onError?: (err: Error, info: { key: string; bytes: number }) => void;
}

/**
 * Browsers disagree on the name: the spec says `QuotaExceededError`, Firefox
 * historically threw `NS_ERROR_DOM_QUOTA_REACHED`.
 */
function isQuotaError(err: unknown): boolean {
  const name = (err as { name?: unknown })?.name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

/** Default in-browser persistence. Stores the board under a single key. */
export function localStorageAdapter(
  key: string = "chordl-board",
  { onError }: LocalStorageAdapterOptions = {},
): StorageAdapter {
  return {
    load(): BoardState {
      if (typeof localStorage === "undefined") return { items: [], meta: {} };
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return { items: [], meta: {} };
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Legacy schema: bare items array.
          return { items: parsed as BoardItem[], meta: {} };
        }
        return {
          items: Array.isArray(parsed?.items) ? parsed.items : [],
          meta: parsed?.meta && typeof parsed.meta === "object" ? parsed.meta : {},
        };
      } catch {
        return { items: [], meta: {} };
      }
    },
    save(state: BoardState): void {
      // No storage at all (SSR, a non-browser host) is the expected shape of
      // "this board is ephemeral", not a failure to report.
      if (typeof localStorage === "undefined") return;
      const json = JSON.stringify(state);
      try {
        localStorage.setItem(key, json);
      } catch (err) {
        // Never rethrow: the board keeps working in memory either way. But the
        // write is gone, so say so — a silent drop is how a user loses a board.
        const error = err instanceof Error ? err : new Error(String(err));
        // Character count, not encoded bytes: data URIs are ASCII, and the
        // point is an order of magnitude against a ~5MB budget, not precision.
        const info = { key, bytes: json.length };
        if (onError) {
          onError(error, info);
        } else if (isQuotaError(error)) {
          console.warn(
            `chordl-board: could not save "${key}" (${info.bytes} bytes) — storage quota exceeded. Changes are in memory only.`,
            error,
          );
        }
        // A non-quota failure with no handler (storage disabled or blocked by
        // policy) means persistence was never available; warning on every edit
        // would be noise.
      }
    },
  };
}

/** No-op adapter for tests or unsigned-in / ephemeral usage. */
export const memoryStorageAdapter = (): StorageAdapter => {
  let state: BoardState = { items: [], meta: {} };
  return {
    load: () => state,
    save: (next) => { state = next; },
  };
};
