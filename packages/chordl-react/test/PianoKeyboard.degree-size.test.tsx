import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

const fontOf = (container: HTMLElement, selector: string) => {
  const el = container.querySelector<HTMLElement>(selector);
  return el ? parseFloat(el.style.fontSize) : null;
};

const nameFont = (c: HTMLElement) => fontOf(c, ".bc-note-label, .bc-annotation-cell span");
const degreeFont = (c: HTMLElement) => fontOf(c, ".bc-degree-label");

/**
 * "note names in xl with degrees in lg" is one request with two sizes in it.
 * Both landed in the same field, so the second overwrote the first and the note
 * names were silently demoted to the degrees' size.
 */
describe("degree labels have their own size", () => {
  it("draws the note names at the size they were asked for", () => {
    const both = render(<PianoChord chord="C note names in xl with degrees in lg" />);
    const namesOnly = render(<PianoChord chord="C note names in xl" />);

    expect(nameFont(both.container)).toBe(nameFont(namesOnly.container));
  });

  it("draws the degrees at their own size, not the note names'", () => {
    const big = render(<PianoChord chord="C note names in xl with degrees in 2xl" />);
    const small = render(<PianoChord chord="C note names in xl with degrees in base" />);

    expect(degreeFont(big.container)).toBeGreaterThan(degreeFont(small.container)!);
    // The note names are the same in both: only the degree size changed.
    expect(nameFont(big.container)).toBe(nameFont(small.container));
  });

  it("keeps the degree row secondary to the name row at equal sizes", () => {
    const { container } = render(<PianoChord chord="C note names in lg with degrees in lg" />);
    expect(degreeFont(container)).toBeLessThan(nameFont(container)!);
  });

  it("falls back to the note-name size when degrees carry none", () => {
    const withSize = render(<PianoChord chord="C note names in xl with degrees in xl" />);
    const without = render(<PianoChord chord="C note names in xl with degrees" />);

    expect(degreeFont(without.container)).toBe(degreeFont(withSize.container));
  });

  it("sizes a degree-only chord by its degree size", () => {
    const big = render(<PianoChord chord="C with degrees in 2xl" />);
    const small = render(<PianoChord chord="C with degrees in base" />);

    expect(nameFont(big.container)).toBeGreaterThan(nameFont(small.container)!);
  });
});
