import { describe, it, expect, vi, afterEach } from "vitest";
import { localStorageAdapter } from "../src/storage";
import type { BoardState } from "../src/types";

const state: BoardState = { items: [{ id: "a", nl: "Cmaj7" }], meta: {} };

/** What the browser throws when the origin's storage budget is gone. */
const quotaError = (name = "QuotaExceededError") => {
  const err = new Error("The quota has been exceeded.");
  Object.defineProperty(err, "name", { value: name });
  return err;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("localStorageAdapter.save", () => {
  it("writes the board through on the happy path", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    localStorageAdapter("k").save(state);
    expect(setItem).toHaveBeenCalledWith("k", JSON.stringify(state));
  });

  it("reports a quota failure to onError instead of swallowing it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    const onError = vi.fn();
    expect(() => localStorageAdapter("k", { onError }).save(state)).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    const [err, info] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(info).toMatchObject({ key: "k" });
    expect(info.bytes).toBeGreaterThan(0);
  });

  it("reports Firefox's historical quota name too", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError("NS_ERROR_DOM_QUOTA_REACHED");
    });
    const onError = vi.fn();
    localStorageAdapter("k", { onError }).save(state);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("warns with the byte size when no onError is supplied", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => localStorageAdapter("k").save(state)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0].join(" "))).toContain(
      String(JSON.stringify(state).length),
    );
  });

  it("stays silent when storage is absent", () => {
    vi.stubGlobal("localStorage", undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onError = vi.fn();
    expect(() => localStorageAdapter("k", { onError }).save(state)).not.toThrow();
    expect(onError).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not throw when storage is present but refuses the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("The operation is insecure.");
      Object.defineProperty(err, "name", { value: "SecurityError" });
      throw err;
    });
    const onError = vi.fn();
    expect(() => localStorageAdapter("k", { onError }).save(state)).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("localStorageAdapter.load", () => {
  it("returns an empty board when storage is absent", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(localStorageAdapter("k").load()).toEqual({ items: [], meta: {} });
  });
});
