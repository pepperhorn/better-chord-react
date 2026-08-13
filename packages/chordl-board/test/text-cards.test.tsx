import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ChordBoard } from "../src";
import type { BoardItem } from "../src";
// Deep import: the icon registry is not part of the package's public surface,
// and the point here is to render an id that really exists rather than one this
// test guessed and would keep passing after it was renamed.
import { BOARD_ICONS } from "../src/icons";

/**
 * A text card is the first card that is not a chord, so every one of these
 * tests is really the same test: the chord path is never reached. The board
 * used to assume `nl` existed and a diagram would render — a text card that
 * slips into either assumption shows up here as a thrown render or an error
 * boundary message, not as a subtly wrong card.
 */

/** 1x1 transparent GIF — the smallest thing that is honestly a data image. */
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const chord = (id: string, nl: string): BoardItem => ({ id, nl });
const text = (id: string, patch: Partial<BoardItem> = {}): BoardItem => ({
  id,
  kind: "text",
  title: `title-${id}`,
  ...patch,
});

/** The boundary renders its label plus the error message when a card throws. */
function boundaryTripped(container: HTMLElement): boolean {
  return container.textContent?.includes("Cannot read") === true
    || container.querySelector('[data-board-id] div[style*="rgb(185, 28, 28)"]') !== null;
}

describe("text cards", () => {
  it("renders chord and text cards together, in board order", () => {
    const items = [chord("a", "C"), text("b"), chord("c", "Am")];
    const { container } = render(<ChordBoard items={items} />);

    const ids = Array.from(container.querySelectorAll("[data-board-id]")).map((el) =>
      el.getAttribute("data-board-id"),
    );
    expect(ids).toEqual(["a", "b", "c"]);

    const textCard = container.querySelector('[data-board-id="b"]');
    expect(textCard!.querySelector(".chordl-board-card-text")).toBeTruthy();
    expect(textCard!.textContent).toContain("title-b");
  });

  /**
   * The spec's acceptance criterion, and the reason `kind` is checked before
   * anything else: no diagram, and no boundary trip on the way to not drawing
   * one.
   */
  it("draws no chord diagram for a text card and does not trip the error boundary", () => {
    const { container } = render(<ChordBoard items={[text("t")]} />);
    const card = container.querySelector('[data-board-id="t"]')!;

    // Scoped to the card's content: the drag handle is an SVG too, and it is
    // chrome, not a diagram.
    const stack = card.querySelector(".chordl-board-card-text")!;
    expect(stack.querySelector("svg")).toBeNull();
    expect(card.querySelector(".chordl-board-card-guitar")).toBeNull();
    expect(card.querySelector(".chordl-board-card-missing-chord")).toBeNull();
    expect(boundaryTripped(container)).toBe(false);
  });

  it("renders title, subheading and footer in that order", () => {
    const items = [text("t", { title: "Verse", subheading: "8 bars", footerText: "repeat" })];
    const { container } = render(<ChordBoard items={items} />);
    const stack = container.querySelector(".chordl-board-card-text")!;

    const rendered = Array.from(stack.children).map((el) => el.textContent);
    expect(rendered).toEqual(["Verse", "8 bars", "repeat"]);
  });

  /**
   * The security property is the element, not the content: io.ts admits
   * `data:image/svg+xml`, which executes script inside <object>/<iframe>/
   * <embed> and is inert inside <img>. Asserting the tag name is what stops a
   * later "improvement" from silently turning an imported board into an XSS.
   */
  it("renders an image as an <img>, never an active embed", () => {
    const { container } = render(<ChordBoard items={[text("t", { image: PIXEL })]} />);
    const card = container.querySelector('[data-board-id="t"]')!;

    const img = card.querySelector(".chordl-board-card-image")!;
    expect(img).toBeTruthy();
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe(PIXEL);

    expect(card.querySelector("object, iframe, embed")).toBeNull();
    expect(card.innerHTML).not.toContain("<svg xmlns");
  });

  it("renders a known icon and survives an unknown icon id", () => {
    expect(BOARD_ICONS.length).toBeGreaterThan(0);
    const { container: known } = render(
      <ChordBoard items={[text("t", { icon: BOARD_ICONS[0].id })]} />,
    );
    expect(known.querySelector(".chordl-board-card-icon")).toBeTruthy();
    expect(boundaryTripped(known)).toBe(false);

    const { container } = render(
      <ChordBoard items={[text("u", { icon: "obj:definitely-not-a-real-icon" })]} />,
    );
    const card = container.querySelector('[data-board-id="u"]')!;
    expect(card.querySelector(".chordl-board-card-icon")).toBeNull();
    expect(card.textContent).toContain("title-u");
    expect(boundaryTripped(container)).toBe(false);
  });

  it("names a text card in the clipboard strip, which used to print its nl", () => {
    const { container } = render(
      <ChordBoard items={[]} clipboard={text("t", { title: "Chorus" })} />,
    );
    expect(container.querySelector(".chordl-board-clipboard-label")!.textContent).toBe("Chorus");
  });

  it("falls back to a readable name for a titleless text card", () => {
    const { container } = render(
      <ChordBoard items={[]} clipboard={{ id: "t", kind: "text" }} />,
    );
    expect(container.querySelector(".chordl-board-clipboard-label")!.textContent).toBe("text card");
  });

  it("adds a text card from the toolbar", () => {
    const onAddTextCard = vi.fn();
    const { container, getByTitle } = render(
      <ChordBoard items={[]} onAddTextCard={onAddTextCard} />,
    );
    expect(container.querySelector(".chordl-board-add-text")!.textContent).toBe("+ Text");

    fireEvent.click(getByTitle("Add a text card"));
    expect(onAddTextCard).toHaveBeenCalledTimes(1);
  });

  it("hides the add button when no handler is wired", () => {
    const { container } = render(<ChordBoard items={[]} />);
    expect(container.querySelector(".chordl-board-add-text")).toBeNull();
  });
});

