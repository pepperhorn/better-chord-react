import { parseChordDescription } from "./parser/natural-language";
import { resolveChord } from "./resolver/chord-resolver";
import { resolveScale } from "./resolver/scale-resolver";
import { calculateLayout } from "./resolver/auto-layout";
import { computeKeyboard, computeSvgDimensions } from "./engine/keyboard-layout";
import { mapHighlights, normalizeNote } from "./engine/highlight-mapper";
import { generateMidiFile } from "./audio/midi-export";
import { logChordRequest } from "./logging";
import type { LogConfig, ChordLogEntry } from "./logging";
import type { Format, KeyDescriptor } from "./types";
import {
  WHITE_KEY_RY,
  BLACK_KEY_RY,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
} from "./engine/svg-constants";

// ── Public types ──────────────────────────────────────────────────

export interface ChordRequest {
  input: string;
  format?: "json" | "svg" | "midi";
  logConfig?: LogConfig;
}

export interface ChordResultKeyboard {
  startFrom: string;
  size: number;
  highlightKeys: string[];
}

export interface ChordResultTelemetry {
  parser: "chord" | "progression";
  resolver: {
    root: string;
    type: string;
    pitchClasses: string[];
  };
  durationMs: number;
}

export interface ChordResult {
  success: boolean;
  chordName: string;
  root: string;
  notes: string[];           // MIDI note names: ["C4", "E4", "G4", "B4"]
  inversion?: number;
  keyboard: ChordResultKeyboard;
  telemetry: ChordResultTelemetry;
  svg?: string;
  midi?: Uint8Array;
  errorMessage?: string;
}

// ── SVG builder ───────────────────────────────────────────────────

function buildSvgString(
  keys: KeyDescriptor[],
  fills: string[],
  svgWidth: number,
  svgHeight: number,
): string {
  const whiteRects: string[] = [];
  const blackRects: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const fill = fills[i];
    const ry = k.isBlack ? BLACK_KEY_RY : WHITE_KEY_RY;
    const rect = `<rect x="${k.x}" y="${k.y}" width="${k.width}" height="${k.height}" rx="${ry}" ry="${ry}" fill="${fill}" stroke="${DEFAULT_STROKE}" stroke-width="${DEFAULT_STROKE_WIDTH}"/>`;

    if (k.isBlack) {
      blackRects.push(rect);
    } else {
      whiteRects.push(rect);
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
    ...whiteRects,
    ...blackRects,
    `</svg>`,
  ].join("\n");
}

import { PC_SEMITONES as NOTE_SEMITONES } from "./engine/note-spelling";

// ── Main pipeline ─────────────────────────────────────────────────

