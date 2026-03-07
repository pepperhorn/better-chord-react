import { MAX_EXAMPLES, resolveChord } from "@better-chord/core";
import { resolveProgression, tokenizeProgression } from "./roman-numeral";
import { findTemplate, FORM_TEMPLATES } from "./form-templates";
import {
  findVoicing,
  voicingPitchClasses,
  mapToVoicingQuality,
  queryVoicings,
  inferStyle,
} from "@better-chord/voicings";
import type { VoicingStyle, VoicingQuality } from "@better-chord/voicings";

export interface ProgressionChord {
  symbol: string;
  root: string;
  notes: string[];
  voicingStyle?: string;
}

export interface ProgressionExample {
  label: string;
  chords: ProgressionChord[];
}

export interface ProgressionResult {
  progressionName: string;
  key: string;
  examples: ProgressionExample[];
}

/**
 * A set of contrasting styles to auto-cycle through when no style hint is given.
 * Ordered by musical diversity.
 */
const CONTRASTING_STYLES: VoicingStyle[] = [
  "Rootless Type A",
  "Drop 2",
  "Shell",
  "Quartal",
  "Spread",
  "4-Note Closed",
  "Rootless Type B",
  "Upper Structure",
  "Drop 2+4",
];

/**
 * Given a style hint, return variations within that family.
 * e.g. "Bill Evans" → [Rootless Type A, Rootless Type B, Shell]
 */
function getStyleVariations(styleHint: string): VoicingStyle[] {
  const primary = inferStyle(styleHint);
  if (!primary) return CONTRASTING_STYLES.slice(0, MAX_EXAMPLES);

  const variations: VoicingStyle[] = [primary];

  // Add related styles
  if (primary === "Rootless Type A") {
    variations.push("Rootless Type B", "Shell");
  } else if (primary === "Rootless Type B") {
    variations.push("Rootless Type A", "Shell");
  } else if (primary === "Shell") {
    variations.push("Rootless Type A", "Drop 2");
  } else if (primary === "Drop 2") {
    variations.push("Drop 2+4", "Shell");
  } else if (primary === "Drop 2+4") {
    variations.push("Drop 2", "Spread");
  } else if (primary === "Quartal") {
    variations.push("Upper Structure", "Rootless Type A");
  } else if (primary === "Upper Structure") {
    variations.push("Quartal", "Spread");
  } else if (primary === "Spread") {
    variations.push("Drop 2", "4-Note Closed");
  } else if (primary === "4-Note Closed") {
    variations.push("Spread", "Drop 2");
  }

  return variations.slice(0, MAX_EXAMPLES);
}

/**
 * Voice a single chord symbol using a specific voicing style.
 * Falls back to plain resolution if no voicing matches.
 */
function voiceChord(symbol: string, style?: VoicingStyle): ProgressionChord {
  const resolved = resolveChord(symbol);
  const quality = mapToVoicingQuality(resolved.type, resolved.notes);

  let notes = resolved.notes;
  let voicingStyle: string | undefined;

  if (quality && style) {
    const matches = queryVoicings({ quality, style });
    if (matches.length > 0) {
      const pcs = voicingPitchClasses(resolved.root, matches[0]);
      if (pcs.length > 0) {
        notes = pcs;
        voicingStyle = style;
      }
    }
  }

  // Fallback: try any voicing for this quality
  if (!voicingStyle && quality) {
    const voicing = findVoicing(quality);
    if (voicing) {
      const pcs = voicingPitchClasses(resolved.root, voicing);
      if (pcs.length > 0) {
        notes = pcs;
        voicingStyle = voicing.tags.style;
      }
    }
  }

  return {
    symbol,
    root: resolved.root,
    notes,
    voicingStyle,
  };
}

export interface ProgressionRequest {
  /** Roman numeral tokens or a form template name */
  progression: string;
  /** Musical key, e.g. "G", "Db" */
  key: string;
  /** Number of examples to generate */
  numExamples?: number;
  /** Style hint: artist name or voicing style keyword */
  styleHint?: string;
}

/**
 * Resolve a progression request into multiple voicing examples.
 */
export function resolveProgressionRequest(req: ProgressionRequest): ProgressionResult {
  const numExamples = Math.min(req.numExamples ?? MAX_EXAMPLES, MAX_EXAMPLES);

  // Try form template first
  const template = findTemplate(req.progression);
  let numerals: string[];
  let progressionName: string;

  if (template) {
    numerals = template.numerals;
    progressionName = template.name;
  } else {
    numerals = tokenizeProgression(req.progression);
    progressionName = numerals.join("-");
  }

  // Resolve roman numerals to chord symbols in the key
  const chords = resolveProgression(numerals, req.key);

  // Determine voicing styles for each example
  const styles = req.styleHint
    ? getStyleVariations(req.styleHint)
    : CONTRASTING_STYLES.slice(0, numExamples);

  const examples: ProgressionExample[] = [];

  for (let i = 0; i < numExamples; i++) {
    const style = styles[i % styles.length];
    const voicedChords = chords.map((c) => voiceChord(c.symbol, style));

    examples.push({
      label: `Example ${i + 1} — ${style}`,
      chords: voicedChords,
    });
  }

  return {
    progressionName,
    key: req.key,
    examples,
  };
}
