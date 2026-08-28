import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)"([^"]+)"/g;

/** "@scope/pkg/sub" -> "@scope/pkg"; "pkg/sub" -> "pkg". */
const packageOf = (spec: string) =>
  spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/");

/**
 * vite.config.ts externalises exactly what the manifest declares as a runtime
 * dependency. Anything else src imports gets silently inlined into the bundle
 * instead — no build error, no CI signal, and consumers go back to shipping two
 * copies of it. @pepperhorn/chordl-board is a devDependency used by dev/, so a
 * single stray import of it from src would do exactly that.
 */
describe("bundle externals", () => {
  it("every package src imports is a declared runtime dependency", () => {
    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ]);
    const offenders: string[] = [];
    for (const file of walk(src)) {
      for (const [, spec] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
        if (spec.startsWith(".") || spec.startsWith("node:")) continue;
        const name = packageOf(spec);
        if (!declared.has(name)) {
          offenders.push(`${file.slice(src.length + 1)}: "${spec}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
