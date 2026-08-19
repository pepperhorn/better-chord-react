import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { BoardIcon, BOARD_ICONS, BOARD_ICON_PREFIXES, isBoardIconId } from "../src/icons";

/**
 * The glyphs are path data typed into a source file, so the defect that
 * actually happens is a truncated or mistyped `d` — a card that silently draws
 * nothing. These tests are mostly about proving every id still draws ink, and
 * are imported from ../src/icons rather than the barrel so a churning index.ts
 * cannot take them down with it.
 */
describe("board icons", () => {
  it("draws something for every id in the set", () => {
    expect(BOARD_ICONS.length).toBeGreaterThan(0);
    for (const def of BOARD_ICONS) {
      const { container } = render(<BoardIcon id={def.id} />);
      const svg = container.querySelector("svg");
      expect(svg, `${def.id} rendered no svg`).toBeTruthy();
      expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");

      const paths = Array.from(svg!.querySelectorAll("path"));
      expect(paths.length, `${def.id} has no shapes`).toBeGreaterThan(0);
      for (const p of paths) {
        const d = p.getAttribute("d") ?? "";
        // A path that does not start with a moveto draws nothing at all, and
        // "NaN"/"undefined" is what a botched generated coordinate looks like.
        expect(d.startsWith("M"), `${def.id} has a path that starts "${d.slice(0, 8)}"`).toBe(true);
        expect(d.length, `${def.id} has a stub path`).toBeGreaterThan(8);
        expect(d).not.toMatch(/NaN|undefined|null/);
      }
    }
  });

  it("gives every icon a unique, prefixed id and a label", () => {
    const ids = BOARD_ICONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of BOARD_ICONS) {
      expect(BOARD_ICON_PREFIXES.some((p) => def.id.startsWith(p)), def.id).toBe(true);
      // The prefix is the category, so a picker can group on either one.
      expect(def.id.startsWith(`${def.category}:`)).toBe(true);
      expect(def.label.trim().length).toBeGreaterThan(0);
      expect(isBoardIconId(def.id)).toBe(true);
    }
  });

  it("renders nothing for an unknown id instead of throwing", () => {
    // An imported board is untrusted: a stale id, a bogus one, and junk.
    for (const id of ["music:noSuchGlyph", "obj:", "lucide:guitar", "", "trebleClef"]) {
      const { container } = render(<BoardIcon id={id} />);
      expect(container.firstChild, `${id} should render null`).toBeNull();
    }
  });

  it("accepts a well-formed id it cannot yet draw, and rejects non-ids", () => {
    // Forward compatibility: an id from a newer chordl round-trips through io
    // rather than being dropped, even though nothing renders here yet.
    expect(isBoardIconId("music:notInventedYet")).toBe(true);
    expect(isBoardIconId("guitar")).toBe(false);
    expect(isBoardIconId(42)).toBe(false);
    expect(isBoardIconId(null)).toBe(false);
    expect(isBoardIconId(undefined)).toBe(false);
    expect(isBoardIconId({ id: "music:sharp" })).toBe(false);
  });

  it("names the glyph when given a title, and hides it when not", () => {
    const titled = render(<BoardIcon id="music:trebleClef" title="Treble clef" />);
    const named = within(titled.container).getByRole("img", { name: "Treble clef" });
    expect(named.querySelector("title")?.textContent).toBe("Treble clef");
    expect(named.getAttribute("aria-hidden")).toBeNull();

    const bare = render(<BoardIcon id="music:trebleClef" />);
    const svg = bare.container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.querySelector("title")).toBeNull();
  });

  it("applies size and colour, and defaults to 32px of currentColor", () => {
    const { container } = render(<BoardIcon id="obj:guitar" size={48} color="#ff0000" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.getAttribute("height")).toBe("48");
    // A stroke glyph carries the colour on stroke, a music glyph on fill.
    expect(svg.getAttribute("stroke")).toBe("#ff0000");
    const music = render(<BoardIcon id="music:sharp" color="#ff0000" />).container.querySelector("svg")!;
    expect(music.getAttribute("fill")).toBe("#ff0000");

    const dflt = render(<BoardIcon id="music:sharp" />).container.querySelector("svg")!;
    expect(dflt.getAttribute("width")).toBe("32");
    expect(dflt.getAttribute("height")).toBe("32");
    expect(dflt.getAttribute("fill")).toBe("currentColor");
  });

  it("keeps a contextual class and merges the caller's", () => {
    const { container } = render(<BoardIcon id="obj:piano" className="text-card-icon" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toBe("chordl-board-icon chordl-board-icon--obj text-card-icon");
  });
});