export function processChordRequest(request: ChordRequest): ChordResult {
  const start = performance.now();

  // Default error result
  const errorResult = (msg: string): ChordResult => ({
    success: false,
    chordName: "",
    root: "",
    notes: [],
    keyboard: { startFrom: "C", size: 8, highlightKeys: [] },
    telemetry: {
      parser: "chord",
      resolver: { root: "", type: "", pitchClasses: [] },
      durationMs: performance.now() - start,
    },
    errorMessage: msg,
  });

  try {
    const { input, format: outputFormat, logConfig } = request;

    if (!input || !input.trim()) {
      return errorResult("No chord input provided");
    }

    // 1. Parse
    const parsed = parseChordDescription(input);
    const isScale = Boolean(parsed.isScale && parsed.scaleName);

    // 2. Resolve — scales resolve one octave from the root by default
    // ("N octaves" extends, "starting on X" rotates); chords via Tonal.
    let displayName: string;
    let resolvedRoot: string;
    let resolvedType: string;
    let pitchClasses: string[];

    if (isScale) {
      const [scaleRoot, ...scaleTypeParts] = parsed.scaleName!.split(" ");
      const scaleResolved = resolveScale(
        scaleRoot,
        scaleTypeParts.join(" "),
        parsed.scaleDirection,
        parsed.scaleOctaves ?? 1,
        parsed.startingNote,
      );
      displayName = `${parsed.scaleName} scale`;
      resolvedRoot = scaleResolved.root;
      resolvedType = scaleResolved.type;
      pitchClasses = scaleResolved.notes;
    } else {
      if (!parsed.chordName) {
        return errorResult("Could not extract a chord name from the input");
      }
      const resolved = resolveChord(parsed.chordName, parsed.inversion);
      displayName = parsed.chordName;
      resolvedRoot = resolved.root;
      resolvedType = resolved.type;
      pitchClasses = resolved.notes;                        // display names (Bb, Eb, etc.)
    }
    const keyboardPitchClasses = pitchClasses.map(normalizeNote); // sharps for keyboard internals

    // 3. Layout — a scale's starting note is already applied via rotation
    const layoutFormat: Format = parsed.format ?? "compact";
    const layout = calculateLayout(keyboardPitchClasses, {
      padding: parsed.padding,
      startingNote: isScale ? undefined : parsed.startingNote,
      spanFrom: parsed.spanFrom,
      spanTo: parsed.spanTo,
    });

    // 4. Compute keyboard keys
    const keys = computeKeyboard(layout.startFrom, layout.size, layoutFormat);

    // 5. Build octave-qualified highlight keys
    const baseOctave = 4;
    const highlightKeys: string[] = [];
    const midiNoteNames: string[] = [];

    // Max playable hand span: octave + fifth (~19 semitones)
    const MAX_SPAN = 28;

    // Build ascending semitone sequence for the chord notes
    let prevSemitone = -1;
    let currentOctave = baseOctave + layout.chordOctave;

    // Step 1: naive ascending octave assignment
    const assigned: { pc: string; kpc: string; semitone: number; octave: number }[] = [];
    for (let i = 0; i < pitchClasses.length; i++) {
      const pc = pitchClasses[i];
      const kpc = keyboardPitchClasses[i];
      const semitone = NOTE_SEMITONES[pc];
      if (semitone === undefined) continue;

      if (prevSemitone !== -1 && semitone <= prevSemitone) {
        currentOctave++;
      }
      prevSemitone = semitone;
      assigned.push({ pc, kpc, semitone, octave: currentOctave });
    }

    // Step 2: compact — fold notes down if span exceeds playable range.
    // Scales are sequential runs, not stacked voicings — never fold them.
    if (!isScale && assigned.length > 1) {
      const baseSemi = assigned[0].semitone + assigned[0].octave * 12;
      for (let i = 1; i < assigned.length; i++) {
        const noteSemi = assigned[i].semitone + assigned[i].octave * 12;
        if (noteSemi - baseSemi > MAX_SPAN && assigned[i].octave > assigned[0].octave) {
          assigned[i].octave--;
        }
      }
    }

    for (const a of assigned) {
      midiNoteNames.push(`${a.pc}${a.octave}`);
      const relOctave = a.octave - baseOctave;
      highlightKeys.push(`${a.kpc}:${relOctave}`);
    }

    // 6. Map highlight fills
    const fills = mapHighlights(keys, highlightKeys);

    // 7. Build result
    const result: ChordResult = {
      success: true,
      chordName: displayName,
      root: resolvedRoot,
      notes: midiNoteNames,
      inversion: parsed.inversion,
      keyboard: {
        startFrom: layout.startFrom,
        size: layout.size,
        highlightKeys,
      },
      telemetry: {
        parser: "chord",
        resolver: {
          root: resolvedRoot,
          type: resolvedType,
          pitchClasses,
        },
        durationMs: performance.now() - start,
      },
    };

    // 8. SVG output
    if (outputFormat === "svg") {
      const dims = computeSvgDimensions(layout.size, layoutFormat);
      result.svg = buildSvgString(keys, fills, dims.width, dims.height);
    }

    // 9. MIDI output
    if (outputFormat === "midi") {
      result.midi = generateMidiFile({ notes: pitchClasses });
    }

    // 10. Optional logging
    if (logConfig) {
      const logEntry: ChordLogEntry = {
        input,
        pipeline: {
          parser: "chord",
          parsed: {
            chordName: displayName,
            inversion: parsed.inversion,
            allInversions: parsed.allInversions,
            startingNote: parsed.startingNote,
            startingDegree: parsed.startingDegree,
            bassNote: parsed.bassNote,
            bassDegree: parsed.bassDegree,
            spanFrom: parsed.spanFrom,
            spanTo: parsed.spanTo,
            padding: parsed.padding,
            chordOctaveShift: parsed.chordOctaveShift,
            bassOctaveShift: parsed.bassOctaveShift,
            styleHint: parsed.styleHint,
            format: parsed.format,
            showNoteNames: parsed.showNoteNames,
            fingering: parsed.fingering,
            autoFingering: parsed.autoFingering,
          },
          resolver: {
            method: "tonal",
            type: resolvedType,
            root: resolvedRoot,
            pitchClasses,
          },
          voicing: {
            attempted: false,
            found: false,
          },
          layout: {
            startFrom: layout.startFrom,
            size: layout.size,
            chordOctave: layout.chordOctave,
          },
          output: {
            notes: midiNoteNames,
            highlightKeys,
            format: outputFormat,
          },
        },
        success: true,
        durationMs: performance.now() - start,
      };
      logChordRequest(logEntry, logConfig);
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(msg);
  }
}
