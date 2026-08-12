# Editor conveniences: quality picker and New board

Two small, unrelated editor features, specced together because neither justifies
its own document.

## 1. Quality picker for a bare root

### Problem

Typing `A` used to error. Since #21 it renders A major, which is the sensible
default — but a bare letter is genuinely ambiguous, and nothing tells a learner
that `m`, `7`, `maj7` are available.

### Decision

A bare root renders **major immediately** — no click between typing `C` and
seeing C major, which is the fastest path in the app — with a quality strip
beneath offering `m · 7 · maj7 · m7 · dim · aug · sus4`.

Seven, chosen by how often a learner meets them rather than by theory. The row
deliberately mixes triads and sevenths; it is a shortcut, not a taxonomy. Typing
still reaches everything the resolver supports.

### Shape

`ChordQualityPicker` in `chordl-react/src/components`, not inline in the dev
playground: it is testable there (jsdom is already set up), and the playground
is not where reusable UI belongs.

**Shows when** the parsed chord name is exactly a bare root — `/^[A-G][#b]?$/` —
and the input is not a scale, progression, or note list. Checking the *parsed*
name rather than the raw input means `show me an A` gets the picker too.

**On click it rewrites the editor input** (`A` → `Am`) rather than re-rendering
in place. Add-to-board, annotations, octave shift and board editing then keep
working with no new plumbing, because the picker is a typing shortcut rather than
a parallel state path.

Class names follow the project convention: `chord-quality-strip`, `btn-quality`.

### Testing

Visibility (bare root yes; `Am`, `C major scale`, note lists no), and that each
button produces the right input string.

## 2. New board

### Problem

There is no way to start a fresh board short of deleting cards one at a time.

### Decision

A **NEW** button in the board toolbar beside PNG / PDF / JSON / Import, disabled
when the board is already empty. It clears cards *and* board title/subtitle/
footer — a genuinely blank board.

Clearing is destructive and unrecoverable, so it goes through an overlay:

```
Start a new board?

This clears 5 cards and the board title. It can't be undone.

  [Download JSON & clear]
  [Clear without saving]
  [Cancel]   ← default focus
```

- **Download JSON & clear** reuses the existing `exportBoardJson` path, then clears.
- **Cancel** takes default focus, so a stray Enter never wipes a board. Escape
  and a backdrop click also cancel.
- The count comes from the live item list, so the message never lies about what
  is about to go.

`useChordBoard` already exposes `replaceState`, which resets items and meta
together; `ChordBoard` gains one `onNew` prop rather than new board state.

### Testing

All three paths, including that Cancel leaves items and meta untouched, and that
the button is disabled on an empty board.

## Ordering

Independent of each other and of every other sub-project. The picker depends on
#21 being merged (it is) — without the parse fix a bare `A` never reaches the
renderer at all.

## Open items

- Whether picking a quality should be recorded. Once the picker rewrites the
  input, a card made by clicking is indistinguishable from one typed, so there is
  no signal about which qualities people reach for. Worth adding only if someone
  will look at it.
