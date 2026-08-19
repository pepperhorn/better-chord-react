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

- **A hand keyword can be followed by a chord symbol, not just notes** — `"rh Cmaj7 lh Dm7"` draws Cmaj7 in the right hand and Dm7 in the left, and hands can be mixed with note lists (`"rh c d e lh Am"`). Where two chords follow one hand, the first wins (`"rh Cmaj7 Dm7"` → Cmaj7). A bare pitch class still reads as a single note (`"lh Bb"`), while a symbol with a quality or extension reads as a chord (`"lh G7"`), matching how `"G7 in lh"` was already treated. `NotesGroup` carries the source symbol in a new optional `chord` field, which also names the card (`"Cmaj7 / Dm7"`).
- **Guitar & ukulele chord diagrams (`@pepperhorn/chordl-guitar`).** A new **Guitar** option on the Display toggle renders fretboard "frames" for a chord via svguitar, backed by `@tombatossals/chords-db`. A **Guitar / Ukulele** switch flips between the 6-string and 4-string (G C E A) instruments — the ukulele library spells accidental roots as flats (`Db`/`Gb`) where guitar uses sharps, and the lookup resolves either enharmonic spelling. Each chord's **alternate placements** (open, barre, higher positions) are browsable with an A/B/C toggle that shows the base fret. Based on the pepperhorn/frames project. The view (svguitar + shape library, ~200KB) is lazy-loaded, so it only ships when selected.
- **Live chord listener (`@pepperhorn/chordl-listen`).** A new package identifies chords from microphone input — mic → FFT chroma → template matching → stabilizer → chord symbol handed to chordl's resolver. A mic button in the input box opens a listen overlay that names the chord you're playing (with a keyboard preview) and keeps it on screen until a new chord is heard. **Save to board** captures the current chord; **Record** captures up to 60s and drops one board card per unique chord heard — a chord board for reference/teaching.
- **Follow-along page turning.** A **Follow along** button on a board of two or more chords opens a page-turner: the mic listens, matches what you play against the board's chords, and advances a highlighted cursor — turning the page automatically when the cursor crosses a page boundary. It's forward-only (a stray chord never jumps backwards), and you can also page manually. Built on `chordl-listen`'s `SequenceFollower`; the expected chords are normalized into the detector's vocabulary (flat roots folded to sharps, richer chords degraded to the nearest hearable voicing) so live detections line up.
- **Scales: "starting on" and multi-octave rotation.** `c major scale starting on G` now runs one octave from G (rotating the scale, enharmonic-aware), and `c major scale 2 octaves` extends it. Scales default to one octave from the root.
- **Notes: run-together sequences.** After the `notes` keyword you can write letters with no separators — `notes cdefgabc` → C D E F G A B C, `notes EbGbBb` → Eb Gb Bb (flats bind after uppercase letters), `notes E4G4C5` with octaves.
- **Verovio font zips.** Bravura and Petaluma are bundled in the repo as Verovio custom-font zips (`packages/chordl-react/fonts/verovio`) and registered via `fontAddCustom`.

- **Board cards keep the view they were created in.** A card added from the editor now renders as what you were looking at — guitar frame, notation, both, or keyboard — instead of always falling back to a piano diagram. `BoardItem` gains `display`, plus `instrument` and `position` for guitar cards, so a card remembers the instrument and the exact A/B/C fret placement you picked. One board can mix all four, and the fields survive JSON export/import, localStorage, and PNG/PDF export.

- **Power chords, top-3-string voicings and a barre filter in the guitar view.** `D5` now renders — chords-db has no `5` suffix, so the shapes are generated (root + fifth + octave, on the 6th- and 5th-string sets, verified by pitch class rather than fret pattern). **Guitar (top 3)** joins the instrument switch, backed by the 20 hand-authored three-string voicings. A **Hide barre shapes** switch filters the alternate placements, appearing only when a chord has both kinds, and saying so rather than rendering nothing when every shape needs a barre (`F`, `Bm`). All three capabilities already existed in `chordl-guitar` and were simply never called: `lookupGuitarChord` is now the single entry point for "shapes for this chord on this instrument", whichever source answers.

