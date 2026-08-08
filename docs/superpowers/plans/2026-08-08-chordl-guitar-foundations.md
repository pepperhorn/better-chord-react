# chordl-guitar Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `@pepperhorn/chordl-guitar` a verified pitch model, voicing facts, an instrument-aware canonical position, a difficulty ladder, and diversity-ranked voicing selection.

**Architecture:** One pure function — `positionToMidi` — becomes the root of everything else. Open-string MIDI moves onto `InstrumentConfig` in chords-db index order, and the conflicting svguitar-order table is retired. Facts (bass, inversion, doubling, duplicates) derive from pitches; selection (canonical position, shape-class filters, diversity ranking) derives from facts. No new runtime data ships.

**Tech Stack:** TypeScript (ESM), Vitest 4, `@tombatossals/chords-db` 0.5.1 (already a runtime dependency), `svguitar` 2.5.1.

**Spec:** `docs/superpowers/specs/2026-08-08-chordl-guitar-boundary-design.md`

## Global Constraints

- Package directory: `/home/shaun/chordl/packages/chordl-guitar`. All paths below are relative to it.
- Run tests with `pnpm test:run` (which runs `build:data` first — required, the generated JSON is gitignored).
- **Never modify `scripts/build-data.mjs` or `test/generated-data.test.ts`.** Stripping `midi`/`capo` from the shipped JSON is a deliberate, tested tradeoff. Pitches are derived, never read from shipped data.
- **`openMidi` is always chords-db index order** — `openMidi[i]` is the string `frets[i]` refers to. Never svguitar order. Exactly one place inverts string order: `dbPositionToChord`.
- `capo` is a rendering hint, never a pitch offset.
- Unknown chords return `null`. Never invent or guess a shape.
- Repo uses double quotes, 2-space indent, `export function` (not arrow consts) for public API.
- Work on a branch off `main`: `feat/guitar-foundations`.

---

### Task 1: Pitch derivation

**Files:**
- Create: `src/pitch.ts`
- Modify: `src/instruments.ts` (add `openMidi` to `InstrumentConfig` and all three `INSTRUMENTS` entries)
- Test: `test/pitch.test.ts`

**Interfaces:**
- Consumes: `ChordsDbPosition` from `src/instruments.ts`
- Produces: `positionToMidi(pos: ChordsDbPosition, openMidi: number[]): number[]`; `rootPitchClass(label: string): number | null`; `InstrumentConfig.openMidi: number[]`

- [ ] **Step 1: Write the failing test**

Create `test/pitch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { positionToMidi, rootPitchClass } from "../src/pitch";
import { INSTRUMENTS } from "../src/instruments";

describe("positionToMidi", () => {
  const guitar = INSTRUMENTS.guitar.openMidi;

  it("treats frets as relative to baseFret, not as absolute fret numbers", () => {
    // F major, chords-db position 2: baseFret 3, low E muted.
    // Absolute-fret reading would give [46,51,58,63,67] — wrong.
    const pos = {
      frets: [-1, 1, 1, 3, 4, 3],
      fingers: [0, 1, 1, 3, 4, 2],
      baseFret: 3,
      barres: [1],
    };
    expect(positionToMidi(pos, guitar)).toEqual([48, 53, 60, 65, 69]);
  });

  it("omits muted strings and sounds open strings regardless of the window", () => {
    // Open C: x32010 at baseFret 1
    const pos = {
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      barres: [],
    };
    expect(positionToMidi(pos, guitar)).toEqual([48, 52, 55, 60, 64]);
  });

  it("handles the ukulele's reentrant tuning", () => {
    // Ukulele C major: 0003. openMidi is G4 C4 E4 A4 — not ascending.
    const pos = { frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], baseFret: 1, barres: [] };
    expect(positionToMidi(pos, INSTRUMENTS.ukulele.openMidi)).toEqual([67, 60, 64, 72]);
  });

  it("returns an empty array for an all-muted position", () => {
    const pos = { frets: [-1, -1, -1, -1, -1, -1], fingers: [0, 0, 0, 0, 0, 0], baseFret: 1, barres: [] };
    expect(positionToMidi(pos, guitar)).toEqual([]);
  });
});

describe("INSTRUMENTS openMidi", () => {
  it("is in chords-db index order — index 0 is the string frets[0] refers to", () => {
    expect(INSTRUMENTS.guitar.openMidi).toEqual([40, 45, 50, 55, 59, 64]);
    expect(INSTRUMENTS["guitar-top3"].openMidi).toEqual([40, 45, 50, 55, 59, 64]);
    expect(INSTRUMENTS.ukulele.openMidi).toEqual([67, 60, 64, 69]);
  });

  it("has one openMidi entry per string", () => {
    for (const inst of Object.values(INSTRUMENTS)) {
      expect(inst.openMidi.length, `${inst.id} openMidi length`).toBe(inst.strings);
    }
  });
});

describe("rootPitchClass", () => {
  it("parses naturals, sharps and flats", () => {
    expect(rootPitchClass("C")).toBe(0);
    expect(rootPitchClass("F#m7")).toBe(6);
    expect(rootPitchClass("Bbmaj7")).toBe(10);
    expect(rootPitchClass("Eb")).toBe(3);
  });

  it("returns null for a label with no parseable root", () => {
    expect(rootPitchClass("H7")).toBeNull();
    expect(rootPitchClass("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- pitch`
Expected: FAIL — cannot find module `../src/pitch`.

- [ ] **Step 3: Add `openMidi` to the instrument config**

In `src/instruments.ts`, add the field to the interface (after `tuning`):

```ts
  /** Open-string tuning, low → high. */
  tuning: string[];
  /**
   * Open-string MIDI numbers in **chords-db index order** — `openMidi[i]` is
   * the string that `frets[i]` refers to. This is NOT svguitar's string
   * numbering, which runs highest-pitch-first; `dbPositionToChord` is the one
   * place that inverts. Ukulele's reentrant high-G means the array is not
   * ascending, so the order cannot be recovered by sorting.
   */
  openMidi: number[];
```

Add to each entry in `INSTRUMENTS`:

