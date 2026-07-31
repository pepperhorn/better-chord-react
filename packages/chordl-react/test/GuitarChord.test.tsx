import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GuitarChord } from "../src/components/GuitarChord";
import { lookupGuitarChord } from "@pepperhorn/chordl-guitar";

const amShape = lookupGuitarChord("Am")!.shapes[0];

describe("GuitarChord", () => {
  it("draws a diagram into its container", () => {
    const { container } = render(<GuitarChord chord={amShape} />);
    const host = container.querySelector(".bc-guitar-chord")!;
    expect(host).toBeTruthy();
    expect(host.querySelector("svg")).toBeTruthy();
  });

  it("redraws in place instead of appending when the chord changes", () => {
    const cShape = lookupGuitarChord("C")!.shapes[0];
    const { container, rerender } = render(<GuitarChord chord={amShape} />);
    rerender(<GuitarChord chord={cShape} />);
    // The effect clears the node before drawing, so exactly one diagram remains.
    expect(container.querySelectorAll(".bc-guitar-chord svg").length).toBe(1);
  });

  it("renders a 4-string diagram when given ukulele settings", () => {
    const ukeShape = lookupGuitarChord("Am", "ukulele")!.shapes[0];
    const { container } = render(
      <GuitarChord chord={ukeShape} settings={{ strings: 4, tuning: ["G", "C", "E", "A"] }} />,
    );
    expect(container.querySelector(".bc-guitar-chord svg")).toBeTruthy();
  });

  it("does not throw on a shape with no fingers", () => {
    expect(() =>
      render(<GuitarChord chord={{ fingers: [], barres: [] }} />),
    ).not.toThrow();
  });
});