- **Text cards, icons and line breaks on boards.** A board is no longer a flat run of chords. **+ Text** adds a title/subtitle card for section headings ("Verse", "Chorus"), and **break** on any card starts a new row after it, so a sheet can be laid out in phrases rather than wherever the grid happens to wrap. A text card takes an **icon** — 16 built in: musical symbols (clefs, accidentals, repeat, fermata, coda, segno, notes) and objects (guitar, piano, mic, metronome, tuning fork) — or an **uploaded image**, whichever was chosen last. `BoardItem` gains `kind`, `icon`, `image` and `breakAfter`; `kind` is optional and absent means "chord", so every board saved before this keeps working with no migration. Text cards render through the same `CardHeading` as chord cards, so a mixed board still agrees on type. Exported JSON is now `chordl.board/v2` — `importBoardJson` still reads v1, so nothing saved before this stops opening, while a v2 board meeting an older build is refused by version rather than by a per-item error about a missing `nl`.
- **Board icons ship as inline SVG, not a webfont.** The musical glyphs are real Bravura outlines (SIL OFL 1.1, converted from the verovio font data already in the repo), so they need no `@font-face` from the host page, cannot race `html2canvas` during an export, and render identically wherever the board is embedded. Provenance in `packages/chordl-board/NOTICE.md`.

### Changed

- **Notation now engraved by Verovio.** The staff view renders through Verovio (MEI → SVG) instead of the hand-rolled SVG engraver, matching the notation stack used by the other apps. Chords keep their own spelling on the staff (a `Bb` chord shows flats, not sharps). Standard/Hand-drawn maps to Bravura/Petaluma.
- **`title` describes a card; it no longer replaces the chord name.** Every chord card shows its chord name automatically, with `title` rendered above it as a descriptive label ("bar 1 — turnaround"). Previously a `title` overrode the name, and keyboard cards showed no name at all unless the NL input asked for a heading. Keyboard, notation and fretboard cards now share one `CardHeading` so a mixed board agrees on type. Bare embedded diagrams are unchanged — the name is still opt-in there via `with heading`; cards request it with the new `showChordName` prop.
- **Notation cards render their card text.** `PianoChord`'s staff branch passes `title`, `subheading` and `footerText` through, and `StaffNotation` takes `showLabel` so a card can supply the name via the shared DOM heading instead of the in-SVG label.
- **"Both" cards center their text over the card** rather than over the keyboard half, and the staff/keyboard pair now wraps instead of compressing in a narrow card.

### Fixed

