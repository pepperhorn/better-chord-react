# chordl

A React component library for rendering interactive SVG piano chord diagrams with audio playback, MIDI export, and a comprehensive jazz voicing engine.

## Features

- **SVG Piano Keyboard** — responsive, themeable piano keyboard rendered as pure SVG
- **Natural Language Input** — describe chords in plain English: `"Cmaj7#5 starting on G#"`
- **Audio Playback** — block chord and arpeggiated playback via Web Audio (smplr)
- **MIDI Export** — download any chord as a standard MIDI file
- **SVG/PNG Export** — download chord diagrams as SVG or PNG (2x retina)
- **Jazz Voicing Library** — 46 voicings across 8 categories with artist/era metadata
- **Polychord & Slash Chord Solver** — upper structure triads, slash chords with LH/RH assignments
- **Locked Hands** — George Shearing block chord algorithm
- **Note Names & Fingering** — display note names and fingering numbers below keys, with auto-fingering engine
- **Progression Resolver** — roman numeral progressions with form templates (ii-V-I, blues, rhythm changes)
- **Color Themes** — Boomwhacker, CRF (Creative Ranges Foundation), Simple, or custom
- **UI Theme** — light/dark mode support for chrome elements
- **Scale Control** — 50%–100% display scaling in 10% increments
- **Chord Resolution** — Tonal.js with fallback resolver for compound jazz alterations

## Installation

```bash
npm install @pepperhorn/chordl-react
```

Peer dependencies: `react >= 18.0.0`, `react-dom >= 18.0.0`

## Quick Start

```tsx
import { PianoChord, PianoKeyboard } from "@pepperhorn/chordl-react";

// Natural language — auto-resolves chord, layout, voicing
<PianoChord chord="Cmaj7" />
<PianoChord chord="D minor seventh in first inversion" />
<PianoChord chord="G7 drop 2" />
<PianoChord chord="Dbmaj9 starting on the 9th with 3 notes on either side" />

// Explicit props — full control
<PianoKeyboard
  highlightKeys={["C", "E", "G"]}
  startFrom="C"
  size={8}
  format="compact"
/>
```

## Natural Language Parser

The parser extracts structured data from freeform text:

| Input | Parsed |
|-------|--------|
| `"Cmaj7#5 starting on G#"` | chord=Cmaj7#5, startingNote=G# |
| `"D minor seventh in first inversion"` | chord=Dm7, inversion=1 |
| `"G sharp augmented"` | chord=G#aug |
| `"C7 in the style of Bill Evans"` | chord=C7, style=Bill Evans |
| `"Dm7 like McCoy Tyner"` | chord=Dm7, style=McCoy Tyner |
| `"Cmaj7 with 3 notes on either side"` | chord=Cmaj7, padding=3 |
| `"C6/9 over D"` | chord=C6/9, bassNote=D |
| `"Cmaj7 with the 5th in the bass"` | chord=Cmaj7, bassDegree=5 |
| `"Dbmaj9 starting on the 9th"` | chord=Dbmaj9, startingDegree=9 |
| `"G7 drop 2"` | chord=G7, style=drop 2 |
| `"G7 drop 2+4"` | chord=G7, style=drop 2+4 |
| `"Cmaj7 spread"` | chord=Cmaj7, style=spread |
| `"G7 nestico"` | chord=G7, style=nestico |
| `"C spanning E to E compact"` | chord=C, span=E-E, format=compact |
| `"Cmaj7 with note names"` | chord=Cmaj7, showNoteNames=true |
| `"Cmaj7 with note names in xl"` | chord=Cmaj7, showNoteNames=true, noteNameSize=xl |
| `"Cmaj7 fingering 1 2 3 5"` | chord=Cmaj7, fingering=[1,2,3,5] |
| `"Cmaj7 with fingerings"` | chord=Cmaj7, autoFingering=true |
| `"Cmaj7 chord down an octave"` | chord=Cmaj7, chordOctaveShift=-1 |
| `"Cmaj7 bass up an octave"` | chord=Cmaj7, bassOctaveShift=+1 |
| `"Cmaj7 all inversions"` | chord=Cmaj7, allInversions=true |
| `"with notes C E G B"` | notesGroups=[{notes:[C,E,G,B]}] (octaves inferred from 4) |
| `"with notes E4 G4 C5"` | notesGroups=[{notes:[E4,G4,C5]}] (explicit) |
| `"notes C E G in lh"` | notesGroups=[{notes:[C,E,G], hand:lh}] |
| `"notes E G B in top hand"` | notesGroups=[{notes:[E,G,B], hand:rh}] |
| `"rh c d e lh c e"` | notesGroups=[{notes:[C,D,E], hand:rh}, {notes:[C,E], hand:lh}] |
| `"rh Cmaj7 lh Dm7"` | notesGroups=[{notes:[C,E,G,B], hand:rh, chord:Cmaj7}, {notes:[D,F,A,C], hand:lh, chord:Dm7}] |
| `"notes C E G in the bass clef"` | notesGroups=[{notes:[C,E,G], hand:lh, clef:bass}] |
| `"notes E G B in the treble clef"` | notesGroups=[{notes:[E,G,B], hand:rh, clef:treble}] |

