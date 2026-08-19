import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

/** White and black highlighted keys carry different fills (highlight-mapper). */
const HIGHLIGHTS = new Set(["#a0c6e8", "#5a8ab5"]);

function highlightedKeys(container: HTMLElement): number {
  return [...container.querySelectorAll("rect")].filter((r) =>
    HIGHLIGHTS.has(r.getAttribute("fill") ?? ""),
  ).length;
}

describe("starting-on note matching is enharmonic", () => {
  // `notes` keeps the chord's own spelling — Bbm is ["Bb", "Db", "F"] — while
  // the requested note was normalised to sharps, so the two never matched.
  // The thrown message listed "3rd (Db)" as available while refusing Db.
  it("accepts the flat spelling the chord itself uses", () => {
    const { container } = render(<PianoChord chord="Bbm starting on Db" />);
    expect(highlightedKeys(container)).toBe(3);
  });

  it("accepts the sharp spelling of the same pitch", () => {
    const { container } = render(<PianoChord chord="Bbm starting on C#" />);
    expect(highlightedKeys(container)).toBe(3);
  });

  it("leaves an all-naturals chord working as before", () => {
    const { container } = render(<PianoChord chord="Am starting on C" />);
    expect(highlightedKeys(container)).toBe(3);
  });

  it("still rejects a note that genuinely is not in the chord", () => {
    expect(() => render(<PianoChord chord="Bbm starting on E" />)).toThrow(/E isn't in Bbm/);
  });

  it("names the chord's own spelling when it rejects a note", () => {
    // The message is built from `notes`, so it must keep saying Db, not C#.
    expect(() => render(<PianoChord chord="Bbm starting on E" />)).toThrow(/3rd \(Db\)/);
  });
});
