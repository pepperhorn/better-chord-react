# Changelog

## Unreleased

### Added

- **Live chord listener (`@pepperhorn/chordl-listen`).** A new package identifies chords from microphone input — mic → FFT chroma → template matching → stabilizer → chord symbol handed to chordl's resolver. A mic button in the input box opens a listen overlay that names the chord you're playing (with a keyboard preview) and keeps it on screen until a new chord is heard. **Save to board** captures the current chord; **Record** captures up to 60s and drops one board card per unique chord heard — a chord board for reference/teaching. Also includes a scaffolded (not-yet-wired) `SequenceFollower` for forward-only score page-turning.
- **Scales: "starting on" and multi-octave rotation.** `c major scale starting on G` now runs one octave from G (rotating the scale, enharmonic-aware), and `c major scale 2 octaves` extends it. Scales default to one octave from the root.
- **Notes: run-together sequences.** After the `notes` keyword you can write letters with no separators — `notes cdefgabc` → C D E F G A B C, `notes EbGbBb` → Eb Gb Bb (flats bind after uppercase letters), `notes E4G4C5` with octaves.
- **Verovio font zips.** Bravura and Petaluma are bundled in the repo as Verovio custom-font zips (`packages/chordl-react/fonts/verovio`) and registered via `fontAddCustom`.

### Changed

- **Notation now engraved by Verovio.** The staff view renders through Verovio (MEI → SVG) instead of the hand-rolled SVG engraver, matching the notation stack used by the other apps. Chords keep their own spelling on the staff (a `Bb` chord shows flats, not sharps). Standard/Hand-drawn maps to Bravura/Petaluma.

### Fixed

- **`c major scale` (and other scale requests) render through the batch pipeline** instead of failing with "Could not extract a chord name".
- **Fingering boxes accept arbitrary strings** (e.g. violin `D1`, `A1`) instead of a single character, and a non-numeral no longer throws an unrecoverable render error — each board card is isolated by its own error boundary.

## 0.3.5 — 2026-05-26

### Fixed

- **Parser: single-note hand assignments.** Inputs like `Bb in lh, D F Bb in rh`, `lh: Bb rh: D F Bb`, and `left Bb right D F Bb` now parse correctly with both hand groups intact. Previously the single-note hand group was dropped and the orphaned note was misread as the chord name (worst case: `left Bb right D F Bb` resolved chordName `E`). Chord symbols like `G7 in lh` / `Bb7 in lh` still parse as chord symbols, not notes.
- **Board: editing a card now updates the board live.** While a card is in edit mode, changes to the input, title, subtitle, footer, and annotation toggles propagate back to the card on the board as you type.
- **Board: drag-and-drop sorting now actually sorts.** The card's `draggable` flag was tied to a ref, so React never re-rendered with `draggable={true}` and HTML5 drag never fired. Swapped to state.

### Changed

- **Board drag handle** is now the conventional 3×2 dot grid icon, always visible to advertise drag-to-reorder. Still hidden in PNG/PDF exports.

## 0.3.4 — 2026-05-26

### Added

- **Board: JSON export / import.** Round-trip a board through a `chordl.board/v1` JSON file — items, meta, and an optional sha256 `cacheKey` (computed the same way as `ph-chordl`) for future ph-apps lookup. Toolbar gets **JSON** and **Import** buttons next to PNG/PDF.
- **Board: card selection.** Click a card to select it; click the background to clear. Action chrome (edit, copy, cut, **repeat**, delete) fades in on hover and stays sticky while a card is selected. Selected cards get a blue ring.
- **Board: repeat (duplicate) action.** Clones the selected card and inserts it right after the source.
- **Board: scoped drag handle.** Drag is now armed by `mousedown` on the hand icon — the rest of the card body no longer steals drags from text/clicks.

### Changed

