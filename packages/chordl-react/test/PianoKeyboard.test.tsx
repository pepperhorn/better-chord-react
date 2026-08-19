import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PianoKeyboard } from "../src/components/PianoKeyboard";

describe("PianoKeyboard", () => {
  it("renders an SVG element", () => {
    const { container } = render(<PianoKeyboard />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders correct number of white keys", () => {
    const { container } = render(<PianoKeyboard size={4} startFrom="C" />);
    const svg = container.querySelector("svg");
    // 4 white keys: C, D, E, F
    // Black keys: C#, D#, F# (C, D, and F have sharps)
    // So: 4 white + 3 black = 7 rects total
    const rects = svg?.querySelectorAll("rect");
    expect(rects?.length).toBe(7);
  });

  it("renders 8 white keys by default", () => {
    const { container } = render(<PianoKeyboard />);
    const svg = container.querySelector("svg");
    // 8 white keys starting from C: C,D,E,F,G,A,B,C
    // Black keys after: C,D,F,G,A = 5 blacks (but second C has no black since it's the last key? Let's count)
    // C(+C#), D(+D#), E, F(+F#), G(+G#), A(+A#), B, C(+C#) = 8 white + 6 black = 14... wait
    // Actually size=8 means 8 white keys. For wrapping: C,D,E,F,G,A,B,C
    // Sharps: C#, D#, F#, G#, A#, C# = 6 black keys
    const rects = svg?.querySelectorAll("rect");
    expect(rects?.length).toBe(14);
  });

  it("highlights specified keys", () => {
    const { container } = render(
      <PianoKeyboard
        size={4}
        startFrom="C"
        highlightKeys={["C", "E"]}
      />
    );
    const rects = container.querySelectorAll("rect");
    // First white key (C) should be highlighted (#a0c6e8)
    const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
    expect(fills).toContain("#a0c6e8");
  });

  it("applies boomwhacker theme", () => {
    const { container } = render(
      <PianoKeyboard
        size={3}
        startFrom="C"
        highlightKeys={["C"]}
        theme="boomwhacker"
      />
    );
    const rects = container.querySelectorAll("rect");
    const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
    // C in boomwhacker = red (#e81c1c)
    expect(fills).toContain("#e81c1c");
  });

  it("applies custom highlight color", () => {
    const { container } = render(
      <PianoKeyboard
        size={3}
        startFrom="C"
        highlightKeys={["C"]}
        highlightColor="#ff0000"
      />
    );
    const rects = container.querySelectorAll("rect");
    const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
    expect(fills).toContain("#ff0000");
  });

  describe("card text", () => {
    it("stays nameless by default — a bare diagram opts in via showHeading", () => {
      const { container } = render(<PianoKeyboard chordLabel="G7" />);
      expect(container.querySelector(".bc-keyboard-heading")).toBeNull();
    });

    it("shows the chord name when a card asks for it", () => {
      const { container } = render(<PianoKeyboard chordLabel="G7" showChordName />);
      expect(container.querySelector(".bc-keyboard-heading")?.textContent).toBe("G7");
    });

    it("keeps the chord name when a descriptive title is also set", () => {
      const { container } = render(
        <PianoKeyboard chordLabel="G7" showChordName title="bar 4 turnaround" />,
      );
      expect(container.querySelector(".bc-keyboard-heading")?.textContent).toBe("bar 4 turnaround");
      expect(container.querySelector(".bc-keyboard-chord-name")?.textContent).toBe("G7");
    });

    it("shows only the title when the name was never requested", () => {
      const { container } = render(<PianoKeyboard chordLabel="G7" title="just a label" />);
      expect(container.querySelector(".bc-keyboard-heading")?.textContent).toBe("just a label");
      expect(container.querySelector(".bc-keyboard-chord-name")).toBeNull();
    });
  });
});

describe("keyboard centring", () => {
  // A board card sizes to the widest card on the board, so a narrower keyboard
  // has slack. Without `margin: 0 auto` the block sat flush left and the chord
  // title, which centres on the card, no longer sat over the keyboard.
  it("centres itself when its parent is wider than the keyboard", () => {
    const { container } = render(<PianoKeyboard highlightKeys={["C", "E", "G"]} />);
    const box = container.querySelector(".bc-keyboard-container") as HTMLElement;
    expect(box).toBeTruthy();
    expect(box.style.marginLeft).toBe("auto");
    expect(box.style.marginRight).toBe("auto");
  });

  it("still caps at the keyboard's natural width", () => {
    const { container } = render(<PianoKeyboard highlightKeys={["C", "E", "G"]} />);
    const box = container.querySelector(".bc-keyboard-container") as HTMLElement;
    expect(box.style.width).toBe("100%");
    expect(box.style.maxWidth).not.toBe("");
  });
});
