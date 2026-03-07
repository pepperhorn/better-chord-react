# Core Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all non-React logic from `@better-chord/react` into `@better-chord/core`, add a programmatic pipeline entry point, and add opt-in chord logging with full pipeline telemetry.

**Architecture:** New `packages/core` package contains parser, resolver, engine, themes, midi-export, progression logic, and types. `packages/chord-react` becomes a thin React wrapper importing from `@better-chord/core`. A new `pipeline.ts` provides the unified programmatic entry point. A new `logging.ts` sends fire-and-forget telemetry to a configurable endpoint.

**Tech Stack:** TypeScript, Vite (build), Vitest (test), npm workspaces, tonal

---

### Task 1: Scaffold the core package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts` (empty placeholder)

**Step 1: Create package.json**

```json
{
  "name": "@better-chord/core",
  "version": "0.1.0",
  "description": "Pure TypeScript chord parsing, resolving, layout, and export engine",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@better-chord/voicings": "*",
    "tonal": "^6.3.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 3: Create empty index.ts**

```ts
// @better-chord/core — pure TypeScript chord engine
```

**Step 4: Install dependencies**

Run: `cd /home/urmom/better-chord-core-extract && npm install`
Expected: resolves workspace dependencies

**Step 5: Verify it builds**

Run: `cd /home/urmom/better-chord-core-extract && npm run build -w @better-chord/core`
Expected: compiles with no errors

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat: scaffold @better-chord/core package"
```

---

### Task 2: Move types to core

**Files:**
- Create: `packages/core/src/types.ts`
- Modify: `packages/chord-react/src/types.ts` (remove moved types, re-export from core)

**Step 1: Create core types.ts**

Move these types from `packages/chord-react/src/types.ts` to `packages/core/src/types.ts`:
- `Format`
- `TextSize`
- `WhiteNote`
- `NoteName`
- `ColorTheme`
- `ParsedChordRequest`
- `KeyDescriptor`
- `HandBracket`

Do NOT move: `KeyboardProps`, `ChordProps`, `PianoChordProps` (React-specific).

**Step 2: Update core index.ts to export types**

```ts
export type {
  Format, TextSize, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket,
} from "./types";
```

**Step 3: Update chord-react types.ts**

Remove moved types. Import them from `@better-chord/core` and re-export. Keep `KeyboardProps`, `ChordProps`, `PianoChordProps` which depend on `ColorTheme`, `Format`, etc. — import those from core.

```ts
import type { CSSProperties } from "react";
import type { UIThemeMode } from "./config";
export type {
  Format, TextSize, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket,
} from "@better-chord/core";
import type { Format, ColorTheme, TextSize, WhiteNote, NoteName } from "@better-chord/core";

// React-specific types stay here
export interface KeyboardProps { /* unchanged, uses imported types */ }
export interface ChordProps { /* unchanged */ }
export type PianoChordProps = ChordProps | KeyboardProps;
```

**Step 4: Add core as dependency of chord-react**

In `packages/chord-react/package.json`, add:
```json
"@better-chord/core": "*"
```

**Step 5: Run npm install, then build all**

Run: `cd /home/urmom/better-chord-core-extract && npm install && npm run build`
Expected: all packages compile

**Step 6: Run tests**

Run: `cd /home/urmom/better-chord-core-extract && npm run test:run`
Expected: all existing tests pass

