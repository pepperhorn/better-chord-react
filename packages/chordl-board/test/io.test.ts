import { describe, it, expect } from "vitest";
import { computeCacheKey, exportBoardJson, importBoardJson } from "../src/io";
import type { BoardState } from "../src/types";

const board = (items: BoardState["items"]): BoardState => ({ items, meta: {} });

describe("board JSON round-trip", () => {
  it("preserves the four original card fields", async () => {
    const state = board([
      { id: "a", nl: "Cmaj7", title: "One", subheading: "tonic", footerText: "bar 1" },
    ]);
    const back = importBoardJson(await exportBoardJson(state));
    expect(back.items[0]).toMatchObject(state.items[0]);
  });

  it("preserves a card's display mode", async () => {
    const state = board([
      { id: "a", nl: "Cmaj7", display: "staff" },
      { id: "b", nl: "Dm7", display: "both" },
    ]);
    const back = importBoardJson(await exportBoardJson(state));
    expect(back.items.map((i) => i.display)).toEqual(["staff", "both"]);
  });

  it("preserves a guitar card's instrument and fret position", async () => {
    const state = board([
      { id: "a", nl: "Cmaj7", display: "guitar", instrument: "ukulele", position: 2 },
    ]);
    const back = importBoardJson(await exportBoardJson(state));
    expect(back.items[0]).toMatchObject({
      display: "guitar",
      instrument: "ukulele",
      position: 2,
    });
  });

  it("leaves the new fields undefined on a legacy card", async () => {
    const state = board([{ id: "a", nl: "Cmaj7" }]);
    const back = importBoardJson(await exportBoardJson(state));
    expect(back.items[0].display).toBeUndefined();
    expect(back.items[0].instrument).toBeUndefined();
    expect(back.items[0].position).toBeUndefined();
  });

  it("drops an unrecognised display mode rather than trusting it", async () => {
    const json = JSON.stringify({
      schema: "chordl.board/v1",
      exportedAt: "2026-08-12T00:00:00.000Z",
      meta: {},
      items: [{ id: "a", nl: "Cmaj7", display: "banjo-tab" }],
    });
    expect(importBoardJson(json).items[0].display).toBeUndefined();
  });

  it("drops a non-integer or negative position", async () => {
    const json = JSON.stringify({
      schema: "chordl.board/v1",
      exportedAt: "2026-08-12T00:00:00.000Z",
      meta: {},
      items: [
        { id: "a", nl: "Cmaj7", display: "guitar", position: -1 },
        { id: "b", nl: "Dm7", display: "guitar", position: 1.5 },
        { id: "c", nl: "G7", display: "guitar", position: "2" },
      ],
    });
    expect(importBoardJson(json).items.map((i) => i.position)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("drops a non-string or empty instrument", async () => {
    const json = JSON.stringify({
      schema: "chordl.board/v1",
      exportedAt: "2026-08-12T00:00:00.000Z",
      meta: {},
      items: [
        { id: "a", nl: "Cmaj7", display: "guitar", instrument: "" },
        { id: "b", nl: "Dm7", display: "guitar", instrument: 42 },
        { id: "c", nl: "G7", display: "guitar", instrument: null },
      ],
    });
    expect(importBoardJson(json).items.map((i) => i.instrument)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe("render cache key", () => {
  const keys = async (items: BoardState["items"]) => {
    const json = JSON.parse(await exportBoardJson(board(items)));
    return json.items.map((i: { cacheKey?: string }) => i.cacheKey);
  };

  // ph-chordl caches rendered SVGs by this key. If the renderer isn't part of
  // it, a board's guitar frame and its keyboard diagram collide and one gets
  // served for the other.
  it("separates the same chord drawn by different renderers", async () => {
    const k = await keys([
      { id: "a", nl: "Cmaj7", display: "keyboard" },
      { id: "b", nl: "Cmaj7", display: "staff" },
      { id: "c", nl: "Cmaj7", display: "guitar", instrument: "guitar", position: 0 },
      { id: "d", nl: "Cmaj7", display: "guitar", instrument: "guitar", position: 1 },
      { id: "e", nl: "Cmaj7", display: "guitar", instrument: "ukulele", position: 0 },
    ]);
    expect(k.every(Boolean)).toBe(true);
    expect(new Set(k).size).toBe(5);
  });

  // A card saved before this feature has no display field, so its render_config
  // must stay exactly as it was or every cached render is invalidated on deploy.
  it("keeps a legacy card's render config free of the new fields", async () => {
    const json = JSON.parse(await exportBoardJson(board([{ id: "a", nl: "Cmaj7" }])));
    expect(json.items[0].renderConfig).toEqual({});
    expect(json.items[0].cacheKey).toBe(
      await computeCacheKey({ user_string: "Cmaj7", render_config: {} }),
    );
  });
});
