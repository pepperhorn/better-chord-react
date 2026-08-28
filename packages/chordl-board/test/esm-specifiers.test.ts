import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });

/** Specifier of a static import/export-from or a dynamic import(). */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)"(\.[^"]*)"/g;

/**
 * chordl-board is the one published package still on moduleResolution:
 * "bundler" — html2canvas and jspdf are CJS with ESM-style default exports
 * that nodenext types as non-callable. So tsc does not enforce what the
 * other packages get for free: relative specifiers must carry an explicit
 * extension, or the emitted dist/*.js throws ERR_MODULE_NOT_FOUND under
 * Node's ESM resolver. Build, lint and the rest of the suite all resolve
 * extensionless specifiers happily, so nothing else would catch it.
 */
describe("Node ESM emit", () => {
  it("every relative import in src carries an explicit extension", () => {
    const offenders: string[] = [];
    for (const file of walk(src)) {
      const text = readFileSync(file, "utf8");
      for (const [, spec] of text.matchAll(SPECIFIER)) {
        if (!/\.(js|json|css|svg)$/.test(spec)) {
          offenders.push(`${file.slice(src.length + 1)}: "${spec}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
