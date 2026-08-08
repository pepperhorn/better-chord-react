# Frames / chordl-guitar Boundary

**Date:** 2026-08-08 (supersedes 2026-08-06 draft)
**Status:** approved — design agreed, ready for implementation planning
**Context:** companion to `docs/plans/2026-03-07-core-extraction-design.md` (chordl-core extraction) — same pattern, applied to the guitar shape/rendering split

## Problem

`frames` (pepperhorn/frames) and `chordl` (pepperhorn/chordl) overlap: frames vendors its own copies of chord-shape lookup, instrument config, and pitch math that have since been ported into `packages/chordl-guitar`. This doc fixes the ownership boundary, and specifies the first tranche of work needed to make that boundary real.

The 2026-08-06 draft described a target state as if it were largely built. It wasn't. This revision replaces the aspirational parts with what exists, what was measured, and what will actually be built.

## Decision

`chordl-guitar` is the single source of truth for guitar chord-shape data, pitch math, and voicing facts. `frames` becomes an interface-only repo: Astro app, rendering pipeline, and API surface, consuming `@pepperhorn/chordl-guitar` as a package dependency. The SVG chord-card generator is a rendering consumer of the same package.

This decision is unchanged from the original draft and remains correct.

## Corrections to the 2026-08-06 draft

Recorded so the stale claims don't get re-inherited:

| Draft claim | Reality |
|---|---|
| `matchVoicing` "in progress" | Does not exist anywhere in the monorepo. Never started. **Downgraded to proposed** — see below. |
| chordl-guitar owns "scale-length profiles (full / 3-4 / 1-2)" | No `scaleLength` field exists. **Struck entirely** — superseded by the difficulty model below. |
| chordl-guitar owns "adult/junior hand-span playability scoring" | Does not exist. Deferred with `matchVoicing`. |
| Restore `midi` / `capo` to `build-data.mjs`'s `KEEP` list | **Rejected.** Derive instead — see Pitch model. |
| Open question: where does the card generator live? | **Answered by fact.** It is `/home/shaun/chordcards`, a standalone repo, already depending on chordl-guitar via `file:` links. |
| frames retires four vendored modules "once the dependency is in place" | frames has **no** `@pepperhorn/*` dependency of any kind today. Migration is unstarted, and blocked on bass support. |

## Ownership

### `chordl-guitar` owns (`packages/chordl-guitar`, `@pepperhorn/chordl-guitar`)

- Chord shape data: `@tombatossals/chords-db`, normalized to one `ChordsDbPosition` schema
- Instrument config: tuning labels, string count, **and octave-anchored open-string MIDI**
- Fret → pitch derivation (see Pitch model)
- **Voicing facts**: bass note, inversion, note count, doubling, duplicate detection, canonical position
- `dbPositionToChord`: converts internal shape data into the generic `{ fingers, barres, position }` shape (svguitar's `Chord` type) — **this is the contract boundary**. Any renderer consumes this output, never chords-db internals directly.
- **Non-goals:** no SVG/rendering, no layout, no fonts, no PDF/PNG export, no Astro or React. No *product-specific* presentation policy — the package states facts and offers a sensible default; which shape a given product displays is the consumer's call. (Curated pedagogical defaults such as `GUITAR_TOP3_PRESETS` are in scope: they are general-purpose editorial data, not one product's policy.)

### `frames` owns (interface-only)

- Astro pages and the API endpoint (`/api/frame.ts` and related)
- The rendering pipeline: svguitar SVG generation, PDF/PNG export, postProcess, textMeasure, pdfFonts
- The Workbench UI: `ChordChart`, `ChordGallery`, `ChordWorkbench`, `FretboardChart`, `ScaleWorkbench`, `TabStaff`, `TabWorkbench`
- A dependency on `@pepperhorn/chordl-guitar` in place of its own vendored `instruments.ts`, `tab/chordLookup.ts`, `tab/pitch.ts`, `notes.ts`, and `tab/instruments.ts` — retired once the dependency is in place
- **Non-goals:** no chord-shape lookup, no pitch/MIDI computation, no voicing facts

### `chordcards` owns (standalone repo, `/home/shaun/chordcards`)

