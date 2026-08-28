import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ChordBoard, BOARD_CARD_SIZES } from "../src";
import type { BoardItem, BoardCardSize } from "../src";

const card = (id: string, size?: BoardCardSize, breakAfter = false): BoardItem =>
  ({ id, nl: "C", size, breakAfter });

const sizeBtn = (container: HTMLElement, id: string, size: BoardCardSize) =>
  container.querySelector<HTMLButtonElement>(
    `[data-board-id="${id}"] .chordl-board-action-size--${size}`,
  )!;

const spanOf = (container: HTMLElement, id: string) =>
  Number(
    container
      .querySelector<HTMLElement>(`[data-board-id="${id}"]`)!
      .style.gridColumn.replace(/^.*span /, ""),
  );

/**
 * A size decides two things at once: how much of the row a card takes, and how
 * big its diagram draws. They cannot come apart — extra width with a diagram
 * the old size is just empty paper.
 */
describe("card size", () => {
  it("offers every size on a card", () => {
    const { container } = render(<ChordBoard items={[card("a")]} onResize={() => {}} />);
    const labels = [...container.querySelectorAll(".chordl-board-action-size")].map((b) => b.textContent);
    expect(labels).toEqual([...BOARD_CARD_SIZES]);
  });

  it("omits the control when the host wires no handler", () => {
    const { container } = render(<ChordBoard items={[card("a")]} />);
    expect(container.querySelector(".chordl-board-action-size")).toBeNull();
  });

  it("marks the card's current size, defaulting to rg", () => {
    const { container } = render(
      <ChordBoard items={[card("a"), card("b", "xl")]} meta={{ columns: 4 }} onResize={() => {}} />,
    );
    expect(sizeBtn(container, "a", "rg").getAttribute("aria-pressed")).toBe("true");
    expect(sizeBtn(container, "b", "xl").getAttribute("aria-pressed")).toBe("true");
    expect(sizeBtn(container, "b", "rg").getAttribute("aria-pressed")).toBe("false");
  });

  it("reports the size the user picked", () => {
    const onResize = vi.fn();
    const { container } = render(
      <ChordBoard items={[card("a")]} meta={{ columns: 4 }} onResize={onResize} />,
    );
    fireEvent.click(sizeBtn(container, "a", "lg"));
    expect(onResize).toHaveBeenCalledWith("a", "lg");
  });

  it("gives a bigger card more of the row", () => {
    const { container } = render(
      <ChordBoard items={[card("a", "rg"), card("b", "sm"), card("c", "xl")]} meta={{ columns: 4 }} onResize={() => {}} />,
    );
    const rg = spanOf(container, "a");
    expect(spanOf(container, "b")).toBe(rg / 2);
    expect(spanOf(container, "c")).toBe(rg * 2);
  });

  /**
   * A size that does not fit is shown greyed rather than hidden: which sizes
   * exist should not depend on where a card happens to sit.
   */
  it("greys out a size the row cannot hold", () => {
    // Three regular cards already fill three of four columns, so the fourth
    // card can be sm, md or rg — never lg, xl or 2xl.
    const items = [card("a"), card("b"), card("c"), card("d")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} onResize={() => {}} />);

    for (const size of ["sm", "md", "rg"] as const) {
      expect(sizeBtn(container, "d", size).disabled, size).toBe(false);
    }
    for (const size of ["lg", "xl", "2xl"] as const) {
      expect(sizeBtn(container, "d", size).disabled, size).toBe(true);
    }
  });

  it("offers a size that exactly fills what the row has left", () => {
    const { container } = render(
      <ChordBoard items={[card("a"), card("b", undefined, true)]} meta={{ columns: 4 }} onResize={() => {}} />,
    );
    // One neighbour on a four-column row, so this card can take the other
    // three — 2xl exactly fills what is left.
    expect(sizeBtn(container, "a", "xl").disabled).toBe(false);
    expect(sizeBtn(container, "a", "2xl").disabled).toBe(false);
  });

  it("never disables the size a card already is", () => {
    // A board narrowed to 2 columns cannot hold a 2xl card, but one already
    // set to 2xl must still show which size it is.
    const { container } = render(
      <ChordBoard items={[card("a", "2xl")]} meta={{ columns: 2 }} onResize={() => {}} />,
    );
    expect(sizeBtn(container, "a", "2xl").disabled).toBe(false);
    expect(sizeBtn(container, "a", "2xl").getAttribute("aria-pressed")).toBe("true");
  });

  it("offers every size when the board has no column count", () => {
    // Without columns there is no row budget to overflow.
    const { container } = render(<ChordBoard items={[card("a")]} onResize={() => {}} />);
    for (const size of BOARD_CARD_SIZES) {
      expect(sizeBtn(container, "a", size).disabled, size).toBe(false);
    }
  });

  it("wraps a card that no longer fits onto the next row", () => {
    // 3 regular + 1 xl on a 4-column board: the xl cannot share, so it starts
    // its own row and is centred there.
    const items = [card("a"), card("b"), card("c"), card("d", "xl")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 4 }} onResize={() => {}} />);

    const placed = container
      .querySelector<HTMLElement>('[data-board-id="d"]')!
      .style.gridColumn;
    expect(placed).toContain("/");
  });
});
