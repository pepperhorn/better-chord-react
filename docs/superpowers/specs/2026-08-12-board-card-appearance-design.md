# Board card appearance

## Problem

A board card has one look, and it is not a print decision anyone made. Every card
carries a 1px grey border on screen and, until #22, in exports too.

#22 established the split: editing chrome never exports, and the card border
defaults to off. That leaves the other half — a user who *wants* boxes, or a
highlight on the chorus turnaround, has no way to say so.

## Decision

Card appearance is a per-card, persisted property that renders identically on
screen and in an export. It is authored in the editor alongside title and
subheading, because that is where a card's other presentation already lives.

Two independent properties:

- **Border style** — `none` (default), `thin`, `heavy`, `double`, `dashed`.
- **Highlight colour** — a swatch applied to the border, and only the border.

Deliberately *not* a background fill. A filled card competes with the chord
diagram it contains, and both the keyboard and the fretboard already use colour
to mean something musical. A coloured border marks a card without lying about
what the colours inside it mean.

## Schema

`BoardItem` gains:

```ts
/** Border treatment. Absent means `none` — an export is a page of chords. */
border?: "none" | "thin" | "heavy" | "double" | "dashed";
/** Border colour, any CSS colour. Ignored when `border` is "none"/absent. */
borderColor?: string;
```

Both are optional and absent on every existing card, so nothing changes for a
board saved before this. They round-trip through `io.ts` with the same validation
posture as `display`: an unrecognised border style degrades to `none` rather than
reaching the renderer, and `borderColor` is accepted only as a string.

**Cache key:** border and colour change the rendered image, so both join
`renderConfig` for the same reason `display` did — otherwise the same chord with
and without a heavy red border collide.

## Rendering

`cardStyle` stops setting a border unconditionally. Each card resolves its own:

| `border` | rendered |
|---|---|
| absent / `none` | `1px solid transparent` — keeps geometry, shows nothing |
| `thin` | `1px solid` |
| `heavy` | `3px solid` |
| `double` | `3px double` |
| `dashed` | `1px dashed` |

Every variant keeps a border box so a card never reflows when its style changes.
Colour falls back to the existing `--btn-border` token when `borderColor` is
absent, so `thin` with no colour looks like today's card.

The capture rule from #22 stays, with one change: it neutralises chrome
unconditionally, but leaves a card's *chosen* border alone. That is the "opt back
in" the #22 comment anticipated — expressed as chrome and card style being
separate declarations, not as an exception in the capture rule.

## Editor

Border style and colour join the Chord Details panel, which already owns title,
subheading, footer and the annotation toggles. They are card presentation, not
chord content, so they do **not** serialize into the NL string — they travel as
`BoardItem` fields, the same as `title`.

The editor preview shows the border, so what you see before adding is what lands.

## Testing

- io round-trip and validation, including an unrecognised style degrading.
- Cache-key separation: same chord, different border → different key.
- Each style renders the expected border box; `none` still occupies 1px.
- Capture: a chosen border survives an export while chrome does not.

## Risks

- **`double` needs at least 3px** to render as two lines; at 1px it silently
  looks solid. Fixed by the width table above rather than left to the user.
- **Contrast.** A pale highlight on white is invisible in print. Out of scope to
  police, but the swatch set should avoid offering colours that vanish.

## Open items

- Whether the swatch set is fixed or free colour entry. Fixed is assumed here —
  a small palette that prints legibly beats a colour wheel that does not.
- Whether a board-level default border exists ("box all cards"), with per-card
  overrides. Deferred: nobody asked, and per-card covers it.