- Card visual design, layout, SVG composition, print/PDF export, deck manifests, themes — including how many voicings a face carries and how they are arranged. The library supplies a ranked list and per-voicing labels; fitting a primary plus one or two alternates onto a face is chordcards' layout work.
- **Audience presets and the pairing of difficulty settings across instruments** — three named levels, each mapping to a guitar shape-class rung and the keyboard span/count constraints. "Target market" is a product/authoring concept and belongs in the deck manifest, not in a library type.
- **Non-goals:** no pitch math, no chord parsing, no voicing construction. Its current `keyboard-window.ts`, the pitch-class tables in `diagrams.ts`, and the thrice-duplicated `FLAT_TO_SHARP` all violate this and are scheduled for removal (sub-project 3).

## Pitch model

**Derive pitches; never revive the stripped fields.**

`scripts/build-data.mjs` strips `midi` and `capo` from the shipped slim JSON to cut bundle weight, and `test/generated-data.test.ts` asserts their absence. That stripping is a deliberate, tested tradeoff and **stays**. Reviving `midi` would also fail to solve the problem: the candidate `szaza/guitar-chords-db-json` merge source ships no `midi` field at all, so pitch derivation is required regardless. Trusting baked values for one source while deriving for the other means two code paths for one concept — precisely the drift this boundary exists to prevent.

### The formula

`frets` values are **relative to `baseFret`**, not absolute fret numbers:

```
frets[i] === -1  → muted, omit
frets[i] === 0   → open: openMidi[i]
otherwise        → openMidi[i] + baseFret + frets[i] - 1
```

Returns sounding strings only, in chords-db index order, matching chords-db's own `midi` array convention.

### Verification

Validated exhaustively against chords-db's shipped `midi`, not spot-checked:

| Library | Positions checked | Mismatches |
|---|---|---|
| guitar | 2,069 | **0** |
| ukulele | 2,114 | **0** |

**`capo` is a rendering hint, not pitch data.** 901 guitar positions carry `capo: true`, and the formula reproduces their `midi` exactly while ignoring `capo` entirely. This is a second, independent reason not to restore it.

### String ordering — the central hazard

chords-db `frets` / `fingers` / `barres` arrays are in **low-string-first** order. svguitar numbers strings with **string 1 = highest pitch**. Both orderings are correct in their own context; mixing them yields wrong-but-plausible pitches with no error raised.

Today the codebase has both, in conflict:

- `chordl-guitar` `OPEN_STRING_MIDI` — svguitar order: guitar `[64,59,55,50,45,40]`, ukulele `[69,64,60,67]`
- `frames` `TAB_INSTRUMENTS[].openMidi` — svguitar order, correct values, different instrument ids
- `frames` `notes.ts` `OPEN_STRING_MIDI` — a third table

Ukulele makes this unrecoverable by inspection: its reentrant high-G tuning means `[67,60,64,69]` is not sorted, so the order cannot be inferred by sorting.

**Rule: `openMidi` is always chords-db index order.** Exactly one place in the codebase inverts string order — `dbPositionToChord` — and it already does. `OPEN_STRING_MIDI` is retired rather than kept alongside `openMidi` in the opposite order. It has no consumers outside chordl-guitar's own tests, so this is free now and would not be after the frames migration.

## Difficulty model

Replaces the struck scale-length profiles. The two instruments have genuinely different constraints — guitar's ladder is **technique** (a barre chord is not hard because your hands are small), keyboard's is **physical reach** — so each gets native controls, and audience labels sit above them in the consumer.

### Guitar — a shape-class ladder

| Rung | Mechanism | Cost |
|---|---|---|
| `top3` | existing `GUITAR_TOP3_PRESETS` + `lookupTop3Chord` | shipping already |
| `power` | **generated** from tuning: root, +7 semitones on the next string, optional octave | new, small |
| `open` | filter: `barres.length === 0 && baseFret === 1` — 359 positions (17.4%) | free |
| `no-barre` | filter: `barres.length === 0` — 851 positions (41%) | free |
| `any` | no filter — all 2,069 positions | free |

Barre data is real and reliable: 851 positions are barre-free, 1,189 carry one barre, 29 carry two. Four of the five rungs therefore fall straight out of sub-project 1's facts layer at no additional cost.

