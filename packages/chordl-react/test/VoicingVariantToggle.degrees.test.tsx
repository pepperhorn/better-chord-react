import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { VoicingVariantToggle } from "../src/components/VoicingVariantToggle";

/**
 * Every variant past the first is rendered from a chord string the toggle
 * rebuilds itself, so anything the rebuild forgets to write down is dropped the
 * moment the user clicks a pill. The degrees clause was never written down: the
 * degree row and its size vanished on the first click, and a degree-only card
 * came back as a plain pitch-class one because the rebuild emitted the literal
 * "note names" for every mode that wasn't midi.
 */
const textsOf = (container: HTMLElement, selector: string): string[] =>
  [...container.querySelectorAll<HTMLElement>(selector)].map((el) => el.textContent ?? "");

const names = (c: HTMLElement) => textsOf(c, ".bc-note-name");
const degrees = (c: HTMLElement) => textsOf(c, ".bc-degree-label");

const pills = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLButtonElement>("button.variant-pill")];

/** Throws rather than returning null: a size that measures nothing proves nothing. */
const fontOf = (container: HTMLElement, selector: string): number => {
  const el = container.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`no element matched ${selector}`);
  const size = parseFloat(el.style.fontSize);
  if (!Number.isFinite(size)) throw new Error(`${selector} has no font size`);
  return size;
};

/** Click the second variant pill — the first click that goes through the rebuild. */
const selectSecondVariant = (container: HTMLElement) => {
  const all = pills(container);
  expect(all.length).toBeGreaterThan(1);
  fireEvent.click(all[1]);
};

describe("variant switching keeps the degree row", () => {
  it("still draws degrees after switching variants", () => {
    const { container } = render(
      <VoicingVariantToggle chord="C note names with degrees" />,
    );
    expect(degrees(container)).toEqual(["I", "III", "V"]);

    selectSecondVariant(container);

    expect(degrees(container).length).toBeGreaterThan(0);
  });

  it("keeps the degree row at the size it was asked for", () => {
    const { container } = render(
      <VoicingVariantToggle chord="C note names in base with degrees in 2xl" />,
    );
    const before = fontOf(container, ".bc-degree-label");

    selectSecondVariant(container);

    expect(fontOf(container, ".bc-degree-label")).toBe(before);
  });

  it("keeps the note names alongside the degrees", () => {
    const { container } = render(
      <VoicingVariantToggle chord="C note names with degrees" />,
    );
    selectSecondVariant(container);

    expect(names(container).length).toBeGreaterThan(0);
    for (const name of names(container)) expect(name).toMatch(/^[A-G][#b]?$/);
  });

  it("keeps midi note names alongside the degrees", () => {
    const { container } = render(
      <VoicingVariantToggle chord="C midi note names with degrees" />,
    );
    expect(degrees(container).length).toBeGreaterThan(0);

    selectSecondVariant(container);

    expect(degrees(container).length).toBeGreaterThan(0);
    // Every midi name still carries its octave: "C4", not "C".
    for (const name of names(container)) expect(name).toMatch(/^[A-G][#b]?\d+$/);
  });
});

describe("the degrees clause sits alongside the other modifiers", () => {
  it("does not crowd out the fingering row", () => {
    const { container } = render(
      <VoicingVariantToggle chord="C note names with degrees in lg with fingering" />,
    );
    selectSecondVariant(container);

    expect(degrees(container).length).toBeGreaterThan(0);
    expect(textsOf(container, ".bc-fingering").length).toBeGreaterThan(0);
  });
});

describe("degree-only stays degree-only", () => {
  it("labels the keys with degrees, not note names, before switching", () => {
    const { container } = render(<VoicingVariantToggle chord="C with degrees" />);

    expect(names(container)).toEqual(["I", "III", "V"]);
  });

  it("labels the keys with degrees, not note names, after switching", () => {
    const { container } = render(<VoicingVariantToggle chord="C with degrees" />);

    selectSecondVariant(container);

    const labels = names(container);
    expect(labels.length).toBeGreaterThan(0);
    // Roman numerals, never pitch classes — "note names" must not have crept in.
    for (const label of labels) expect(label).toMatch(/^[b#]?[IViv]+$/);
  });

  it("keeps the degree size on a degree-only card across a switch", () => {
    const big = render(<VoicingVariantToggle chord="C with degrees in 2xl" />);
    const small = render(<VoicingVariantToggle chord="C with degrees in base" />);

    selectSecondVariant(big.container);
    selectSecondVariant(small.container);

    expect(fontOf(big.container, ".bc-note-name"))
      .toBeGreaterThan(fontOf(small.container, ".bc-note-name"));
  });
});
