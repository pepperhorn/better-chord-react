# Keyboard Hand Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a caller ask `@pepperhorn/chordl-core` for keyboard voicings a small hand can actually play, constrained by reach and note count.

**Architecture:** Lands in `chordl-core`, not `chordl-voicings`. Voicings is a leaf package (`tonal` only) and core depends on it, so voicings cannot reach core's `dropOrder`/`classifyTones` — the "which notes may I drop" knowledge this needs. Core composes `generateVariants` with its own reduction. Constraints are satisfied by folding octaves first (keeps every chord tone), then dropping in `dropOrder` (never below identity tones), then preferring whichever generated variant already fits.

**Tech Stack:** TypeScript (ESM), Vitest 4, `@pepperhorn/chordl-voicings` (workspace dependency, already present).

**Spec:** `docs/superpowers/specs/2026-08-08-chordl-guitar-boundary-design.md`, sub-project 1b.

## Global Constraints

- Package directory: `/home/shaun/chordl/packages/chordl-core`. All paths below are relative to it.
- Run tests with `pnpm test:run`. Note: packages resolve each other's types from `dist/`, so run `pnpm build` at the monorepo root once before testing on a clean checkout.
- **`maxNotesPerHand` minimum is 2.** A dyad is a shell voicing — a legitimate beginner idiom, not a degenerate case. Values below 2 are clamped to 2.
- **Reduce, never filter to nothing.** A beginner deck needs a playable 3-note C7, not an empty result.
- **Never drop an identity tone.** The 3rd and 7th define the chord; dropping them yields a different chord, not a simpler voicing. The root *is* droppable as a last resort — that is how shell voicings work.
- Span is measured in semitones between the lowest and highest sounding pitch **within one hand**.
- Do not modify `@pepperhorn/chordl-voicings`. This work is additive in core.
- Repo uses double quotes, 2-space indent, `export function` for public API.
- Work on a branch off `main`: `feat/keyboard-hand-constraints`.

---

### Task 1: Span measurement and pitch realization

**Files:**
- Create: `src/theory/hand-constraints.ts`
- Test: `test/hand-constraints.test.ts`

**Interfaces:**
- Consumes: `PC_SEMITONES`, `assignAscendingOctaves` from `src/engine/note-spelling.ts`; `Hand` from `@pepperhorn/chordl-voicings`
- Produces: `HandConstraints`, `PlacedNote`, `midiOf(note, octave): number`, `placeAscending(notes, baseOctave, maxSpan?): PlacedNote[]`, `spanOf(pitches): number`

- [ ] **Step 1: Write the failing test**

Create `test/hand-constraints.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { midiOf, placeAscending, spanOf } from "../src/theory/hand-constraints";

describe("midiOf", () => {
  it("uses the C4 = 60 convention", () => {
    expect(midiOf("C", 4)).toBe(60);
    expect(midiOf("A", 3)).toBe(57);
  });

  it("accepts flats as well as sharps", () => {
    expect(midiOf("Bb", 3)).toBe(58);
    expect(midiOf("A#", 3)).toBe(58);
  });
});

describe("placeAscending", () => {
  it("stacks a triad upward without bumping the octave", () => {
    expect(placeAscending(["C", "E", "G"], 3).map((n) => n.midi)).toEqual([48, 52, 55]);
  });

  it("bumps the octave when a note would descend", () => {
    // 1st inversion Cmaj7: C wraps above B.
    expect(placeAscending(["E", "G", "B", "C"], 3).map((n) => n.midi)).toEqual([52, 55, 59, 60]);
  });

  it("returns an empty array for no notes", () => {
    expect(placeAscending([], 3)).toEqual([]);
  });
});

describe("spanOf", () => {
  it("measures lowest to highest in semitones", () => {
    expect(spanOf([48, 52, 55])).toBe(7);
    expect(spanOf([52, 59])).toBe(7);
  });

  it("is zero for one note or none", () => {
    expect(spanOf([60])).toBe(0);
    expect(spanOf([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- hand-constraints`
Expected: FAIL — cannot find module `../src/theory/hand-constraints`.

- [ ] **Step 3: Write the module**

Create `src/theory/hand-constraints.ts`:

