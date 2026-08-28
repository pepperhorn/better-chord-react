import type { VoicingVariant, VoicingQuality, VoicingEntry, Hand } from "./types.js";
import { VOICING_LIBRARY } from "./library.js";
import { voicingPitchClasses, findVoicing } from "./query.js";
import { normalizeToSharps } from "./spelling.js";

/** Check if the lowest note (first in array) is the root/tonic. */
function isRootPosition(notes: string[], root: string): boolean {
  if (notes.length === 0) return false;
  return normalizeToSharps(notes[0]) === normalizeToSharps(root);
}

/**
 * Generate voicing variants for the A/B/C toggle.
 *
 * Strategy: three tiers of sources, nearest-first. An inversion keeps every
 * note the user's chord already has and only moves the bass, so it is the
 * smallest step away from what they typed; library and algorithmic voicings
 * change which notes sound, so they come after.
 * 1. Inversions (note rotation)
 * 2. Library voicings (grouped by style, one per style)
 * 3. Algorithmic (open voicing, close position)
 *
 * @param root - Root note (e.g. "C", "D#")
 * @param quality - Voicing quality from mapToVoicingQuality (may be undefined for plain triads)
 * @param resolvedNotes - Pitch classes from chord resolver in root position
 * @param count - Number of variants to generate (3, 6, 9...)
 * @param options - Style hint, excluded IDs
 */
export function generateVariants(
  root: string,
  quality: VoicingQuality | undefined,
  resolvedNotes: string[],
  count: number = 3,
  options?: {
    styleHint?: string;
    excludeIds?: string[];
  },
): VoicingVariant[] {
  const excludeIds = new Set(options?.excludeIds ?? []);
  const candidates: VoicingVariant[] = [];
  const seenHashes = new Set<string>();

  // Helper: hash a variant by note order to deduplicate.
  // Preserves order so inversions (same notes, different bottom note) are distinct.
  const hash = (notes: string[]): string => notes.join(",");

  const addCandidate = (v: VoicingVariant): boolean => {
    const h = hash(v.notes);
    if (seenHashes.has(h) || excludeIds.has(v.id)) return false;
    seenHashes.add(h);
    candidates.push(v);
    return true;
  };

  // ── Slot A: Default voicing ──────────────────────────────────────
  // If style hint matches a library entry, use that. Otherwise root position.
  let slotAEntry: VoicingEntry | undefined;
  if (options?.styleHint && quality) {
    slotAEntry = findVoicing(quality, options.styleHint);
  }

  if (slotAEntry) {
    const notes = voicingPitchClasses(root, slotAEntry);
    addCandidate({
      id: slotAEntry.id,
      label: slotAEntry.tags.style,
      notes,
      handHints: slotAEntry.hands,
      source: "library",
    });
  } else {
    const defaultNotes = [...resolvedNotes];
    const isRoot = isRootPosition(defaultNotes, root);
    const label = isRoot
      ? "Root position"
      : `From ${defaultNotes[0]}`;
    addCandidate({
      id: isRoot ? "root-position" : "default",
      label,
      notes: defaultNotes,
      source: "inversion",
    });
  }

  // ── Inversions ───────────────────────────────────────────────────
  // Ahead of the library on purpose: the first alternatives a learner is
  // offered should be the chord they typed with a different note in the bass,
  // not a different set of notes.
  const INVERSION_LABELS = ["1st inv", "2nd inv", "3rd inv", "4th inv", "5th inv"];
  for (let inv = 1; inv < resolvedNotes.length && inv <= 5; inv++) {
    const rotated = [...resolvedNotes.slice(inv), ...resolvedNotes.slice(0, inv)];
    addCandidate({
      id: `inv-${inv}`,
      label: INVERSION_LABELS[inv - 1] ?? `${inv}th inv`,
      notes: rotated,
      source: "inversion",
    });
  }

  // ── Library voicings (one per style) ─────────────────────────────
  if (quality) {
    const byStyle = new Map<string, VoicingEntry>();
    for (const entry of VOICING_LIBRARY) {
      if (entry.quality !== quality) continue;
      if (excludeIds.has(entry.id)) continue;
      if (slotAEntry && entry.id === slotAEntry.id) continue;
      // Keep first entry per style (library is ordered by preference)
      if (!byStyle.has(entry.tags.style)) {
        byStyle.set(entry.tags.style, entry);
      }
    }

    for (const [style, entry] of byStyle) {
      const notes = voicingPitchClasses(root, entry);
      addCandidate({
        id: entry.id,
        label: style,
        notes,
        handHints: entry.hands,
        source: "library",
      });
    }
  }

  // ── Algorithmic variants ─────────────────────────────────────────
  if (resolvedNotes.length >= 3) {
    // Open voicing: move 2nd note up an octave (widen the voicing)
    // This changes the note order, giving a different sound
    const open = [resolvedNotes[0], ...resolvedNotes.slice(2), resolvedNotes[1]];
    addCandidate({
      id: "algo-open",
      label: "Open voicing",
      notes: open,
      source: "algorithmic",
    });

    // Drop 2 style: move 2nd-from-top note to the bottom
    const drop2 = [...resolvedNotes];
    const secondFromTop = drop2.splice(-2, 1)[0];
    drop2.unshift(secondFromTop);
    addCandidate({
      id: "algo-drop2",
      label: "Drop 2",
      notes: drop2,
      source: "algorithmic",
    });
  }

  if (resolvedNotes.length >= 4) {
    // Simplified: root + 3rd + 7th only (guide tones)
    // Take 1st, 2nd, and last notes as an approximation
    const simplified = [resolvedNotes[0], resolvedNotes[1], resolvedNotes[resolvedNotes.length - 1]];
    addCandidate({
      id: "algo-simplified",
      label: "Simplified",
      notes: simplified,
      source: "algorithmic",
    });
  }

  // Return up to `count` variants
  return candidates.slice(0, count);
}
