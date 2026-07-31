import { describe, it, expect } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import { GuitarChordPanel } from "../src/components/GuitarChordPanel";

/** The Guitar/Ukulele pills are the first button row in the panel. */
function instrumentButtons(container: HTMLElement) {
  const guitar = within(container).getByText("Guitar").closest("button")!;
  const ukulele = within(container).getByText("Ukulele").closest("button")!;
  return { guitar, ukulele };
}

/** Alternate-placement buttons are labelled A/B/C… plus a "fret N" caption. */
function positionButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button")).filter((b) =>
    /^fret \d+$/.test(b.querySelectorAll("span")[1]?.textContent ?? ""),
  );
}

describe("GuitarChordPanel", () => {
  it("renders a diagram and the instrument toggle for a known chord", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    expect(container.querySelector(".bc-guitar-chord")).toBeTruthy();
    const { guitar, ukulele } = instrumentButtons(container);
    expect(guitar.dataset.active).toBe("true");
    expect(ukulele.dataset.active).toBe("false");
  });

  it("shows a notice in scale mode instead of a diagram", () => {
    const { container } = render(<GuitarChordPanel chord="C major scale" />);
    expect(container.textContent).toContain("switch off scale mode");
    expect(container.querySelector(".bc-guitar-chord")).toBeNull();
  });

  it("shows a notice when no chord has been entered", () => {
    const { container } = render(<GuitarChordPanel chord="" />);
    expect(container.textContent).toContain("Enter a chord");
  });

  it("keeps the instrument toggle visible when a shape is missing", () => {
    // chords-db ships no slash-bass shapes for ukulele, so C/E is guitar-only.
    const { container } = render(<GuitarChordPanel chord="C/E" instrument="ukulele" />);
    expect(container.textContent).toContain("No ukulele shape found");
    // The toggle must still render, otherwise the user is stranded.
    expect(instrumentButtons(container).guitar).toBeTruthy();
  });

  it("switches instrument when the toggle is clicked", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    fireEvent.click(instrumentButtons(container).ukulele);
    const { guitar, ukulele } = instrumentButtons(container);
    expect(ukulele.dataset.active).toBe("true");
    expect(guitar.dataset.active).toBe("false");
  });

  it("follows the instrument prop when the host changes it", () => {
    const { container, rerender } = render(
      <GuitarChordPanel chord="Am" instrument="guitar" />,
    );
    expect(instrumentButtons(container).guitar.dataset.active).toBe("true");
    rerender(<GuitarChordPanel chord="Am" instrument="ukulele" />);
    expect(instrumentButtons(container).ukulele.dataset.active).toBe("true");
  });

  it("selects an alternate placement and resets it when the chord changes", () => {
    const { container, rerender } = render(<GuitarChordPanel chord="Am" />);
    const positions = positionButtons(container);
    expect(positions.length).toBeGreaterThan(1); // Am has alternate placements

    fireEvent.click(positions[1]);
    expect(positionButtons(container)[1].dataset.active).toBe("true");

    rerender(<GuitarChordPanel chord="C" />);
    expect(positionButtons(container)[0].dataset.active).toBe("true");
  });

  it("resets the selected placement when the instrument changes", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    fireEvent.click(positionButtons(container)[1]);
    expect(positionButtons(container)[1].dataset.active).toBe("true");

    fireEvent.click(instrumentButtons(container).ukulele);
    expect(positionButtons(container)[0].dataset.active).toBe("true");
  });

  it("prefers an explicit title over the chord label as heading", () => {
    const { container } = render(<GuitarChordPanel chord="Am" title="First shape" />);
    expect(container.textContent).toContain("First shape");
  });
});
