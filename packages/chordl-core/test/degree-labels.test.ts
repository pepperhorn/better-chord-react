import { describe, it, expect } from "vitest";
import { degreeLabelsForNotes } from "@pepperhorn/chordl-core";

/**
 * `degreeLabelsForNotes` keys degrees by pitch, not by array position, because
 * the rendered note list gets rotated (inversions, "starting on") and expanded
 * (arpeggios) while the resolver's interval list stays canonical.
 */
describe("degreeLabelsForNotes", () => {
  it("labels a root-position triad", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P"], ["C", "E", "G"]))
      .toEqual(["I", "III", "V"]);
  });

  it("follows a first-inversion rotation", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P"], ["E", "G", "C"]))
      .toEqual(["III", "V", "I"]);
  });

  it("follows a second-inversion rotation", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P"], ["G", "C", "E"]))
      .toEqual(["V", "I", "III"]);
  });

  it("keeps a slash chord's re-rooted intervals (C/E)", () => {
    expect(degreeLabelsForNotes("C", ["3M", "5P", "8P"], ["E", "G", "C"]))
      .toEqual(["III", "V", "8"]);
  });

  it("keeps a second-inversion slash chord's compound intervals (C/G)", () => {
    expect(degreeLabelsForNotes("C", ["5P", "8P", "10M"], ["G", "C", "E"]))
      .toEqual(["V", "8", "X"]);
  });

  it("repeats the pattern across an arpeggio", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P"], ["C", "E", "G", "C", "E", "G", "C"]))
      .toEqual(["I", "III", "V", "I", "III", "V", "I"]);
  });

  it("repeats the pattern across a rotated arpeggio", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P"], ["E", "G", "C", "E", "G", "C", "E"]))
      .toEqual(["III", "V", "I", "III", "V", "I", "III"]);
  });

  it("labels a flat-spelled minor triad", () => {
    expect(degreeLabelsForNotes("Bb", ["1P", "3m", "5P"], ["Db", "F", "Bb"]))
      .toEqual(["bIII", "V", "I"]);
  });

  it("falls back to chroma for enharmonically respelled notes", () => {
    expect(degreeLabelsForNotes("Bb", ["1P", "3m", "5P"], ["C#", "F", "A#"]))
      .toEqual(["bIII", "V", "I"]);
  });

  it("matches a double-flat interval to its enharmonic rendering (dim7)", () => {
    // 7d off C transposes to Bbb; only chroma matches it to the rendered A.
    expect(degreeLabelsForNotes("C", ["1P", "3m", "5d", "7d"], ["C", "Eb", "Gb", "A"]))
      .toEqual(["I", "bIII", "bV", "bVII"]);
  });

  it("prefers spelling over chroma so G# and Ab stay distinct", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5A", "7m", "6m"], ["C", "E", "G#", "Bb", "Ab"]))
      .toEqual(["I", "III", "#V", "bVII", "bVI"]);
  });

  it("matches a voicing that respells a chord tone", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P", "7m"], ["G", "C", "E", "A#"]))
      .toEqual(["V", "I", "III", "bVII"]);
  });

  it("labels a note the chord's interval list does not contain", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P", "7M"], ["E", "G", "B", "D"]))
      .toEqual(["III", "V", "VII", "IX"]);
  });

  it("keeps a sus2's own 2nd as a chord tone", () => {
    expect(degreeLabelsForNotes("C", ["1P", "2M", "5P"], ["C", "D", "G"]))
      .toEqual(["I", "II", "V"]);
  });

  it("keeps an add6's own 6th as a chord tone", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P", "6M"], ["C", "E", "G", "A"]))
      .toEqual(["I", "III", "V", "VI"]);
  });

  it("keeps a sus4's own 4th as a chord tone", () => {
    expect(degreeLabelsForNotes("C", ["1P", "4P", "5P"], ["C", "F", "G"]))
      .toEqual(["I", "IV", "V"]);
  });

  it("raises an added 4th to an 11th", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P", "7M"], ["E", "G", "B", "F"]))
      .toEqual(["III", "V", "VII", "XI"]);
  });

  it("raises an added 6th to a 13th", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P", "7m"], ["E", "G", "Bb", "A"]))
      .toEqual(["III", "V", "bVII", "XIII"]);
  });

  it("carries the alteration through the raise", () => {
    expect(degreeLabelsForNotes("C", ["1P", "3M", "5P", "7m"], ["E", "G", "Bb", "Db"]))
      .toEqual(["III", "V", "bVII", "bIX"]);
  });

  it("returns undefined for every note when there are no intervals", () => {
    expect(degreeLabelsForNotes("C", undefined, ["C", "E", "G"]))
      .toEqual([undefined, undefined, undefined]);
    expect(degreeLabelsForNotes("C", [], ["C", "E", "G"]))
      .toEqual([undefined, undefined, undefined]);
  });
});
