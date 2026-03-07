import { describe, it, expect } from "vitest";
import { generateMidiFile } from "@better-chord/core";

describe("generateMidiFile", () => {
  it("produces a valid MIDI file header", () => {
    const midi = generateMidiFile({ notes: ["C", "E", "G"] });
    expect(midi.length).toBeGreaterThan(0);
    // MThd magic bytes
    expect(midi[0]).toBe(0x4d); // M
    expect(midi[1]).toBe(0x54); // T
    expect(midi[2]).toBe(0x68); // h
    expect(midi[3]).toBe(0x64); // d
  });

  it("contains MTrk track header", () => {
    const midi = generateMidiFile({ notes: ["C", "E", "G"] });
    // Find MTrk header after the 14-byte MThd
    expect(midi[14]).toBe(0x4d); // M
    expect(midi[15]).toBe(0x54); // T
    expect(midi[16]).toBe(0x72); // r
    expect(midi[17]).toBe(0x6b); // k
  });

  it("returns empty for no valid notes", () => {
    const midi = generateMidiFile({ notes: [] });
    expect(midi.length).toBe(0);
  });

  it("produces different output for arpeggiated vs block", () => {
    const block = generateMidiFile({ notes: ["C", "E", "G"], arpeggiated: false });
    const arp = generateMidiFile({ notes: ["C", "E", "G"], arpeggiated: true });
    // Arpeggiated has non-zero delta times between note-ons
    const blockBytes = Array.from(block);
    const arpBytes = Array.from(arp);
    expect(blockBytes).not.toEqual(arpBytes);
  });

  it("respects custom octave", () => {
    const low = generateMidiFile({ notes: ["C"], octave: 2 });
    const high = generateMidiFile({ notes: ["C"], octave: 6 });
    // Different MIDI note numbers produce different bytes
    expect(low).not.toEqual(high);
  });
});
