# Verovio font zips

`Bravura.zip` and `Petaluma.zip` are [Verovio](https://www.verovio.org) custom-font
archives (bounding-box XML + per-glyph SVG paths + the embedded woff2 CSS). The
notation renderer registers them with Verovio via `fontAddCustom` (see
`src/verovio.ts`) so engraving uses these repo-bundled fonts rather than whatever
the Verovio WASM build happens to compile in.

Both fonts are licensed under the SIL Open Font License (see `../OFL.txt`):

- **Bravura** — designed by Daniel Spreadbury / Steinberg.
- **Petaluma** — designed by Steinberg.

## Regenerating

The zips are assembled from the upstream Verovio font data and then embedded as
base64 in `src/verovio-fonts.generated.ts`:

```sh
pnpm --filter @pepperhorn/chordl-react fonts:build
```

`scripts/build-verovio-fonts.mjs` fetches the font data and writes the zips;
`scripts/embed-verovio-fonts.mjs` regenerates the base64 module. Commit all three
outputs (the two zips and the generated module) together.
