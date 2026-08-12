# Changelog

## Unreleased

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

### Added

- **Guitar & ukulele chord diagrams (`@pepperhorn/chordl-guitar`).** A new **Guitar** option on the Display toggle renders fretboard "frames" for a chord via svguitar, backed by `@tombatossals/chords-db`. A **Guitar / Ukulele** switch flips between the 6-string and 4-string (G C E A) instruments — the ukulele library spells accidental roots as flats (`Db`/`Gb`) where guitar uses sharps, and the lookup resolves either enharmonic spelling. Each chord's **alternate placements** (open, barre, higher positions) are browsable with an A/B/C toggle that shows the base fret. Based on the pepperhorn/frames project. The view (svguitar + shape library, ~200KB) is lazy-loaded, so it only ships when selected.
- **Live chord listener (`@pepperhorn/chordl-listen`).** A new package identifies chords from microphone input — mic → FFT chroma → template matching → stabilizer → chord symbol handed to chordl's resolver. A mic button in the input box opens a listen overlay that names the chord you're playing (with a keyboard preview) and keeps it on screen until a new chord is heard. **Save to board** captures the current chord; **Record** captures up to 60s and drops one board card per unique chord heard — a chord board for reference/teaching.
- **Follow-along page turning.** A **Follow along** button on a board of two or more chords opens a page-turner: the mic listens, matches what you play against the board's chords, and advances a highlighted cursor — turning the page automatically when the cursor crosses a page boundary. It's forward-only (a stray chord never jumps backwards), and you can also page manually. Built on `chordl-listen`'s `SequenceFollower`; the expected chords are normalized into the detector's vocabulary (flat roots folded to sharps, richer chords degraded to the nearest hearable voicing) so live detections line up.
- **Scales: "starting on" and multi-octave rotation.** `c major scale starting on G` now runs one octave from G (rotating the scale, enharmonic-aware), and `c major scale 2 octaves` extends it. Scales default to one octave from the root.
- **Notes: run-together sequences.** After the `notes` keyword you can write letters with no separators — `notes cdefgabc` → C D E F G A B C, `notes EbGbBb` → Eb Gb Bb (flats bind after uppercase letters), `notes E4G4C5` with octaves.
- **Verovio font zips.** Bravura and Petaluma are bundled in the repo as Verovio custom-font zips (`packages/chordl-react/fonts/verovio`) and registered via `fontAddCustom`.

- **Board cards keep the view they were created in.** A card added from the editor now renders as what you were looking at — guitar frame, notation, both, or keyboard — instead of always falling back to a piano diagram. `BoardItem` gains `display`, plus `instrument` and `position` for guitar cards, so a card remembers the instrument and the exact A/B/C fret placement you picked. One board can mix all four, and the fields survive JSON export/import, localStorage, and PNG/PDF export.

- **Power chords, top-3-string voicings and a barre filter in the guitar view.** `D5` now renders — chords-db has no `5` suffix, so the shapes are generated (root + fifth + octave, on the 6th- and 5th-string sets, verified by pitch class rather than fret pattern). **Guitar (top 3)** joins the instrument switch, backed by the 20 hand-authored three-string voicings. A **Hide barre shapes** switch filters the alternate placements, appearing only when a chord has both kinds, and saying so rather than rendering nothing when every shape needs a barre (`F`, `Bm`). All three capabilities already existed in `chordl-guitar` and were simply never called: `lookupGuitarChord` is now the single entry point for "shapes for this chord on this instrument", whichever source answers.

### Changed

- **Notation now engraved by Verovio.** The staff view renders through Verovio (MEI → SVG) instead of the hand-rolled SVG engraver, matching the notation stack used by the other apps. Chords keep their own spelling on the staff (a `Bb` chord shows flats, not sharps). Standard/Hand-drawn maps to Bravura/Petaluma.
- **`title` describes a card; it no longer replaces the chord name.** Every chord card shows its chord name automatically, with `title` rendered above it as a descriptive label ("bar 1 — turnaround"). Previously a `title` overrode the name, and keyboard cards showed no name at all unless the NL input asked for a heading. Keyboard, notation and fretboard cards now share one `CardHeading` so a mixed board agrees on type. Bare embedded diagrams are unchanged — the name is still opt-in there via `with heading`; cards request it with the new `showChordName` prop.
- **Notation cards render their card text.** `PianoChord`'s staff branch passes `title`, `subheading` and `footerText` through, and `StaffNotation` takes `showLabel` so a card can supply the name via the shared DOM heading instead of the in-SVG label.
- **"Both" cards center their text over the card** rather than over the keyboard half, and the staff/keyboard pair now wraps instead of compressing in a narrow card.

### Fixed

- **Board exports no longer carry editing chrome.** A selected card's blue ring was captured into PNG and PDF output, because `isExporting` hid the drag handle and action row but nothing else. Card styling now separates editing chrome (selection, edit ring, drag glow, pulse) — which never reaches an export — from the card's own border, which is a print decision and defaults to off: an exported chord sheet is a page of chords, not a page of boxes. Geometry is unchanged, so what you see still matches what you get, and selection survives the export.
- **`c major scale` (and other scale requests) render through the batch pipeline** instead of failing with "Could not extract a chord name".
- **Fingering boxes accept arbitrary strings** (e.g. violin `D1`, `A1`) instead of a single character, and a non-numeral no longer throws an unrecoverable render error — each board card is isolated by its own error boundary.
- **`useChordBoard`'s `addItem` no longer drops card fields.** It copied a fixed list of properties, so anything added to `BoardItem` later was silently discarded on the way to the board; it now spreads the item.
- **A guitar card naming an unknown instrument degrades instead of blanking.** An imported board file or an older export could carry an instrument id this build doesn't have, which threw on `INSTRUMENTS[id].strings` and left an error tile. `GuitarChordPanel` resolves the id once and falls back to guitar.
- **A guitar card's chord name is no longer drawn twice** — once by the panel and once by svguitar's built-in diagram title, in a font it sized independently of the page.
- **Board PNG/PDF exports can't capture a loading placeholder.** `ChordBoard` imported the guitar panel lazily for a saving it never made (chordl-react ships as one bundle, so `PianoChord` already pulls in svguitar and chords-db), while its Suspense fallback was a live race with `html2canvas`. The import is now static.

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
