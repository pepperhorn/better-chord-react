import { parseChordDescription } from "./parser/natural-language";
import { resolveChord } from "./resolver/chord-resolver";
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

// ── Note-to-semitone map ──────────────────────────────────────────

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

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
    if (!parsed.chordName) {
      return errorResult("Could not extract a chord name from the input");
    }

    // 2. Resolve
    const resolved = resolveChord(parsed.chordName, parsed.inversion);
    const pitchClasses = resolved.notes.map(normalizeNote);

    // 3. Layout
    const layoutFormat: Format = parsed.format ?? "compact";
    const layout = calculateLayout(pitchClasses, {
      padding: parsed.padding,
      startingNote: parsed.startingNote,
      spanFrom: parsed.spanFrom,
      spanTo: parsed.spanTo,
    });

    // 4. Compute keyboard keys
    const keys = computeKeyboard(layout.startFrom, layout.size, layoutFormat);

    // 5. Build octave-qualified highlight keys
    const baseOctave = 4;
    const highlightKeys: string[] = [];
    const midiNoteNames: string[] = [];

    // Build ascending semitone sequence for the chord notes
    let prevSemitone = -1;
    let currentOctave = baseOctave + layout.chordOctave;

    for (const pc of pitchClasses) {
      const semitone = NOTE_SEMITONES[pc];
      if (semitone === undefined) continue;

      if (prevSemitone !== -1 && semitone <= prevSemitone) {
        currentOctave++;
      }
      prevSemitone = semitone;

      midiNoteNames.push(`${pc}${currentOctave}`);
      // Highlight key uses relative octave within the keyboard
      const relOctave = currentOctave - baseOctave;
      highlightKeys.push(`${pc}:${relOctave}`);
    }

    // 6. Map highlight fills
    const fills = mapHighlights(keys, highlightKeys);

    // 7. Build result
    const result: ChordResult = {
      success: true,
      chordName: parsed.chordName,
      root: resolved.root,
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
          root: resolved.root,
          type: resolved.type,
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
            chordName: parsed.chordName,
            inversion: parsed.inversion,
            bassDegree: parsed.bassDegree,
            styleHint: parsed.styleHint,
            format: parsed.format,
          },
          resolver: {
            method: "tonal",
            type: resolved.type,
            root: resolved.root,
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