```ts
/**
 * Keyboard reach constraints.
 *
 * Two orthogonal limits, both required:
 *   - maxSpanPerHand — physical reach, in semitones
 *   - maxNotesPerHand — coordination, in note count
 *
 * Count alone does not express reach: a 3-note cap still admits C-E-C', three
 * notes spanning a full octave, which a young player cannot stretch. The
 * converse also holds — a 4-note cluster inside a 5th is an easy reach but
 * harder to coordinate.
 *
 * Deriving a junior cutoff from "no 7ths or octaves": a 7th spans 10-11
 * semitones and an octave 12, so maxSpanPerHand 9 (a major 6th) is binding.
 */
import { PC_SEMITONES, assignAscendingOctaves } from "../engine/note-spelling";

export interface HandConstraints {
  /** Maximum semitones between lowest and highest note in one hand. */
  maxSpanPerHand: number;
  /** Maximum notes in one hand. Values below 2 are clamped to 2. */
  maxNotesPerHand: number;
}

export interface PlacedNote {
  note: string;
  octave: number;
  midi: number;
}

/**
 * MIDI number for a pitch class in a given octave, C4 = 60.
 *
 * PC_SEMITONES handles both sharps and flats, so no spelling normalization is
 * needed here.
 */
export function midiOf(note: string, octave: number): number {
  const semi = PC_SEMITONES[note] ?? 0;
  return semi + (octave + 1) * 12;
}

/**
 * Stack pitch classes into an ascending voicing.
 *
 * @param notes - pitch classes in voicing order
 * @param baseOctave - octave of the first note
 * @param maxSpan - optional semitone limit; folds notes down where it can
 *   (0 = no folding). Folding is preferred over dropping because it keeps
 *   every chord tone.
 */
export function placeAscending(
  notes: string[],
  baseOctave: number,
  maxSpan: number = 0,
): PlacedNote[] {
  return assignAscendingOctaves(notes, baseOctave, maxSpan).map(({ note, octave }) => ({
    note,
    octave,
    midi: midiOf(note, octave),
  }));
}

/** Semitones between the lowest and highest pitch. Zero for 0 or 1 notes. */
export function spanOf(pitches: number[]): number {
  if (pitches.length < 2) return 0;
  return Math.max(...pitches) - Math.min(...pitches);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- hand-constraints`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/theory/hand-constraints.ts test/hand-constraints.test.ts
git commit -m "feat(core): add span measurement and pitch realization for hand constraints"
```

---

### Task 2: Constrain a single voicing

**Files:**
- Modify: `src/theory/hand-constraints.ts` (append)
- Test: `test/hand-constraints.test.ts` (append)

**Interfaces:**
- Consumes: `placeAscending`, `spanOf`, `HandConstraints`, `PlacedNote` (Task 1); `Hand` from `@pepperhorn/chordl-voicings`
- Produces: `ConstrainedNote`, `ConstrainVoicingInput`, `ConstrainedVoicing`, `constrainVoicing(input): ConstrainedVoicing`

**Reduction order:** fold octaves first (keeps every tone), then drop in `dropOrder`, stopping before identity tones. The root is droppable as a last resort — dropping it is exactly how a shell voicing is formed.

- [ ] **Step 1: Write the failing test**

Append to `test/hand-constraints.test.ts`:

```ts
import { constrainVoicing } from "../src/theory/hand-constraints";

