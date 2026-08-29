import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

/**
 * "midi note names with degrees" asks for two rows at once. The parser used to
 * drop the degrees clause whenever midi names were active, so the request went
 * silently unanswered. Now it is its own display mode, and both rows have to
 * survive the trip through the renderer: the names keep their octave suffix
 * and the degree row is drawn underneath them.
 */
const textsOf = (container: HTMLElement, selector: string): string[] =>
  [...container.querySelectorAll<HTMLElement>(selector)].map((el) => el.textContent ?? "");

const names = (c: HTMLElement) => textsOf(c, ".bc-note-name");
const degrees = (c: HTMLElement) => textsOf(c, ".bc-degree-label");

describe("midi note names render alongside degrees", () => {
  it("draws both rows", () => {
    const { container } = render(<PianoChord chord="C midi note names with degrees in xl" />);

    expect(names(container).length).toBeGreaterThan(0);
    expect(degrees(container).length).toBeGreaterThan(0);
  });

  it("keeps the octave number on the note names", () => {
    const { container } = render(<PianoChord chord="C midi note names with degrees in xl" />);

    // Every midi name carries its octave: "C4", not "C".
    for (const name of names(container)) expect(name).toMatch(/^[A-G][#b]?\d+$/);
  });

  it("draws the same names it would without the degrees clause", () => {
    const both = render(<PianoChord chord="C midi note names with degrees in xl" />);
    const namesOnly = render(<PianoChord chord="C midi note names" />);

    expect(names(both.container)).toEqual(names(namesOnly.container));
    expect(degrees(namesOnly.container)).toEqual([]);
  });

  it("draws the degrees the chord actually has", () => {
    const { container } = render(<PianoChord chord="C midi note names with degrees" />);

    expect(degrees(container)).toEqual(["I", "III", "V"]);
  });

  it("sizes the degree row by the size the degrees clause named", () => {
    const fontOf = (c: HTMLElement, sel: string) => {
      const el = c.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`no element matched ${sel}`);
      return parseFloat(el.style.fontSize);
    };
    const big = render(<PianoChord chord="C midi note names in base with degrees in 2xl" />);
    const small = render(<PianoChord chord="C midi note names in base with degrees in base" />);

    expect(fontOf(big.container, ".bc-degree-label"))
      .toBeGreaterThan(fontOf(small.container, ".bc-degree-label"));
    // Only the degree size changed; the names stay where they were asked to be.
    expect(fontOf(big.container, ".bc-note-name")).toBe(fontOf(small.container, ".bc-note-name"));
  });

  it("carries the degree row into the export payload", () => {
    const { container } = render(<PianoChord chord="C midi note names with degrees in xl" />);
    const svg = container.querySelector("svg.bc-keyboard")!;
    const data = JSON.parse(svg.getAttribute("data-annotations") ?? "{}");

    expect(data.items.map((it: { note: string }) => it.note)).toEqual(names(container));
    expect(data.items.map((it: { degree: string }) => it.degree)).toEqual(degrees(container));
  });
});
