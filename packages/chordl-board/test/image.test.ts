import { describe, it, expect, vi } from "vitest";
import {
  IMAGE_BUDGET_CHARS,
  ImageTooLargeError,
  MAX_UPLOAD_BYTES,
  fileToCardImage,
  imageBytesUsed,
} from "../src/image";
import type { DecodedImage, ImageDecoder } from "../src/image";

/**
 * The real decode step needs `Image` and `<canvas>`, which jsdom has neither
 * of. Everything worth testing here — the guards, the size arithmetic, the
 * format choice, the release paths — sits on this side of that seam.
 */
function stubDecode(
  width: number,
  height: number,
  dataUri = "data:image/jpeg;base64,AAAA",
) {
  const encode = vi.fn<DecodedImage["encode"]>(() => dataUri);
  const release = vi.fn();
  const decode = vi.fn<ImageDecoder>(async () => ({ width, height, encode, release }));
  return { decode, encode, release };
}

const file = (type: string, bytes = 1024, name = "photo") => {
  const f = new File(["x"], name, { type });
  // Blob.size follows the content; a test that actually allocated 100MB to
  // check the "rejected before decode" guarantee would defeat its own point.
  Object.defineProperty(f, "size", { value: bytes });
  return f;
};

describe("fileToCardImage guards", () => {
  it("rejects a non-image by type, with a message a user can act on", async () => {
    const { decode } = stubDecode(100, 100);
    await expect(fileToCardImage(file("application/pdf"), {}, decode)).rejects.toThrow(
      /not an image/i,
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("does not trust the extension", async () => {
    const { decode } = stubDecode(100, 100);
    await expect(
      fileToCardImage(file("application/pdf", 1024, "sneaky.jpg"), {}, decode),
    ).rejects.toThrow(/not an image/i);
    expect(decode).not.toHaveBeenCalled();
  });

  it("refuses SVG even though it is an image type", async () => {
    const { decode } = stubDecode(100, 100);
    await expect(fileToCardImage(file("image/svg+xml"), {}, decode)).rejects.toThrow(
      /SVG pictures cannot be added/i,
    );
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects an empty file", async () => {
    const { decode } = stubDecode(100, 100);
    await expect(fileToCardImage(file("image/jpeg", 0), {}, decode)).rejects.toThrow(/empty/i);
    expect(decode).not.toHaveBeenCalled();
  });

  it("rejects an oversized upload without decoding it", async () => {
    const { decode } = stubDecode(100, 100);
    const huge = file("image/jpeg", 100 * 1024 * 1024);
    const err = await fileToCardImage(huge, {}, decode).catch((e) => e);
    expect(err).toBeInstanceOf(ImageTooLargeError);
    expect(err.bytes).toBe(100 * 1024 * 1024);
    expect(err.limit).toBe(MAX_UPLOAD_BYTES);
    expect(err.message).toMatch(/100\.0MB/);
    // The memory guarantee: nothing was read.
    expect(decode).not.toHaveBeenCalled();
  });
});

describe("fileToCardImage sizing", () => {
  it("preserves aspect ratio when downscaling", async () => {
    const { decode, encode } = stubDecode(4000, 3000);
    await fileToCardImage(file("image/jpeg"), {}, decode);
    expect(encode).toHaveBeenCalledWith(640, 480, "image/jpeg", 0.82);
  });

  it("fits a portrait photo by its longest edge", async () => {
    const { decode, encode } = stubDecode(1500, 3000);
    await fileToCardImage(file("image/jpeg"), { maxDim: 600 }, decode);
    expect(encode).toHaveBeenCalledWith(300, 600, "image/jpeg", 0.82);
  });

  it("never upscales a small image", async () => {
    const { decode, encode } = stubDecode(120, 90);
    await fileToCardImage(file("image/jpeg"), {}, decode);
    expect(encode).toHaveBeenCalledWith(120, 90, "image/jpeg", 0.82);
  });

  it("honours an explicit quality", async () => {
    const { decode, encode } = stubDecode(800, 800);
    await fileToCardImage(file("image/jpeg"), { quality: 0.5 }, decode);
    expect(encode).toHaveBeenCalledWith(640, 640, "image/jpeg", 0.5);
  });
});

describe("fileToCardImage output format", () => {
  it("keeps a PNG source as PNG so transparency survives", async () => {
    const { decode, encode } = stubDecode(800, 800, "data:image/png;base64,AAAA");
    const out = await fileToCardImage(file("image/png"), {}, decode);
    expect(encode.mock.calls[0][2]).toBe("image/png");
    expect(out.startsWith("data:image/png")).toBe(true);
  });

  it("re-encodes a JPEG source as JPEG", async () => {
    const { decode, encode } = stubDecode(800, 800);
    await fileToCardImage(file("image/jpeg"), {}, decode);
    expect(encode.mock.calls[0][2]).toBe("image/jpeg");
  });

  it("treats WebP as possibly-transparent and emits PNG", async () => {
    const { decode, encode } = stubDecode(800, 800, "data:image/png;base64,AAAA");
    await fileToCardImage(file("image/webp"), {}, decode);
    expect(encode.mock.calls[0][2]).toBe("image/png");
  });
});

describe("fileToCardImage result size", () => {
  it("throws ImageTooLargeError carrying the real numbers", async () => {
    const oversized = `data:image/jpeg;base64,${"A".repeat(2 * 1024 * 1024)}`;
    const { decode } = stubDecode(2000, 1000, oversized);
    const err = await fileToCardImage(file("image/jpeg"), {}, decode).catch((e) => e);
    expect(err).toBeInstanceOf(ImageTooLargeError);
    expect(err.bytes).toBe(oversized.length);
    expect(err.limit).toBe(512 * 1024);
    expect(err.message).toMatch(/limit 512KB/);
  });

  it("respects a caller-supplied maxBytes", async () => {
    const { decode } = stubDecode(200, 200, "data:image/jpeg;base64,AAAAAAAAAA");
    const err = await fileToCardImage(file("image/jpeg"), { maxBytes: 10 }, decode).catch((e) => e);
    expect(err).toBeInstanceOf(ImageTooLargeError);
    expect(err.limit).toBe(10);
  });

  it("tells a PNG uploader why their file is bulky", async () => {
    const { decode } = stubDecode(200, 200, "data:image/png;base64,AAAAAAAAAA");
    const err = await fileToCardImage(file("image/png"), { maxBytes: 10 }, decode).catch((e) => e);
    expect(err.message).toMatch(/transparent backgrounds/i);
  });

  it("rejects a canvas that produced no image", async () => {
    const { decode } = stubDecode(200, 200, "data:,");
    await expect(fileToCardImage(file("image/jpeg"), {}, decode)).rejects.toThrow(
      /could not be prepared/i,
    );
  });
});

describe("fileToCardImage cleanup", () => {
  it("releases the decoded image on success", async () => {
    const { decode, release } = stubDecode(800, 600);
    await fileToCardImage(file("image/jpeg"), {}, decode);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases the decoded image when encoding fails", async () => {
    const { decode, encode, release } = stubDecode(800, 600);
    encode.mockImplementation(() => {
      throw new Error("no 2d context");
    });
    await expect(fileToCardImage(file("image/jpeg"), {}, decode)).rejects.toThrow(/no 2d context/);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases the decoded image when the result is over budget", async () => {
    const { decode, release } = stubDecode(800, 600, "data:image/jpeg;base64,AAAAAAAAAA");
    await fileToCardImage(file("image/jpeg"), { maxBytes: 4 }, decode).catch(() => {});
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("imageBytesUsed", () => {
  it("returns 0 for an empty board", () => {
    expect(imageBytesUsed([])).toBe(0);
  });

  it("returns 0 when no card carries an image", () => {
    expect(imageBytesUsed([{}, {}, { image: undefined }])).toBe(0);
  });

  it("sums only the cards that have one", () => {
    const used = imageBytesUsed([{ image: "abc" }, {}, { image: "de" }]);
    expect(used).toBe(5);
  });

  it("measures a board against the image budget", () => {
    const items = [{ image: "d".repeat(200 * 1024) }, { image: "d".repeat(200 * 1024) }];
    expect(imageBytesUsed(items)).toBeLessThan(IMAGE_BUDGET_CHARS);
    expect(IMAGE_BUDGET_CHARS).toBeLessThan(5 * 1024 * 1024);
  });
});
