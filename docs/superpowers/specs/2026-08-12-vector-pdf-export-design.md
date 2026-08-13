# Vector PDF export

Backlog item. Not scheduled — this records what the work actually is, because
the obvious framing ("swap html2canvas for svg2pdf") is wrong.

## Why

Board PDFs are raster: html2canvas screenshots the DOM, and the bitmap is
embedded. Since the compression fix a 30-card board is 0.08MB, so **size is no
longer the reason to do this**. The reasons that remain are print quality:

- **Scaling.** A raster PDF at capture resolution blurs when a teacher prints
  A3 or zooms. Vector output is resolution-independent.
- **Selectable, searchable text.** Chord names and titles are currently pixels.
- **Real pagination.** A raster export is one enormous page — `format:
  [canvas.width, canvas.height]` — rather than a paginated document.

## The thing that makes this bigger than it looks

A board is **not** mostly SVG. Audited on a three-card board with titles:

| | content |
|---|---|
| **DOM text** (invisible to svg2pdf) | board title, board subtitle, board footer, every card title, subheading and footer, **and every chord name** |
| **SVG text** | Verovio's own credit line, a stylesheet blob, fret/string labels |
| **CSS, not SVG** | card borders, card background, grid layout, spacing |

The chord names moved into the DOM deliberately, in the card-text work: keyboard,
staff and fretboard cards share one `CardHeading` so a mixed board agrees on
type. That was right for the screen and it is exactly what breaks a naive
svg2pdf pass — you would get diagrams with **no chord names on them**.

So the work is not "render the SVGs into a PDF". It is:

> Stop screenshotting the document and start composing it.

Positions, type, borders and page breaks are computed and drawn into the PDF,
with `svg2pdf` used only for the diagram inside each card.

## Shape, if built

A `boardToPdf(state, options)` composer in chordl-board that walks the board
model — not the DOM — and emits:

1. page setup (real page size, margins, orientation);
2. board title / subtitle as PDF text;
3. per card: border (from the card-appearance spec), heading text, the diagram
   via `svg2pdf`, subheading and footer text;
4. page breaks, honouring `breakAfter` from the board-structure spec.

Driving from the model rather than the DOM is what makes pagination possible:
the composer decides what fits on a page, which a screenshot can never do.

`prepareExportClone` in chordl-react already strips playback controls from an
SVG for export and is the right input to `svg2pdf` per diagram.

## Known traps

- **`paint-order` is ignored by svg2pdf.** The house note-text style (white fill,
  dark stroke, `paint-order: stroke`) renders wrong — the stroke paints over the
  fill. The documented workaround is a three-pass render: stroke-only outline,
  shadow, then solid fill on top. This is already in the project conventions, so
  it is a known cost rather than a discovery.
- **Verovio output.** Staff notation is Verovio-generated SVG with its own
  stylesheet blob and a credit line; both need handling before it goes through
  svg2pdf.
- **Fonts.** PDF text needs embedded fonts to match the screen. The repo already
  bundles Bravura and Petaluma for notation; UI text is `system-ui`, which is not
  a real font and cannot be embedded — a concrete face has to be chosen for PDF
  output, and it will not match every viewer's screen rendering exactly.
- **Two renderers to keep in agreement.** A composer means the PDF no longer
  derives from the screen, so screen and print can drift. Whatever the composer
  draws needs to be verified against the rendered board, not assumed.

## Dependencies

`svg2pdf.js` 2.7.0, MIT, pairs with jsPDF which is already a dependency.

## Sequencing

After **card appearance** and **board structure**. Both add fields the composer
would have to draw (border style and colour; text cards, icons, `breakAfter`),
and building the composer first would mean building it twice.

## Open question

Whether raster export stays. Keeping both means two export paths to maintain and
two outputs that can disagree; dropping raster means PNG export needs its own
answer, since PNG has no vector form. Most likely: PNG stays raster, PDF goes
vector, and they are explicitly allowed to differ.
