import { describe, it, expect } from "vitest";
import { computeCacheKey, exportBoardJson, importBoardJson } from "../src/io";
import { isTextCard } from "../src/types";
import type { BoardState } from "../src/types";

const board = (items: BoardState["items"]): BoardState => ({ items, meta: {} });

/** Hand-rolled JSON standing in for an untrusted file the user picked. */
const rawBoard = (items: unknown[]): string =>
  JSON.stringify({
    schema: "chordl.board/v1",
    exportedAt: "2026-08-12T00:00:00.000Z",
    meta: {},
    items,
  });

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

describe("text cards", () => {
  it("round-trips kind, icon and breakAfter", async () => {
    const state = board([
      {
        id: "t",
        kind: "text",
        title: "Verse",
        subheading: "x2",
        footerText: "capo 2",
        icon: "music:trebleClef",
        breakAfter: true,
      },
    ]);
    const back = importBoardJson(await exportBoardJson(state));
    expect(back.items[0]).toMatchObject(state.items[0]);
    expect(isTextCard(back.items[0])).toBe(true);
  });

  it("round-trips an uploaded image", async () => {
    const image = "data:image/png;base64,iVBORw0KGgo=";
    const state = board([{ id: "t", kind: "text", title: "Chorus", image }]);
    const back = importBoardJson(await exportBoardJson(state));
    expect(back.items[0].image).toBe(image);
  });

  it("contributes no cache key and no render config", async () => {
    const json = JSON.parse(
      await exportBoardJson(board([{ id: "t", kind: "text", title: "Verse", breakAfter: true }])),
    );
    expect(json.items[0]).not.toHaveProperty("cacheKey");
    expect(json.items[0]).not.toHaveProperty("renderConfig");
  });

  it("accepts a text card with no chord but still rejects a chord card without one", () => {
    expect(() => importBoardJson(rawBoard([{ id: "t", kind: "text", title: "Verse" }]))).not.toThrow();
    expect(() => importBoardJson(rawBoard([{ id: "c", title: "no chord here" }]))).toThrow(/nl/);
    expect(() => importBoardJson(rawBoard([{ id: "c", kind: "chord", title: "x" }]))).toThrow(/nl/);
  });

  it("reads every card on a legacy board as a chord card", () => {
    const back = importBoardJson(rawBoard([{ id: "a", nl: "Cmaj7" }, { id: "b", nl: "Dm7" }]));
    expect(back.items.map(isTextCard)).toEqual([false, false]);
    expect(back.items.map((i) => i.kind)).toEqual([undefined, undefined]);
  });
});

describe("import degradation for text-card fields", () => {
  it("drops an unrecognised kind rather than trusting it", () => {
    const back = importBoardJson(rawBoard([{ id: "a", nl: "Cmaj7", kind: "sticker" }]));
    expect(back.items[0].kind).toBeUndefined();
    expect(isTextCard(back.items[0])).toBe(false);
  });

  it("drops a breakAfter that is not a boolean", () => {
    const back = importBoardJson(
      rawBoard([
        { id: "a", nl: "C", breakAfter: "true" },
        { id: "b", nl: "D", breakAfter: 1 },
        { id: "c", nl: "E", breakAfter: null },
        { id: "d", nl: "F", breakAfter: false },
        { id: "e", nl: "G", breakAfter: true },
      ]),
    );
    expect(back.items.map((i) => i.breakAfter)).toEqual([
      undefined,
      undefined,
      undefined,
      false,
      true,
    ]);
  });

  it("drops an icon with an unknown prefix", () => {
    const back = importBoardJson(
      rawBoard([
        { id: "a", kind: "text", icon: "sprite:../../etc/passwd" },
        { id: "b", kind: "text", icon: "trebleClef" },
        { id: "c", kind: "text", icon: 7 },
        { id: "d", kind: "text", icon: "music:trebleClef" },
        { id: "e", kind: "text", icon: "obj:guitar" },
      ]),
    );
    expect(back.items.map((i) => i.icon)).toEqual([
      undefined,
      undefined,
      undefined,
      "music:trebleClef",
      "obj:guitar",
    ]);
  });

  // `image` lands in a src attribute, so an imported board is a script-injection
  // vector unless everything but an inline image is refused.
  it("drops an image that is not an inline image data URI", () => {
    const back = importBoardJson(
      rawBoard([
        { id: "a", kind: "text", image: "javascript:alert(1)" },
        { id: "b", kind: "text", image: "data:text/html,<script>alert(1)</script>" },
        { id: "c", kind: "text", image: "https://example.com/x.png" },
        { id: "d", kind: "text", image: " data:image/png;base64,AAAA" },
        { id: "e", kind: "text", image: 42 },
        { id: "f", kind: "text", image: "data:image/png;base64,AAAA" },
      ]),
    );
    expect(back.items.map((i) => i.image)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "data:image/png;base64,AAAA",
    ]);
  });

  it("does not throw on any of the bogus optional fields", () => {
    expect(() =>
      importBoardJson(
        rawBoard([
          { id: "a", nl: "C", kind: 3, breakAfter: {}, icon: [], image: null },
        ]),
      ),
    ).not.toThrow();
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

  // Layout, not image content: two identical cards must share a cached render
  // whether or not a break follows one of them.
  it("keeps the text-card fields out of a chord card's render config", async () => {
    const json = JSON.parse(
      await exportBoardJson(
        board([
          { id: "a", nl: "Cmaj7", title: "One", breakAfter: true, kind: "chord" },
          { id: "b", nl: "Cmaj7", title: "One" },
        ]),
      ),
    );
    expect(json.items[0].renderConfig).toEqual({ title: "One" });
    expect(json.items[0].cacheKey).toBe(
      await computeCacheKey({ user_string: "Cmaj7", render_config: { title: "One" } }),
    );
    expect(json.items[0].cacheKey).toBe(json.items[1].cacheKey);
  });
});
