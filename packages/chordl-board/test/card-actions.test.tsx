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

/**
 * A selection is how the app says "your edits land here". Getting into one is a
 * click; getting out of one used to need the strip of board background around
 * the grid, which a full board barely has.
 */
describe("deselecting a card", () => {
  it("selects an unselected card", () => {
    const onSelect = vi.fn();
    const { container } = render(<ChordBoard items={items} onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-board-id="b"]')!);
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("deselects when the selected card is clicked again", () => {
    const onSelect = vi.fn();
    const { container } = render(<ChordBoard items={items} selectedId="b" onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-board-id="b"]')!);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("still moves the selection to a different card", () => {
    const onSelect = vi.fn();
    const { container } = render(<ChordBoard items={items} selectedId="b" onSelect={onSelect} />);
    fireEvent.click(container.querySelector('[data-board-id="a"]')!);
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("clears the selection on Escape", () => {
    const onClearSelection = vi.fn();
    render(<ChordBoard items={items} selectedId="b" onClearSelection={onClearSelection} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("leaves Escape alone when nothing is selected", () => {
    const onClearSelection = vi.fn();
    render(<ChordBoard items={items} onClearSelection={onClearSelection} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("gives Escape to the new-board overlay while it is open", () => {
    const onClearSelection = vi.fn();
    const { container } = render(
      <ChordBoard items={items} selectedId="b" onNew={() => {}} onClearSelection={onClearSelection} />,
    );
    fireEvent.click(container.querySelector(".chordl-board-new")!);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("keeps a click on the action row off the card's own handler", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ChordBoard items={items} selectedId="a" onSelect={onSelect} onDelete={() => {}} />,
    );
    fireEvent.click(container.querySelector(".chordl-board-action-delete")!);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
