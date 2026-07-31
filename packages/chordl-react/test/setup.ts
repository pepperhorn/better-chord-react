import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom implements no SVG layout, so SVGElement.getBBox is missing and svguitar
// throws while measuring text ("Getting bbox of element \"text\" is not
// possible"). GuitarChord catches that and renders nothing, which would make
// every diagram assertion vacuous. A fixed-size box is enough for svguitar to
// finish laying out — we assert on structure, not on exact geometry.
if (typeof SVGElement !== "undefined" && !("getBBox" in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    writable: true,
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  });
}

// Testing Library only auto-cleans when the test runner exposes globals.
// This package runs vitest without `globals: true`, so without this the DOM
// from one render() leaks into the next test in the same file — document-wide
// queries (getAllByRole, getByText) then see nodes from earlier tests.
afterEach(cleanup);
