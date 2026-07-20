# @pepperhorn/chordl-listen

Live microphone chord identification. Turns mic input into a stream of stable
chord symbols, which are handed to chordl's resolver for spelling — this package
never invents chord names itself.

## Pipeline

```
mic ─▶ AnalyserNode FFT ─▶ chroma (12-bin) ─▶ template match ─▶ stabilizer ─▶ chord symbol ─▶ chordl resolver
```

- **capture** — `ChordListener` opens the mic via `getUserMedia` and reads an
  `AnalyserNode` FFT each frame.
- **`chromaFromSpectrum`** folds the FFT magnitude spectrum into a 12-bin
  pitch-class profile. It uses the platform FFT rather than a heavier CQT /
  Essentia.js dependency; the module is isolated behind a
  `Float32Array → number[12]` contract, so a higher-fidelity front-end can be
  swapped in without touching the matcher.
- **`matchChord`** correlates the chroma against every (root × quality) template
  by cosine similarity. Many pitch-class sets are genuinely ambiguous (a rootless
  `Am7` and `C6` are the same four notes); ties resolve to the simpler / more
  common quality.
- **`ChordStabilizer`** debounces the per-frame guesses into "chord changed"
  events — a chord must hold for a few frames before it is emitted, and a held
  chord fires once, not every frame.
- **`toChordSymbol`** formats a candidate as a chordl chord string (`"Dm7"`).

## Usage

```ts
import { ChordListener, toChordSymbol } from "@pepperhorn/chordl-listen";

const listener = new ChordListener({
  onChord: (chord) => console.log("heard", toChordSymbol(chord), chord.confidence),
});
await listener.start(); // prompts for mic permission
// ...
listener.stop();
```

The detection/stabilizer/resolve modules are pure and unit-tested; only
`ChordListener` touches Web Audio.

## Score follow-along (scaffolded, not yet wired)

`SequenceFollower` implements forward-only sequence alignment for automatic page
turning — matching the live chord stream against a known `ExpectedChord[]`
sequence. It is **not** beat tracking (no tempo, no beat grid). It is tested in
isolation but not yet connected to any UI.

## Notes / limitations

- Single source (one instrument or mic). No polyphonic source separation.
- Chroma detection is octave- and bass-agnostic, so inversions and slash chords
  aren't distinguished, and enharmonically-equal voicings (e.g. `Am7` vs `C6`)
  resolve to the conventional reading.
