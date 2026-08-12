# Wiring chordl-guitar's existing capabilities through

## Problem

Three things a guitarist asks for do not work, and all three are already built:

| Input | Today | Why |
|---|---|---|
| `D5` in guitar view | "No guitar shape found" | `lookupGuitarChord` returns `null` |
| Top-3-strings voicings | Not offered | The panel lists Guitar / Ukulele only |
| Avoid barre shapes | Not offered | No UI for it |

`D5` parses and resolves correctly in core (`["D", "A"]`), so keyboard and
notation render it fine. Only the guitar path fails.

The capability exists in every case:

- `powerChords.ts` exports `powerChordPosition` / `powerChordShape`. chords-db
  carries no `5` suffix, which is why this file was written. **Nothing calls it.**
- `staticPresets.ts` exports `GUITAR_TOP3_PRESETS` and `lookupTop3Chord`, and
  `INSTRUMENTS` carries `guitar-top3`. **Nothing calls it** — `lookupGuitarChord("D", "guitar-top3")`
  returns `null`.
- `voicingSelect.ts` exports `ShapeClass = "open" | "no-barre" | "any"` and
  `SHAPE_CLASS_LADDER`. **Not exposed in the UI.**

So this is not three features. It is one: `chordLookup` is a thin wrapper over
chords-db that never learned about its siblings, and `GuitarChordPanel` offers a
hardcoded two-instrument list.

## Decision

Make `lookupGuitarChord` the single entry point for "shapes for this chord on
this instrument", whatever the source, and let the panel filter what it returns.

Consumers (the board, the editor, frames) keep calling one function. Where a
shape came from — chords-db, a generated power chord, a hand-authored top-3
preset — is an implementation detail they should not have to know.

## Resolution order

`lookupGuitarChord(label, instrument)` resolves in this order, first hit wins:

1. **Top-3 presets** when `instrument === "guitar-top3"`. Hand-authored, so they
   beat anything generated.
2. **chords-db**, as today, for every instrument that has a library.
3. **Generated power chords** when the label's quality is `5` (and chords-db has
   nothing, which is always — it has no `5` suffix).

Returning `null` stays meaningful: no shape exists for this chord on this
instrument. `bass4` / `bass5` continue to return `null` by design — chords-db has
no bass library, and generating bass shapes is out of scope here.

### Power chords

`D5` means root + fifth, no third. The generator already produces movable
root+5th(+octave) shapes from `openMidi` for the string sets standard tuning
supports. Wiring is:

- Detect the `5` quality from the resolved label rather than string-matching the
  input, so `D5`, `D5 chord`, and a `D5` arriving from a board card all work.
- Emit through `dbPositionToChord` like every other shape, so renderers see one
  contract and the A/B/C position toggle works unchanged.
- Multiple string sets (6-5-4, 5-4-3, 4-3-2) become multiple positions, which is
  exactly what the existing placement toggle is for.

Out of scope: power chords on ukulele. Reentrant high-G tuning makes a root+5th
shape a different problem, and nobody asked.

## Instrument selection

`GuitarChordPanel`'s `INSTRUMENT_ORDER` becomes derived rather than hardcoded:
the instruments that can actually return a shape, in a stable order. Today that
is `guitar`, `guitar-top3`, `ukulele`. `bass4`/`bass5` stay out of the picker
until they can return something, because an instrument that always says "no
shape found" is worse than an absent one.

Labels come from `INSTRUMENTS[id].label`, so the picker never drifts from the
instrument table.

The picker already has a `showControls={false}` mode for board cards, and a
persisted `instrument` field on `BoardItem` — a top-3 card is saved and restored
with no schema change. `BoardItem.instrument` is typed as `string` precisely so
the board does not need to track this union.

## Barre toggle

A switch, default off (barres allowed), that filters the returned shapes to those
whose `positions[i].barres` is empty — `voicingFacts` already computes `hasBarre`.

It filters what is displayed rather than changing what is looked up, so:

- toggling never triggers a fresh chords-db query;
- the count in the A/B/C toggle reflects the filter honestly;
- when a chord has *only* barre shapes, the panel says so and offers to show them
  anyway, rather than rendering an empty frame. This case is common for beginners
  (`F`, `Bm`), which is the audience the toggle is for.

The toggle is panel state, not a card field. A board card stores the position it
was saved with, so a filter that hid that position would contradict the card.

## Phases

1. **Lookup** — resolution order, power-chord detection and generation, top-3
   routing. Pure, testable in chordl-guitar with no DOM.
2. **Panel** — derived instrument list, barre switch, the only-barre-shapes case.
3. **Editor** — nothing, if phase 2 is right. The panel is already wired.

## Risks

- **Position indices shift.** A board card stores `position` as an index into the
  shape list. If top-3 or power chords change what index 2 means for an existing
  card, saved cards silently render a different voicing. Power chords only affect
  labels that previously returned `null`, and top-3 only affects `guitar-top3`,
  which no saved card can reference today. Both are safe now and both stop being
  safe the moment shape ordering changes for an instrument already in use — worth
  a note in the lookup module.
- **The barre filter interacts with the position toggle.** Filtering re-indexes
  the visible shapes; the panel must not report a filtered index to a host that
  will persist it.

## Open items

- Whether top-3 should fall back to chords-db when a preset is missing (only 20
  exist) or say "no top-3 voicing for this chord". Falling back would silently
  show a six-string shape under a three-string label, so the spec assumes it
  does **not** fall back.
- Whether the barre preference should persist across sessions.
