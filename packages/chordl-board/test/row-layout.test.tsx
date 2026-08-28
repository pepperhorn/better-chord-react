import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ChordBoard } from "../src";
import type { BoardItem } from "../src";

const card = (id: string, breakAfter = false): BoardItem => ({ id, nl: "C", breakAfter });

const placement = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-board-id="${id}"]`)!.style.gridColumn;

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

    // 120 tracks / 4 columns = 30 per card, on the short row and the full one.
    expect(placement(container, "a")).toContain("span 30");
    expect(placement(container, "c")).toBe("span 30");
  });

  it("centres a row a break cut short", () => {
    // 2 of 4 columns used: two leftover columns, 60 tracks, split as 30 each
    // side — so the row starts at track 31.
    const items = [card("a"), card("b", true), card("c"), card("d"), card("e"), card("f")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    expect(placement(container, "a")).toBe("31 / span 30");
    expect(placement(container, "b")).toBe("span 30");
  });

  it("leaves a full row where the grid puts it", () => {
    const items = [card("a"), card("b", true), card("c"), card("d"), card("e"), card("f")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    for (const id of ["c", "d", "e", "f"]) expect(placement(container, id), id).toBe("span 30");
  });

  it("centres a lone card on its row", () => {
    const items = [card("a", true), card("b"), card("c"), card("d")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 3 }} />);

    // 1 of 3 columns: two leftover columns of 40 tracks, 40 either side.
    expect(placement(container, "a")).toBe("41 / span 40");
  });

  it("centres the trailing row too", () => {
    const items = [card("a"), card("b"), card("c"), card("d"), card("e")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} />);

    expect(placement(container, "e")).toBe("46 / span 30");
  });

  it("lands on a whole track for every column count and row length", () => {
    for (const columns of [1, 2, 3, 4, 5, 6]) {
      for (let short = 1; short <= columns; short++) {
        const items = Array.from({ length: short }, (_, i) => card(`s${i}`, i === short - 1));
        const { container, unmount } = render(<ChordBoard items={items} meta={{ columns }} />);
        const placed = placement(container, "s0");
        const start = placed.includes("/") ? Number(placed.split("/")[0].trim()) : 1;
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
