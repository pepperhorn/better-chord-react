# Board structure: text cards, icons, and line breaks

## Problem

A board is a flat run of chord cards that wrap wherever the grid puts them. A
real chord sheet has sections — "Verse", "Chorus" — and deliberate line endings.
Neither is expressible.

Three asks, one schema change:

- a **title / text-only card** authored from a board palette button;
- an optional **icon or image** on that card;
- **break after this card**, so the next card starts a new row.

## The change that matters

Today every `BoardItem` is a chord: `nl` is required, and every consumer assumes
a chord renders. A text card is the first card that is *not* a chord, so
`BoardItem` needs a discriminator. That is the real work — the three features are
small once a card can be more than one thing.

```ts
/** What a card is. Absent means "chord" — every card saved before this. */
kind?: "chord" | "text";
```

Discriminating on an optional field with an implied default keeps every existing
board valid with no migration. The alternative — a required `kind` plus a
migration pass over stored JSON and localStorage — buys nothing.

`nl` stays optional-in-practice for text cards. Rather than loosen its type and
force every chord consumer to null-check, `BoardCardChord` branches on `kind`
first and never reaches the chord path for a text card.

## Text cards

A text card reuses the fields it already has — `title`, `subheading`,
`footerText` — rendered through the same `CardHeading`/`CardFooter` that chord
cards use. This is the payoff from the card-text work in #20: a text card is a
card with the text and no diagram, not a new layout.

It gains:

```ts
/** Icon id (see below) or uploaded image, shown above the text. */
icon?: string;
image?: string;   // data URI
```

Added from a **board palette** button ("+ Text") beside the existing New / PNG /
PDF / JSON / Import controls, appended like a chord card and reorderable by the
same drag handle.

Editing routes through the existing edit flow: selecting a text card loads its
title/subheading/footer into the editor, with the chord input and its annotation
toggles hidden — they mean nothing here.

## Icons

Two sources, because they answer different questions:

- **SMuFL (Bravura)** for musical symbols — clefs, repeat signs, fermatas,
  dynamics, coda. Already in the repo, already OFL-licensed, already loading.
  Caveat: the bundled font is a **6-codepoint subset**; a wider subset must be
  cut from the full woff2 in `dev/public/fonts/` and the `@font-face` extended.
- **Lucide** for objects — guitar, piano, mic, metronome. MIT, tree-shakeable,
  no network. Roughly 15 relevant glyphs; import them individually rather than
  the barrel, so the board does not gain a full icon set.

`icon` stores a stable id (`smufl:gClef`, `lucide:guitar`), not a codepoint or a
component. Ids survive a library version bump; codepoints and imports do not.

### Images

`image` holds a data URI so a board stays self-contained — a JSON export must
carry its images or the export is not a backup. That has a cost: a few hundred KB
of base64 per image in localStorage, which has a ~5MB budget. The upload path
must therefore downscale to a bounded dimension and re-encode before storing,
and refuse anything that would push the board over budget with a clear message
rather than a silent `QuotaExceededError` — `localStorageAdapter.save` currently
swallows that failure.

An icon and an image are mutually exclusive; setting one clears the other.

## Line breaks

```ts
/** Start a new row after this card. */
breakAfter?: boolean;
```

Toggled from the selected card's action row ("break after this card").

The board grid is `gridTemplateColumns: repeat(N, minmax(0, 1fr))` when `columns`
is set, and flex-wrap otherwise. A break is a zero-height grid item spanning the
full row (`grid-column: 1 / -1`), which pushes the next card to a fresh row in
the grid case. In the flex-wrap case it is a `flex-basis: 100%` spacer with no
height. Either way it is a rendered sibling rather than a layout mode, so
`breakAfter` on the last card is harmless.

The break element carries a class and no visible styling, so it costs nothing in
an export.

## Ordering

`kind`, `icon`, `image` and `breakAfter` all round-trip through `io.ts` with the
validation posture the other fields use: an unrecognised `kind` degrades to
`chord`, `breakAfter` is coerced to boolean, and `icon` is accepted only as a
string matching a known prefix.

**Cache key:** a text card has no rendered chord, so it contributes no cache key.
`breakAfter` is layout, not image content, and stays out of `renderConfig` — two
otherwise-identical cards should share a cached render whether or not a break
follows them.

## Testing

- A board mixing chord and text cards renders both, in order.
- A text card never reaches the chord renderer (no diagram, no error boundary trip).
- `breakAfter` emits a break element; the last card's break is harmless.
- io round-trip and degradation for every new field.
- Image upload downscales, and a board near the storage budget fails loudly.

## Risks

- **localStorage budget.** The most likely real-world failure, and today it fails
  silently. Fixing the swallow is in scope for this sub-project even though it
  predates it.
- **A text card in the follow-along page turner.** `sequenceFromChords` maps board
  items to expected chords; a text card must be skipped, not treated as an
  unparseable chord. Needs checking against `useFollowAlong`.

## Open items

- Whether a text card can span the full board width (a section header usually
  wants to). Likely yes, but it interacts with `columns` and is worth deciding
  with a real sheet in front of us.
