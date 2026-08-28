import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ChordBoard } from "../src";
import type { BoardItem } from "../src";

const items: BoardItem[] = [{ id: "a", nl: "C" }, { id: "b", nl: "Am" }];

const actionsRow = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".chordl-board-actions")!;

const labels = (container: HTMLElement) =>
  Array.from(actionsRow(container).querySelectorAll("button")).map((b) => b.textContent);

/**
 * Six controls in a row is wider than a card at small scales or in a
 * many-column layout, and a non-wrapping flex row does not shrink to fit — it
 * spills past the card border. Wrapping keeps them inside; centring keeps the
 * short second row from hanging off one edge.
 */
describe("card action row", () => {
  it("wraps its controls instead of overflowing the card", () => {
    const row = actionsRow(render(<ChordBoard items={items} />).container);
    expect(row.style.flexWrap).toBe("wrap");
  });

  it("centres them, so a wrapped row is not lopsided", () => {
    const row = actionsRow(render(<ChordBoard items={items} />).container);
    expect(row.style.justifyContent).toBe("center");
  });

  /**
   * "copy" only filled a clipboard the user then had to paste; "repeat" did the
   * same job in one click. One control named for what it does replaces both.
   */
  it("offers duplicate in place of copy and repeat", () => {
    const { container } = render(<ChordBoard items={items} onDuplicate={() => {}} />);
    expect(labels(container)).toEqual(["edit", "duplicate", "cut", "break", "delete"]);
  });

  it("duplicates the card the control belongs to", () => {
    const onDuplicate = vi.fn();
    const { container } = render(<ChordBoard items={items} onDuplicate={onDuplicate} />);
    fireEvent.click(container.querySelector(".chordl-board-action-duplicate")!);
    expect(onDuplicate).toHaveBeenCalledWith("a");
  });
});