describe("constrainVoicing", () => {
  const JUNIOR = { maxSpanPerHand: 9, maxNotesPerHand: 3 };

  it("leaves a triad alone when it already fits", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "G"],
      dropOrder: ["G", "C", "E"],
      keepAtLeast: ["E"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual([]);
    expect(r.notes.map((n) => n.note)).toEqual(["C", "E", "G"]);
    expect(r.span).toBe(7);
  });

  it("drops toward a shell voicing when a maj7 cannot be reached", () => {
    // Root-position Cmaj7 spans C3-B3 = 11 semitones, over the 9 cap, and
    // octave folding cannot help because every note is already in one octave.
    const r = constrainVoicing({
      notes: ["C", "E", "G", "B"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: JUNIOR,
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual(["G", "C"]);
    expect(r.notes.map((n) => n.note)).toEqual(["E", "B"]);
    expect(r.span).toBe(7);
  });

  it("enforces the note-count cap even when the span already fits", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "G", "B"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 3 },
    });
    expect(r.notes).toHaveLength(3);
    expect(r.dropped).toEqual(["G"]);
    expect(r.satisfied).toBe(true);
  });

  it("never drops an identity tone, reporting failure instead", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "B"],
      dropOrder: ["C", "E", "B"],
      keepAtLeast: ["C", "E", "B"],
      constraints: { maxSpanPerHand: 3, maxNotesPerHand: 3 },
    });
    expect(r.satisfied).toBe(false);
    expect(r.dropped).toEqual([]);
    expect(r.notes).toHaveLength(3);
  });

  it("clamps a note cap below 2 up to 2", () => {
    const r = constrainVoicing({
      notes: ["C", "E", "G"],
      dropOrder: ["G", "C", "E"],
      keepAtLeast: ["E"],
      constraints: { maxSpanPerHand: 24, maxNotesPerHand: 1 },
    });
    expect(r.notes).toHaveLength(2);
  });

  it("measures span per hand, not across the whole voicing", () => {
    // Ascending placement from octave 3: C3=48 G3=55 | E4=64 B4=71.
    // LH span 7, RH span 7 — but the whole-voicing span is 23, well over the cap.
    const r = constrainVoicing({
      notes: ["C", "G", "E", "B"],
      handHints: ["LH", "LH", "RH", "RH"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: { maxSpanPerHand: 9, maxNotesPerHand: 2 },
    });
    expect(r.satisfied).toBe(true);
    expect(r.dropped).toEqual([]);
    expect(r.notes).toHaveLength(4);
  });

  it("treats a voicing with no hand hints as a single hand", () => {
    const r = constrainVoicing({
      notes: ["C", "G", "E", "B"],
      dropOrder: ["G", "C", "E", "B"],
      keepAtLeast: ["E", "B"],
      constraints: { maxSpanPerHand: 9, maxNotesPerHand: 2 },
    });
    expect(r.notes.length).toBeLessThan(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- hand-constraints`
Expected: FAIL — `constrainVoicing` is not exported.

- [ ] **Step 3: Append the implementation**

Add the import at the top of `src/theory/hand-constraints.ts`:

```ts
import type { Hand } from "@pepperhorn/chordl-voicings";
```

Then append:

```ts
export interface ConstrainedNote extends PlacedNote {
  hand: Hand;
}

export interface ConstrainVoicingInput {
  /** Pitch classes in voicing order. */
  notes: string[];
  /**
   * Per-note hand assignment. When absent the whole voicing counts as one
   * hand — variants from the `inversion` and `algorithmic` sources carry no
   * hand hints, so both caps apply to the voicing as a whole.
   */
  handHints?: Hand[];
  /** Safest-to-drop first, from core's `dropOrder(analysis)`. */
  dropOrder: string[];
  /** Notes that must survive — the chord's identity tones. */
  keepAtLeast: string[];
  constraints: HandConstraints;
  /** Octave of the lowest note. Default 3. */
  baseOctave?: number;
}

export interface ConstrainedVoicing {
  notes: ConstrainedNote[];
  /** Pitch classes removed, in the order they were dropped. */
  dropped: string[];
  /** Largest per-hand span in the result, semitones. */
  span: number;
  /** True when every hand is within both caps. */
  satisfied: boolean;
}

const DEFAULT_HAND: Hand = "LH";

function groupsOf(notes: ConstrainedNote[]): ConstrainedNote[][] {
  const byHand = new Map<Hand, ConstrainedNote[]>();
  for (const n of notes) {
    const list = byHand.get(n.hand);
    if (list) list.push(n);
    else byHand.set(n.hand, [n]);
  }
  return [...byHand.values()];
}

function withinCaps(groups: ConstrainedNote[][], c: HandConstraints, maxNotes: number): boolean {
  return groups.every(
    (g) => g.length <= maxNotes && spanOf(g.map((n) => n.midi)) <= c.maxSpanPerHand,
  );
}

/**
 * Fit a voicing inside a hand's reach and note count.
 *
 * Strategy, in order:
 *   1. Fold octaves — keeps every chord tone, so it is always preferred.
 *   2. Drop notes in `dropOrder`, never below `keepAtLeast`.
 *
 * When the constraints still cannot be met without dropping an identity tone,
 * returns the closest legal voicing with `satisfied: false` rather than
 * returning nothing or a chord that is no longer the chord asked for.
 * Callers wanting a voicing that genuinely fits should try other variants —
 * an inversion often fits where root position cannot.
 */
export function constrainVoicing(input: ConstrainVoicingInput): ConstrainedVoicing {
  const baseOctave = input.baseOctave ?? 3;
  const maxNotes = Math.max(2, input.constraints.maxNotesPerHand);
  const keep = new Set(input.keepAtLeast);

  let working = [...input.notes];
  const dropped: string[] = [];

  const place = (notes: string[]): ConstrainedNote[] => {
    const placed = placeAscending(notes, baseOctave, input.constraints.maxSpanPerHand);
    return placed.map((p, i) => {
      // Hand hints index the ORIGINAL note order, so look the hand up by
      // pitch class rather than by position in the reduced array.
      const original = input.handHints
        ? input.handHints[input.notes.indexOf(notes[i])]
        : undefined;
      return { ...p, hand: original ?? DEFAULT_HAND };
    });
  };

  for (;;) {
    const placed = place(working);
    const groups = groupsOf(placed);
    if (withinCaps(groups, input.constraints, maxNotes)) {
      return {
        notes: placed,
        dropped,
        span: Math.max(0, ...groups.map((g) => spanOf(g.map((n) => n.midi)))),
        satisfied: true,
      };
    }

    const next = input.dropOrder.find((n) => working.includes(n) && !keep.has(n));
    if (next === undefined) {
      return {
        notes: placed,
        dropped,
        span: Math.max(0, ...groups.map((g) => spanOf(g.map((n) => n.midi)))),
        satisfied: false,
      };
    }
    working = working.filter((n) => n !== next);
    dropped.push(next);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- hand-constraints`
Expected: PASS (14 tests total in this file).

- [ ] **Step 5: Commit**

```bash
git add src/theory/hand-constraints.ts test/hand-constraints.test.ts
git commit -m "feat(core): constrain a voicing to a hand's reach and note count

Folds octaves before dropping, never drops an identity tone, and measures
span per hand rather than across the whole voicing."
```

---

### Task 3: Constrained variant generation

**Files:**
- Create: `src/theory/constrained-variants.ts`
- Test: `test/constrained-variants.test.ts`

**Interfaces:**
- Consumes: `constrainVoicing`, `HandConstraints`, `ConstrainedVoicing` (Task 2); `generateVariants`, `VoicingVariant`, `VoicingQuality` from `@pepperhorn/chordl-voicings`; `classifyTones`, `dropOrder` from `./chord-tones`
- Produces: `ConstrainedVariant`, `GenerateConstrainedOptions`, `generateConstrainedVariants(...): ConstrainedVariant[]`

**Why variants matter here:** root-position Cmaj7 spans 11 semitones and cannot fit a 9-semitone reach without losing a chord tone, but its 1st inversion (E G B C) spans 8 and fits with every tone intact. Generating variants and constraining each finds that automatically; constraining one voicing in isolation cannot.

- [ ] **Step 1: Write the failing test**

Create `test/constrained-variants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateConstrainedVariants } from "../src/theory/constrained-variants";

const JUNIOR = { maxSpanPerHand: 9, maxNotesPerHand: 3 };

describe("generateConstrainedVariants", () => {
  it("returns variants that fit before ones that do not", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7M"],
      chordType: "major seventh",
    });
    expect(out.length).toBeGreaterThan(0);
    const firstUnsatisfied = out.findIndex((v) => !v.voicing.satisfied);
    if (firstUnsatisfied >= 0) {
      expect(out.slice(firstUnsatisfied).every((v) => !v.voicing.satisfied)).toBe(true);
    }
  });

  it("keeps every chord tone when an inversion fits the reach", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, JUNIOR, {
      intervals: ["1P", "3M", "5P", "7M"],
      chordType: "major seventh",
    });
    const intact = out.find((v) => v.voicing.satisfied && v.voicing.dropped.length === 0);
    expect(intact, "an inversion should fit without dropping").toBeDefined();
    expect(intact!.voicing.notes.length).toBe(4);
  });

  it("never returns an empty list for a plain triad", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, JUNIOR, {
      intervals: ["1P", "3M", "5P"],
      chordType: "major",
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].voicing.satisfied).toBe(true);
  });

  it("carries the source variant's id and label through", () => {
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, JUNIOR, {
      intervals: ["1P", "3M", "5P"],
      chordType: "major",
    });
    expect(out[0].id).toBeTruthy();
    expect(out[0].label).toBeTruthy();
  });

  it("falls back to a safe drop order when intervals are unavailable", () => {
    // resolveChord returns undefined intervals for special-builder chords.
    const out = generateConstrainedVariants("C", undefined, ["C", "E", "G"], 3, JUNIOR);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].voicing.notes.length).toBeGreaterThanOrEqual(2);
  });

  it("tightens the result as the reach shrinks", () => {
    const roomy = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, {
      maxSpanPerHand: 24,
      maxNotesPerHand: 4,
    }, { intervals: ["1P", "3M", "5P", "7M"], chordType: "major seventh" });
    const tight = generateConstrainedVariants("C", undefined, ["C", "E", "G", "B"], 6, {
      maxSpanPerHand: 5,
      maxNotesPerHand: 2,
    }, { intervals: ["1P", "3M", "5P", "7M"], chordType: "major seventh" });

    const maxNotes = (xs: typeof roomy) => Math.max(...xs.map((v) => v.voicing.notes.length));
    expect(maxNotes(tight)).toBeLessThan(maxNotes(roomy));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- constrained-variants`
Expected: FAIL — cannot find module `../src/theory/constrained-variants`.

- [ ] **Step 3: Write the module**

Create `src/theory/constrained-variants.ts`:

```ts
/**
 * Voicing variants that fit a given hand.
 *
 * This lives in core rather than chordl-voicings because it needs
 * classifyTones/dropOrder, and voicings is a leaf package that core depends
 * on — the dependency cannot run the other way.
 */
import { generateVariants } from "@pepperhorn/chordl-voicings";
import type { VoicingQuality, VoicingVariant } from "@pepperhorn/chordl-voicings";
import { classifyTones, dropOrder } from "./chord-tones";
import { constrainVoicing } from "./hand-constraints";
import type { ConstrainedVoicing, HandConstraints } from "./hand-constraints";

export interface ConstrainedVariant {
  id: string;
  label: string;
  source: VoicingVariant["source"];
  voicing: ConstrainedVoicing;
}

export interface GenerateConstrainedOptions {
  /** Tonal interval names, e.g. ["1P","3M","5P","7M"]. */
  intervals?: string[];
  /** Tonal chord type, e.g. "major seventh". */
  chordType?: string;
  styleHint?: string;
  excludeIds?: string[];
  baseOctave?: number;
}

/**
 * Drop order when the chord's intervals are unknown.
 *
 * resolveChord returns undefined intervals for special-builder chords, so
 * guessing roles is not possible. Dropping from the top of the stack downward
 * is the conservative choice: it removes extensions before the root and third,
 * which sit lowest in a root-position voicing.
 */
function fallbackDropOrder(notes: string[]): { order: string[]; keep: string[] } {
  const order = [...notes].reverse();
  return { order, keep: notes.slice(0, 2) };
}

/**
 * Generate voicing variants and fit each to a hand.
 *
 * Variants that satisfy the constraints are returned first, then those that
 * could not be satisfied without losing a chord tone. Ordering matters because
 * an inversion often fits where root position cannot: Cmaj7 spans 11 semitones
 * in root position but 8 in first inversion.
 *
 * @param root - root note, e.g. "C"
 * @param quality - voicing quality from mapToVoicingQuality, may be undefined
 * @param resolvedNotes - pitch classes in root position
 * @param count - how many variants to generate before constraining
 * @param constraints - the hand's reach and note count
 */
export function generateConstrainedVariants(
  root: string,
  quality: VoicingQuality | undefined,
  resolvedNotes: string[],
  count: number,
  constraints: HandConstraints,
  options: GenerateConstrainedOptions = {},
): ConstrainedVariant[] {
  const variants = generateVariants(root, quality, resolvedNotes, count, {
    styleHint: options.styleHint,
    excludeIds: options.excludeIds,
  });
  if (variants.length === 0) return [];

  let order: string[];
  let keep: string[];
  if (options.intervals && options.intervals.length > 0) {
    const analysis = classifyTones(
      root,
      options.chordType ?? "",
      options.intervals,
      resolvedNotes,
      "piano",
    );
    order = dropOrder(analysis);
    // Identity tones only — the root is droppable as a last resort, which is
    // exactly how a shell voicing is formed.
    keep = analysis.identityTones;
  } else {
    ({ order, keep } = fallbackDropOrder(resolvedNotes));
  }

  const constrained = variants.map((v) => ({
    id: v.id,
    label: v.label,
    source: v.source,
    voicing: constrainVoicing({
      notes: v.notes,
      handHints: v.handHints,
      dropOrder: order,
      keepAtLeast: keep,
      constraints,
      baseOctave: options.baseOctave,
    }),
  }));

  // Stable partition: satisfied first, original order preserved within groups.
  return [
    ...constrained.filter((c) => c.voicing.satisfied),
    ...constrained.filter((c) => !c.voicing.satisfied),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run -- constrained-variants`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/theory/constrained-variants.ts test/constrained-variants.test.ts
git commit -m "feat(core): generate voicing variants constrained to a hand

Satisfied variants sort first, because an inversion often fits a reach
that root position cannot."
```

---

### Task 4: Public API, changelog and version

**Files:**
- Modify: `src/index.ts`
- Modify: `package.json` (version)
- Modify: `../../CHANGELOG.md`
- Test: `test/hand-constraints.test.ts` (append an export check)

**Interfaces:**
- Consumes: everything from Tasks 1–3
- Produces: core's public surface for hand constraints

- [ ] **Step 1: Write the failing test**

Append to `test/hand-constraints.test.ts`:

```ts
import * as core from "../src/index";

describe("public API", () => {
  it("exports the hand-constraint surface", () => {
    for (const name of [
      "midiOf",
      "placeAscending",
      "spanOf",
      "constrainVoicing",
      "generateConstrainedVariants",
    ]) {
      expect(core, `missing export ${name}`).toHaveProperty(name);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run -- hand-constraints`
Expected: FAIL — `constrainVoicing` is not exported from the index.

- [ ] **Step 3: Update `src/index.ts`**

Append:

```ts
export { midiOf, placeAscending, spanOf, constrainVoicing } from "./theory/hand-constraints";
export type {
  HandConstraints,
  PlacedNote,
  ConstrainedNote,
  ConstrainVoicingInput,
  ConstrainedVoicing,
} from "./theory/hand-constraints";

export { generateConstrainedVariants } from "./theory/constrained-variants";
export type {
  ConstrainedVariant,
  GenerateConstrainedOptions,
} from "./theory/constrained-variants";
```

- [ ] **Step 4: Bump the version**

In `package.json`, change `"version": "0.3.3"` to `"version": "0.4.0"` — additive, but a new public surface on a 0.x line.

- [ ] **Step 5: Add the changelog entry**

In `/home/shaun/chordl/CHANGELOG.md`, under `## Unreleased`:

```markdown
### chordl-core 0.4.0

- `constrainVoicing` fits a voicing to a hand, bounded by `maxSpanPerHand`
  (semitones) and `maxNotesPerHand` (count, minimum 2). Both are required:
  a 3-note cap alone still admits C-E-C' across a full octave.
- `generateConstrainedVariants` generates variants and fits each, returning
  those that satisfy the constraints first. An inversion often fits a reach
  root position cannot — Cmaj7 spans 11 semitones in root position, 8 in
  first inversion.
- Reduction folds octaves before dropping notes, and never drops an identity
  tone. The root is droppable as a last resort, which is how shell voicings
  are formed.
- `midiOf`, `placeAscending` and `spanOf` are exported for callers doing their
  own keyboard layout.

This lives in core rather than chordl-voicings because it needs
`classifyTones`/`dropOrder`; voicings is a leaf package that core depends on.
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `pnpm test:run && pnpm lint`
Expected: PASS, no TypeScript errors.

- [ ] **Step 7: Verify the whole monorepo still builds**

Run: `cd /home/shaun/chordl && pnpm build`
Expected: all packages build. `chordl-react`, `ph-chordl` and `chordcards` consume core.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts package.json ../../CHANGELOG.md test/hand-constraints.test.ts
git commit -m "feat(core): publish hand-constraint API as 0.4.0"
```

---

## Self-Review

**Spec coverage:** Sub-project 1b's five bullets map to tasks — `maxSpanPerHand` + `maxNotesPerHand` as orthogonal required constraints (1, 2), per-hand grouping from `handHints` (2), whole-voicing fallback when hints are absent (2), reduce-don't-filter via `dropOrder` (2, 3), and reduction satisfying both constraints (2).

**Deliberately not in this plan:** chordcards' audience presets — the spec puts those in the deck manifest, not in a library type. Retiring chordcards' `voiceAscending()` is sub-project 3.

**Known limitation, by design:** `constrainVoicing` reports `satisfied: false` rather than dropping an identity tone. `generateConstrainedVariants` is the intended remedy — it tries inversions and algorithmic voicings, which usually fit. A caller that receives only unsatisfied variants should widen the constraints rather than expect the library to invent a voicing.

**Open follow-up for the implementer:** `assignAscendingOctaves`'s folding is a single pass that only lowers a note when its octave exceeds the first note's, so it cannot compact a voicing already inside one octave (root-position Cmaj7 is the case that matters). Task 2's tests are written against that actual behaviour, not an idealised version. If folding is later strengthened, the "drops toward a shell voicing" test will need revisiting — that is expected, not a regression.
