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
  piano = new Soundfont(context, { instrument: "acoustic_grand_piano" });
  loading = piano.load.then(() => {});
  await loading;
  return piano;
}

/** Convert pitch class + optional octave to a MIDI-playable note */
function toPlayableNote(note: string, defaultOctave: number = 4): string {
  // If already has octave (e.g. "C4", "Eb3"), return as-is
  if (/[0-9]$/.test(note)) return note;
  return `${note}${defaultOctave}`;
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

  const now = context.currentTime;
  for (const note of notes) {
    p.start({ note: toPlayableNote(note, octave), time: now, duration });
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

  const now = context.currentTime;
  for (let i = 0; i < notes.length; i++) {
    p.start({
      note: toPlayableNote(notes[i], octave),
      time: now + (i * delayMs) / 1000,
      duration,
    });
  }
}
