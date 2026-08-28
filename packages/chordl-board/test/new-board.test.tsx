import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ChordBoard } from "../src";
import type { BoardItem } from "../src";

const items: BoardItem[] = [
  { id: "a", nl: "C" },
  { id: "b", nl: "Am" },
];

const meta = { title: "Practice sheet" };

const openOverlay = (container: HTMLElement) => {
  const btn = container.querySelector(".chordl-board-new") as HTMLButtonElement;
  fireEvent.click(btn);
  return document.querySelector(".chordl-board-new-overlay") as HTMLElement;
};

beforeEach(() => {
  // The JSON path builds a Blob URL and clicks an anchor; jsdom has neither.
  URL.createObjectURL = vi.fn(() => "blob:new-board");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => vi.restoreAllMocks());

/**
 * Clearing a board is destructive and unrecoverable — there is no undo and the
 * only copy lives in localStorage. So the button never clears on its own: it
 * opens an overlay whose default focus is Cancel, and the only paths out are
 * explicit.
 */
describe("New board", () => {
  it("offers the button in the toolbar beside the export controls", () => {
    const { container } = render(<ChordBoard items={items} onNew={() => {}} />);
    const btn = container.querySelector(".chordl-board-new");
    expect(btn).toBeTruthy();
    expect(btn!.closest(".chordl-board-toolbar")).toBeTruthy();
  });

  it("disables the button when the board is already empty", () => {
    const { container } = render(<ChordBoard items={[]} onNew={() => {}} />);
    const btn = container.querySelector(".chordl-board-new") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("names the board settings rather than a title it does not have", () => {
    // A column count is a setting, not content the user wrote. Saying "title"
    // for a board with none promises something the clear cannot deliver.
    const { container } = render(
      <ChordBoard items={items} meta={{ columns: 4 }} onNew={() => {}} />,
    );
    const overlay = openOverlay(container);
    expect(overlay.textContent).toContain("2 cards and the board settings");
    expect(overlay.textContent).not.toContain("board title");
  });

  it("enables the button when a board title is the only thing to clear", () => {
    // Meta is part of the board: a titled but cardless board is not blank.
    const { container } = render(<ChordBoard items={[]} meta={meta} onNew={() => {}} />);
    const btn = container.querySelector(".chordl-board-new") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("omits the button entirely when the host wires no handler", () => {
    const { container } = render(<ChordBoard items={items} />);
    expect(container.querySelector(".chordl-board-new")).toBeNull();
  });

  it("counts the live cards in the warning, so the message never lies", () => {
    const { container } = render(<ChordBoard items={items} meta={meta} onNew={() => {}} />);
    const overlay = openOverlay(container);
    expect(overlay.textContent).toContain("2 cards");
    expect(overlay.textContent).toContain("board title");
  });

  it("gives Cancel default focus, so a stray Enter never wipes a board", () => {
    const { container } = render(<ChordBoard items={items} onNew={() => {}} />);
    openOverlay(container);
    expect(document.activeElement).toBe(
      document.querySelector(".chordl-board-new-cancel"),
    );
  });

  it("clears without saving when that button is chosen", () => {
    const onNew = vi.fn();
    const { container } = render(<ChordBoard items={items} meta={meta} onNew={onNew} />);
    const overlay = openOverlay(container);
    fireEvent.click(overlay.querySelector(".chordl-board-new-clear")!);
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".chordl-board-new-overlay")).toBeNull();
  });

  it("downloads the board as JSON before clearing when asked to", async () => {
    const onNew = vi.fn();
    const { container } = render(<ChordBoard items={items} meta={meta} onNew={onNew} />);
    const overlay = openOverlay(container);
    fireEvent.click(overlay.querySelector(".chordl-board-new-save")!);
    await waitFor(() => expect(onNew).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("leaves the board untouched on Cancel", () => {
    const onNew = vi.fn();
    const { container } = render(<ChordBoard items={items} onNew={onNew} />);
    const overlay = openOverlay(container);
    fireEvent.click(overlay.querySelector(".chordl-board-new-cancel")!);
    expect(onNew).not.toHaveBeenCalled();
    expect(document.querySelector(".chordl-board-new-overlay")).toBeNull();
  });

  it("cancels on Escape and on a backdrop click", () => {
    const onNew = vi.fn();
    const { container } = render(<ChordBoard items={items} onNew={onNew} />);

    const overlay = openOverlay(container);
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(document.querySelector(".chordl-board-new-overlay")).toBeNull();

    const reopened = openOverlay(container);
    fireEvent.click(reopened);
    expect(document.querySelector(".chordl-board-new-overlay")).toBeNull();
    expect(onNew).not.toHaveBeenCalled();
  });

  it("says one card, not 1 cards", () => {
    const { container } = render(<ChordBoard items={[items[0]]} onNew={() => {}} />);
    const overlay = openOverlay(container);
    expect(overlay.textContent).toContain("1 card");
    expect(overlay.textContent).not.toContain("1 cards");
  });
});