describe("line breaks", () => {
  it("emits a break element after a card that carries one, and only that card", () => {
    const items = [chord("a", "C"), { ...chord("b", "Am"), breakAfter: true }, chord("c", "G")];
    const { container } = render(<ChordBoard items={items} />);

    const breaks = container.querySelectorAll(".chordl-board-break");
    expect(breaks).toHaveLength(1);
    expect(breaks[0].getAttribute("data-break-after")).toBe("b");

    // A sibling, not a wrapper: the break follows the card it belongs to.
    expect(breaks[0].previousElementSibling!.getAttribute("data-board-id")).toBe("b");
  });

  it("spans the row in the grid case", () => {
    const items = [{ ...chord("a", "C"), breakAfter: true }, chord("b", "G")];
    const { container } = render(<ChordBoard items={items} meta={{ columns: 3 }} />);

    const brk = container.querySelector(".chordl-board-break") as HTMLElement;
    expect(brk).toBeTruthy();
    expect(brk.style.gridColumn).toBe("1 / -1");
    expect(brk.style.height).toBe("0px");
  });

  it("fills the line in the flex-wrap case", () => {
    const items = [{ ...chord("a", "C"), breakAfter: true }, chord("b", "G")];
    const { container } = render(<ChordBoard items={items} />);

    const brk = container.querySelector(".chordl-board-break") as HTMLElement;
    expect(brk).toBeTruthy();
    expect(brk.style.flexBasis).toBe("100%");
    expect(brk.style.height).toBe("0px");
    expect(brk.style.gridColumn).toBe("");
  });

  /**
   * The whole reason a break is a rendered sibling rather than a layout mode:
   * with nothing after it, it is an empty element and nothing else.
   */
  it("is harmless on the last card", () => {
    const items = [chord("a", "C"), { ...text("b"), breakAfter: true }];
    const { container } = render(<ChordBoard items={items} />);

    const breaks = container.querySelectorAll(".chordl-board-break");
    expect(breaks).toHaveLength(1);
    expect(breaks[0].nextElementSibling).toBeNull();
    expect(container.querySelectorAll("[data-board-id]")).toHaveLength(2);
    expect(boundaryTripped(container)).toBe(false);
  });

  it("toggles the break from the card action row", () => {
    const onToggleBreak = vi.fn();
    const items = [chord("a", "C"), { ...chord("b", "Am"), breakAfter: true }];
    const { container } = render(<ChordBoard items={items} onToggleBreak={onToggleBreak} />);

    const buttons = container.querySelectorAll(".chordl-board-action-break");
    expect(buttons).toHaveLength(2);

    // The toggle has to read as on/off, or a break — which is invisible by
    // design — cannot be seen at all.
    expect(buttons[0].getAttribute("aria-pressed")).toBe("false");
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1].classList.contains("chordl-board-action-break--on")).toBe(true);

    fireEvent.click(buttons[0]);
    expect(onToggleBreak).toHaveBeenCalledWith("a");
  });
});