**Power chords are not in chords-db** — there is no `5` suffix and nothing power-like among its 63 suffixes. Unlike `guitar-top3` this needs no curation: the shape is perfectly regular and movable, so 12 roots × 2 string sets are generated from `openMidi` rather than hand-authored.

### Keyboard — two numeric constraints

- **`maxSpanPerHand`** (semitones) — physical reach
- **`maxNotesPerHand`** (count, minimum 2 — a dyad is a shell voicing, a legitimate beginner idiom, not a degenerate case)

**These are orthogonal and both are required.** Count alone does not express reach: `maxNotesPerHand: 3` still admits C–E–C′, three notes spanning a full octave, which is exactly what a young player cannot stretch. The converse also holds — a four-note cluster inside a 5th is an easy reach but harder to coordinate.

Deriving the junior cutoff from the requirement "no 7ths or octaves": a 7th spans 10–11 semitones and an octave 12, so **`maxSpanPerHand: 9`** (a major 6th) is the binding value.

### Audience presets live in the consumer

Three named levels, named by **audience, not hand size**. Hand size and playing level correlate only loosely and diverge at the edges — an adult beginner has large hands and no technique — and anatomy-based naming cannot pair with guitar's technique-based ladder under a single label.

The libraries expose the constraints; **chordcards' deck manifest names the audiences** and maps each to its per-instrument settings (e.g. *Junior* → `guitar-top3` + `maxSpanPerHand: 9` + `maxNotesPerHand: 3`). Deliberately **not** built: a shared `DifficultyTier` type spanning packages. Hardcoding what "Junior" means would bake one product's pedagogy into a general library, and a fourth level later should be a JSON edit rather than a schema change.

## Sub-project 1 — chordl-guitar foundations

**Status: designed, ready to plan. Unblocked.**

1. **`src/pitch.ts`** — `positionToMidi(pos: ChordsDbPosition, openMidi: number[]): number[]`, implementing the formula above. Pure, no I/O.

2. **`openMidi` on `InstrumentConfig`** — chords-db index order, co-located with the `tuning` labels so the two cannot drift:
   - `guitar`, `guitar-top3`: `[40, 45, 50, 55, 59, 64]`
   - `ukulele`: `[67, 60, 64, 69]`
   - `bass4`: `[28, 33, 38, 43]`
   - `bass5`: `[23, 28, 33, 38, 43]`

3. **Retire `OPEN_STRING_MIDI`** — remove from `src/index.ts`, update the two internal tests that use it. Breaking export change at 0.1.0 → minor bump plus CHANGELOG entry.

4. **Bass instruments** — new `InstrumentId`s. chords-db ships no bass library, so `lookupGuitarChord` continues to return `null` for them; frames' `tab/chordLookup.ts` already behaves this way, so the contract is preserved rather than invented.

   The id clash resolves to **`bass4` and `bass5`**: frames uses `bass` in `lib/instruments.ts` but `bass4`/`bass5` in `lib/tab/`, and the explicit string count is the unambiguous form. frames maps its legacy `bass` → `bass4` during sub-project 2.

5. **Voicing facts** — all derived from `positionToMidi`, near-zero marginal cost:
   - bass note and inversion (root / 1st / 2nd / 3rd) per position
   - note count and doubling
   - pitch-class set, enabling the shape-spells-the-chord check that `OPEN_STRING_MIDI`'s docstring always claimed as its purpose
   - duplicate-voicing flag

6. **Canonical position — instrument-aware.** Measured behaviour of the naive `positions[0]` default:

   | | position[0] is root position | entries with no root-position shape |
   |---|---|---|
   | guitar | 431/529 (81.5%) | 50 (9.5%) |
   | ukulele | 75/552 (13.6%) | **317 (57.4%)** |

   For **guitar**: prefer the first root-position shape; fall back to `positions[0]` for the 9.5% with none.
   For **ukulele**: rank on compactness / lowest `baseFret` instead. Root position is close to meaningless under reentrant tuning, and a "prefer root position" rule would fail on the majority of entries.

   Curated overrides remain available where editorial judgement beats any rule — the `GUITAR_TOP3_PRESETS` precedent.