- **The hands are placed at least an octave apart, so the RH can't land on the LH's keys.** Giving each hand its own base octave (LH 3, RH 4) wasn't enough: a group's ascending-octave wrap can climb into the other hand's range — `"lh Dm7"` resolves D3 F3 A3 **C4**, exactly where `"rh Cmaj7"` starts — and `"rh c d e lh a b"` left only three semitones between the hands. The RH group is now lifted by whole octaves (its own shape untouched) until its lowest note is both an octave above the LH's lowest and clear of the LH's highest. Requests that pin octaves themselves (`"notes C3 E3 in lh and notes C4 E4 in rh"`) are placed exactly as written, and a bass/treble clef pair keeps the placement its clefs imply.
- **A left-hand note group no longer hides under the right-hand one.** `"rh c d e lh c e"` parsed both hands correctly but drew only three keys: every group with no explicit octave digits started at octave 4, so the LH notes landed on the exact keys the RH notes already held, with the L.H. bracket stacked on top of the R.H. one. A group whose hand is LH (and that names no clef) now starts at octave 3, the same base the bass clef already used. Hand order in the string never mattered and still doesn't — `"lh c e rh c d e"` renders identically.
- **A board that can no longer be saved now says so.** `localStorageAdapter.save` caught `QuotaExceededError` and dropped the write silently, so a full localStorage looked exactly like a working board until the tab was closed and the work was gone. It now reports through an `onError` callback — the app raises a dismissible warning suggesting a JSON export — and warns with the byte size when nothing handles it.
- **Uploaded card images cannot blow the storage budget.** An upload is downscaled to 640px and re-encoded before it ever reaches a card, and one that still would not fit is refused with its actual size and the limit rather than accepted and lost. PNG and WebP sources stay PNG: re-encoding a transparent image as JPEG blackens its background, which is the one outcome a user cannot undo.
- **Board cards no longer overlap in a multi-column layout.** Cards carried a 240px floor into a `minmax(0, 1fr)` grid, so asking for more columns than the board had room for made every card spill into its neighbour. The floor now applies only to the wrapping layout, where it is what stops a card collapsing to its content; in a grid the track sets the width.
- **Board PDFs are ~150x smaller.** A 12-card board exported at 5.95MB and a 30-card board at roughly 15MB. jsPDF defaults `compress` to false, so it embedded the decoded bitmap with no stream compression — the same board is now 0.04MB and 0.08MB. The image resolution was never the cause: the PNG itself was 0.12MB before and after. PNG is kept rather than switching to JPEG, which measured three times larger (chord diagrams are flat line art, which Flate compresses better) and would ring around staff lines.
- **Board exports no longer carry editing chrome.** A selected card's blue ring was captured into PNG and PDF output, because `isExporting` hid the drag handle and action row but nothing else. Card styling now separates editing chrome (selection, edit ring, drag glow, pulse) — which never reaches an export — from the card's own border, which is a print decision and defaults to off: an exported chord sheet is a page of chords, not a page of boxes. Geometry is unchanged, so what you see still matches what you get, and selection survives the export.
- **`c major scale` (and other scale requests) render through the batch pipeline** instead of failing with "Could not extract a chord name".
- **Fingering boxes accept arbitrary strings** (e.g. violin `D1`, `A1`) instead of a single character, and a non-numeral no longer throws an unrecoverable render error — each board card is isolated by its own error boundary.
- **`useChordBoard`'s `addItem` no longer drops card fields.** It copied a fixed list of properties, so anything added to `BoardItem` later was silently discarded on the way to the board; it now spreads the item.
- **A guitar card naming an unknown instrument degrades instead of blanking.** An imported board file or an older export could carry an instrument id this build doesn't have, which threw on `INSTRUMENTS[id].strings` and left an error tile. `GuitarChordPanel` resolves the id once and falls back to guitar.
- **A guitar card's chord name is no longer drawn twice** — once by the panel and once by svguitar's built-in diagram title, in a font it sized independently of the page.
- **Board PNG/PDF exports can't capture a loading placeholder.** `ChordBoard` imported the guitar panel lazily for a saving it never made (chordl-react ships as one bundle, so `PianoChord` already pulls in svguitar and chords-db), while its Suspense fallback was a live race with `html2canvas`. The import is now static.

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

### chordl-voicings 0.4.0

`mapToVoicingQuality` classified a chord by searching its type name for
substrings, and several names contain the name of a different quality.

- **Dominant chords no longer render minor voicings.** `"dominant"` contains
  `"min"` (do-MIN-ant), and the minor test ran first, so every dominant type —
  `dominant seventh`, `dominant ninth`, `dominant thirteenth`, `dominant flat
  ninth`, `dominant sharp ninth` and `lydian dominant seventh` — resolved to
  min7. This is the whole shipped dominant vocabulary,
  and it is what `resolveChord("C7").type` returns.
- **A diminished triad no longer renders minor voicings.** `"diminished"`
  contains `"min"` too. `dim7` and the half-diminished spellings were answered
  earlier and were correct; the bare triad fell through to min7. It now returns
  no quality, like the major and minor triads.
- **Minor shorthand is read as minor.** `m7`, `m9`, `m11`, `m13` contain
  neither `"min"` nor `"minor"`, so they reached the digit catchall and came
  out dom7 (`m11` returned nothing at all). This is reachable from chordl's own
  code, not only from external callers: `buildSpecialChord` emits the literal
  type `m6/9` for any `Xm6/9`, and every call site passes `.type` straight
  through.
- **Uppercase-M shorthand stays major.** Lowercasing destroys the one signal
  separating `M7` (major) from `m7` (minor), so it is now tested before the
  lowercase pass — including tonal's altered aliases `M69` and `M7#11`, which
  an anchored test let fall through into the minor branch. `M7b5` still reads
  as half-diminished, which is the only established meaning of that symbol.
