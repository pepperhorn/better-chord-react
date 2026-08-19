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
    // Verovio runs with `svgViewBox: true`, so its root carries a viewBox and
    // NO width/height. The mock has to match, or the component's sizing path
    // is never the one production takes.
    return Promise.resolve(
      `<svg viewBox="0 0 140 120" overflow="visible"><g class="staff"></g></svg>`,
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

describe("engraving box matches the engraving", () => {
  it("pins the injected SVG's size instead of letting it fill the outer viewport", async () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} chordLabel="C" />);
    await waitFor(() => {
      expect(container.querySelector(".bc-staff__engraving svg")).toBeTruthy();
    });
    const inner = container.querySelector(".bc-staff__engraving svg")!;
    // Without explicit width/height a nested <svg> resolves to 100% of the
    // OUTER viewport and `xMidYMid meet` pads the surplus above the clef.
    expect(inner.getAttribute("width")).toBeTruthy();
    expect(inner.getAttribute("height")).toBeTruthy();
  });

  it("reserves height for the engraving at the width it is actually drawn", async () => {
    const { container } = render(<StaffNotation notes={["C", "E", "G"]} chordLabel="C" />);
    await waitFor(() => {
      expect(container.querySelector(".bc-staff__engraving svg")).toBeTruthy();
    });
    const outer = container.querySelector("svg.bc-staff")!;
    const inner = container.querySelector(".bc-staff__engraving svg")!;
    const [, , vbW, vbH] = outer.getAttribute("viewBox")!.split(" ").map(Number);
    const w = Number(inner.getAttribute("width"));
    const h = Number(inner.getAttribute("height"));
    // The engraving spans the full width, and its height keeps 140:120.
    expect(w).toBe(vbW);
    expect(h).toBeCloseTo((w * 120) / 140, 3);
    // Everything left over is exactly the label and controls bands, with no
    // spare vertical room for `meet` to centre into.
    expect(vbH - h).toBeGreaterThanOrEqual(0);
    expect(vbH - h).toBeLessThanOrEqual(48 + 0.001);
  });
});