```ts
  guitar: { /* ...existing fields... */ openMidi: [40, 45, 50, 55, 59, 64] },
  ukulele: { /* ...existing fields... */ openMidi: [67, 60, 64, 69] },
  "guitar-top3": { /* ...existing fields... */ openMidi: [40, 45, 50, 55, 59, 64] },
```

- [ ] **Step 4: Write `src/pitch.ts`**

```ts
/**
 * Fret → pitch derivation.
 *
 * chords-db ships a `midi` array per position, but scripts/build-data.mjs
 * strips it from the shipped JSON to cut bundle weight. Deriving rather than
 * reviving keeps one pitch code path: the candidate szaza merge source ships
 * no midi field at all, so derivation is required regardless.
 */
import type { ChordsDbPosition } from "./instruments";

/**
 * Sounding MIDI pitches for a chords-db position.
 *
 * `frets` values are relative to `baseFret`, not absolute fret numbers: a
 * value of 1 at baseFret 3 sounds fret 3. Muted strings (-1) are omitted;
 * open strings (0) sound the open pitch regardless of the diagram window.
 *
 * `capo` is deliberately ignored — it is a rendering hint (draw a bar), not a
 * pitch offset. All 901 capo-flagged guitar positions reproduce chords-db's
 * own `midi` array exactly without it; see test/pitch-golden.test.ts.
 *
 * @param pos - chords-db position
 * @param openMidi - open-string MIDI in chords-db index order (InstrumentConfig.openMidi)
 * @returns sounding pitches only, in chords-db string order
 */
export function positionToMidi(pos: ChordsDbPosition, openMidi: number[]): number[] {
  const out: number[] = [];
  pos.frets.forEach((fret, i) => {
    if (fret === -1) return;
    const open = openMidi[i];
    if (open === undefined) return;
    out.push(fret === 0 ? open : open + pos.baseFret + fret - 1);
  });
  return out;
}

const PITCH_CLASSES: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

/**
 * Pitch class of a chord label's root, or null when unparseable.
 *
 * Derived from the requested label rather than from a chords-db `key` field:
 * chords-db spells the same root inconsistently ("Csharp" as a container key,
 * "C#" on the entry), and the label is what the caller actually asked for.
 */
export function rootPitchClass(label: string): number | null {
  const m = label.trim().match(/^([A-Ga-g][#b]?)/);
  if (!m) return null;
  const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const pc = PITCH_CLASSES[root];
  return pc === undefined ? null : pc;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run -- pitch`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pitch.ts src/instruments.ts test/pitch.test.ts
git commit -m "feat(guitar): derive pitches from tuning and baseFret

Adds positionToMidi and openMidi on InstrumentConfig, in chords-db index
order. frets values are relative to baseFret; capo is a render hint and
is deliberately ignored."
```

---

### Task 2: Retire `OPEN_STRING_MIDI`

**Files:**
- Modify: `src/instruments.ts` (delete `OPEN_STRING_MIDI`)
- Modify: `src/index.ts` (drop the export)
- Modify: `test/instruments.test.ts:17-19`
- Modify: `test/staticPresets.test.ts:3,28`

**Interfaces:**
- Consumes: `InstrumentConfig.openMidi` from Task 1
- Produces: nothing new — removes a symbol

**Why now:** `OPEN_STRING_MIDI` holds correct values in the *opposite* order to `openMidi`. Two tables in conflicting orders is precisely the drift that produces wrong-but-plausible pitches with no error. It has no consumers outside this package's own tests, so removing it is free today and would be breaking once frames depends on it.

- [ ] **Step 1: Update `test/instruments.test.ts`**

Replace the import on line 2 and the third `it` block:

```ts
import { INSTRUMENTS } from "../src/instruments";
```

```ts
  it("exposes open-string MIDI in chords-db index order (low string first)", () => {
    expect(INSTRUMENTS["guitar-top3"].openMidi.slice(0, 3)).toEqual([40, 45, 50]);
    expect(INSTRUMENTS.guitar.openMidi.slice(0, 3)).toEqual([40, 45, 50]);
    expect(INSTRUMENTS.ukulele.openMidi).toEqual([67, 60, 64, 69]);
  });
```

- [ ] **Step 2: Update `test/staticPresets.test.ts`**

The preset test indexes by svguitar string number, so it needs the reversed view. Replace the import on line 3 and the `const midi` on line 28:

```ts
import { INSTRUMENTS } from "../src/instruments";
```

```ts
  // Presets index by svguitar string number (1 = high E), so reverse the
  // chords-db-order openMidi to get midi[stringNum - 1].
  const midi = [...INSTRUMENTS["guitar-top3"].openMidi].reverse();
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm test:run`
Expected: PASS.

**This task is a refactor, so there is no red phase — do not expect a failure here.** Task 1 already added `openMidi`, so the repointed assertions pass immediately. That is the point of this step: it proves `openMidi` carries the same information as `OPEN_STRING_MIDI` *before* the old symbol is deleted, so the deletion in Step 4 cannot hide a behaviour change.

- [ ] **Step 4: Delete `OPEN_STRING_MIDI`**

In `src/instruments.ts`, delete the entire `OPEN_STRING_MIDI` declaration and its doc comment (the final ~10 lines of the file).

In `src/index.ts`, change line 7 to:

```ts
export { INSTRUMENTS, dbPositionToChord } from "./instruments";
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test:run && pnpm lint`
Expected: PASS, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/instruments.ts src/index.ts test/instruments.test.ts test/staticPresets.test.ts
git commit -m "refactor(guitar)!: retire OPEN_STRING_MIDI in favour of InstrumentConfig.openMidi

BREAKING CHANGE: OPEN_STRING_MIDI is removed. It held svguitar-order
values while chords-db data is low-string-first; two tables in opposite
orders produce wrong-but-plausible pitches silently. Use
INSTRUMENTS[id].openMidi, which is chords-db index order."
```

---

### Task 3: Golden test against chords-db

**Files:**
- Create: `test/pitch-golden.test.ts`

**Interfaces:**
- Consumes: `positionToMidi`, `INSTRUMENTS[].openMidi`
- Produces: nothing — this is the proof that makes the `midi`-stripping safe

- [ ] **Step 1: Write the test**

