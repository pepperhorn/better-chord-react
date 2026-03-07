import { describe, it, expect } from "vitest";
import { calculateLayout } from "@better-chord/core";

describe("calculateLayout", () => {
  it("returns default for empty notes", () => {
    const result = calculateLayout([]);
    expect(result.startFrom).toBe("C");
    expect(result.size).toBe(8);
  });

  it("adds padding around chord notes", () => {
    const result = calculateLayout(["C", "E", "G"]);
    expect(result.size).toBeGreaterThanOrEqual(5);
  });

  it("respects span overrides", () => {
    const result = calculateLayout(["C", "E", "G"], {
      spanFrom: "A",
      spanTo: "E",
    });
    expect(result.startFrom).toBe("A");
    expect(result.size).toBe(5);
  });

  it("handles same-note span", () => {
    const result = calculateLayout(["C", "E", "G"], {
      spanFrom: "E",
      spanTo: "E",
    });
    expect(result.startFrom).toBe("E");
    expect(result.size).toBe(8); // defaults to 8 for zero span
  });

  it("respects custom padding", () => {
    const result = calculateLayout(["C", "E", "G"], { padding: 2 });
    expect(result.size).toBeGreaterThanOrEqual(7);
  });
});
