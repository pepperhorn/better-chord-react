import type { ChordSheetData } from "../types.js";
import { CHORD_SHEET_SCHEMA_VERSION, validateVersion } from "./schema.js";

const TOKEN_PREFIX = "bcs1.";

export interface CodecOptions {
  /** Skip compression (for environments without CompressionStream). */
  skipCompression?: boolean;
}

/**
 * Encode a ChordSheetData object into a portable string token.
 * Format: bcs1.<base64url(deflate(JSON))>
 */
export async function encodeChordSheet(
  data: ChordSheetData,
  options?: CodecOptions,
): Promise<string> {
  const json = JSON.stringify({ ...data, v: data.v ?? CHORD_SHEET_SCHEMA_VERSION });
  const bytes = new TextEncoder().encode(json);

  if (!options?.skipCompression && typeof CompressionStream !== "undefined") {
    try {
      const compressed = await compress(bytes);
      return TOKEN_PREFIX + base64urlEncode(compressed);
    } catch {
      // Fallback to uncompressed
    }
  }

  return TOKEN_PREFIX + base64urlEncode(bytes);
}

/**
 * Decode a token string back into ChordSheetData.
 */
export async function decodeChordSheet(
  token: string,
  _options?: CodecOptions,
): Promise<ChordSheetData> {
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error(`Invalid token: must start with "${TOKEN_PREFIX}"`);
  }

  const payload = token.slice(TOKEN_PREFIX.length);
  const bytes = base64urlDecode(payload);

  // Try decompressing first, fall back to raw JSON
  let json: string;
  if (typeof DecompressionStream !== "undefined") {
    try {
      const decompressed = await decompress(bytes);
      json = new TextDecoder().decode(decompressed);
    } catch {
      json = new TextDecoder().decode(bytes);
    }
  } else {
    json = new TextDecoder().decode(bytes);
  }

  let data: ChordSheetData;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Invalid token: could not parse payload as JSON");
  }

  validateVersion(data.v);
  return data;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compress(input: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(input as unknown as BufferSource);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return concatBytes(chunks);
}

async function decompress(input: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  // Write and close, but don't await — let errors surface on the readable side
  const writePromise = writer.write(input as unknown as BufferSource).then(() => writer.close()).catch(() => {});
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } catch (e) {
    // Ensure writer is cleaned up
    await writePromise;
    throw e;
  }
  await writePromise;
  return concatBytes(chunks);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
