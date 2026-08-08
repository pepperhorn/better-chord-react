import { describe, it, expect } from "vitest";
import * as api from "../src/index";

describe("public API", () => {
  it("exports the pitch and voicing surface", () => {
    for (const name of [
      "INSTRUMENTS",
      "dbPositionToChord",
      "positionToMidi",
      "rootPitchClass",
      "positionFacts",
      "duplicateVoicingMap",
      "matchesShapeClass",
      "canonicalPositionIndex",
      "selectVoicings",
      "SHAPE_CLASS_LADDER",
      "powerChordPosition",
      "powerChordShape",
      "lookupGuitarChord",
      "hasGuitarChord",
      "GUITAR_TOP3_PRESETS",
      "lookupTop3Chord",
    ]) {
      expect(api, `missing export ${name}`).toHaveProperty(name);
    }
  });

  it("no longer exports the retired svguitar-order table", () => {
    expect(api).not.toHaveProperty("OPEN_STRING_MIDI");
  });
});
