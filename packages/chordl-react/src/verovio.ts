// Verovio toolkit loader + font registration.
//
// Verovio ships as a ~7 MB WASM module, so it is dynamically imported and the
// toolkit instance is cached behind a single promise. The bundled Bravura /
// Petaluma zips (see fonts/verovio + verovio-fonts.generated.ts) are registered
// via `fontAddCustom` the first time the toolkit initializes, so engraving uses
// the repo-bundled fonts rather than whatever the Verovio build compiled in.

export type VerovioFont = "Bravura" | "Petaluma";

// Minimal shape of the bits of the Verovio toolkit we use.
interface Toolkit {
  setOptions(opts: Record<string, unknown>): void;
  loadData(data: string): boolean;
  renderToSVG(page: number): string;
  getPageCount(): number;
}

let toolkitPromise: Promise<Toolkit> | null = null;

async function initToolkit(): Promise<Toolkit> {
  // `verovio/wasm` is the WASM module factory; `verovio/esm` the JS toolkit.
  // The embedded font zips (~1 MB base64) are dynamically imported here too so
  // they land in this lazy chunk rather than the main bundle.
  const [{ default: createVerovioModule }, { VerovioToolkit }, { VEROVIO_FONT_ZIPS }] =
    await Promise.all([
      import("verovio/wasm"),
      import("verovio/esm"),
      import("./verovio-fonts.generated"),
    ]);
  const mod = await createVerovioModule();
  const tk = new VerovioToolkit(mod) as unknown as Toolkit;
  // Register the bundled font zips (base64). Loading all keeps font switching
  // instant afterwards — no re-init when the user toggles Bravura/Petaluma.
  tk.setOptions({
    fontAddCustom: Object.values(VEROVIO_FONT_ZIPS),
  });
  return tk;
}

/** Lazily load (and cache) the Verovio toolkit with the bundled fonts registered. */
export function getVerovioToolkit(): Promise<Toolkit> {
  if (!toolkitPromise) {
    toolkitPromise = initToolkit().catch((err) => {
      // Reset so a later call can retry after a transient import/WASM failure.
      toolkitPromise = null;
      throw err;
    });
  }
  return toolkitPromise;
}

export interface RenderMeiOptions {
  font?: VerovioFont;
  /** Verovio `scale` (percent). Larger = bigger engraving. */
  scale?: number;
}

/** Render an MEI document to a single-system SVG string. */
export async function renderMeiToSvg(
  mei: string,
  { font = "Bravura", scale = 40 }: RenderMeiOptions = {},
): Promise<string> {
  const tk = await getVerovioToolkit();
  tk.setOptions({
    font,
    scale,
    adjustPageWidth: true,
    adjustPageHeight: true,
    breaks: "none",
    header: "none",
    footer: "none",
    pageMarginTop: 8,
    pageMarginBottom: 8,
    pageMarginLeft: 4,
    pageMarginRight: 4,
    svgViewBox: true,
    svgRemoveXlink: true,
  });
  if (!tk.loadData(mei)) {
    throw new Error("Verovio failed to load notation data");
  }
  return tk.renderToSVG(1);
}