### Starting Note / Degree

"Starting on" rotates the voicing so the specified note is lowest:

- `"Dbmaj9 starting on the 9th"` — Dbmaj9 voiced as Eb, F, Ab, C, Db
- `"Cmaj7 starting on E"` — Cmaj7 voiced as E, G, B, C

If the requested note or degree isn't in the chord, you get a helpful error:

> `Cmaj7 doesn't have a 9th — try: root (C), 3rd (E), 5th (G), 7th (B)`

### Explicit Notes (`with notes ...`)

Skip chord resolution entirely and render an explicit list of notes, low to
high. Octaves can be embedded in the token (`E4`, `Bb3`) or omitted — when
omitted, octaves are inferred ascending from 4, bumping each time the pitch
class wraps past the previous note.

- `"with notes C E G B"` — Cmaj7 voicing (octave 4)
- `"with notes E4 G4 C5 E5"` — Cmaj7/E with explicit octaves
- `"with notes Bb Eb Ab Db"` — descending fourths, ascending octaves

Append a hand or clef assignment to draw an L.H. / R.H. bracket below the
keyboard. Clefs also seed the inferred base octave (bass = 3, treble = 4).

- LH: `in lh`, `in left hand`, `in bottom hand`, `in l.h.`
- RH: `in rh`, `in right hand`, `in top hand`, `in r.h.`
- Bass clef → LH + low octave: `in (the) bass clef`
- Treble clef → RH + high octave: `in (the) treble clef`

```tsx
<PianoChord chord="notes C E G in lh" />
<PianoChord chord="with notes G B D F in top hand" />
<PianoChord chord="notes C E G in the bass clef" />
```

The hand can also come first, and what follows it may be notes *or* a chord
symbol. Both hands can be named in one input, in either order — with no
explicit octaves, the hands are placed at least an octave apart and never
share a key:

```tsx
<PianoChord chord="rh c d e lh c e" />
<PianoChord chord="lh c e rh c d e" />   {/* same picture */}
<PianoChord chord="rh Cmaj7 lh Dm7" />   {/* a chord per hand */}
<PianoChord chord="rh c d e lh Am" />    {/* notes in one hand, chord in the other */}
```

Placement is automatic only while the request leaves octaves open. Name an
octave on any note and every group is placed exactly as written:
`"notes C3 E3 in lh and notes C4 E4 in rh"`.

Only the first chord after a hand keyword is used — `"rh Cmaj7 Dm7"` draws
Cmaj7 and drops Dm7. A lone pitch class still reads as a single note
(`"lh Bb"` = the note Bb), while a symbol carrying a quality or extension
reads as a chord (`"lh G7"` = G B D F). For the note G in octave 7, say
`"notes G7 in lh"`.

Pair bass + treble clef in one input to render both hands on a single
keyboard with separate L.H. / R.H. brackets:

```tsx
<PianoChord chord="notes C E G in the bass clef and notes B D F in the treble clef" />
```

## Audio Playback & MIDI

Every chord diagram includes five control buttons (top-right):

- **Speaker** — plays all notes simultaneously (block chord)
- **Arpeggio** — plays notes bottom-to-top with stagger
- **MIDI** — exports the chord as a `.mid` file
- **SVG** — downloads the chord diagram as an SVG file
- **PNG** — downloads the chord diagram as a PNG file (2x retina)

Controls appear automatically when notes are highlighted. Disable with `showPlayback={false}`.