7. **Duplicate positions — flag, do not strip.** 62 guitar entries ship 63 byte-identical-MIDI redundant positions; ukulele has none. **Stripping is unsafe**: `frames/src/lib/apiFrame.ts:40` exposes `positionIndex` on the live `/api/frame` HTTP endpoint (default 0, indexing `entry.positions[positionIndex]` at :128). Removing entries renumbers positions and silently changes results for existing callers. Flagging conveys the same information with no breakage; consumers filter if they wish.

8. **Shape-class filters** — `open`, `no-barre`, `any`, derived from `barres` and `baseFret` per the difficulty model. Pure predicates over the facts layer; no new data.

9. **Power-chord generation** — movable root+5th(+octave) shapes derived from `openMidi`, for the roots and string sets standard tuning supports. Not sourced from chords-db, which has no power-chord suffix. Emitted through `dbPositionToChord` like any other shape so renderers see one contract.

10. **Diversity-ranked voicing selection** — returns a primary plus *n* alternates, for card faces and any UI offering "other ways to play this".

    - Primary is the canonical position (item 6); alternates are ranked to **maximise contrast** across inversion, barre/open, and neck position.
    - Operates on deduplicated voicings, so a card can never print visual twins. This is what makes item 7's duplicate flag load-bearing rather than cosmetic: 62 entries would otherwise offer identical alternates.
    - **Justification:** naive `positions[0..2]` repeats an (inversion, barre) profile for **396 of 529 entries (74.9%)**. C major is typical — pos1 and pos2 are both 2nd-inversion barres, while the contrasting root-position barre at fret 8 sits unused at pos3. Without ranking, the feature looks broken on three-quarters of cards.
    - Candidate pool is filtered by shape-class rung, **defaulting to within-rung** with an opt-in to widen by one rung. Same ranking function either way; only the pool changes. Within-rung keeps junior decks safe; the opt-in supports deliberate "here's the easy way, here's the next step" teaching cards.
    - Caller passes *n*. **Degrades gracefully with a flag** when supply is short — 5 guitar entries have fewer than 3 unique voicings. Card layout stays chordcards' decision, not the library's.

11. **Golden test** — replay all 4,183 chords-db positions through `positionToMidi` and assert equality against the shipped `midi`. Reads `@tombatossals/chords-db` directly as a test-only devDependency, so `build-data.mjs` and `generated-data.test.ts` are untouched and the stripping stays correct and tested.

   Implementation note: chords-db key naming is inconsistent — container keys use `Csharp`/`Fsharp`, entry `key` fields use `C#`/`F#`. Any root-note mapping must accept both forms. (This inconsistency corrupted an early measurement of the position[0] statistic.)

## Sub-project 1b — notes-per-hand

**Status: designed, ready to plan. Unblocked, independent of 1.**

Lands in **`chordl-core`**, not `chordl-voicings`. `chordl-voicings` is a leaf package (`tonal` only) and `chordl-core` depends on it, so voicings cannot import core's `dropOrder` / `minimalVoicing` / `classifyTones` from `theory/chord-tones.ts` — which is exactly the "which notes may I drop" knowledge this needs. Core composes `generateVariants` with its own reduction logic: correct layering, no dependency inversion, no duplicated theory.

- **`maxSpanPerHand`** (semitones) and **`maxNotesPerHand`** (count, minimum 2) — orthogonal, both required; see the difficulty model for why count alone is insufficient
- Per-hand grouping derived from the existing `VoicingVariant.handHints`
- Variants from the `inversion` and `algorithmic` sources carry no `handHints`; for those both caps apply to the voicing as a whole
- **Reduce, don't filter.** A beginner deck needs a playable 3-note C7, not an empty result. Reduction order comes from core's existing `dropOrder`.
- **Reduction must satisfy both constraints**, iterating until the voicing is within span *and* under the note cap. Dropping to three notes does not by itself bring a voicing inside a 6th.

Both live consumers already depend on core (`ph-chordl` pins `chordl-core@^0.3.4`; `chordcards` imports `resolveChord` / `computeKeyboard`), so no consumer gains a new dependency. This also retires chordcards' hand-rolled `voiceAscending()`, which a filter-only approach would not.

## Sub-project 2 — frames migration (scoped, not yet designed)

Blocked on sub-project 1 (needs bass). Largest blast radius; its own brainstorm cycle.

