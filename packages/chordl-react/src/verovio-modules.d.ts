// Verovio ships without TypeScript types. We use only the toolkit surface we
// need (see src/verovio.ts); declare the two subpath modules we import.
declare module "verovio/wasm" {
  const createVerovioModule: () => Promise<unknown>;
  export default createVerovioModule;
}

declare module "verovio/esm" {
  export class VerovioToolkit {
    constructor(module: unknown);
    setOptions(opts: Record<string, unknown>): void;
    loadData(data: string): boolean;
    renderToSVG(page: number): string;
    getPageCount(): number;
    getVersion(): string;
  }
}
