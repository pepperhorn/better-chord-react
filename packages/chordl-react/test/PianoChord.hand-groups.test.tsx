import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

const HIGHLIGHT = "#a0c6e8";

/** Count highlighted key rects in the rendered keyboard. */
function highlightedKeys(container: HTMLElement): number {
  return [...container.querySelectorAll("rect")].filter(
    (r) => r.getAttribute("fill") === HIGHLIGHT,
  ).length;
}

/** Rendered note labels, in order. Ask for MIDI names to read octaves back. */
function noteLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll(".bc-note-name")].map((n) => n.textContent ?? "");
}

/** Bracket labels with the x of their label text, left to right. */
function brackets(container: HTMLElement): { label: string; x: number }[] {
  return [...container.querySelectorAll("svg text")]
    .filter((t) => t.textContent === "L.H." || t.textContent === "R.H.")
    .map((t) => ({ label: t.textContent!, x: Number(t.getAttribute("x")) }));
}

describe("PianoChord hand groups", () => {
  it("puts the LH group below the RH group instead of on top of it", () => {
    const { container } = render(<PianoChord chord="Rh c d e LH c e" />);
    // 3 RH keys (C4 D4 E4) + 2 LH keys (C3 E3) — before the octave fix the
    // LH notes landed on the RH keys and only 3 showed.
    expect(highlightedKeys(container)).toBe(5);
    const [lh, rh] = brackets(container);
    expect(lh.label).toBe("L.H.");
    expect(rh.label).toBe("R.H.");
    expect(lh.x).toBeLessThan(rh.x);
  });

  it("renders the same whichever hand comes first in the string", () => {
    const rhFirst = render(<PianoChord chord="Rh c d e LH c e" />);
    const lhFirst = render(<PianoChord chord="LH c e Rh c d e" />);
    expect(highlightedKeys(lhFirst.container)).toBe(highlightedKeys(rhFirst.container));
    expect(brackets(lhFirst.container)).toEqual(brackets(rhFirst.container));
  });

  it("renders a chord symbol given per hand", () => {
    const { container } = render(<PianoChord chord="lh Cmaj7 rh Dm7" />);
    // Cmaj7 (C3 E3 G3 B3) + Dm7 (D4 F4 A4 C5) = 8 keys.
    expect(highlightedKeys(container)).toBe(8);
    expect(brackets(container).map((b) => b.label)).toEqual(["L.H.", "R.H."]);
  });

  it("keeps the hands an octave apart", () => {
    const { container } = render(<PianoChord chord="rh c d e lh c e with midi note names" />);
    expect(noteLabels(container)).toEqual(["C3", "E3", "C4", "D4", "E4"]);
  });

  it("lifts the RH clear of an LH group that wraps into its octave", () => {
    // "lh Dm7" resolves D3 F3 A3 C4 — the C4 that "rh Cmaj7" would start on.
    const { container } = render(<PianoChord chord="rh Cmaj7 lh Dm7 with midi note names" />);
    expect(noteLabels(container)).toEqual(["D3", "F3", "A3", "C4", "C5", "E5", "G5", "B5"]);
    expect(highlightedKeys(container)).toBe(8);
  });

  it("lifts the RH when the default octaves would crowd the LH", () => {
    // A3 B3 leaves C4 only three semitones up — not a hand's worth of space.
    const { container } = render(<PianoChord chord="rh c d e lh a b with midi note names" />);
    expect(noteLabels(container)).toEqual(["A3", "B3", "C5", "D5", "E5"]);
  });

  it("leaves a comfortable spread alone", () => {
    const { container } = render(<PianoChord chord="rh e g b lh c e g with midi note names" />);
    expect(noteLabels(container)).toEqual(["C3", "E3", "G3", "E4", "G4", "B4"]);
  });

  it("honors octaves the request pins itself", () => {
    const { container } = render(
      <PianoChord chord="notes C3 E3 in lh and notes C4 E4 in rh with midi note names" />,
    );
    expect(noteLabels(container)).toEqual(["C3", "E3", "C4", "E4"]);
  });

  it("leaves a bass/treble clef pair where the clefs put it", () => {
    const { container } = render(
      <PianoChord chord="notes C E G in the bass clef and notes B D F in the treble clef with midi note names" />,
    );
    expect(noteLabels(container)).toEqual(["C3", "E3", "G3", "B4", "D5", "F5"]);
  });

  it("labels a per-hand chord request with its chord symbols", () => {
    const { container } = render(<PianoChord chord="lh Cmaj7 rh Dm7" showChordName />);
    expect(container.textContent).toContain("Cmaj7 / Dm7");
  });
});
