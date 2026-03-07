import { Soundfont } from "smplr";

let ctx: AudioContext | null = null;
let piano: Soundfont | null = null;
let loading: Promise<void> | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

async function ensurePiano(): Promise<Soundfont> {
  if (piano) return piano;
  if (loading) {
    await loading;
    return piano!;
  }

  const context = getContext();
  const instance = new Soundfont(context, { instrument: "acoustic_grand_piano" });
  loading = instance.load.then(() => {});
  try {
    await loading;
    piano = instance;
  } catch {
    // Reset so next call retries instead of returning a broken instance
    loading = null;
    throw new Error("Failed to load piano soundfont");
  }
  return piano;
}

/** Convert pitch class + optional octave to a MIDI-playable note */
function toPlayableNote(note: string, defaultOctave: number = 4): string {
  // If already has octave (e.g. "C4", "Eb3"), return as-is
  if (/[0-9]$/.test(note)) return note;
  return `${note}${defaultOctave}`;
}

/** Semitone value for a pitch class (C=0, C#=1, ..., B=11) */
const PC_SEMITONES: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0,
};

/**
 * Assign ascending octaves to pitch classes so they form a rising sequence.
 * Notes are assumed to be in voicing order (bottom to top).
 */
function toAscendingNotes(notes: string[], baseOctave: number = 4): string[] {
  let octave = baseOctave;
  let prevSemitone = -1;

  return notes.map((note) => {
    if (/[0-9]$/.test(note)) return note;
    const semitone = PC_SEMITONES[note];
    if (semitone == null) return `${note}${octave}`;
    if (prevSemitone >= 0 && semitone <= prevSemitone) {
      octave++;
    }
    prevSemitone = semitone;
    return `${note}${octave}`;
  });
}

/**
 * Play all notes simultaneously (block chord).
 */
export async function playBlock(
  notes: string[],
  octave: number = 4,
  duration: number = 1.5
): Promise<void> {
  const p = await ensurePiano();
  const context = getContext();
  if (context.state === "suspended") await context.resume();

  const ascending = toAscendingNotes(notes, octave);
  const now = context.currentTime;
  for (const note of ascending) {
    p.start({ note, time: now, duration });
  }
}

/**
 * Play notes one at a time from bottom to top (arpeggiated).
 */
export async function playArpeggiated(
  notes: string[],
  octave: number = 4,
  delayMs: number = 100,
  duration: number = 1.5
): Promise<void> {
  const p = await ensurePiano();
  const context = getContext();
  if (context.state === "suspended") await context.resume();

  const ascending = toAscendingNotes(notes, octave);
  const now = context.currentTime;
  for (let i = 0; i < ascending.length; i++) {
    p.start({
      note: ascending[i],
      time: now + (i * delayMs) / 1000,
      duration,
    });
  }
}
