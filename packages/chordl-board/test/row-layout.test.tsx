import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ChordBoard } from "../src";
import type { BoardItem } from "../src";

const card = (id: string, breakAfter = false): BoardItem => ({ id, nl: "C", breakAfter });

const placement = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-board-id="${id}"]`)!.style.gridColumn;

/** Tracks a card spans, whatever the grid's internal resolution is. */
const spanOf = (container: HTMLElement, id: string) =>
  Number(placement(container, id).replace(/^.*span /, ""));

/** Track the card starts on; 0 when the grid places it automatically. */
const startOf = (container: HTMLElement, id: string) => {
  const placed = placement(container, id);
  return placed.includes("/") ? Number(placed.split("/")[0].trim()) : 0;
};

const gridOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-board-id]")!.parentElement!;

/**
 * A card is the same size wherever it lands — what changes on a short row is
 * where the row sits. Left in the grid's own tracks it hugged the left edge
 * and read as "a full row missing two"; centred, the leftover columns split
 * evenly either side and it reads as a deliberate short row.
 */
describe("row layout", () => {
  it("keeps every card the width its column count gives it", () => {
    const items = [card("a"), card("b", true), card("c"), card("d"), card("e"), card("f")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    // The card on the short row is exactly as wide as one on the full row.
    expect(spanOf(container, "a")).toBe(spanOf(container, "c"));
  });

  it("centres a row a break cut short", () => {
    // 2 of 4 columns used, so two columns are left over: one either side.
    const items = [card("a"), card("b", true), card("c"), card("d"), card("e"), card("f")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    const column = spanOf(container, "c");
    expect(startOf(container, "a")).toBe(column + 1);
    expect(startOf(container, "b")).toBe(0);
  });

  it("leaves a full row where the grid puts it", () => {
    const items = [card("a"), card("b", true), card("c"), card("d"), card("e"), card("f")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    for (const id of ["c", "d", "e", "f"]) expect(startOf(container, id), id).toBe(0);
  });

  it("centres a lone card on its row", () => {
    const items = [card("a", true), card("b"), card("c"), card("d")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 3 }} />);

    // 1 of 3 columns: two columns left over, one either side.
    const column = spanOf(container, "b");
    expect(startOf(container, "a")).toBe(column + 1);
  });

  it("centres the trailing row too", () => {
    const items = [card("a"), card("b"), card("c"), card("d"), card("e")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    // 1 of 4 columns: three left over, one and a half either side.
    const column = spanOf(container, "a");
    expect(startOf(container, "e")).toBe((column * 3) / 2 + 1);
  });

  it("lands on a whole track for every column count and row length", () => {
    for (const columns of [1, 2, 3, 4, 5, 6]) {
      for (let short = 1; short <= columns; short++) {
        const items = Array.from({ length: short }, (_, i) => card(`s${i}`, i === short - 1));
        const { container, unmount } = render(<ChordBoard items={items} meta={{ columns }} />);
        const start = startOf(container, "s0") || 1;
        expect(Number.isInteger(start), `columns=${columns} row=${short}`).toBe(true);
        expect(start, `columns=${columns} row=${short}`).toBeGreaterThan(0);
        unmount();
      }
    }
  });

  it("keeps the wrapping layout untouched when no column count is set", () => {
    const { container } = render(<ChordBoard items={[card("a"), card("b")]} />);
    expect(placement(container, "a")).toBe("");
    expect(gridOf(container).style.display).toBe("flex");
  });
});
