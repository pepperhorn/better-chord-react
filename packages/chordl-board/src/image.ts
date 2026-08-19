/**
 * Upload path for a text card's `image`.
 *
 * A card stores its image as a data URI so a JSON export is a complete backup
 * (see types.ts). The whole board then has to fit in localStorage's ~5MB, and a
 * phone photo is 3–8MB on its own — storing a raw upload does not overflow one
 * card, it loses the user's board. So nothing reaches a card until it has been
 * downscaled and re-encoded here, and an upload that still will not fit is
 * refused out loud rather than written and dropped later.
 *
 * `storage.ts` is the other half of the same problem: this module prevents the
 * overflow, `localStorageAdapter`'s `onError` reports the one that got through.
 */

/** Longest edge of a stored image. A board card is ~240px wide, ~480px at 2x
 * export, so 640 is already generous — past that we are storing pixels no one
 * ever sees. */
const DEFAULT_MAX_DIM = 640;

/** Below ~0.75 JPEG artefacts show on photos of sheet music; above ~0.85 the
 * file grows fast for no visible gain. */
const DEFAULT_QUALITY = 0.82;

/** Per-image ceiling. A 640px JPEG lands around 40–110KB of base64, so this is
 * a backstop for the pathological case, not a target. */
const DEFAULT_MAX_BYTES = 512 * 1024;

/**
 * Largest file we will even open. Decoding is what costs memory: a 20MB JPEG is
 * already a ~48-megapixel bitmap (~190MB decoded), and anything larger is a
 * video, a RAW file or a mistake. Checked against `file.size` so a 100MB pick
 * is refused without being read.
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Rough character budget a board's images may occupy.
 *
 * The ~5MB localStorage quota is counted in UTF-16 storage by every major
 * browser, so ~5MB of quota is closer to 2.5M characters than 5M. Half of that
 * again leaves the chords, titles and meta room to grow after the images are
 * in. Data URIs are ASCII, so characters are the unit throughout this module.
 */
export const IMAGE_BUDGET_CHARS = 1.5 * 1024 * 1024;

export interface DownscaleOptions {
  /** Longest edge in px. Default 640 — a board card is ~240px wide at 2x export. */
  maxDim?: number;
  /** JPEG/WebP quality 0..1. Default 0.82. */
  quality?: number;
  /** Reject the result if it exceeds this many characters. Default 512 * 1024. */
  maxBytes?: number;
}

/**
 * Thrown when an image will not fit — either the picked file is too big to
 * decode, or the re-encoded result is still over `maxBytes`. `bytes` and
 * `limit` are exposed so the UI can say "2.1MB, limit 0.5MB" without parsing
 * the message.
 */
export class ImageTooLargeError extends Error {
  readonly bytes: number;
  readonly limit: number;
  constructor(message: string, bytes: number, limit: number) {
    super(message);
    this.name = "ImageTooLargeError";
    this.bytes = bytes;
    this.limit = limit;
  }
}

/** A decoded upload, with just enough surface for the size logic to work on.
 * Everything DOM-shaped lives behind this so the rest of the module runs (and
 * is tested) without a canvas. */
export interface DecodedImage {
  width: number;
  height: number;
  /** Draw the decoded pixels at `width` x `height` and return a data URI. */
  encode(width: number, height: number, mimeType: string, quality: number): string;
  /** Drop the object URL and the decoded bitmap. Must be safe to call twice. */
  release(): void;
}

/** Injection seam for the browser-only step. The default reads the file with
 * `Image` + `<canvas>`; tests pass a stub, which is the only way the size,
 * format and budget logic is reachable under jsdom. */
export type ImageDecoder = (file: File) => Promise<DecodedImage>;

/** Sizes for humans: this text goes straight into an alert, so "2.1MB" beats
 * "2202009". Characters are treated as bytes — data URIs are ASCII. */
function formatSize(chars: number): string {
  return chars >= 1024 * 1024
    ? `${(chars / (1024 * 1024)).toFixed(1)}MB`
    : `${Math.max(1, Math.round(chars / 1024))}KB`;
}

/**
 * Alpha is decided by source type, not by inspecting pixels. Re-encoding a
 * transparent PNG as JPEG turns its background black, which is the one failure
 * a user cannot undo, so PNG and WebP sources keep their transparency and stay
 * PNG. The cost is that an opaque screenshot pasted in as a PNG is stored
 * several times larger than it needs to be, and is the likeliest thing to trip
 * `maxBytes` — that is a loud, recoverable error, and we prefer it to a silent
 * black rectangle. (Reading the pixels back to check for real transparency
 * would mean a full `getImageData` pass and would still misjudge images the
 * browser colour-manages.)
 *
 * WebP sources come out as PNG rather than WebP: canvas WebP encoding is not
 * available everywhere, and a silently-ignored mime type yields a PNG anyway.
 */