**Step 7: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts packages/chord-react/src/types.ts packages/chord-react/package.json package-lock.json
git commit -m "refactor: move shared types to @better-chord/core"
```

---

### Task 3: Move engine modules to core

**Files:**
- Move: `packages/chord-react/src/engine/svg-constants.ts` -> `packages/core/src/engine/svg-constants.ts`
- Move: `packages/chord-react/src/engine/keyboard-layout.ts` -> `packages/core/src/engine/keyboard-layout.ts`
- Move: `packages/chord-react/src/engine/highlight-mapper.ts` -> `packages/core/src/engine/highlight-mapper.ts`
- Move: `packages/chord-react/src/engine/auto-fingering.ts` -> `packages/core/src/engine/auto-fingering.ts`
- Update: `packages/core/src/index.ts`
- Update: imports in `packages/chord-react/src/components/*.tsx`

**Step 1: Copy engine files to core**

Copy all four files. Update their imports to use `../types` (which now lives in core).

**Step 2: Update core index.ts**

Add exports:
```ts
export { computeKeyboard, computeSvgDimensions } from "./engine/keyboard-layout";
export { mapHighlights, normalizeNote } from "./engine/highlight-mapper";
export { autoFingering } from "./engine/auto-fingering";
export {
  WHITE_KEY_WIDTH, WHITE_KEY_WIDTH_EXACT, WHITE_KEY_HEIGHT_COMPACT, WHITE_KEY_HEIGHT_EXACT,
  BLACK_KEY_WIDTH, BLACK_KEY_WIDTH_EXACT, BLACK_KEY_HEIGHT_COMPACT, BLACK_KEY_HEIGHT_EXACT,
  BLACK_KEY_OFFSETS, BLACK_KEY_OFFSETS_EXACT,
  WHITE_NOTES_WITH_SHARPS, WHITE_NOTE_ORDER, FLAT_TO_SHARP,
  DEFAULT_WHITE_FILL, DEFAULT_BLACK_FILL,
} from "./engine/svg-constants";
```

**Step 3: Delete engine files from chord-react**

Remove `packages/chord-react/src/engine/` directory entirely.

**Step 4: Update chord-react component imports**

All components that imported from `../engine/*` now import from `@better-chord/core`:

- `PianoKeyboard.tsx`: `import { computeKeyboard, computeSvgDimensions, mapHighlights, normalizeNote, ... } from "@better-chord/core"`
- `PianoChord.tsx`: `import { normalizeNote, FLAT_TO_SHARP, WHITE_NOTE_ORDER, autoFingering, computeKeyboard } from "@better-chord/core"`
- `ChordGroup.tsx`: `import { normalizeNote, WHITE_NOTE_ORDER, calculateLayout } from "@better-chord/core"`
- `PlaybackControls.tsx`: no engine imports (only audio + ui-theme)

**Step 5: Build and test**

Run: `cd /home/urmom/better-chord-core-extract && npm run build && npm run test:run`
Expected: all pass

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move engine modules to @better-chord/core"
```

---

### Task 4: Move parser and resolver to core

**Files:**
- Move: `packages/chord-react/src/parser/natural-language.ts` -> `packages/core/src/parser/natural-language.ts`
- Move: `packages/chord-react/src/parser/progression-parser.ts` -> `packages/core/src/parser/progression-parser.ts`
- Move: `packages/chord-react/src/resolver/chord-resolver.ts` -> `packages/core/src/resolver/chord-resolver.ts`
- Move: `packages/chord-react/src/resolver/auto-layout.ts` -> `packages/core/src/resolver/auto-layout.ts`
- Create: `packages/core/src/config.ts` (with `MAX_EXAMPLES`)
- Update: `packages/core/src/index.ts`
- Update: `packages/chord-react/src/components/PianoChord.tsx` imports
- Update: `packages/chord-react/src/index.ts` to re-export from core

**Step 1: Create core config.ts**

```ts
export const MAX_EXAMPLES = 3;

// --- Chord Logging ---
// Opt-in telemetry for shared learning.
// When enabled, chord requests and their results are sent to a write-only
// public ledger. No personal data is collected — just chord inputs, outputs,
// and an anonymized session hash derived server-side from the request IP.
//
// By pointing to the shared public ledger, we can all learn from the results
// and keep improving the voicing logic together.
//
// To use the shared ledger, uncomment CHORD_LOG_ENDPOINT below.
// To self-host, point it at your own compatible endpoint.

export const ENABLE_CHORD_LOGGING = false;
// export const CHORD_LOG_ENDPOINT = "https://ledger.betterchord.com/api/chord-log";
```

**Step 2: Copy parser and resolver files to core**

Update internal imports:
- `natural-language.ts`: imports from `../types` (now in core) — no change needed
- `progression-parser.ts`: imports `Format` from `../types`, `MAX_EXAMPLES` from `../config` — both now in core
- `chord-resolver.ts`: imports `FLAT_TO_SHARP` from `../engine/svg-constants` — now in core
- `auto-layout.ts`: imports `WhiteNote` from `../types`, constants from `../engine/svg-constants` — both in core

**Step 3: Update core index.ts**

Add exports for parser, resolver, config:
```ts
export { parseChordDescription } from "./parser/natural-language";
export { isProgressionRequest, parseProgressionRequest } from "./parser/progression-parser";
export type { ParsedProgressionRequest } from "./parser/progression-parser";
export { resolveChord } from "./resolver/chord-resolver";
export { calculateLayout } from "./resolver/auto-layout";
export type { LayoutOptions, LayoutResult } from "./resolver/auto-layout";
export { MAX_EXAMPLES, ENABLE_CHORD_LOGGING } from "./config";
```

**Step 4: Delete parser and resolver from chord-react**

Remove `packages/chord-react/src/parser/` and `packages/chord-react/src/resolver/` directories.

**Step 5: Update chord-react component imports**

- `PianoChord.tsx`: `import { parseChordDescription, resolveChord, calculateLayout } from "@better-chord/core"`
- Update `packages/chord-react/src/config.ts`: remove `MAX_EXAMPLES` (now in core), keep UI theme tokens
- Update `packages/chord-react/src/index.ts`: re-export parser/resolver from core instead of local paths

**Step 6: Build and test**

Run: `cd /home/urmom/better-chord-core-extract && npm run build && npm run test:run`
Expected: all pass

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move parser and resolver to @better-chord/core"
```

---

### Task 5: Move progression and themes to core

**Files:**
- Move: `packages/chord-react/src/progression/` -> `packages/core/src/progression/`
- Move: `packages/chord-react/src/themes/` -> `packages/core/src/themes/`
- Update: `packages/core/src/index.ts`
- Update: chord-react imports

**Step 1: Copy progression directory to core**

Files: `index.ts`, `roman-numeral.ts`, `form-templates.ts`, `progression-resolver.ts`

Update imports:
- `progression-resolver.ts`: `MAX_EXAMPLES` from `../config` (now in core), `resolveChord` from `../resolver/chord-resolver` (now in core) — paths stay the same since both are in core

**Step 2: Copy themes directory to core**

Files: `index.ts`, `simple.ts`, `boomwhacker.ts`, `crf.ts`

Update imports:
- `index.ts` and individual themes import `ColorTheme` from `../types` — same relative path in core

**Step 3: Update core index.ts**

Add progression and theme exports:
```ts
export { resolveProgression, tokenizeProgression } from "./progression/roman-numeral";
export { FORM_TEMPLATES, findTemplate } from "./progression/form-templates";
export type { FormTemplate } from "./progression/form-templates";
export { resolveProgressionRequest } from "./progression/progression-resolver";
export type { ProgressionRequest, ProgressionResult, ProgressionExample, ProgressionChord } from "./progression/progression-resolver";
export { getTheme, resolveTheme } from "./themes";
```

**Step 4: Delete progression and themes from chord-react**

Remove `packages/chord-react/src/progression/` and `packages/chord-react/src/themes/`.

**Step 5: Update chord-react imports**

- `PianoChord.tsx`: `import type { ProgressionChord } from "@better-chord/core"`
- `PianoKeyboard.tsx`: `import { resolveTheme } from "@better-chord/core"`
- `ChordGroup.tsx`: `import type { ProgressionChord } from "@better-chord/core"`
- `ProgressionView.tsx`: `import type { ProgressionResult } from "@better-chord/core"`
- `packages/chord-react/src/index.ts`: re-export progression and themes from core

**Step 6: Build and test**

Run: `cd /home/urmom/better-chord-core-extract && npm run build && npm run test:run`
Expected: all pass

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move progression resolver and themes to @better-chord/core"
```

---

### Task 6: Move MIDI export to core

**Files:**
- Move: `packages/chord-react/src/audio/midi-export.ts` -> `packages/core/src/audio/midi-export.ts`
- Update: `packages/core/src/index.ts`
- Update: `packages/chord-react/src/components/PlaybackControls.tsx`
- Keep in chord-react: `audio/playback.ts` (uses `smplr`, browser-only), `audio/svg-export.ts` (uses DOM)

**Step 1: Copy midi-export.ts to core**

Only dependency is `tonal` (already a core dependency). No changes needed to imports.

**Step 2: Update core index.ts**

```ts
export { generateMidiFile, downloadMidi } from "./audio/midi-export";
```

Note: `downloadMidi` uses `Blob` and `document.createElement` — it's browser-dependent. We should split: keep `generateMidiFile` in core (pure byte generation), move `downloadMidi` wrapper to chord-react or mark it as browser-only.

Actually, check the implementation. If `downloadMidi` just wraps `generateMidiFile` with a download trigger, export both from core but document that `downloadMidi` requires a browser environment. The commercial API will only use `generateMidiFile`.

**Step 3: Delete midi-export.ts from chord-react audio/**

Keep `playback.ts` and `svg-export.ts` in chord-react.

**Step 4: Update PlaybackControls.tsx**

```ts
import { downloadMidi } from "@better-chord/core";
```

**Step 5: Update chord-react index.ts**

Re-export `generateMidiFile`, `downloadMidi` from core.

**Step 6: Build and test**

Run: `cd /home/urmom/better-chord-core-extract && npm run build && npm run test:run`
Expected: all pass

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move MIDI export to @better-chord/core"
```

---

### Task 7: Move tests that belong to core

**Files:**
- Move: `packages/chord-react/test/auto-layout.test.ts` -> `packages/core/test/auto-layout.test.ts`
- Move: `packages/chord-react/test/chord-resolver.test.ts` -> `packages/core/test/chord-resolver.test.ts`
- Move: `packages/chord-react/test/natural-language.test.ts` -> `packages/core/test/natural-language.test.ts`
- Move: `packages/chord-react/test/progression.test.ts` -> `packages/core/test/progression.test.ts`
- Move: `packages/chord-react/test/progression-stress.test.ts` -> `packages/core/test/progression-stress.test.ts`
- Keep in chord-react: `PianoKeyboard.test.tsx`, `playback-controls.test.ts` (React component tests)

**Step 1: Copy test files to core**

Update imports in each test to use `@better-chord/core` or relative paths into `../src/`.

**Step 2: Create vitest config for core if needed**

Check if a `vitest.config.ts` is needed or if the root-level config suffices. Voicings package runs tests without one (uses `vitest` script in package.json which auto-discovers).

**Step 3: Delete moved tests from chord-react**

**Step 4: Run all tests**

Run: `cd /home/urmom/better-chord-core-extract && npm run test:run`
Expected: all tests pass across all three packages

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move parser, resolver, and progression tests to @better-chord/core"
```

---

### Task 8: Add logging types and module

**Files:**
- Create: `packages/core/src/logging.ts`
- Modify: `packages/core/src/config.ts` (already has logging config from Task 4)
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/logging.test.ts`

**Step 1: Write the failing test**

```ts
// packages/core/test/logging.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logChordRequest, type ChordLogEntry } from "../src/logging";

describe("logChordRequest", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when logging is disabled", () => {
    logChordRequest(makeEntry(), { enabled: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when no endpoint is configured", () => {
    logChordRequest(makeEntry(), { enabled: true, endpoint: undefined });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends POST to configured endpoint when enabled", () => {
    logChordRequest(makeEntry(), {
      enabled: true,
      endpoint: "https://example.com/log",
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://example.com/log");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.logSchema).toBe("1.0.0");
    expect(body.input).toBe("Cmaj7");
  });

  it("never throws even if fetch fails", () => {
    fetchSpy.mockRejectedValue(new Error("network down"));
    expect(() => {
      logChordRequest(makeEntry(), {
        enabled: true,
        endpoint: "https://example.com/log",
      });
    }).not.toThrow();
  });

  it("includes version info", () => {
    logChordRequest(makeEntry(), {
      enabled: true,
      endpoint: "https://example.com/log",
      versions: { core: "1.0.0", voicings: "1.1.0" },
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.versions.core).toBe("1.0.0");
    expect(body.versions.voicings).toBe("1.1.0");
  });
});

function makeEntry(): ChordLogEntry {
  return {
    input: "Cmaj7",
    pipeline: {
      parser: "chord",
      parsed: { chordName: "Cmaj7", inversion: undefined, bassDegree: undefined, styleHint: undefined, format: "compact" },
      resolver: { method: "tonal", type: "maj7", root: "C", pitchClasses: ["C", "E", "G", "B"] },
      voicing: { attempted: false, style: undefined, quality: "maj7", found: false },
      layout: { startFrom: "B", size: 6, chordOctave: 0 },
      output: { notes: ["C4", "E4", "G4", "B4"], highlightKeys: ["C", "E", "G", "B"], format: "svg" },
    },
    success: true,
    durationMs: 5,
  };
}
```

**Step 2: Run test to verify it fails**

Run: `cd /home/urmom/better-chord-core-extract && npm run test:run -w @better-chord/core -- logging`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
// packages/core/src/logging.ts

export const LOG_SCHEMA_VERSION = "1.0.0";

export interface ChordLogEntry {
  input: string;
  pipeline: {
    parser: "chord" | "progression";
    parsed: {
      chordName: string;
      inversion?: number;
      bassDegree?: number;
      styleHint?: string;
      format?: string;
    };
    resolver: {
      method: "tonal" | "special-builder" | "fallback";
      type: string;
      root: string;
      pitchClasses: string[];
    };
    voicing: {
      attempted: boolean;
      style?: string;
      quality?: string;
      found: boolean;
    };
    layout: {
      startFrom: string;
      size: number;
      chordOctave: number;
    };
    output: {
      notes: string[];       // MIDI note names: ["C4", "E4", "G4", "B4"]
      lhNotes?: string[];
      rhNotes?: string[];
      highlightKeys: string[];
      format?: string;
    };
  };
  success: boolean;
  errorMessage?: string;
  durationMs: number;
}

export interface LogConfig {
  enabled: boolean;
  endpoint?: string;
  versions?: {
    core?: string;
    voicings?: string;
    react?: string;
  };
}

export function logChordRequest(entry: ChordLogEntry, config: LogConfig): void {
  if (!config.enabled || !config.endpoint) return;

  const payload = {
    logSchema: LOG_SCHEMA_VERSION,
    ...entry,
    versions: config.versions ?? {},
    timestamp: new Date().toISOString(),
  };

  try {
    fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // silently swallow — logging must never affect functionality
    });
  } catch {
    // silently swallow
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/urmom/better-chord-core-extract && npm run test:run -w @better-chord/core -- logging`
Expected: PASS

**Step 5: Update core index.ts**

```ts
export { logChordRequest, LOG_SCHEMA_VERSION } from "./logging";
export type { ChordLogEntry, LogConfig } from "./logging";
export { ENABLE_CHORD_LOGGING } from "./config";
```

**Step 6: Commit**

```bash
git add packages/core/src/logging.ts packages/core/test/logging.test.ts packages/core/src/index.ts
git commit -m "feat: add opt-in chord logging with full pipeline telemetry"
```

---

### Task 9: Add pipeline entry point

**Files:**
- Create: `packages/core/src/pipeline.ts`
- Create: `packages/core/test/pipeline.test.ts`
- Modify: `packages/core/src/index.ts`

**Step 1: Write the failing test**

```ts
// packages/core/test/pipeline.test.ts
import { describe, it, expect } from "vitest";
import { processChordRequest } from "../src/pipeline";

describe("processChordRequest", () => {
  it("resolves a simple chord to structured result", () => {
    const result = processChordRequest({ input: "Cmaj7" });
    expect(result.chordName).toBe("Cmaj7");
    expect(result.root).toBe("C");
    expect(result.notes.length).toBeGreaterThan(0);
    // Notes should be MIDI format: C4, E4, etc.
    expect(result.notes[0]).toMatch(/^[A-G]#?\d$/);
    expect(result.keyboard.startFrom).toBeDefined();
    expect(result.keyboard.size).toBeGreaterThan(0);
    expect(result.keyboard.highlightKeys.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it("returns MIDI note names with octaves", () => {
    const result = processChordRequest({ input: "C" });
    // C major triad: C, E, G — as MIDI notes like C4, E4, G4
    expect(result.notes).toEqual(expect.arrayContaining([
      expect.stringMatching(/^C\d$/),
      expect.stringMatching(/^E\d$/),
      expect.stringMatching(/^G\d$/),
    ]));
  });

  it("handles inversions", () => {
    const result = processChordRequest({ input: "C in 2nd inversion" });
    expect(result.chordName).toBe("C");
    expect(result.inversion).toBe(2);
    // First note should be G (2nd inversion of C major)
    expect(result.notes[0]).toMatch(/^G\d$/);
  });

  it("generates SVG string when format is svg", () => {
    const result = processChordRequest({ input: "Cmaj7", format: "svg" });
    expect(result.svg).toBeDefined();
    expect(result.svg).toContain("<svg");
  });

  it("generates MIDI bytes when format is midi", () => {
    const result = processChordRequest({ input: "Cmaj7", format: "midi" });
    expect(result.midi).toBeInstanceOf(Uint8Array);
    // MIDI files start with "MThd"
    expect(result.midi![0]).toBe(0x4d); // M
    expect(result.midi![1]).toBe(0x54); // T
  });

  it("returns structured JSON by default", () => {
    const result = processChordRequest({ input: "Cmaj7" });
    expect(result.svg).toBeUndefined();
    expect(result.midi).toBeUndefined();
  });

  it("captures errors gracefully", () => {
    const result = processChordRequest({ input: "not a chord at all zzz" });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it("includes pipeline telemetry", () => {
    const result = processChordRequest({ input: "Cmaj7" });
    expect(result.telemetry).toBeDefined();
    expect(result.telemetry.parser).toBe("chord");
    expect(result.telemetry.resolver.method).toBeDefined();
    expect(result.telemetry.durationMs).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/urmom/better-chord-core-extract && npm run test:run -w @better-chord/core -- pipeline`
Expected: FAIL

**Step 3: Write the implementation**

```ts
// packages/core/src/pipeline.ts
import { parseChordDescription } from "./parser/natural-language";
import { resolveChord } from "./resolver/chord-resolver";
import { calculateLayout } from "./resolver/auto-layout";
import { computeKeyboard } from "./engine/keyboard-layout";
import { mapHighlights, normalizeNote } from "./engine/highlight-mapper";
import { generateMidiFile } from "./audio/midi-export";
import { FLAT_TO_SHARP, WHITE_NOTE_ORDER } from "./engine/svg-constants";
import { findVoicing, voicingPitchClasses, mapToVoicingQuality } from "@better-chord/voicings";
import { logChordRequest, type LogConfig } from "./logging";
import type { WhiteNote } from "./types";

export interface ChordRequest {
  input: string;
  format?: "svg" | "midi" | "json";
  logConfig?: LogConfig;
}

export interface ChordResult {
  chordName: string;
  root: string;
  notes: string[];         // MIDI note names: ["G3", "B4", "C5", "E5"]
  lhNotes?: string[];
  rhNotes?: string[];
  inversion?: number;
  voicingStyle?: string;
  keyboard: {
    startFrom: string;
    size: number;
    highlightKeys: string[];
  };
  svg?: string;
  midi?: Uint8Array;
  success: boolean;
  errorMessage?: string;
  telemetry: {
    parser: "chord" | "progression";
    parsed: Record<string, unknown>;
    resolver: {
      method: string;
      type: string;
      root: string;
      pitchClasses: string[];
    };
    voicing: {
      attempted: boolean;
      style?: string;
      quality?: string;
      found: boolean;
    };
    layout: {
      startFrom: string;
      size: number;
      chordOctave: number;
    };
    durationMs: number;
  };
}

export function processChordRequest(req: ChordRequest): ChordResult {
  const start = performance.now();

  try {
    const parsed = parseChordDescription(req.input);
    const resolved = resolveChord(parsed.chordName, parsed.inversion);

    let { notes } = resolved;

    // Apply voicing if style hint present
    let voicingAttempted = false;
    let voicingFound = false;
    let voicingQuality: string | undefined;

    if (parsed.styleHint) {
      const quality = mapToVoicingQuality(resolved.type, resolved.notes);
      voicingQuality = quality ?? undefined;
      if (quality) {
        voicingAttempted = true;
        const voicing = findVoicing(quality, parsed.styleHint);
        if (voicing) {
          voicingFound = true;
          const pitchClasses = voicingPitchClasses(resolved.root, voicing);
          if (pitchClasses.length > 0) notes = pitchClasses;
        }
      }
    }

    // Apply starting note rotation
    if (parsed.startingNote) {
      const norm = FLAT_TO_SHARP[parsed.startingNote] ?? parsed.startingNote;
      const idx = notes.indexOf(norm);
      if (idx > 0) notes = [...notes.slice(idx), ...notes.slice(0, idx)];
    }

    // Calculate layout
    const layout = calculateLayout(notes, {
      padding: parsed.padding ?? 1,
      startingNote: parsed.startingNote,
      spanFrom: parsed.spanFrom,
      spanTo: parsed.spanTo,
    });

    // Build octave-qualified highlights
    let highlightKeys: string[] = notes;
    if (layout.chordOctave > 0) {
      let octave = layout.chordOctave;
      const firstNorm = normalizeNote(notes[0]);
      const firstWhiteIdx = WHITE_NOTE_ORDER.indexOf(firstNorm.replace("#", "") as WhiteNote);
      let prevWhiteIdx = firstWhiteIdx;
      highlightKeys = notes.map((n, i) => {
        const norm = normalizeNote(n);
        const whiteKey = norm.replace("#", "") as WhiteNote;
        const whiteIdx = WHITE_NOTE_ORDER.indexOf(whiteKey);
        if (i > 0 && whiteIdx <= prevWhiteIdx) octave++;
        prevWhiteIdx = whiteIdx;
        return `${norm}:${octave}`;
      });
    }

    // Compute MIDI note names from keyboard
    const keys = computeKeyboard(layout.startFrom as WhiteNote, layout.size, parsed.format ?? "compact");
    const midiNotes: string[] = [];
    const baseOctave = 4; // default octave

    for (const hl of highlightKeys) {
      const colonIdx = hl.indexOf(":");
      const noteName = colonIdx >= 0 ? hl.slice(0, colonIdx) : normalizeNote(hl);
      const relOctave = colonIdx >= 0 ? parseInt(hl.slice(colonIdx + 1), 10) : 0;
      midiNotes.push(`${noteName}${baseOctave + relOctave}`);
    }

    const durationMs = Math.round(performance.now() - start);

    const result: ChordResult = {
      chordName: parsed.chordName,
      root: resolved.root,
      notes: midiNotes,
      inversion: parsed.inversion,
      voicingStyle: parsed.styleHint,
      keyboard: {
        startFrom: layout.startFrom,
        size: layout.size,
        highlightKeys,
      },
      success: true,
      telemetry: {
        parser: "chord",
        parsed: { ...parsed },
        resolver: {
          method: resolved.resolverMethod ?? "tonal",
          type: resolved.type,
          root: resolved.root,
          pitchClasses: resolved.notes,
        },
        voicing: {
          attempted: voicingAttempted,
          style: parsed.styleHint,
          quality: voicingQuality,
          found: voicingFound,
        },
        layout: {
          startFrom: layout.startFrom,
          size: layout.size,
          chordOctave: layout.chordOctave,
        },
        durationMs,
      },
    };

    // Generate requested format
    if (req.format === "midi") {
      result.midi = generateMidiFile(notes, parsed.chordName);
    }
    // SVG generation requires building the SVG string from keyboard data
    // (to be implemented — needs SVG string builder extracted from React component)
    if (req.format === "svg") {
      result.svg = buildSvgString(keys, highlightKeys, parsed.chordName, layout);
    }

    // Log if configured
    if (req.logConfig) {
      logChordRequest({
        input: req.input,
        pipeline: {
          parser: result.telemetry.parser,
          parsed: result.telemetry.parsed as any,
          resolver: result.telemetry.resolver as any,
          voicing: result.telemetry.voicing,
          layout: result.telemetry.layout,
          output: {
            notes: midiNotes,
            highlightKeys,
            format: req.format,
          },
        },
        success: true,
        durationMs,
      }, req.logConfig);
    }

    return result;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return {
      chordName: "",
      root: "",
      notes: [],
      keyboard: { startFrom: "C", size: 8, highlightKeys: [] },
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      telemetry: {
        parser: "chord",
        parsed: {},
        resolver: { method: "unknown", type: "", root: "", pitchClasses: [] },
        voicing: { attempted: false, found: false },
        layout: { startFrom: "C", size: 8, chordOctave: 0 },
        durationMs,
      },
    };
  }
}

// Minimal SVG string builder for server-side rendering
// This generates the same SVG structure as PianoKeyboard but as a string
function buildSvgString(
  keys: import("./types").KeyDescriptor[],
  highlightKeys: string[],
  label: string,
  layout: { startFrom: string; size: number },
): string {
  const { mapHighlights } = require("./engine/highlight-mapper");
  const fills: string[] = mapHighlights(keys, highlightKeys);
  const { computeSvgDimensions } = require("./engine/keyboard-layout");
  const dims = computeSvgDimensions(layout.size, "compact");

  const rects: string[] = [];
  // White keys first (back layer)
  for (let i = 0; i < keys.length; i++) {
    if (!keys[i].isBlack) {
      rects.push(`<rect x="${keys[i].x}" y="0" width="${keys[i].width}" height="${keys[i].height}" fill="${fills[i]}" stroke="#333" stroke-width="1" rx="0" ry="2"/>`);
    }
  }
  // Black keys on top
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].isBlack) {
      rects.push(`<rect x="${keys[i].x}" y="0" width="${keys[i].width}" height="${keys[i].height}" fill="${fills[i]}" stroke="#333" stroke-width="0.5" rx="0" ry="2"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dims.width} ${dims.height}" width="${dims.width}" height="${dims.height}">${rects.join("")}</svg>`;
}
```

Note: `buildSvgString` is a minimal version. The React component has richer rendering (note names, fingering, brackets). The server-side version starts simple and can be enhanced later. Refactor to use static imports rather than require().

**Step 4: Run test to verify it passes**

Run: `cd /home/urmom/better-chord-core-extract && npm run test:run -w @better-chord/core -- pipeline`
Expected: PASS

**Step 5: Update core index.ts**

```ts
export { processChordRequest } from "./pipeline";
export type { ChordRequest, ChordResult } from "./pipeline";
```

**Step 6: Commit**

```bash
git add packages/core/src/pipeline.ts packages/core/test/pipeline.test.ts packages/core/src/index.ts
git commit -m "feat: add processChordRequest pipeline with MIDI note names and telemetry"
```

---

### Task 10: Update chord-react index.ts to re-export from core

**Files:**
- Modify: `packages/chord-react/src/index.ts`

**Step 1: Rewrite index.ts**

Replace all local re-exports with imports from `@better-chord/core` for moved modules. Keep direct exports for React components and browser-specific modules (`playback.ts`, `svg-export.ts`).

```ts
// React components (local)
export { PianoKeyboard } from "./components/PianoKeyboard";
export { PianoChord } from "./components/PianoChord";
export { ChordGroup } from "./components/ChordGroup";
export { ProgressionView } from "./components/ProgressionView";
export type { ChordGroupProps } from "./components/ChordGroup";
export type { ProgressionViewProps, GroupMode } from "./components/ProgressionView";

// Browser-only (local)
export { playBlock, playArpeggiated } from "./audio/playback";
export { downloadSvg, downloadPng } from "./audio/svg-export";

// UI theme (local — React context)
export { UIThemeProvider, useUITheme, resolveUITheme } from "./ui-theme";
export { LIGHT_THEME, DARK_THEME, DEFAULT_UI_THEME, getUIThemeTokens } from "./config";
export type { UIThemeMode, UIThemeTokens } from "./config";

// React-specific types (local)
export type { KeyboardProps, ChordProps, PianoChordProps } from "./types";

// Everything else re-exported from core
export {
  // Engine
  computeKeyboard, computeSvgDimensions,
  mapHighlights, normalizeNote,
  autoFingering,
  // Parser & Resolver
  parseChordDescription,
  resolveChord,
  calculateLayout,
  isProgressionRequest, parseProgressionRequest,
  // Progression
  resolveProgression, tokenizeProgression,
  FORM_TEMPLATES, findTemplate,
  resolveProgressionRequest,
  // Themes
  getTheme,
  // MIDI
  generateMidiFile, downloadMidi,
  // Pipeline
  processChordRequest,
  // Logging
  logChordRequest, LOG_SCHEMA_VERSION,
  ENABLE_CHORD_LOGGING, MAX_EXAMPLES,
  // Constants
  WHITE_NOTE_ORDER, FLAT_TO_SHARP,
} from "@better-chord/core";

export type {
  Format, TextSize, WhiteNote, NoteName, ColorTheme,
  ParsedChordRequest, KeyDescriptor, HandBracket,
  FormTemplate, ProgressionRequest, ProgressionResult,
  ProgressionExample, ProgressionChord,
  ParsedProgressionRequest,
  ChordRequest, ChordResult,
  ChordLogEntry, LogConfig,
} from "@better-chord/core";

// Re-export voicings (pass-through — core already depends on voicings)
export {
  VOICING_LIBRARY, queryVoicings, findVoicing,
  realizeVoicing, realizeVoicingFull, voicingPitchClasses,
  getAlternativeVoicings, inferStyle, mapToVoicingQuality,
  selectByRange, autoSelectVoicing,
  generateLockedHands, solvePolychord, solveSlashChord,
} from "@better-chord/voicings";
export type {
  VoicingEntry, VoicingQuery, VoicingQuality, VoicingEra,
  VoicingStyle, Hand, RealizedNote, ChordDescriptor,
} from "@better-chord/voicings";
```

**Step 2: Build and run all tests**

Run: `cd /home/urmom/better-chord-core-extract && npm run build && npm run test:run`
Expected: all tests pass across all packages

**Step 3: Commit**

```bash
git add packages/chord-react/src/index.ts
git commit -m "refactor: chord-react re-exports engine, parser, resolver from @better-chord/core"
```

---

### Task 11: Final verification and cleanup

**Step 1: Full clean build**

```bash
cd /home/urmom/better-chord-core-extract
rm -rf packages/core/dist packages/voicings/dist packages/chord-react/dist
npm run build
```

Expected: all three packages build cleanly

**Step 2: Full test suite**

```bash
npm run test:run
```

Expected: all tests pass

**Step 3: Verify no duplicate source files**

Ensure `packages/chord-react/src/` no longer contains engine/, parser/, resolver/, progression/, themes/ directories (except any React-specific files that stayed).

**Step 4: Verify dev server**

```bash
npm run dev
```

Open browser, test interactive input with a few chords. Verify playback, export, inversions all work.

**Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore: final cleanup after core extraction"
```
