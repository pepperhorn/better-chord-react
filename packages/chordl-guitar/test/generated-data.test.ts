import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import guitarSlim from "../src/generated/guitar.slim.json";
import ukuleleSlim from "../src/generated/ukulele.slim.json";

const require = createRequire(import.meta.url);

/**
 * scripts/build-data.mjs strips midi/capo out of the chords-db libraries to cut
 * bundle weight. These tests lock the invariant that stripping is *only* a
 * field subset — every shape must survive byte-identical.
 */
const LIBRARIES = [
  ["guitar", guitarSlim],
  ["ukulele", ukuleleSlim],
] as const;

describe.each(LIBRARIES)("generated %s data", (name, slim) => {
  const raw = require(`@tombatossals/chords-db/lib/${name}.json`);
  const slimDb = slim as unknown as {
    chords: Record<string, { suffix: string; positions: Record<string, unknown>[] }[]>;
  };

  it("keeps every root key and suffix", () => {
    expect(Object.keys(slimDb.chords).sort()).toEqual(Object.keys(raw.chords).sort());
    for (const key of Object.keys(raw.chords)) {
      expect(slimDb.chords[key].map((e) => e.suffix)).toEqual(
        raw.chords[key].map((e: { suffix: string }) => e.suffix),
      );
    }
  });

  it("preserves every position's shape fields exactly", () => {
    let compared = 0;
    for (const key of Object.keys(raw.chords)) {
      raw.chords[key].forEach((entry: { positions: Record<string, unknown>[] }, i: number) => {
        entry.positions.forEach((rawPos, p) => {
          const slimPos = slimDb.chords[key][i].positions[p];
          for (const field of ["frets", "fingers", "baseFret", "barres"]) {
            expect(slimPos[field]).toEqual(rawPos[field]);
          }
          compared++;
        });
      });
    }
    expect(compared).toBeGreaterThan(1000); // guard against a silently empty library
  });

  it("drops the unused midi and capo fields", () => {
    for (const entries of Object.values(slimDb.chords)) {
      for (const entry of entries) {
        for (const pos of entry.positions) {
          expect(pos).not.toHaveProperty("midi");
          expect(pos).not.toHaveProperty("capo");
        }
      }
    }
  });
});
