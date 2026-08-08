/**
 * Replays every chords-db position through positionToMidi and asserts it
 * reproduces chords-db's own `midi` array.
 *
 * This reads @tombatossals/chords-db DIRECTLY, not src/generated/*.slim.json:
 * build-data.mjs strips `midi` from the shipped copy on purpose. This test is
 * why that stripping is safe — it proves the field is exactly reproducible,
 * so shipping it would be redundant weight.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { positionToMidi } from "../src/pitch";
import { INSTRUMENTS } from "../src/instruments";
import type { ChordsDbPosition } from "../src/instruments";

const require = createRequire(import.meta.url);

interface RawEntry {
  key: string;
  suffix: string;
  positions: Array<ChordsDbPosition & { midi?: number[] }>;
}

const LIBRARIES = [
  { name: "guitar", openMidi: INSTRUMENTS.guitar.openMidi, minPositions: 2000 },
  { name: "ukulele", openMidi: INSTRUMENTS.ukulele.openMidi, minPositions: 2000 },
];

describe("positionToMidi reproduces chords-db's midi arrays", () => {
  for (const { name, openMidi, minPositions } of LIBRARIES) {
    it(`matches every ${name} position`, () => {
      const db = require(`@tombatossals/chords-db/lib/${name}.json`) as {
        chords: Record<string, RawEntry[]>;
      };

      let checked = 0;
      let capoSeen = 0;
      const mismatches: string[] = [];

      for (const entries of Object.values(db.chords)) {
        for (const entry of entries) {
          for (const pos of entry.positions) {
            if (!pos.midi) continue;
            if (pos.capo) capoSeen++;
            checked++;
            const got = positionToMidi(pos, openMidi);
            if (JSON.stringify(got) !== JSON.stringify(pos.midi)) {
              mismatches.push(
                `${entry.key}${entry.suffix} frets=${JSON.stringify(pos.frets)} ` +
                  `baseFret=${pos.baseFret}: got ${JSON.stringify(got)}, want ${JSON.stringify(pos.midi)}`,
              );
            }
          }
        }
      }

      expect(mismatches.slice(0, 5).join("\n")).toBe("");
      expect(checked).toBeGreaterThanOrEqual(minPositions);
      // Guitar carries 901 capo-flagged positions; all reproduce without any
      // capo handling, which is why positionToMidi ignores the flag.
      if (name === "guitar") expect(capoSeen).toBeGreaterThan(500);
    });
  }
});
