import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

/** White and black highlighted keys carry different fills (highlight-mapper). */
const HIGHLIGHTS = new Set(["#a0c6e8", "#5a8ab5"]);

const svgOf = (c: HTMLElement) => c.querySelector("svg.bc-keyboard")!;
const keyCount = (c: HTMLElement) => svgOf(c).querySelectorAll("rect").length;
const highlightXs = (c: HTMLElement) =>
  [...svgOf(c).querySelectorAll("rect")]
    .filter((r) => HIGHLIGHTS.has(r.getAttribute("fill") ?? ""))
    .map((r) => r.getAttribute("x"));

/**
 * "chord up 1 octave" used to extend the keyboard by a whole octave — eight
 * white keys became fifteen — and put the chord at the far right of it. On a
 * board the oversized diagram was then shrunk to fit its card and rendered as a
 * letterboxed strip, so the shifted card matched none of its neighbours.
 *
 * The keyboard is a window onto the chord, not a ruler measuring how far it
 * moved: the window moves with the chord and stays the same size. The octave is
 * carried by the staff, by MIDI note names and by playback.
 */
describe("chord octave shift", () => {
  it("draws the same keyboard as the unshifted chord", () => {
    const plain = render(<PianoChord chord="C" />);
    const shifted = render(<PianoChord chord="C chord up 1 octave" />);

    expect(svgOf(shifted.container).getAttribute("viewBox"))
      .toBe(svgOf(plain.container).getAttribute("viewBox"));
    expect(keyCount(shifted.container)).toBe(keyCount(plain.container));
  });

  it("highlights the same keys, in the same places", () => {
    const plain = render(<PianoChord chord="C" />);
    const shifted = render(<PianoChord chord="C chord up 1 octave" />);

    expect(highlightXs(shifted.container)).toHaveLength(3);
    expect(highlightXs(shifted.container)).toEqual(highlightXs(plain.container));
  });

  it("holds for a downward shift too", () => {
    const plain = render(<PianoChord chord="Am7" />);
    const shifted = render(<PianoChord chord="Am7 chord down 1 octave" />);

    expect(svgOf(shifted.container).getAttribute("viewBox"))
      .toBe(svgOf(plain.container).getAttribute("viewBox"));
    expect(highlightXs(shifted.container)).toEqual(highlightXs(plain.container));
  });

  it("still names the shifted octave on the keys", () => {
    // The shift has to stay visible somewhere the keyboard itself can show it.
    // MIDI note names are that place: same keys, an octave higher in name.
    const plain = render(<PianoChord chord="Cmaj7 with midi note names" />);
    const shifted = render(
      <PianoChord chord="Cmaj7 with midi note names chord up 1 octave" />,
    );

    expect(plain.container.textContent).toContain("C5");
    expect(shifted.container.textContent).toContain("C6");
    expect(shifted.container.textContent).not.toContain("C5");
  });
});