### Programmatic API

```ts
import { playBlock, playArpeggiated, downloadMidi, generateMidiFile } from "@pepperhorn/chordl-react";

await playBlock(["C", "E", "G"]);
await playArpeggiated(["C", "E", "G"], 4, 100); // octave 4, 100ms delay

downloadMidi(["C", "E", "G"], "Cmaj"); // triggers browser download

const midiBytes = generateMidiFile({
  notes: ["C", "E", "G"],
  octave: 4,
  tempo: 120,
  arpeggiated: true,
});
```

### SVG/PNG Export

```ts
import { downloadSvg, downloadPng } from "@pepperhorn/chordl-react";

// Pass the SVG element from the DOM
const svgEl = document.querySelector("svg") as SVGSVGElement;
downloadSvg(svgEl, "Cmaj7.svg");
downloadPng(svgEl, "Cmaj7.png");        // 2x retina by default
downloadPng(svgEl, "Cmaj7.png", 3);     // custom pixel ratio
```

## Batch SVG Rendering

For generating large libraries of chord cards (print sheets, app graphics, asset pipelines), use the `@pepperhorn/render-cli` package. It renders the same React components server-side via `renderToStaticMarkup`, so output is pixel-identical to the live UI.

```bash
# Build chord-react first (CLI imports the dist bundle)
pnpm --filter @pepperhorn/chordl-react build

# Render a manifest (paths are resolved relative to the render-cli package)
pnpm --filter @pepperhorn/render-cli render manifests/example.json
# or with explicit output dir
pnpm --filter @pepperhorn/render-cli render manifests/example.json --out ./dist-svgs
```

### Manifest format

```json
{
  "outDir": "./out",
  "defaultPreset": "app-color",
  "entries": [
    { "chord": "Cmaj7" },
    { "chord": "Dm7", "preset": "print-bw" },
    { "chord": "G7", "highlightColor": "#e63946", "filename": "g7-red" }
  ]
}
```

Merge precedence (lowest → highest): `defaultPreset` → entry-level `preset` → inline overrides.

### Visual presets

Defined in `packages/render-cli/src/presets.ts`:

| Preset | Theme | UI | Notes |
|--------|-------|----|-----|
| `app-color` | boomwhacker | light | Default app look |
| `app-dark` | boomwhacker | dark | Dark UI variant |
| `print-bw` | simple | light | Black highlight, print-friendly |
| `crf-brand` | crf | light | CRF brand colors |
| `chord-cards` | crf | light | CRF colors, full layout, 2 padding keys, 2XL note names — for chord-card prints |

Presets can also include a `chordTemplate` field that wraps each entry's chord string with natural-language modifiers. Example: the `chord-cards` preset uses `"full {chord} with 2 notes either side with note names 2xl"`, so a manifest entry `{ "chord": "Cmaj7" }` is rendered as if the user had written the full phrase.

Add new presets by editing the `PRESETS` map.

### Bulk generation

```ts
import { expandCombinations } from "@pepperhorn/render-cli/manifest";

const entries = expandCombinations({
  roots: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  qualities: ["maj7", "m7", "7", "dim7", "m7b5"],
  presets: ["app-color", "print-bw"],
});
// 12 × 5 × 2 = 120 entries
```

Output is non-interactive — playback controls are suppressed via `showPlayback={false}`.

## Voicing Library

46 voicings across 8 categories, stored as semitone intervals relative to the root (key-agnostic):

| Category | Count | Era | Artists |
|----------|-------|-----|---------|
| Shell | 9 | Bebop | Bud Powell, Monk, Count Basie |
| Rootless Type A | 5 | Post-Bop | Bill Evans, Wynton Kelly |
| Rootless Type B | 5 | Post-Bop | Bill Evans |
| Quartal | 4 | Modal | McCoy Tyner |
| Upper Structure | 4 | Modern | Herbie Hancock |
| Drop 2 | 5 | Hard Bop | Barry Harris, Shearing, Duke Ellington |
| Drop 2+4 | 4 | Hard Bop | Big band arranging |
| Spread | 5 | Modern | Sax section writing |
| 4-Note Closed | 5 | Modern | Sammy Nestico |

### Style Hints

Use artist names or style keywords in your chord description:

```tsx
<PianoChord chord="Dm7 in the style of Bill Evans" />  // Rootless Type A
<PianoChord chord="G7 like McCoy Tyner" />              // Quartal
<PianoChord chord="Cmaj7 bebop" />                      // Shell
<PianoChord chord="G7 drop 2" />                        // Drop 2
<PianoChord chord="G7 drop 2+4" />                      // Drop 2+4
<PianoChord chord="Cmaj7 spread" />                     // Spread
<PianoChord chord="G7 nestico" />                       // 4-Note Closed
<PianoChord chord="C7 basie" />                         // Shell (sparse, high-register)
<PianoChord chord="Dm7 ellington" />                    // Drop 2
```

### Voicing API

```ts
import {
  findVoicing, realizeVoicing, realizeVoicingFull, voicingPitchClasses,
  queryVoicings, getAlternativeVoicings, autoSelectVoicing,
  mapToVoicingQuality, inferStyle,
} from "@pepperhorn/chordl-react";

// Find best voicing for quality + style
const voicing = findVoicing("dom7", "Bill Evans");
const notes = realizeVoicing("G", voicing, 3); // ["B3", "E4", "F4", "A4"]

// Full realization with hand assignments
const full = realizeVoicingFull("G", voicing, 3);
// [{ note: "B3", midi: 59, pitchClass: "B", hand: "LH" }, ...]

// Pitch classes for SVG highlighting
const pcs = voicingPitchClasses("G", voicing); // ["B", "E", "F", "A"]

// Range-aware auto-selection (Type A vs Type B)
const auto = autoSelectVoicing("C", "dom7", 3, "rootless");
```

### Polychord Solver

```ts
import { solvePolychord, solveSlashChord } from "@pepperhorn/chordl-react";

// D triad over C7 — LH gets tritone shell (E + Bb), RH gets D triad
const poly = solvePolychord(
  { root: "D", quality: "maj" },
  { root: "C", quality: "dom7" }
);

// C/E slash chord — E in LH (octave 3), C and G in RH (octave 4)
const slash = solveSlashChord(["C", "E", "G"], "E");
```

### Locked Hands (Block Chords)

```ts
import { generateLockedHands } from "@pepperhorn/chordl-react";

// G4 melody over Cmaj7 → 5-note voicing: G3, C4, E4, G4 (melody doubled)
const voicing = generateLockedHands("G4", "Cmaj7");
// Returns RealizedNote[] with LH/RH assignments
```

## Staff Notation Fonts

