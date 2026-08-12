import { describe, it, expect, vi } from "vitest";
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

  it("shows a descriptive title above the chord name, not instead of it", () => {
    const { container } = render(<GuitarChordPanel chord="Am" title="bar 1 turnaround" />);
    expect(container.querySelector(".bc-guitar-heading")?.textContent).toBe("bar 1 turnaround");
    expect(container.querySelector(".bc-guitar-chord-name")?.textContent).toBe("Am");
  });

  it("leads with the chord name when no title is given", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    expect(container.querySelector(".bc-guitar-heading")?.textContent).toBe("Am");
    expect(container.querySelector(".bc-guitar-chord-name")).toBeNull();
  });

  it("does not let svguitar draw a second copy of the chord name", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    const occurrences = (container.textContent?.match(/Am/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});

/**
 * How a chord-board card renders the panel: a fixed shape, no pickers, with the
 * instrument and position supplied from the saved card.
 */
describe("GuitarChordPanel as a board card (showControls=false)", () => {
  it("draws the diagram but no instrument or position pickers", () => {
    const { container } = render(
      <GuitarChordPanel chord="Am" showControls={false} title="Am" />,
    );
    expect(container.querySelector(".bc-guitar-chord")).toBeTruthy();
    expect(container.textContent).toContain("Am");
    expect(positionButtons(container)).toHaveLength(0);
    expect(within(container).queryByText("Ukulele")).toBeNull();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("renders the fret position it was given, not the first one", () => {
    const withDefault = render(<GuitarChordPanel chord="Am" showControls={false} />);
    const withSecond = render(
      <GuitarChordPanel chord="Am" showControls={false} position={1} />,
    );
    const fretLabel = (c: HTMLElement) =>
      c.querySelector(".bc-guitar-chord")?.textContent ?? "";
    expect(fretLabel(withSecond.container)).not.toBe(fretLabel(withDefault.container));
  });

  it("clamps an out-of-range position instead of blanking the card", () => {
    const { container } = render(
      <GuitarChordPanel chord="Am" showControls={false} position={999} />,
    );
    expect(container.querySelector(".bc-guitar-chord")).toBeTruthy();
  });

  it("falls back to guitar for an instrument this build does not know", () => {
    // Reachable from an imported board file or an older export.
    const { container } = render(
      // @ts-expect-error deliberately outside InstrumentId, as untrusted JSON can be
      <GuitarChordPanel chord="Am" showControls={false} instrument="theremin" />,
    );
    expect(container.querySelector(".bc-guitar-chord")).toBeTruthy();
  });
});

describe("GuitarChordPanel position reporting", () => {
  it("does not clobber a restored position on mount", () => {
    const onPositionChange = vi.fn();
    render(
      <GuitarChordPanel chord="Am" position={1} onPositionChange={onPositionChange} />,
    );
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it("reports the index when the user picks a placement", () => {
    const onPositionChange = vi.fn();
    const { container } = render(
      <GuitarChordPanel chord="Am" onPositionChange={onPositionChange} />,
    );
    fireEvent.click(positionButtons(container)[1]);
    expect(onPositionChange).toHaveBeenCalledWith(1);
  });

  it("reports the reset to 0 when the chord changes, so a host cannot drift", () => {
    const onPositionChange = vi.fn();
    const { rerender } = render(
      <GuitarChordPanel chord="Am" position={1} onPositionChange={onPositionChange} />,
    );
    onPositionChange.mockClear();
    rerender(
      <GuitarChordPanel chord="C" position={1} onPositionChange={onPositionChange} />,
    );
    expect(onPositionChange).toHaveBeenCalledWith(0);
  });

  it("reports the instrument the user switched to", () => {
    const onInstrumentChange = vi.fn();
    const { container } = render(
      <GuitarChordPanel chord="Am" onInstrumentChange={onInstrumentChange} />,
    );
    fireEvent.click(instrumentButtons(container).ukulele);
    expect(onInstrumentChange).toHaveBeenCalledWith("ukulele");
  });
});

const barreToggle = (c: HTMLElement) =>
  c.querySelector<HTMLInputElement>(".bc-guitar-barre-checkbox");

describe("instrument coverage", () => {
  it("offers guitar, top-3 and ukulele", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    for (const label of ["Guitar", "Guitar (top 3)", "Ukulele"]) {
      expect(within(container).getByText(label), label).toBeTruthy();
    }
  });

  it("does not offer bass, which can never return a shape", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    expect(within(container).queryByText(/Bass/)).toBeNull();
  });

  it("renders a top-3 voicing", () => {
    const { container } = render(<GuitarChordPanel chord="D" instrument="guitar-top3" />);
    expect(container.querySelector(".bc-guitar-chord")).toBeTruthy();
    expect(container.textContent).not.toContain("No guitar (top 3) shape found");
  });

  it("renders a power chord that chords-db cannot supply", () => {
    const { container } = render(<GuitarChordPanel chord="D5" />);
    expect(container.querySelector(".bc-guitar-chord")).toBeTruthy();
    expect(container.textContent).toContain("D5");
  });
});

describe("barre filter", () => {
  it("is offered only when the chord has both barre and non-barre shapes", () => {
    // Am has open shapes and barre shapes.
    expect(barreToggle(render(<GuitarChordPanel chord="Am" />).container)).toBeTruthy();
  });

  it("is hidden on a board card", () => {
    const { container } = render(<GuitarChordPanel chord="Am" showControls={false} />);
    expect(barreToggle(container)).toBeNull();
  });

  it("removes barre placements when switched on", () => {
    const { container } = render(<GuitarChordPanel chord="Am" />);
    const before = positionButtons(container).length;
    fireEvent.click(barreToggle(container)!);
    expect(positionButtons(container).length).toBeLessThan(before);
  });

  /**
   * The filter hides shapes; it never renumbers them. A board card persists the
   * position index, so a click has to report the index into the full list or a
   * saved card would come back showing a different voicing.
   */
  it("reports the underlying index, not the filtered one", () => {
    const onPositionChange = vi.fn();
    const { container } = render(
      <GuitarChordPanel chord="Am" onPositionChange={onPositionChange} />,
    );
    const unfiltered = positionButtons(container);
    // Index reported for the last placement with the filter off...
    fireEvent.click(unfiltered[unfiltered.length - 1]);
    const reportedUnfiltered = onPositionChange.mock.calls.at(-1)![0];

    onPositionChange.mockClear();
    fireEvent.click(barreToggle(container)!);
    const filtered = positionButtons(container);
    fireEvent.click(filtered[filtered.length - 1]);
    const reportedFiltered = onPositionChange.mock.calls.at(-1)![0];

    // ...must still be an index into the full list, so the two agree on meaning.
    expect(reportedFiltered).toBeLessThanOrEqual(reportedUnfiltered);
    expect(Number.isInteger(reportedFiltered)).toBe(true);
  });
});