- Adopt `@pepperhorn/chordl-guitar`; retire vendored `instruments.ts`, `notes.ts`, `tab/pitch.ts`, `tab/instruments.ts`, `tab/chordLookup.ts`
- Reconcile three tuning tables into one. The values in frames are **correct** — `bass4` `[43,38,33,28]` reverses to `[28,33,38,43]`, and its ukulele `[69,64,60,67]` reverses to exactly the verified `[67,60,64,69]`. This is a reversal-and-merge, not a re-derivation.
- Split `src/lib/scales.ts` (251 lines): scale interval formulas are general theory → `chordl-core`; fretboard position/window generation (`POSITIONS`, pentatonic boxes) is guitar-specific → `chordl-guitar`
- Preserve `/api/frame`'s `positionIndex` semantics
- Incidental: `lib/render/*` imports `TextStyle` from a component file (`@/components/FretboardChart`), inverting the lib→component layering

## Sub-project 3 — chordcards boundary cleanup (scoped, not yet designed)

Blocked on 1b, and on chordcards' own Tasks 16–17 (deck CLI, print proof). Lowest urgency — chordcards works today.

- Replace `keyboard-window.ts`'s `voiceAscending()` with core's reduction
- Remove `diagrams.ts`'s local `PC` / `INTERVALS` / `SUFFIX` / `split()` chord vocabulary, which already drifts from `cli.ts`'s `QUALITY_LABELS`
- De-duplicate `FLAT_TO_SHARP` (currently in `diagrams.ts`, `card.ts`, `cli.ts`)
- Move `colourFingers`'s tuning→pitch-class transposition onto `positionToMidi`
- Drop the unused `chordl-voicings` dependency
- Review `diagrams.ts:226`'s unconditional `found.positions[0]` against the canonical-position work in sub-project 1

## Interface contract

Stable today:

- `dbPositionToChord(pos, stringCount, title?) → Chord`
- `lookupGuitarChord(label, instrument) → GuitarChordResult | null`
- `lookupTop3Chord`, `hasGuitarChord`, `INSTRUMENTS`, `GUITAR_TOP3_PRESETS`

Landing in sub-project 1: `positionToMidi`, `openMidi` on `InstrumentConfig`, the voicing-facts accessors, canonical-position selection.

### `matchVoicing` — proposed only

**No current consumer. Do not build against this.** The card generator should use `lookupGuitarChord` plus canonical-position and diversity-ranked selection from sub-project 1.

Those cover what the card generator actually needs. The requirement was never "match an externally supplied piano voicing" — it is "pick *n* maximally different playable shapes for this chord", which is a far more tractable problem with a concrete consumer today.

Beyond having no caller, the draft's tiering is unsound as specified. It proposed `exact match → inversion → inversion + octave shift` against a target piano voicing. On guitar, "exact match" will essentially never fire: guitar shapes carry doublings and 4–6 notes, so an open C is `[48,52,55,60,64]` (C3 E3 G3 C4 E4) against a keyboard root-position C of three notes. The tiers collapse to the fallback on the first call.

More fundamentally, "root position" means far less on guitar than on keyboard — it constrains the bass note only, leaving doubling, note count, and register unconstrained — and under ukulele's reentrant tuning it barely applies at all (57.4% of entries have no root-position shape). Any future design must start from these facts rather than from keyboard intuition.

**Constraint recorded for whoever builds the span/playability scoring:** physical fret span must use `baseFret + frets[i] - 1`, not `frets[i]`. Using the raw value computes the wrong fret numbers for every non-open-position shape, silently.

## Open items

- [ ] Sub-project 1 — implementation plan and build
- [ ] Sub-project 1b — implementation plan and build
- [ ] Spike: evaluate `szaza/guitar-chords-db-json` as a supplementary source (decode single-char fret encoding, normalize, merge). Runs alongside 1, gated on a written go/no-go so it cannot silently expand into a merge project.
- [ ] Sub-project 2 — frames migration: own brainstorm cycle after 1 lands
- [ ] Sub-project 3 — chordcards cleanup: own brainstorm cycle after 1b lands
- [ ] Version-skew policy: `chordcards` consumes chordl packages via `file:` symlinks while `ph-chordl` pins registry `^0.3.x`. Changes land instantly in one consumer and not the other.
