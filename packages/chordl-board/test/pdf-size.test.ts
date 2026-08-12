import { describe, it, expect } from "vitest";
import { deflateSync } from "node:zlib";
import jsPDF from "jspdf";

/**
 * Minimal PNG encoder — enough for jsPDF to embed. Avoids depending on a canvas
 * (jsdom has none) so this test measures real bytes rather than a mocked flag.
 */
function png(width: number, height: number, rgb: [number, number, number]): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour RGB
  // Each scanline is a filter byte followed by width RGB triples.
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    for (let x = 0; x < width; x++) {
      const p = row + 1 + x * 3;
      raw[p] = rgb[0]; raw[p + 1] = rgb[1]; raw[p + 2] = rgb[2];
    }
  }
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

/**
 * jsPDF defaults `compress` to false, which embeds the decoded bitmap with no
 * stream compression. A real 12-card board measured 8.33MB without the flag and
 * 0.05MB with it, from the identical PNG — the image resolution was never the
 * problem. This pins the behaviour rather than the flag, so the guarantee holds
 * even if the option is renamed.
 */
describe("PDF export size", () => {
  const W = 600, H = 400;
  const image = png(W, H, [255, 255, 255]);

  const build = (compress: boolean) => {
    const pdf = new jsPDF({
      orientation: W >= H ? "landscape" : "portrait",
      unit: "px",
      format: [W, H],
      compress,
    });
    pdf.addImage(image, "PNG", 0, 0, W, H);
    return (pdf.output("arraybuffer") as ArrayBuffer).byteLength;
  };

  it("compresses the embedded bitmap", () => {
    const uncompressed = build(false);
    const compressed = build(true);
    // An uncompressed RGB bitmap is ~3 bytes per pixel; compressed flat colour
    // is a rounding error next to it. Ten-fold is a conservative floor for what
    // measured as a 166x difference on a real board.
    expect(compressed).toBeLessThan(uncompressed / 10);
  });

  it("keeps a full-page image well under a megabyte", () => {
    expect(build(true)).toBeLessThan(1024 * 1024);
  });
});
