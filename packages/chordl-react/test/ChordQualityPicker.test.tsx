import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ChordQualityPicker } from "../src/components/ChordQualityPicker";

const strip = (c: HTMLElement) => c.querySelector(".chord-quality-strip");
const buttons = (c: HTMLElement) =>
  Array.from(c.querySelectorAll(".btn-quality")).map((b) => b.textContent);

/**
 * A bare letter renders major immediately — the fastest path in the app — but
 * it is genuinely ambiguous, and nothing else in the UI says that `m`, `7` and
 * `maj7` are a keystroke away. The strip is a typing shortcut, so it rewrites
 * the input rather than rendering a chord of its own.
 */
describe("ChordQualityPicker", () => {
  it("offers the seven shortcut qualities for a bare root", () => {
    const { container } = render(<ChordQualityPicker input="C" onPick={() => {}} />);
    expect(buttons(container)).toEqual(["m", "7", "maj7", "m7", "dim", "aug", "sus4"]);
  });

  it("shows for an accidental root", () => {
    for (const root of ["C#", "Bb", "F#"]) {
      const { container, unmount } = render(<ChordQualityPicker input={root} onPick={() => {}} />);
      expect(strip(container), root).toBeTruthy();
      unmount();
    }
  });

  it("shows when the bare root arrived inside a sentence", () => {
    // Checking the *parsed* name rather than the raw input is what gets
    // "show me an A" the same shortcut as "A".
    const { container } = render(<ChordQualityPicker input="show me an A" onPick={() => {}} />);
    expect(strip(container)).toBeTruthy();
  });

  it("stays hidden once the chord already has a quality", () => {
    for (const chord of ["Am", "C7", "Gmaj7", "Dsus4"]) {
      const { container, unmount } = render(<ChordQualityPicker input={chord} onPick={() => {}} />);
      expect(strip(container), chord).toBeNull();
      unmount();
    }
  });

  it("stays hidden for scales, progressions and note lists", () => {
    for (const input of ["C major scale", "A blues scale", "I V vi IV", "12 bar blues", "C E G", "A C# E"]) {
      const { container, unmount } = render(<ChordQualityPicker input={input} onPick={() => {}} />);
      expect(strip(container), input).toBeNull();
      unmount();
    }
  });

  it("stays hidden for an empty input", () => {
    for (const input of ["", "   "]) {
      const { container, unmount } = render(<ChordQualityPicker input={input} onPick={() => {}} />);
      expect(strip(container), JSON.stringify(input)).toBeNull();
      unmount();
    }
  });

  it("tracks the parser rather than second-guessing it", () => {
    // "banana" parses to a chord name of "B", and the app renders B major for
    // it. The strip follows that: it offers shortcuts for whatever chord is on
    // screen, so it can never disagree with the keyboard beside it.
    const { container } = render(<ChordQualityPicker input="banana" onPick={() => {}} />);
    expect(strip(container)).toBeTruthy();
  });

  it("rewrites the input to the root plus the chosen quality", () => {
    const onPick = vi.fn();
    const { container } = render(<ChordQualityPicker input="A" onPick={onPick} />);
    const picks = Array.from(container.querySelectorAll<HTMLButtonElement>(".btn-quality"));

    for (const btn of picks) fireEvent.click(btn);

    expect(onPick.mock.calls.map((c) => c[0])).toEqual([
      "Am", "A7", "Amaj7", "Am7", "Adim", "Aaug", "Asus4",
    ]);
  });

  it("uses the parsed root, not the raw sentence", () => {
    const onPick = vi.fn();
    const { container } = render(<ChordQualityPicker input="show me an A" onPick={onPick} />);
    fireEvent.click(container.querySelector(".btn-quality")!);
    expect(onPick).toHaveBeenCalledWith("Am");
  });

  it("keeps the root's own accidental spelling", () => {
    const onPick = vi.fn();
    const { container } = render(<ChordQualityPicker input="Bb" onPick={onPick} />);
    fireEvent.click(container.querySelectorAll(".btn-quality")[2]);
    expect(onPick).toHaveBeenCalledWith("Bbmaj7");
  });
});
