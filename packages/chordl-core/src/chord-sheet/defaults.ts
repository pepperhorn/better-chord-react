import type { DisplayDefaults } from "../types.js";

/** System-level defaults when nothing is specified. */
export const SYSTEM_DEFAULTS: Required<DisplayDefaults> = {
  display: "keyboard",
  format: "compact",
  theme: "simple",
  highlightColor: "#a0c6e8",
  padding: 1,
  scale: 0.5,
  glyphs: "bravura",
  showNoteNames: false,
  noteNameSize: "base",
  noteNameMode: "pitch-class",
  showFingering: false,
  fingeringSize: "base",
};

/**
 * Shallow-merge display defaults with undefined-stripping.
 * Priority: chord > section > sheet > system.
 */
export function resolveDefaults(
  sheet?: DisplayDefaults,
  section?: DisplayDefaults,
  chord?: Partial<DisplayDefaults>,
): Required<DisplayDefaults> {
  return {
    ...SYSTEM_DEFAULTS,
    ...(sheet ? stripUndefined(sheet) : {}),
    ...(section ? stripUndefined(section) : {}),
    ...(chord ? stripUndefined(chord) : {}),
  } as Required<DisplayDefaults>;
}

/** Remove keys whose value is undefined so they don't overwrite lower layers. */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out as Partial<T>;
}

/**
 * Compute a chord reference ID from its position.
 * Single section → "1","2","3"...  Multiple sections → "A1","A2","B1"...
 */
export function chordRef(
  sectionIndex: number,
  chordIndex: number,
  sectionCount: number,
  sectionId?: string,
): string {
  const num = chordIndex + 1;
  if (sectionCount <= 1) return String(num);
  const letter = sectionId ?? String.fromCharCode(65 + sectionIndex); // A, B, C...
  return `${letter}${num}`;
}
