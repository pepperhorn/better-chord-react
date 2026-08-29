import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

/**
 * Degree labels used to be handed to the keyboard by array position, so any
 * card that rotated its notes ("starting on", inversions) or expanded them
 * (arpeggios) called whatever note came first the root. The labels now follow
 * the pitch, so a rotated card reads III, V, I.
 */
const textsOf = (container: HTMLElement, selector: string): string[] =>
  [...container.querySelectorAll<HTMLElement>(selector)].map((el) => el.textContent ?? "");

const names = (c: HTMLElement) => textsOf(c, ".bc-note-name");
const degrees = (c: HTMLElement) => textsOf(c, ".bc-degree-label");

describe("degree labels follow the rotation", () => {
  it("labels 'C starting on E' as III, V, I", () => {
    const { container } = render(<PianoChord chord="C starting on E note names with degrees" />);

    expect(names(container)).toEqual(["E", "G", "C"]);
    expect(degrees(container)).toEqual(["III", "V", "I"]);
  });

  it("labels 'C starting on G' as V, I, III", () => {
    const { container } = render(<PianoChord chord="C starting on G note names with degrees" />);

    expect(names(container)).toEqual(["G", "C", "E"]);
    expect(degrees(container)).toEqual(["V", "I", "III"]);
  });

  it("labels a first inversion as III, V, I", () => {
    const { container } = render(
      <PianoChord chord="C in first inversion note names with degrees" />,
    );

    expect(degrees(container)).toEqual(["III", "V", "I"]);
  });

  it("leaves a slash chord's own degrees alone", () => {
    const { container } = render(<PianoChord chord="C/E note names with degrees" />);

    expect(names(container)).toEqual(["E", "G", "C"]);
    expect(degrees(container)).toEqual(["III", "V", "8"]);
  });

  it("leaves a root-position triad alone", () => {
    const { container } = render(<PianoChord chord="C note names with degrees" />);

    expect(degrees(container)).toEqual(["I", "III", "V"]);
  });

  it("rotates a degree-only card too", () => {
    const plain = render(<PianoChord chord="C with degrees" />);
    expect(names(plain.container)).toEqual(["I", "III", "V"]);

    const rotated = render(<PianoChord chord="C starting on E with degrees" />);
    expect(names(rotated.container)).toEqual(["III", "V", "I"]);
  });

  it("matches flat-spelled notes to their intervals", () => {
    const { container } = render(
      <PianoChord chord="Bbm starting on Db note names with degrees" />,
    );

    expect(names(container)).toEqual(["Db", "F", "Bb"]);
    expect(degrees(container)).toEqual(["bIII", "V", "I"]);
  });

  it("repeats the pattern across an arpeggio", () => {
    const { container } = render(
      <PianoChord chord="C over 2 octaves note names with degrees" />,
    );

    expect(degrees(container)).toEqual(["I", "III", "V", "I", "III", "V", "I"]);
  });

  it("repeats the rotated pattern across an arpeggio", () => {
    const { container } = render(
      <PianoChord chord="C starting on E over 2 octaves note names with degrees" />,
    );

    expect(degrees(container)).toEqual(["III", "V", "I", "III", "V", "I", "III"]);
  });

  it("labels a style voicing's added tone, root or no root", () => {
    const { container } = render(<PianoChord chord="Cmaj7 rootless note names with degrees" />);

    expect(names(container)).toEqual(["E", "G", "B", "D"]);
    expect(degrees(container)).toEqual(["III", "V", "VII", "IX"]);
  });

  it("leaves a chord's own 2nd, 4th and 6th unraised", () => {
    const sus2 = render(<PianoChord chord="Csus2 note names with degrees" />);
    expect(names(sus2.container)).toEqual(["C", "D", "G"]);
    expect(degrees(sus2.container)).toEqual(["I", "II", "V"]);

    const sus4 = render(<PianoChord chord="Csus4 note names with degrees" />);
    expect(names(sus4.container)).toEqual(["C", "F", "G"]);
    expect(degrees(sus4.container)).toEqual(["I", "IV", "V"]);

    const six = render(<PianoChord chord="C6 note names with degrees" />);
    expect(names(six.container)).toEqual(["C", "E", "G", "A"]);
    expect(degrees(six.container)).toEqual(["I", "III", "V", "VI"]);
  });

  it("draws no question mark under a bass note below the root", () => {
    const overF = render(<PianoChord chord="C/F note names with degrees" />);
    expect(degrees(overF.container)).toEqual(["XI", "I", "III", "V"]);

    const overBb = render(<PianoChord chord="C/Bb note names with degrees" />);
    expect(degrees(overBb.container)).toEqual(["bVII", "I", "III", "V"]);

    // Degree-only mode puts the labels in the note-name row, which is where
    // the stray "?" was actually visible.
    const only = render(<PianoChord chord="C/F with degrees" />);
    expect(names(only.container)).not.toContain("?");
  });

  it("carries the rotated degrees into the export payload", () => {
    const { container } = render(<PianoChord chord="C starting on E note names with degrees" />);
    const svg = container.querySelector("svg.bc-keyboard")!;
    const data = JSON.parse(svg.getAttribute("data-annotations") ?? "{}");

    expect(data.items.map((it: { degree: string }) => it.degree)).toEqual(degrees(container));
  });
});