Create `test/pitch-golden.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test**

Run: `pnpm test:run -- pitch-golden`
Expected: PASS. Guitar checks 2,069 positions, ukulele 2,114 — 4,183 total, zero mismatches.

- [ ] **Step 3: Commit**

```bash
git add test/pitch-golden.test.ts
git commit -m "test(guitar): golden test positionToMidi against all 4183 chords-db positions

Reads chords-db directly rather than the slim JSON. Proves the stripped
midi field is exactly reproducible, and that capo needs no pitch handling."
```

---

### Task 4: Bass instruments

**Files:**
- Modify: `src/instruments.ts` (`InstrumentId`, `INSTRUMENTS`)
- Test: `test/instruments.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `InstrumentConfig` from Task 1
- Produces: `InstrumentId` gains `"bass4" | "bass5"`

**Why `bass4`/`bass5`:** frames uses `bass` in `lib/instruments.ts` but `bass4`/`bass5` in `lib/tab/`. The explicit string count is unambiguous; frames maps its legacy `bass` → `bass4` during its own migration.

- [ ] **Step 1: Write the failing test**

Append to `test/instruments.test.ts`:

```ts
describe("bass instruments", () => {
  it("registers 4- and 5-string bass with standard tunings", () => {
    expect(INSTRUMENTS.bass4.strings).toBe(4);
    expect(INSTRUMENTS.bass4.tuning).toEqual(["E", "A", "D", "G"]);
    expect(INSTRUMENTS.bass4.openMidi).toEqual([28, 33, 38, 43]);

    expect(INSTRUMENTS.bass5.strings).toBe(5);
    expect(INSTRUMENTS.bass5.tuning).toEqual(["B", "E", "A", "D", "G"]);
    expect(INSTRUMENTS.bass5.openMidi).toEqual([23, 28, 33, 38, 43]);
  });
});
```

Append to `test/chordLookup.test.ts`:

```ts
describe("bass lookup", () => {
  it("returns null — chords-db ships no bass library, and we never invent shapes", () => {
    expect(lookupGuitarChord("C", "bass4")).toBeNull();
    expect(lookupGuitarChord("Am", "bass5")).toBeNull();
    expect(hasGuitarChord("C", "bass4")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run -- instruments chordLookup`
Expected: FAIL — `bass4` is not a valid `InstrumentId`.

- [ ] **Step 3: Add the instruments**

In `src/instruments.ts`:

```ts
export type InstrumentId = "guitar" | "ukulele" | "guitar-top3" | "bass4" | "bass5";
```

Add to `INSTRUMENTS`:

```ts
  bass4: {
    id: "bass4",
    label: "Bass (4-string)",
    description: "Standard 4-string bass (E A D G)",
    strings: 4,
    frets: 5,
    tuning: ["E", "A", "D", "G"],
    openMidi: [28, 33, 38, 43],
  },
  bass5: {
    id: "bass5",
    label: "Bass (5-string)",
    description: "5-string bass with low B (B E A D G)",
    strings: 5,
    frets: 5,
    tuning: ["B", "E", "A", "D", "G"],
    openMidi: [23, 28, 33, 38, 43],
  },
```

`dbFor` in `src/chordLookup.ts` already returns `null` for any instrument that is not `guitar` or `ukulele`, so bass lookup returns `null` with no change.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test:run && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/instruments.ts test/instruments.test.ts test/chordLookup.test.ts
git commit -m "feat(guitar): add bass4 and bass5 instruments

chords-db has no bass library, so lookup returns null rather than
guessing — matching what frames' tab/chordLookup.ts already does."
```

---

### Task 5: Voicing facts and duplicate detection

**Files:**
- Create: `src/voicingFacts.ts`
- Test: `test/voicingFacts.test.ts`

**Interfaces:**
- Consumes: `positionToMidi` (Task 1), `ChordsDbPosition`
- Produces: `Inversion`, `PositionFacts`, `positionFacts(pos, openMidi, rootPc): PositionFacts`, `duplicateVoicingMap(positions, openMidi): Array<number | null>`

- [ ] **Step 1: Write the failing test**

Create `test/voicingFacts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { positionFacts, duplicateVoicingMap } from "../src/voicingFacts";
import { INSTRUMENTS } from "../src/instruments";

const guitar = INSTRUMENTS.guitar.openMidi;

// C major, chords-db positions 0-3.
const OPEN_C = { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [] };
const BARRE_C3 = { frets: [1, 1, 3, 3, 3, 1], fingers: [1, 1, 2, 3, 4, 1], baseFret: 3, barres: [1] };
const BARRE_C8 = { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8, barres: [1] };

describe("positionFacts", () => {
  it("reads the open C as a root-position open shape", () => {
    const f = positionFacts(OPEN_C, guitar, 0);
    expect(f.midi).toEqual([48, 52, 55, 60, 64]);
    expect(f.bassMidi).toBe(48);
    expect(f.inversion).toBe("root");
    expect(f.noteCount).toBe(5);
    expect(f.pitchClasses).toEqual([0, 4, 7]);
    expect(f.doubledCount).toBe(2);
    expect(f.hasBarre).toBe(false);
    expect(f.isOpenShape).toBe(true);
    expect(f.baseFret).toBe(1);
  });

  it("reads the 3rd-fret barre C as a 2nd inversion barre shape", () => {
    const f = positionFacts(BARRE_C3, guitar, 0);
    expect(f.bassMidi).toBe(43);
    expect(f.inversion).toBe("2nd");
    expect(f.hasBarre).toBe(true);
    expect(f.isOpenShape).toBe(false);
  });

  it("reads the 8th-fret barre C as root position", () => {
    expect(positionFacts(BARRE_C8, guitar, 0).inversion).toBe("root");
  });

  it("classifies a 7th in the bass as 3rd inversion", () => {
    // Synthetic: F2 in the bass against a G root — a 10-semitone interval.
    const pos = { frets: [1, -1, -1, -1, -1, -1], fingers: [1, 0, 0, 0, 0, 0], baseFret: 1, barres: [] };
    expect(positionFacts(pos, guitar, 7).inversion).toBe("3rd");
  });

  it("reports 'other' when the root pitch class is unknown", () => {
    expect(positionFacts(OPEN_C, guitar, null).inversion).toBe("other");
  });
});