**Added:** `maj7b5` joins `VoicingQuality`, and `VOICING_LIBRARY` gains entries
for the five qualities that had none.

- **Every quality the mapper can return now has a voicing.** `min6`, `m6/9`,
  `6/9` and `dim7` were reachable but carried no entries, so a chord identified
  correctly resolved to nothing at all. Twelve entries are added, using the
  chord's own tones — no seventh on a sixth chord, no perfect fifth on a
  flat-five one.
- **`M7b5` is its own chord.** Tonal's major seventh flat five is 1 3 b5 7; it
  was being lowercased into `m7b5` and answered as a half-diminished, which is
  1 b3 b5 b7 — a different third and a different seventh. It now has its own
  quality and its own voicings.
- **The `o` and `°` diminished symbols resolve.** `o7` and `°7` are the same
  chord as `dim7` and carry none of its letters, so they fell to the digit
  catchall and were answered as dominants. The bare `o`/`°` is the diminished
  triad and has no seventh voicing. `oM7` and `o7M7` are diminished triads
  carrying a *major* seventh — the minor/major shape with a lowered fifth — and
  are read as minor.
- **`ø`, `h` and `h7` resolve as half-diminished.** Matched whole, since a bare
  "h" appears inside "seventh", "eleventh" and "half".
- **Fixed a voicing that contradicted itself.** `drop24-m7b5` opened on a major
  third in a half-diminished chord: its lowest interval was `-8` where the
  comment — and the chord — called for the flat five an octave down, `-6`. A new
  test checks every entry in the library for notes that contradict its quality.
- **The jazz major-seventh symbols are read as major sevenths.** `^7`, `^9`,
  `^13`, `Δ9`, `ma7` and their altered forms carry no "maj" for the major test
  to find, so they fell to the digit catchall and were answered with *dominant*
  voicings — a b7 against the chord's natural 7. A bare `^` is still the major
  triad it actually is.
- **Every minor/major seventh spelling is now minor.** The canonical name
  contains "minor" and resolved, but the shorthand scattered: `mMaj7` and
  `-maj7` contain "maj" and landed in the major branch, while `mM7`, `mΔ`,
  `-Δ7` and `m/M7` fell through to dominant. One chord had three different
  answers depending on how it was written. `mMaj7b6` and `mb6M7` come with it —
  whether the added tone is read as a b6 or as the raised fifth it sounds like,
  the chord is minor either way.
- **A sus chord with a major seventh gets no voicing rather than a wrong one.**
  The sus4 entries are quartal stacks built on a minor seventh, so answering
  `M7sus4` or `M9sus4` with one sounds a b7 against the natural 7 those chords
  are named for. There is no maj7sus4 quality to return.
- **An altered degree is no longer read as a quality.** `major seventh flat
  sixth` contains the word "sixth" and `6#11` contains "11", but in both the
  number is an alteration inside another chord, not the chord's own quality.
  The same applies to the digit in `mMaj7b6`. Answering them with a sixth
  voicing dropped the seventh and added a sixth the chord does not contain.
- **Tonal's dash spelling of minor is read as minor.** `-7`, `-9`, `-11`,
  `-13`, `-6`, `-69` and `-7b5` are the same shorthand as the `m` forms and
  were falling to the dominant catchall.
- **Spelled-out and bare names resolve.** Tonal names several chords with no
  digit to match: `sixth`, `minor sixth`, `sixth added ninth`, `eleventh`. The
  bare `69` alias was also being claimed by the digit catchall as dom7.

Note for consumers: `min6`, `m6/9`, `6/9` and `dim7` are now returned where
they were previously mis-answered, but `VOICING_LIBRARY` carries no entries for
those qualities yet, so `findVoicing` returns nothing for them. A sixth chord
that used to render a wrong (minor-seventh) voicing now renders none until the
library gains them. `VoicingVariantToggle` falls through to its inversion and
algorithmic variants; a call passing a style hint logs the usual
"No voicing found" warning.

Known gap, unchanged: a triad with an added tone and no seventh (`add9`,
`add13`, `+add9`) is still claimed by the digit catchall and answered as dom7.

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