`<StaffNotation>` renders glyphs (clefs, accidentals, noteheads) using SMuFL-compliant music fonts. As of **0.3.1**, the library bundles 6-codepoint subsets of [Bravura](https://github.com/steinbergmedia/bravura) and [Petaluma](https://github.com/steinbergmedia/petaluma) (~7.5KB total) under the names `PHBravura` / `PHPetaluma`. The fonts are embedded as data URLs and `@font-face`-injected at module load. **No consumer setup required.**

Switch between Standard (Bravura) and Hand drawn (Petaluma) via the `glyphs` prop:

```tsx
import { StaffNotation, BRAVURA_GLYPHS, PETALUMA_GLYPHS } from "@pepperhorn/chordl-react";

<StaffNotation notes={["C", "E", "G"]} glyphs={PETALUMA_GLYPHS} />
```

Or set the app-wide default via `setDefaultGlyphs(PETALUMA_GLYPHS)`.

To use a different SMuFL font, pass any object matching `StaffGlyphSet` (`{ name, fontFamily, glyphs: { trebleClef, ... }, brace }`). The bundled font family stacks fall back to the unsubsetted Bravura/Petaluma names, so consumers who already host the full fonts override the subset automatically.

The bundled subsets are licensed under the SIL Open Font License 1.1 (see `node_modules/@pepperhorn/chordl-react/fonts/OFL.txt`). They are renamed per the OFL Reserved Font Name clause.

## Themes

```tsx
<PianoChord chord="C" theme="boomwhacker" />   // Chromatic pitch-class colors
<PianoChord chord="C" theme="crf" />           // Creative Ranges Foundation colors
<PianoChord chord="C" theme="simple" />        // Single highlight color (default)
<PianoChord chord="Am" highlightColor="#ff6b6b" /> // Custom highlight
```

### Custom Theme

```ts
import { PianoKeyboard } from "@pepperhorn/chordl-react";
import type { ColorTheme } from "@pepperhorn/chordl-react";

const myTheme: ColorTheme = {
  name: "custom",
  whiteKey: (note, highlighted) => highlighted ? "#ff0" : "#fafafa",
  blackKey: (note, highlighted) => highlighted ? "#f80" : "#222",
};

<PianoKeyboard highlightKeys={["C", "E", "G"]} theme={myTheme} />
```

## Note Names & Fingering

The dev playground's **Chord Details** panel (collapsible below the NL input) is the preferred way to toggle these display options — title/subheading/footer text are pure component props, and the annotation toggles (note names, MIDI mode, degrees, fingering, sizes) wire directly to `<PianoChord>` via state.

The NL phrases below remain supported for backwards compatibility and for use cases where you want to share a single chord string that carries display options with it.

Display note names and fingering numbers below highlighted keys:

```tsx
// Via natural language
<PianoChord chord="Cmaj7 with note names" />
<PianoChord chord="Cmaj7 with note names in xl" />
<PianoChord chord="Cmaj7 fingering 1 2 3 5" />
<PianoChord chord="Cmaj7 with fingerings" />  // auto-computed

// Via props
<PianoKeyboard
  highlightKeys={["C", "E", "G", "B"]}
  showNoteNames
  noteNameSize="lg"
  fingering={[1, 2, 3, 5]}
  fingeringSize="xl"
/>
```

### Text Sizes

Note names and fingering sizes use a Tailwind-inspired scale and can be set independently:

| Size | Scale |
|------|-------|
| `base` | 1× (default) |
| `lg` | 1.25× |
| `xl` | 1.5× |
| `2xl` | 1.875× |

### Auto-Fingering

The auto-fingering engine scores candidate patterns based on:
- Thumb-on-black-key avoidance
- Stretch comfort between fingers
- Conventional hand positions (thumb start, pinky end)

Works for both hands — LH fingering mirrors RH (finger N → 6-N).

```ts
import { autoFingering } from "@pepperhorn/chordl-react";

autoFingering(["C", "E", "G", "B"], "rh"); // [1, 2, 3, 5]
autoFingering(["C", "Eb", "G"], "lh");     // [5, 3, 1]
```

## Chord Resolution

Resolves chord symbols using Tonal.js with a fallback for compound jazz alterations:

```ts
import { resolveChord } from "@pepperhorn/chordl-react";

resolveChord("Cmaj7");        // { notes: ["C","E","G","B"], root: "C", type: "major seventh" }
resolveChord("Dm7", 1);       // First inversion: { notes: ["F","A","C","D"], ... }
resolveChord("Cmaj9#5#13");   // Fallback resolver strips alterations and reapplies
resolveChord("Cm7sus");       // Special builder: [C, Eb, F, Bb]
resolveChord("C7omit3");      // Special builder: [C, G, Bb]
```

## Props

### `<PianoChord>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chord` | `string` | required | Natural language chord description |
| `format` | `"compact" \| "exact"` | `"compact"` | Key height mode |
| `theme` | `string \| ColorTheme` | `"simple"` | Color theme |
| `highlightColor` | `string` | `"#a0c6e8"` | Shortcut for simple theme color |
| `padding` | `number` | `1` | Extra white keys on each side |
| `scale` | `number` | `1` | Display scale (0.5–1.0) |
| `uiTheme` | `"light" \| "dark"` | `"light"` | UI chrome theme |
| `showPlayback` | `boolean` | `true` | Show audio/MIDI/export controls (set `false` for static export) |
| `className` | `string` | — | CSS class |
| `style` | `CSSProperties` | — | Inline styles |

### `<PianoKeyboard>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `format` | `"compact" \| "exact"` | `"compact"` | Key height mode |
| `size` | `number` | `8` | Number of white keys |
| `startFrom` | `WhiteNote` | `"C"` | First white key |
| `highlightKeys` | `string[]` | `[]` | Notes to highlight |
| `theme` | `string \| ColorTheme` | `"simple"` | Color theme |
| `highlightColor` | `string` | `"#a0c6e8"` | Shortcut for simple theme |
| `showPlayback` | `boolean` | `true` | Show audio/MIDI/export controls |
| `chordLabel` | `string` | — | Label for MIDI filename |
| `scale` | `number` | `1` | Display scale (0.5–1.0) |
| `showNoteNames` | `boolean` | `false` | Show note names below keys |
| `noteNameSize` | `TextSize` | `"base"` | Note name text size |
| `fingering` | `number[]` | — | Fingering numbers (aligned with highlightKeys) |
| `fingeringSize` | `TextSize` | `"base"` | Fingering text size |
| `handBrackets` | `HandBracket[]` | — | L.H./R.H. bracket annotations |
| `uiTheme` | `"light" \| "dark"` | `"light"` | UI chrome theme |
| `className` | `string` | — | CSS class |
| `style` | `CSSProperties` | — | Inline styles |

## Monorepo Structure

```
packages/
  chord-react/          @pepperhorn/chordl-react (main package)
    src/
      components/       PianoKeyboard, PianoChord, ChordGroup, ProgressionView
      engine/           SVG layout, highlight mapping, auto-fingering, constants
      resolver/         Chord resolution, auto-layout
      parser/           Natural language parser, progression parser
      audio/            Playback (smplr), MIDI export, SVG/PNG export
      themes/           Boomwhacker, CRF, Simple
    test/               Vitest tests
    dev/                Vite dev playground
  voicings/             @pepperhorn/chordl-voicings (standalone package)
    src/
      library.ts        46 voicing entries
      query.ts          Query, realize, style inference
      range-algorithm.ts Range-aware voicing selection
      polychord.ts      Polychord & slash chord solver
      locked-hands.ts   Locked hands block chord algorithm
      types.ts          VoicingEntry, RealizedNote, etc.
    test/               Vitest tests
  render-cli/           @pepperhorn/render-cli (Node CLI, batch SVG export)
    src/
      cli.ts            Manifest loader + writer
      render.tsx        SSR via renderToStaticMarkup
      presets.ts        Named visual presets (app-color, print-bw, ...)
      manifest.ts       Manifest types + expandCombinations() helper
    manifests/          Example + project manifests
  chordl-board/         @pepperhorn/chordl-board (stateful chord-card list)
    src/
      ChordBoard.tsx    Reorderable cards + clipboard + edit/copy/cut/delete
      storage.ts        localStorage + memory adapters
      types.ts          BoardItem, StorageAdapter
```

### Chord Board

`<ChordBoard>` renders a reorderable list of chord cards backed by a
pluggable storage adapter. Pair it with `useChordBoard()` for ready-made
add/remove/reorder/clipboard mutators.

```tsx
import { ChordBoard, useChordBoard, localStorageAdapter } from "@pepperhorn/chordl-board";

function MyBoard() {
  const board = useChordBoard({ storage: localStorageAdapter("my-board") });
  return (
    <>
      <button onClick={() => board.addItem({ nl: "Cmaj7", title: "Intro" })}>
        + Add chord
      </button>
      <ChordBoard
        items={board.items}
        clipboard={board.clipboard}
        onEdit={(item) => /* hydrate your editor with item.nl */}
        onCopy={board.copyItem}
        onCut={board.cutItem}
        onDelete={board.removeItem}
        onPaste={board.pasteItem}
        onClearClipboard={board.clearClipboard}
        onReorder={board.reorder}
      />
    </>
  );
}
```

Swap the default `localStorageAdapter` for any `StorageAdapter`
(`{ load(): Items | Promise<Items>; save(items): void | Promise<void> }`)
to back the board with a remote API or IndexedDB.

## Development

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start Vite dev playground (http://localhost:5173)
npm run build        # Build both packages
npm test             # Run all tests (watch mode)
```

Run tests once (CI):
```bash
npm run test -w @pepperhorn/chordl-voicings -- --run
npm run test -w @pepperhorn/chordl-react -- --run
```

## Test Coverage

170 tests across 10 test files:

- **Voicings** (43): library structure, query filtering, style inference (Basie/Ellington/Nestico/etc.), voicing realization, polychord solving, locked hands algorithm
- **Chord React** (127): NL parser (22), chord resolution (12), auto-layout (5), playback controls (5), keyboard rendering (6), progression resolver (54), progression stress tests (23)

## Acknowledgments

This project was inspired by and builds upon [amypellegrini/piano-chord-chart](https://github.com/amypellegrini/piano-chord-chart) — the original SVG piano chord rendering approach that served as the foundation for this library.

## License

MIT
