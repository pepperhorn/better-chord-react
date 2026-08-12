import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ChordBoard } from "../src";
import type { BoardItem } from "../src";

const items: BoardItem[] = [
  { id: "a", nl: "C" },
  { id: "b", nl: "Am" },
];

/**
 * A card is styled for two jobs at once. Editing chrome — the selection ring,
 * the edit ring, the drag glow — says what you are working on and must never
 * reach a PNG or PDF. The card border is a print decision and defaults to off.
 *
 * html2canvas captures the live DOM, so the guarantee is a CSS one: while the
 * capture class is on the export root, chrome is neutralised. These tests pin
 * the wiring and the rules; the rendered pixels were verified in a browser.
 */
describe("export chrome", () => {
  it("marks the export root so capture styling can apply", () => {
    const { container } = render(<ChordBoard items={items} selectedId="b" />);
    const root = container.querySelector(".chordl-board-export");
    expect(root).toBeTruthy();
    // Not capturing yet — the class is only added while an export runs.
    expect(root!.classList.contains("chordl-board-export--capturing")).toBe(false);
  });

  it("still marks a selected card, so selection survives an export", () => {
    const { container } = render(<ChordBoard items={items} selectedId="b" />);
    const selected = container.querySelectorAll('[data-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute("data-board-id")).toBe("b");
  });

  it("neutralises chrome and the border under the capture class", () => {
    const { container } = render(<ChordBoard items={items} />);
    const css = Array.from(container.querySelectorAll("style"))
      .map((s) => s.textContent ?? "").join("\n");

    const rule = css.match(
      /\.chordl-board-export--capturing[^{]*\{([^}]*)\}/,
    )?.[1] ?? "";
    expect(rule).toContain("border-color: transparent !important");
    expect(rule).toContain("box-shadow: none !important");
    expect(rule).toContain("animation: none !important");

    // The selected/editing rings set border-color with !important of their own,
    // so the capture rule has to out-specify them by name.
    const selector = css.match(/([^}]*)\{[^}]*border-color: transparent/)?.[1] ?? "";
    expect(selector).toContain(".chordl-board-card--selected");
    expect(selector).toContain(".chordl-board-card--editing");
  });
});
