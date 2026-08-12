import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Board cards render chord diagrams, and svguitar measures text via getBBox,
// which jsdom does not implement. A fixed-size box is enough for layout to
// finish — these tests assert on structure, never on geometry.
if (typeof SVGElement !== "undefined" && !("getBBox" in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    writable: true,
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  });
}

// This package runs vitest without `globals: true`, so Testing Library does not
// auto-clean; without this the DOM from one render() leaks into the next test.
afterEach(() => cleanup());
