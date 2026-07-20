import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { StaffNotation } from "../src/components/StaffNotation";
import { buildMei } from "@pepperhorn/chordl-core";

// Verovio is a heavy async WASM module — mock it so tests exercise the
// component's MEI construction + wrapper markup without loading the toolkit.
const rendered: string[] = [];
vi.mock("../src/verovio", () => ({
  renderMeiToSvg: (mei: string) => {
    rendered.push(mei);
    return Promise.resolve(
      `<svg width="140px" height="120px" viewBox="0 0 140 120"><g class="staff"></g></svg>`,
    );
  },
}));

beforeEach(() => { rendered.length = 0; });

describe("StaffNotation (verovio)", () => {
  it("renders an SVG element", () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} />);
    expect(container.querySelector("svg.bc-staff")).toBeTruthy();
  });

  it("builds MEI and injects the engraving", async () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} />);
    await waitFor(() => {
      expect(container.querySelector(".bc-staff__engraving svg")).toBeTruthy();
    });
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered[0]).toContain("<mei");
  });

  it("renders chord label", () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} chordLabel="Cmaj" />);
    const label = container.querySelector(".bc-staff__label");
    expect(label?.textContent).toBe("Cmaj");
  });

  it("has data-controls attribute for export compatibility", () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} showPlayback />);
    expect(container.querySelector("[data-controls]")).toBeTruthy();
  });

  it("omits controls when playback is disabled", () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} showPlayback={false} />);
    expect(container.querySelector("[data-controls]")).toBeFalsy();
  });

  it("labels the SVG with the chord name", () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} chordLabel="Cmaj7" />);
    const svg = container.querySelector("svg.bc-staff");
    expect(svg?.getAttribute("aria-label")).toBe("Staff notation: Cmaj7");
  });
});

describe("buildMei", () => {
  it("puts a treble chord on a single staff", () => {
    const { mei, staffMode } = buildMei(["C", "E", "G"], { rhOctave: 4 });
    expect(staffMode).toBe("treble");
    expect(mei).toContain('clef.shape="G"');
    expect(mei).toContain("<chord");
    expect((mei.match(/<note /g) ?? []).length).toBe(3);
  });

  it("uses a grand staff for explicit LH/RH split", () => {
    const { mei, staffMode } = buildMei(["C", "E", "G"], { lhNotes: ["C"], lhOctave: 3, rhOctave: 4 });
    expect(staffMode).toBe("grand");
    expect(mei).toContain('symbol="brace"');
    expect(mei).toContain('clef.shape="F"');
    expect(mei).toContain('clef.shape="G"');
  });

  it("preserves the chord's own accidental spelling", () => {
    const { mei } = buildMei(["C#", "Bb", "G"], { rhOctave: 4 });
    expect(mei).toContain('pname="c" oct="4" accid="s"');
    expect(mei).toContain('pname="b" oct="4" accid="f"');
  });

  it("honors octave-qualified notes", () => {
    const { mei } = buildMei([], { octaveQualifiedNotes: ["C:4", "E:4", "G:4"] });
    expect(mei).toContain('oct="4"');
    expect((mei.match(/<note /g) ?? []).length).toBe(3);
  });

  it("chooses bass clef when notes sit low", () => {
    const { mei, staffMode } = buildMei(["C", "E", "G"], { rhOctave: 2 });
    expect(staffMode).toBe("bass");
    expect(mei).toContain('clef.shape="F"');
  });
});
