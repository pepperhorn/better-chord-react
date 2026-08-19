import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { PianoChord } from "../src/components/PianoChord";

// Capture the MEI the component builds, without loading the WASM toolkit.
const rendered: string[] = [];
vi.mock("../src/verovio", () => ({
  renderMeiToSvg: (mei: string) => {
    rendered.push(mei);
    return Promise.resolve(`<svg viewBox="0 0 140 120"><g class="staff"></g></svg>`);
  },
}));

beforeEach(() => { rendered.length = 0; });

/** Every pname/accid pair in document order. */
function pitches(mei: string): string[] {
  return [...mei.matchAll(/<note[^>]*\/?>/g)].map((m) => {
    const tag = m[0];
    const pname = /pname="([a-g])"/.exec(tag)?.[1] ?? "?";
    const accid = /accid(?:\.ges)?="([a-z]+)"/.exec(tag)?.[1];
    return pname + (accid === "f" ? "b" : accid === "s" ? "#" : "");
  });
}

describe("staff spelling follows the chord, not the keyboard", () => {
  // The staff path reused the keyboard's octave-qualification helper, which
  // normalises flats to sharps for key geometry. The staff engraves what it is
  // given, so Bbm came out as A#/C#/F — right pitches, wrong notation.
  it("engraves Bbm with flats", async () => {
    render(<PianoChord chord="Bbm" display="staff" />);
    await waitFor(() => expect(rendered.length).toBeGreaterThan(0));
    const mei = rendered[rendered.length - 1];
    expect(pitches(mei)).toEqual(["bb", "db", "f"]);
    expect(mei).not.toMatch(/accid="s"/);
  });

  it("engraves a sharp chord with sharps", async () => {
    render(<PianoChord chord="F#m" display="staff" />);
    await waitFor(() => expect(rendered.length).toBeGreaterThan(0));
    const mei = rendered[rendered.length - 1];
    expect(pitches(mei)).toEqual(["f#", "a", "c#"]);
    expect(mei).not.toMatch(/accid="f"/);
  });

  it("leaves a natural chord alone", async () => {
    render(<PianoChord chord="C" display="staff" />);
    await waitFor(() => expect(rendered.length).toBeGreaterThan(0));
    expect(pitches(rendered[rendered.length - 1])).toEqual(["c", "e", "g"]);
  });

  it("keeps the octaves it assigned while preserving spelling", async () => {
    // Bb4 Db5 F5 — the ascent test must read the letter, since "Bb" is not a
    // white note after the keyboard's sharp-stripping trick.
    render(<PianoChord chord="Bbm" display="staff" />);
    await waitFor(() => expect(rendered.length).toBeGreaterThan(0));
    const octs = [...rendered[rendered.length - 1].matchAll(/oct="(\d)"/g)].map((m) => m[1]);
    expect(octs).toEqual(["4", "5", "5"]);
  });
});

describe("slash-chord staff spelling", () => {
  it("engraves a flat bass with a flat, not its sharp twin", async () => {
    render(<PianoChord chord="Bbm over Db" display="staff" />);
    await waitFor(() => expect(rendered.length).toBeGreaterThan(0));
    const mei = rendered[rendered.length - 1];
    expect(mei).not.toMatch(/accid="s"/);
    expect(pitches(mei)).toContain("db");
  });
});