- **Board exports.** PNG/PDF capture now hides the drag handle and the action button row, so exports show only chords + their annotations (no edit/delete UI).
- **Board title / subtitle.** Now render as semantic `<h1>` / `<h3>`, centered.

## 0.3.3 — 2026-05-21

### Added

- **Parser: many more ways to define two-hand note strings.** `parseChordDescription` now accepts:
  - Hand-prefix without "notes": `lh: Eb Gb Bb rh: Db Eb F Gb` (colon optional)
  - Long-form hand words: `left ... right ...`, `bottom ... top ...`, `bass ... treble ...`
  - Polychord `//` separator (top over bottom = rh over lh): `Eb Gb Bb // Db Eb F Gb`
  - Semicolon separator (reading order = lh then rh): `Eb Gb Bb; Db Eb F Gb`
  - Parens + hand suffix: `(Eb Gb Bb) lh (Db Eb F Gb) rh`
  - Bare suffix without "in": `Eb Gb Bb lh, Db Eb F Gb rh`

### Fixed

- **chord-resolver tests** updated to reflect the resolver's actual (and intentional) flat-spelling behavior — `Cm` first inversion is `[Eb, G, C]` and `Bbmaj7` resolves to `[Bb, D, F, A]`. Forcing flats→sharps would mangle display, so the tests were wrong, not the code.

## 0.3.2 — 2026-05-21

### Added

- **Parser: `notes in <hand> <notes>` prefix form.** `parseChordDescription` now accepts inputs like `notes in lh Eb Gb Bb notes in rh Db Eb F Gb` and emits the expected `notesGroups` with correct hand assignments. The existing suffix form (`notes C E G in lh`) is unchanged.

### Changed

- **Dev playground:** Chord Details panel restyled — white background at 40% opacity with a light-blue glow shadow — and the summary now reads "Choose more chord details".

## 0.3.1 — 2026-05-14

### Added

- **Bundled SMuFL fonts.** `@pepperhorn/chordl-react` now embeds 6-codepoint subsets of Bravura and Petaluma (~7.5KB total) and auto-injects `@font-face` rules at module load. Consumers no longer need to host woff2 files or declare `@font-face` themselves.
- Font families renamed to `PHBravura` / `PHPetaluma` per the OFL Reserved Font Name clause; `fontFamily` stacks fall back to `Bravura` / `Petaluma` so consumers who provide the full fonts still override the bundled subset.
- OFL.txt shipped alongside the package.

## 0.3.0 — 2026-05-14

### Breaking

- **Renamed packages** with a `chordl-` prefix to make room for other `@pepperhorn/*` product lines:
  - `@pepperhorn/voicings` → `@pepperhorn/chordl-voicings`
  - `@pepperhorn/core` → `@pepperhorn/chordl-core`
  - `@pepperhorn/react` → `@pepperhorn/chordl-react`

  The old packages are deprecated on npm and point to the new names. Update imports accordingly.

## 0.2.0 — 2026-05-12

### Breaking

- **Renamed packages** to the `@pepperhorn` scope:
  - `@better-chord/voicings` → `@pepperhorn/voicings`
  - `@better-chord/core` → `@pepperhorn/core`
  - `@better-chord/react` → `@pepperhorn/react`

  Update any imports in your application accordingly.

### Added

- New types exported from `@pepperhorn/react`: `VariationContext`, `RenderVariationExtras`, `OnVariation`.
- New optional props on `PianoChord`, `VoicingVariantToggle`, `ChordGroup`, `ProgressionView`, and `ChordSheet`:
  - `onVariation?: (ctx: VariationContext) => void` — fires post-render once per `(chord, voicing)` cell. Use it to capture rendered notes + SVG markup.
  - `renderVariationExtras?: (ctx: VariationContext) => ReactNode` — render arbitrary children (rating UI, debug overlays, etc.) alongside each variation cell.

  Both props are fully backwards compatible — when absent, behavior is unchanged.

- First publish to public npm under the `@pepperhorn` scope.