function outputMimeType(sourceType: string): "image/png" | "image/jpeg" {
  return sourceType === "image/png" || sourceType === "image/webp" ? "image/png" : "image/jpeg";
}

/** Fit inside a `maxDim` box, preserving aspect ratio. Never upscales: blowing
 * a 120px thumbnail up to 640 costs storage and adds no detail. */
function targetSize(width: number, height: number, maxDim: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Default decode/resize step — `Image` and `<canvas>`, neither of which exists
 * under jsdom. Nothing else in this file touches the DOM. */
function decodeInDom(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    // Handlers first: clearing `src` fires another error event otherwise, and
    // the object URL leaks for the life of the document if it is never revoked.
    img.onload = null;
    img.onerror = null;
    img.src = "";
    URL.revokeObjectURL(url);
  };
  return new Promise<DecodedImage>((resolve, reject) => {
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        encode(width, height, mimeType, quality) {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("This browser could not process that image. Please try another one.");
          // A fresh canvas is transparent and JPEG has no alpha, so any
          // untouched pixel would encode as black. White matches the card.
          if (mimeType === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL(mimeType, quality);
        },
        release,
      });
    };
    img.onerror = () => {
      release();
      reject(new Error("That image could not be opened. It may be damaged, or in a format this browser does not support."));
    };
    img.src = url;
  });
}

/**
 * Read a user-selected file, downscale it, and return a data URI safe to store
 * on a board card. Rejects with a clear Error the UI can show verbatim.
 *
 * `decode` exists to be replaced in tests; callers pass two arguments.
 */
export async function fileToCardImage(
  file: File,
  opts: DownscaleOptions = {},
  decode: ImageDecoder = decodeInDom,
): Promise<string> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  if (!file) throw new Error("No file was chosen.");

  const type = typeof file.type === "string" ? file.type.toLowerCase() : "";

  // Type, not extension: a `.jpg` that is really a PDF fails deep inside the
  // decoder with a browser-worded error, if it fails at all.
  if (!type.startsWith("image/")) {
    throw new Error("That file is not an image. Please choose a JPG, PNG or WebP picture.");
  }

  // SVG is a document format that can carry script and external references.
  // It is inert inside an `<img>`, but accepting it means the board stores
  // markup it cannot audit — and canvas cannot rasterise it reliably across
  // browsers anyway, so it would skip the downscale that makes storage safe.
  // Note the asymmetry with io.ts's `parseImage`, which does accept
  // `data:image/svg+xml`: that is the import path, kept permissive so an older
  // export still loads. This is the upload path, where we choose what enters.
  if (type === "image/svg+xml" || type.startsWith("image/svg")) {
    throw new Error("SVG pictures cannot be added to a card. Please choose a JPG, PNG or WebP picture instead.");
  }

  if (file.size === 0) {
    throw new Error("That image file is empty. Please choose another picture.");
  }

  // Before `decode`, deliberately: this is the check that keeps a 100MB pick
  // from being read into memory at all.
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageTooLargeError(
      `That picture is too big to open (${formatSize(file.size)}). Please choose one under ${formatSize(MAX_UPLOAD_BYTES)}.`,
      file.size,
      MAX_UPLOAD_BYTES,
    );
  }

  const decoded = await decode(file);
  let dataUri: string;
  try {
    const size = targetSize(decoded.width, decoded.height, maxDim);
    dataUri = decoded.encode(size.width, size.height, outputMimeType(type), quality);
  } finally {
    // Both paths: an encode that throws still holds a decoded bitmap and an
    // object URL, and a board is edited a card at a time all session.
    decoded.release();
  }

  // A blocked or empty canvas yields `"data:,"`, which would sail through as a
  // card image and render as nothing.
  if (!dataUri.startsWith("data:image/")) {
    throw new Error("That picture could not be prepared for the board. Please try another one.");
  }

  if (dataUri.length > maxBytes) {
    const advice =
      outputMimeType(type) === "image/png"
        ? " Pictures with transparent backgrounds have to stay as PNGs, which are bulkier — saving it as a JPG usually fixes this."
        : "";
    throw new ImageTooLargeError(
      `That picture is still too large after shrinking (${formatSize(dataUri.length)}, limit ${formatSize(maxBytes)}).${advice}`,
      dataUri.length,
      maxBytes,
    );
  }

  return dataUri;
}

/** Total characters currently spent on images across a set of cards. */
export function imageBytesUsed(items: { image?: string }[]): number {
  let total = 0;
  for (const item of items) {
    if (typeof item?.image === "string") total += item.image.length;
  }
  return total;
}