describe("duplicateVoicingMap", () => {
  it("marks a later position that sounds identical to an earlier one", () => {
    const map = duplicateVoicingMap([OPEN_C, BARRE_C3, { ...OPEN_C }], guitar);
    expect(map).toEqual([null, null, 0]);
  });

  it("marks nothing when every voicing differs", () => {
    expect(duplicateVoicingMap([OPEN_C, BARRE_C3, BARRE_C8], guitar)).toEqual([null, null, null]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- voicingFacts`
Expected: FAIL — cannot find module `../src/voicingFacts`.

- [ ] **Step 3: Write `src/voicingFacts.ts`**

```ts
/**
 * Facts about a chord shape, derived from its sounding pitches.
 *
 * This module states facts; it never decides which shape a product should
 * display. Selection lives in src/voicingSelect.ts.
 */
import type { ChordsDbPosition } from "./instruments";
import { positionToMidi } from "./pitch";

export type Inversion = "root" | "1st" | "2nd" | "3rd" | "other";

export interface PositionFacts {
  /** Sounding pitches, chords-db string order. */
  midi: number[];
  /** Lowest sounding pitch, or -1 for an all-muted position. */
  bassMidi: number;
  /** Pitch class of the bass note, or -1 when nothing sounds. */
  bassPitchClass: number;
  inversion: Inversion;
  /** Sounding string count, including doublings. */
  noteCount: number;
  /** Distinct pitch classes, ascending. */
  pitchClasses: number[];
  /** Sounding strings beyond the first of each pitch class. */
  doubledCount: number;
  hasBarre: boolean;
  /** Barre-free and at the nut — the beginner "open chord" rung. */
  isOpenShape: boolean;
  baseFret: number;
}

/**
 * Interval from root to bass → inversion name.
 *
 * On guitar this constrains the bass note only: doubling, note count and
 * register are all unconstrained, so "root position" means far less here than
 * on a keyboard. Both major and minor thirds map to 1st inversion, and altered
 * fifths to 2nd, so dim/aug shapes classify rather than falling through.
 */
function inversionFor(interval: number): Inversion {
  if (interval === 0) return "root";
  if (interval === 3 || interval === 4) return "1st";
  if (interval === 6 || interval === 7 || interval === 8) return "2nd";
  if (interval === 9 || interval === 10 || interval === 11) return "3rd";
  return "other";
}

/**
 * Derive facts for one position.
 *
 * @param pos - chords-db position
 * @param openMidi - open-string MIDI in chords-db index order
 * @param rootPc - root pitch class from `rootPitchClass(label)`, or null when
 *   unparseable; null yields inversion "other" rather than a wrong guess.
 */
export function positionFacts(
  pos: ChordsDbPosition,
  openMidi: number[],
  rootPc: number | null,
): PositionFacts {
  const midi = positionToMidi(pos, openMidi);
  const bassMidi = midi.length ? Math.min(...midi) : -1;
  const bassPitchClass = bassMidi >= 0 ? bassMidi % 12 : -1;
  const pitchClasses = [...new Set(midi.map((m) => m % 12))].sort((a, b) => a - b);
  const hasBarre = pos.barres.length > 0;

  const inversion: Inversion =
    rootPc === null || bassPitchClass < 0
      ? "other"
      : inversionFor((bassPitchClass - rootPc + 12) % 12);

  return {
    midi,
    bassMidi,
    bassPitchClass,
    inversion,
    noteCount: midi.length,
    pitchClasses,
    doubledCount: midi.length - pitchClasses.length,
    hasBarre,
    isOpenShape: !hasBarre && pos.baseFret === 1,
    baseFret: pos.baseFret,
  };
}

/**
 * For each position, the index of the first earlier position that sounds
 * exactly the same pitches, or null when it is the first of its kind.
 *
 * chords-db ships 63 such redundant positions across 62 guitar entries
 * (ukulele has none). Callers offering alternate voicings must skip these or
 * they will present visual twins.
 *
 * Flags rather than removes: frames' /api/frame exposes a positionIndex
 * parameter, so renumbering positions would silently change existing results.
 */
export function duplicateVoicingMap(
  positions: ChordsDbPosition[],
  openMidi: number[],
): Array<number | null> {
  const firstSeen = new Map<string, number>();
  return positions.map((pos, i) => {
    const key = positionToMidi(pos, openMidi).join(",");
    const seen = firstSeen.get(key);
    if (seen === undefined) {
      firstSeen.set(key, i);
      return null;
    }
    return seen;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- voicingFacts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/voicingFacts.ts test/voicingFacts.test.ts
git commit -m "feat(guitar): derive voicing facts and detect duplicate voicings

Bass note, inversion, note count, doubling and open/barre classification,
all from positionToMidi. Duplicates are flagged, not stripped, because
frames' /api/frame exposes a positionIndex."
```

---

### Task 6: Shape-class filters and canonical position

**Files:**
- Create: `src/voicingSelect.ts`
- Test: `test/voicingSelect.test.ts`

**Interfaces:**
- Consumes: `PositionFacts`, `positionFacts`, `duplicateVoicingMap` (Task 5); `InstrumentId` (Task 4)
- Produces: `ShapeClass = "open" | "no-barre" | "any"`; `matchesShapeClass(facts, cls): boolean`; `canonicalPositionIndex(positions, openMidi, opts): number`

**Why instrument-aware:** `positions[0]` is root position for 431/529 guitar entries (81.5%) but only 75/552 ukulele entries (13.6%), and 317 ukulele entries (57.4%) have no root-position shape at all — its reentrant high-G tuning puts the third or fifth in the bass routinely. A "prefer root position" rule would fail on the majority of ukulele chords, so ukulele ranks on compactness instead.

- [ ] **Step 1: Write the failing test**

Create `test/voicingSelect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { matchesShapeClass, canonicalPositionIndex } from "../src/voicingSelect";
import { positionFacts } from "../src/voicingFacts";
import { INSTRUMENTS } from "../src/instruments";

const guitar = INSTRUMENTS.guitar.openMidi;

const OPEN_C = { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [] };
const BARRE_C3 = { frets: [1, 1, 3, 3, 3, 1], fingers: [1, 1, 2, 3, 4, 1], baseFret: 3, barres: [1] };
const BARRE_C5 = { frets: [-1, -1, 1, 1, 1, 4], fingers: [0, 0, 1, 1, 1, 4], baseFret: 5, barres: [1] };
const BARRE_C8 = { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8, barres: [1] };
const C_POSITIONS = [OPEN_C, BARRE_C3, BARRE_C5, BARRE_C8];

describe("matchesShapeClass", () => {
  it("accepts only nut-position barre-free shapes as open", () => {
    expect(matchesShapeClass(positionFacts(OPEN_C, guitar, 0), "open")).toBe(true);
    expect(matchesShapeClass(positionFacts(BARRE_C3, guitar, 0), "open")).toBe(false);
  });

  it("accepts any barre-free shape as no-barre", () => {
    expect(matchesShapeClass(positionFacts(OPEN_C, guitar, 0), "no-barre")).toBe(true);
    expect(matchesShapeClass(positionFacts(BARRE_C8, guitar, 0), "no-barre")).toBe(false);
  });

  it("accepts everything as any", () => {
    for (const p of C_POSITIONS) {
      expect(matchesShapeClass(positionFacts(p, guitar, 0), "any")).toBe(true);
    }
  });
});

describe("canonicalPositionIndex", () => {
  it("prefers the first root-position shape on guitar", () => {
    const i = canonicalPositionIndex(C_POSITIONS, guitar, { instrument: "guitar", rootPc: 0 });
    expect(i).toBe(0); // open C, root position
  });

  it("falls back to the first position when no shape is root position", () => {
    // Both are 2nd inversion for C.
    const i = canonicalPositionIndex([BARRE_C3, BARRE_C5], guitar, { instrument: "guitar", rootPc: 0 });
    expect(i).toBe(0);
  });

  it("ranks ukulele on compactness, not inversion", () => {
    const uke = INSTRUMENTS.ukulele.openMidi;
    const high = { frets: [5, 4, 3, 3], fingers: [4, 3, 1, 2], baseFret: 3, barres: [] };
    const low = { frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], baseFret: 1, barres: [] };
    const i = canonicalPositionIndex([high, low], uke, { instrument: "ukulele", rootPc: 0 });
    expect(i).toBe(1); // lowest baseFret wins
  });

  it("never picks a duplicate voicing", () => {
    const i = canonicalPositionIndex([{ ...OPEN_C }, OPEN_C, BARRE_C8], guitar, {
      instrument: "guitar",
      rootPc: 0,
    });
    expect(i).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- voicingSelect`
Expected: FAIL — cannot find module `../src/voicingSelect`.

- [ ] **Step 3: Write the filters and canonical selection**

Create `src/voicingSelect.ts`:

```ts
/**
 * Choosing among a chord's stored shapes.
 *
 * The package offers a sensible default and a ranked list; which shape a
 * product actually displays stays the consumer's decision.
 */
import type { ChordsDbPosition, InstrumentId } from "./instruments";
import type { PositionFacts } from "./voicingFacts";
import { positionFacts, duplicateVoicingMap } from "./voicingFacts";

/**
 * Difficulty rungs expressible as a filter over stored shapes.
 *
 * The `guitar-top3` and `power` rungs are not filters — top-3 comes from
 * GUITAR_TOP3_PRESETS and power chords are generated (src/powerChords.ts),
 * because chords-db has neither.
 */
export type ShapeClass = "open" | "no-barre" | "any";

/** Rungs ordered easiest → hardest, for the "widen by one rung" option. */
export const SHAPE_CLASS_LADDER: ShapeClass[] = ["open", "no-barre", "any"];

export function matchesShapeClass(facts: PositionFacts, cls: ShapeClass): boolean {
  if (cls === "any") return true;
  if (cls === "no-barre") return !facts.hasBarre;
  return facts.isOpenShape;
}

export interface CanonicalOptions {
  instrument: InstrumentId;
  /** Root pitch class from `rootPitchClass(label)`; null disables inversion ranking. */
  rootPc: number | null;
}

/**
 * Index of the shape to present by default.
 *
 * Guitar: the first root-position shape, falling back to the first shape when
 * none is root position (50 of 529 guitar entries have none).
 *
 * Ukulele: lowest baseFret, because root position barely applies — its
 * reentrant high-G tuning leaves 317 of 552 entries with no root-position
 * shape at all.
 *
 * Duplicate voicings are never chosen.
 */
export function canonicalPositionIndex(
  positions: ChordsDbPosition[],
  openMidi: number[],
  opts: CanonicalOptions,
): number {
  if (positions.length === 0) return -1;
  const dupes = duplicateVoicingMap(positions, openMidi);
  const candidates = positions
    .map((pos, index) => ({ index, facts: positionFacts(pos, openMidi, opts.rootPc) }))
    .filter((c) => dupes[c.index] === null);

  if (candidates.length === 0) return 0;

  if (opts.instrument === "ukulele") {
    let best = candidates[0];
    for (const c of candidates) {
      if (c.facts.baseFret < best.facts.baseFret) best = c;
    }
    return best.index;
  }

  const rootPosition = candidates.find((c) => c.facts.inversion === "root");
  return (rootPosition ?? candidates[0]).index;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- voicingSelect`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/voicingSelect.ts test/voicingSelect.test.ts
git commit -m "feat(guitar): shape-class filters and instrument-aware canonical position

Guitar prefers the first root-position shape; ukulele ranks on lowest
baseFret because 57% of its entries have no root-position shape under
reentrant tuning. Duplicates are never chosen."
```

---

### Task 7: Power chord generation

**Files:**
- Create: `src/powerChords.ts`
- Test: `test/powerChords.test.ts`

**Interfaces:**
- Consumes: `INSTRUMENTS`, `dbPositionToChord`, `ChordsDbPosition`; `positionToMidi` for the test
- Produces: `powerChordPosition(rootPc, opts): ChordsDbPosition | null`; `powerChordShape(rootPc, opts): Chord | null`

**Why generated:** chords-db has no power-chord suffix — there is no `5` among its 63 suffixes. Unlike `guitar-top3`, no curation is needed: the shape is regular and movable, so it derives from `openMidi`.

- [ ] **Step 1: Write the failing test**

Create `test/powerChords.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { powerChordPosition, powerChordShape } from "../src/powerChords";
import { positionToMidi } from "../src/pitch";
import { INSTRUMENTS } from "../src/instruments";

const guitar = INSTRUMENTS.guitar.openMidi;

describe("powerChordPosition", () => {
  it("puts G5 at the 3rd fret of the low E string", () => {
    const pos = powerChordPosition(7, { stringSet: "E" })!;
    expect(pos.baseFret).toBe(3);
    expect(pos.frets).toEqual([1, 3, 3, -1, -1, -1]);
    // G2 D3 G3
    expect(positionToMidi(pos, guitar)).toEqual([43, 50, 55]);
  });

  it("uses the nut for an open E5", () => {
    const pos = powerChordPosition(4, { stringSet: "E" })!;
    expect(pos.baseFret).toBe(1);
    expect(pos.frets).toEqual([0, 2, 2, -1, -1, -1]);
    expect(positionToMidi(pos, guitar)).toEqual([40, 47, 52]);
  });

  it("puts C5 at the 3rd fret of the A string", () => {
    const pos = powerChordPosition(0, { stringSet: "A" })!;
    expect(pos.baseFret).toBe(3);
    expect(pos.frets).toEqual([-1, 1, 3, 3, -1, -1]);
    expect(positionToMidi(pos, guitar)).toEqual([48, 55, 60]);
  });

  it("drops the octave when includeOctave is false", () => {
    const pos = powerChordPosition(7, { stringSet: "E", includeOctave: false })!;
    expect(pos.frets).toEqual([1, 3, -1, -1, -1, -1]);
    expect(positionToMidi(pos, guitar)).toEqual([43, 50]);
  });

  it("always sounds root, fifth and octave in pitch-class terms", () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const stringSet of ["E", "A"] as const) {
        const pos = powerChordPosition(pc, { stringSet })!;
        const pcs = new Set(positionToMidi(pos, guitar).map((m) => m % 12));
        expect([...pcs].sort((a, b) => a - b), `${pc} on ${stringSet}`).toEqual(
          [pc % 12, (pc + 7) % 12].sort((a, b) => a - b),
        );
      }
    }
  });
});

describe("powerChordShape", () => {
  it("returns an svguitar Chord with no barres", () => {
    const chord = powerChordShape(7, { stringSet: "E", title: "G5" })!;
    expect(chord.barres).toEqual([]);
    expect(chord.position).toBe(3);
    expect(chord.title).toBe("G5");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- powerChords`
Expected: FAIL — cannot find module `../src/powerChords`.

- [ ] **Step 3: Write `src/powerChords.ts`**

```ts
/**
 * Movable power-chord (root + fifth + octave) shapes.
 *
 * chords-db has no power-chord suffix, so these cannot be looked up. They also
 * need no curation: the shape is perfectly regular, so it derives from the
 * instrument's open-string pitches. Output goes through dbPositionToChord so
 * renderers see the same contract as any other shape.
 */
import type { Chord } from "svguitar";
import type { ChordsDbPosition } from "./instruments";
import { INSTRUMENTS, dbPositionToChord } from "./instruments";

/** Which string carries the root. "E" = 6th string, "A" = 5th string. */
export type PowerChordStringSet = "E" | "A";

export interface PowerChordOptions {
  stringSet: PowerChordStringSet;
  /** Include the octave doubling on the next string up. Default true. */
  includeOctave?: boolean;
  title?: string;
}

const ROOT_STRING_INDEX: Record<PowerChordStringSet, number> = { E: 0, A: 1 };

/**
 * Build a chords-db-shaped position for a power chord.
 *
 * @param rootPc - root pitch class, 0 = C
 * @returns null when rootPc is out of range
 */
export function powerChordPosition(
  rootPc: number,
  opts: PowerChordOptions,
): ChordsDbPosition | null {
  if (!Number.isInteger(rootPc) || rootPc < 0 || rootPc > 11) return null;

  const openMidi = INSTRUMENTS.guitar.openMidi;
  const rootIdx = ROOT_STRING_INDEX[opts.stringSet];
  const includeOctave = opts.includeOctave ?? true;

  // Fret on the root string that sounds rootPc.
  const fret = (rootPc - (openMidi[rootIdx] % 12) + 12) % 12;

  // Open position keeps baseFret at the nut so the diagram shows the nut;
  // elsewhere the window starts at the root fret and frets are window-relative.
  const baseFret = fret === 0 ? 1 : fret;
  const rootFret = fret === 0 ? 0 : 1;
  const upperFret = fret === 0 ? 2 : 3;

  const frets = new Array<number>(6).fill(-1);
  const fingers = new Array<number>(6).fill(0);

  frets[rootIdx] = rootFret;
  fingers[rootIdx] = 1;
  frets[rootIdx + 1] = upperFret;
  fingers[rootIdx + 1] = fret === 0 ? 2 : 3;
  if (includeOctave) {
    frets[rootIdx + 2] = upperFret;
    fingers[rootIdx + 2] = fret === 0 ? 3 : 4;
  }

  return { frets, fingers, baseFret, barres: [] };
}

/** The same shape as an svguitar Chord, ready to render. */
export function powerChordShape(rootPc: number, opts: PowerChordOptions): Chord | null {
  const pos = powerChordPosition(rootPc, opts);
  if (!pos) return null;
  return dbPositionToChord(pos, INSTRUMENTS.guitar.strings, opts.title);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- powerChords`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/powerChords.ts test/powerChords.test.ts
git commit -m "feat(guitar): generate movable power-chord shapes

chords-db has no power-chord suffix, but the shape is regular enough to
derive from openMidi rather than curate."
```

---

### Task 8: Diversity-ranked voicing selection

**Files:**
- Modify: `src/voicingSelect.ts` (append)
- Test: `test/voicingSelect.test.ts` (append)

**Interfaces:**
- Consumes: `PositionFacts`, `positionFacts`, `duplicateVoicingMap`, `matchesShapeClass`, `canonicalPositionIndex`, `SHAPE_CLASS_LADDER`, `dbPositionToChord`
- Produces: `VoicingChoice`, `SelectVoicingsOptions`, `SelectVoicingsResult`, `selectVoicings(positions, openMidi, opts): SelectVoicingsResult | null`

**Why ranking is needed:** taking `positions[0..2]` repeats an (inversion, barre) profile for 396 of 529 guitar entries — 74.9%. C major is typical: positions 1 and 2 are both 2nd-inversion barres while the contrasting root-position barre at fret 8 sits unused at position 3.

- [ ] **Step 1: Write the failing test**

In `test/voicingSelect.test.ts`, add `selectVoicings` to the **existing** import from `../src/voicingSelect` (do not add a second import statement from the same module), then append the new describe block:

```ts
// existing import becomes:
import { matchesShapeClass, canonicalPositionIndex, selectVoicings } from "../src/voicingSelect";
```

```ts
describe("selectVoicings", () => {
  it("picks the canonical shape as primary", () => {
    const r = selectVoicings(C_POSITIONS, guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    expect(r.primary.index).toBe(0);
    expect(r.primary.facts.isOpenShape).toBe(true);
  });

  it("avoids two same-profile alternates and surfaces the contrasting one", () => {
    // positions 1 and 2 are both 2nd-inversion barres; position 3 is a
    // root-position barre. Naive first-n takes 1 and 2 and never reaches 3.
    const r = selectVoicings(C_POSITIONS, guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    const picked = r.alternates.map((a) => a.index);
    expect(picked).toContain(3);
    expect(picked).not.toEqual([1, 2]);
    expect(r.short).toBe(false);
  });

  it("never returns the same voicing twice", () => {
    const r = selectVoicings([OPEN_C, { ...OPEN_C }, BARRE_C8], guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    const chosen = [r.primary.index, ...r.alternates.map((a) => a.index)];
    expect(new Set(chosen).size).toBe(chosen.length);
    expect(r.alternates).toHaveLength(1);
    expect(r.short).toBe(true);
  });

  it("restricts candidates to the requested shape class", () => {
    const r = selectVoicings(C_POSITIONS, guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
      shapeClass: "open",
    })!;
    expect(r.primary.facts.isOpenShape).toBe(true);
    expect(r.alternates).toHaveLength(0);
    expect(r.short).toBe(true);
  });

  it("widens by one rung when allowNextRung is set", () => {
    // Only the open C is barre-free, so "no-barre" alone yields no alternates;
    // widening to "any" brings the barre shapes into the pool.
    const narrow = selectVoicings(C_POSITIONS, guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
      shapeClass: "no-barre",
    })!;
    expect(narrow.alternates).toHaveLength(0);

    const widened = selectVoicings(C_POSITIONS, guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
      shapeClass: "no-barre",
      allowNextRung: true,
    })!;
    expect(widened.alternates).toHaveLength(2);
  });

  it("labels each choice from its facts", () => {
    const r = selectVoicings(C_POSITIONS, guitar, {
      instrument: "guitar",
      rootPc: 0,
      alternates: 2,
    })!;
    expect(r.primary.label).toBe("Open");
    expect(r.alternates.some((a) => a.label.startsWith("Barre, fret "))).toBe(true);
  });

  it("returns null for an empty position list", () => {
    expect(selectVoicings([], guitar, { instrument: "guitar", rootPc: 0, alternates: 2 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- voicingSelect`
Expected: FAIL — `selectVoicings` is not exported.

- [ ] **Step 3: Append the implementation to `src/voicingSelect.ts`**

Add the `Chord` and `dbPositionToChord` imports at the top of the file:

```ts
import type { Chord } from "svguitar";
import { INSTRUMENTS, dbPositionToChord } from "./instruments";
```

Then append:

```ts
export interface VoicingChoice {
  /** Index into the original positions array — stable, so it round-trips. */
  index: number;
  facts: PositionFacts;
  shape: Chord;
  /** Human label derived from facts, e.g. "Open", "Barre, fret 8". */
  label: string;
}

export interface SelectVoicingsOptions extends CanonicalOptions {
  /** How many alternates to return alongside the primary. */
  alternates: number;
  /** Restrict candidates to a difficulty rung. Default "any". */
  shapeClass?: ShapeClass;
  /** Widen the pool by one rung when the requested rung runs dry. Default false. */
  allowNextRung?: boolean;
  title?: string;
}

export interface SelectVoicingsResult {
  primary: VoicingChoice;
  alternates: VoicingChoice[];
  /** True when fewer alternates were available than requested. */
  short: boolean;
}

function labelFor(facts: PositionFacts): string {
  if (facts.isOpenShape) return "Open";
  if (facts.hasBarre) return `Barre, fret ${facts.baseFret}`;
  return `Fret ${facts.baseFret}`;
}

/**
 * How different two shapes look and feel to a player. Higher = more contrast.
 *
 * Inversion dominates because it changes what the chord sounds like; barre vs
 * open is the next most visible difference; neck distance breaks ties.
 */
function contrast(a: PositionFacts, b: PositionFacts): number {
  let score = 0;
  if (a.inversion !== b.inversion) score += 4;
  if (a.hasBarre !== b.hasBarre) score += 2;
  score += Math.min(Math.abs(a.baseFret - b.baseFret), 5) / 5;
  return score;
}

function widen(cls: ShapeClass): ShapeClass {
  const i = SHAPE_CLASS_LADDER.indexOf(cls);
  return SHAPE_CLASS_LADDER[Math.min(i + 1, SHAPE_CLASS_LADDER.length - 1)];
}

/**
 * A primary shape plus up to `alternates` maximally-contrasting others.
 *
 * Alternates are chosen greedily: each pick maximises its minimum contrast
 * against everything already chosen. Naive first-n selection repeats an
 * (inversion, barre) profile on 74.9% of guitar entries, which reads as a
 * broken card when three shapes appear side by side.
 *
 * Duplicate voicings are excluded, so a card can never print visual twins.
 * Returns fewer alternates than asked for rather than padding, with `short`
 * set — 5 guitar entries have fewer than 3 unique voicings.
 */
export function selectVoicings(
  positions: ChordsDbPosition[],
  openMidi: number[],
  opts: SelectVoicingsOptions,
): SelectVoicingsResult | null {
  if (positions.length === 0) return null;

  const dupes = duplicateVoicingMap(positions, openMidi);
  const stringCount = INSTRUMENTS[opts.instrument].strings;

  const build = (index: number): VoicingChoice => {
    const facts = positionFacts(positions[index], openMidi, opts.rootPc);
    return {
      index,
      facts,
      shape: dbPositionToChord(positions[index], stringCount, opts.title),
      label: labelFor(facts),
    };
  };

  const requested: ShapeClass = opts.shapeClass ?? "any";
  const classes = opts.allowNextRung ? [requested, widen(requested)] : [requested];

  let pool: VoicingChoice[] = [];
  for (const cls of classes) {
    pool = positions
      .map((_, index) => index)
      .filter((index) => dupes[index] === null)
      .map(build)
      .filter((c) => matchesShapeClass(c.facts, cls));
    if (pool.length > opts.alternates) break;
  }
  if (pool.length === 0) return null;

  const canonical = canonicalPositionIndex(positions, openMidi, opts);
  const primary = pool.find((c) => c.index === canonical) ?? pool[0];

  const chosen: VoicingChoice[] = [primary];
  const remaining = pool.filter((c) => c.index !== primary.index);

  while (chosen.length <= opts.alternates && remaining.length > 0) {
    let bestAt = 0;
    let bestScore = -Infinity;
    remaining.forEach((cand, i) => {
      const score = Math.min(...chosen.map((c) => contrast(c.facts, cand.facts)));
      if (score > bestScore) {
        bestScore = score;
        bestAt = i;
      }
    });
    chosen.push(remaining.splice(bestAt, 1)[0]);
  }

  const alternates = chosen.slice(1);
  return { primary, alternates, short: alternates.length < opts.alternates };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- voicingSelect`
Expected: PASS (14 tests total in this file).

- [ ] **Step 5: Commit**

```bash
git add src/voicingSelect.ts test/voicingSelect.test.ts
git commit -m "feat(guitar): diversity-ranked alternate voicing selection

Greedy max-contrast ranking over inversion, barre and neck position.
Naive first-n repeats a profile on 74.9% of entries; duplicates are
excluded so a card can never print visual twins."
```

---

### Task 9: Public API, changelog and version

**Files:**
- Modify: `src/index.ts`
- Modify: `package.json` (version)
- Modify: `../../CHANGELOG.md`
- Test: `test/publicApi.test.ts` (create)

**Interfaces:**
- Consumes: everything from Tasks 1–8
- Produces: the package's public surface

- [ ] **Step 1: Write the failing test**

Create `test/publicApi.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- publicApi`
Expected: FAIL — `positionToMidi` and friends are not exported from the index.

- [ ] **Step 3: Update `src/index.ts`**

Append after the existing exports:

```ts
export { positionToMidi, rootPitchClass } from "./pitch";

export { positionFacts, duplicateVoicingMap } from "./voicingFacts";
export type { Inversion, PositionFacts } from "./voicingFacts";

export {
  matchesShapeClass,
  canonicalPositionIndex,
  selectVoicings,
  SHAPE_CLASS_LADDER,
} from "./voicingSelect";
export type {
  ShapeClass,
  CanonicalOptions,
  VoicingChoice,
  SelectVoicingsOptions,
  SelectVoicingsResult,
} from "./voicingSelect";

export { powerChordPosition, powerChordShape } from "./powerChords";
export type { PowerChordStringSet, PowerChordOptions } from "./powerChords";
```

- [ ] **Step 4: Bump the version**

In `package.json`, change `"version": "0.1.0"` to `"version": "0.2.0"` — `OPEN_STRING_MIDI` was removed, so this is a breaking change on a 0.x line.

- [ ] **Step 5: Add the changelog entry**

In `/home/shaun/chordl/CHANGELOG.md`, under `## Unreleased`:

```markdown
### chordl-guitar 0.2.0

**Breaking:** `OPEN_STRING_MIDI` is removed. Use `INSTRUMENTS[id].openMidi`,
which is chords-db index order (`openMidi[i]` is the string `frets[i]` refers
to) rather than svguitar's highest-pitch-first numbering.

- `positionToMidi(pos, openMidi)` derives sounding pitches from tuning and
  `baseFret`. Verified against all 4,183 chords-db positions. `capo` is a
  rendering hint and is ignored.
- `positionFacts` exposes bass note, inversion, note count, doubling, pitch
  classes and open/barre classification.
- `duplicateVoicingMap` flags chords-db's 63 redundant identical-sounding
  positions. Flagged, not removed — frames' `/api/frame` exposes a
  `positionIndex`.
- `canonicalPositionIndex` picks a default shape, instrument-aware: guitar
  prefers root position, ukulele ranks on lowest `baseFret`.
- `selectVoicings` returns a primary plus diversity-ranked alternates.
- `powerChordPosition` / `powerChordShape` generate movable power chords,
  which chords-db does not carry.
- New instruments: `bass4`, `bass5`. Lookup returns `null` — chords-db has no
  bass library.
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `pnpm test:run && pnpm lint`
Expected: PASS, no TypeScript errors.

- [ ] **Step 7: Verify the whole monorepo still builds and every suite passes**

Run, from the repository root (the worktree root, two levels up from this package): `pnpm build && pnpm test:run`
Expected: all packages build; 28 test files and 423 tests passed at baseline, so the totals should be baseline plus this branch's new tests, with zero failures. `chordl-react` consumes this package, so a break surfaces here rather than at publish.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts package.json ../../CHANGELOG.md test/publicApi.test.ts
git commit -m "feat(guitar)!: publish pitch, facts, selection and power-chord API as 0.2.0"
```

---

## Self-Review

**Spec coverage:** Sub-project 1's eleven items map to tasks as follows — `src/pitch.ts` (1), `openMidi` on config (1), retire `OPEN_STRING_MIDI` (2), bass (4), voicing facts (5), canonical position (6), duplicate flagging (5 + used in 6, 8), shape-class filters (6), power chords (7), diversity-ranked selection (8), golden test (3). Public surface and version (9).

**Deliberately not in this plan:** the szaza spike (independent, gated on its own go/no-go), sub-projects 2 and 3 (own brainstorm cycles), and `matchVoicing` (proposed, no consumer).

**Known follow-up:** `test/staticPresets.test.ts` still carries its own local `PC` and `INTERVALS` tables. Task 1 adds `rootPitchClass`, which overlaps the `PC` table. Left alone deliberately — the preset test's independence from production code is the point of it, since a wrong preset is unrecoverable once printed.
