import { Note } from "tonal";

/**
 * Minimal MIDI file generator for a single chord.
 * Produces a Format 0 (single track) Standard MIDI File.
 */

function toVarLen(value: number): number[] {
  if (value < 0x80) return [value];
  const bytes: number[] = [];
  bytes.unshift(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

function writeUint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function writeUint32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

function noteToMidi(note: string, defaultOctave: number = 4): number | null {
  if (/[0-9]$/.test(note)) return Note.midi(note);
  return Note.midi(`${note}${defaultOctave}`);
}

interface MidiChordOptions {
  notes: string[];
  octave?: number;
  durationTicks?: number;
  velocity?: number;
  tempo?: number;
  arpeggiated?: boolean;
  arpDelayTicks?: number;
}

/**
 * Generate a MIDI file as a Uint8Array containing a single chord.
 */
export function generateMidiFile(options: MidiChordOptions): Uint8Array {
  const {
    notes,
    octave = 4,
    durationTicks = 960, // one beat at 480 ticks/quarter
    velocity = 90,
    tempo = 120,
    arpeggiated = false,
    arpDelayTicks = 120,
  } = options;

  const ticksPerQuarter = 480;

  // Build track data
  const trackData: number[] = [];

  // Tempo meta event: FF 51 03 tt tt tt (microseconds per quarter note)
  const microsecondsPerBeat = Math.round(60_000_000 / tempo);
  trackData.push(
    0x00, // delta time
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Track name meta event
  const trackName = "Chord";
  trackData.push(0x00, 0xff, 0x03, trackName.length);
  for (const ch of trackName) trackData.push(ch.charCodeAt(0));

  // Convert notes to MIDI numbers
  const midiNotes = notes
    .map((n) => noteToMidi(n, octave))
    .filter((m): m is number => m != null);

  if (midiNotes.length === 0) return new Uint8Array(0);

  // Note-on events
  if (arpeggiated) {
    for (let i = 0; i < midiNotes.length; i++) {
      const delta = i === 0 ? 0 : arpDelayTicks;
      trackData.push(...toVarLen(delta), 0x90, midiNotes[i], velocity);
    }
  } else {
    // All notes at once
    for (let i = 0; i < midiNotes.length; i++) {
      trackData.push(...toVarLen(0), 0x90, midiNotes[i], velocity);
    }
  }

  // Note-off events after duration
  const totalArpDelay = arpeggiated ? (midiNotes.length - 1) * arpDelayTicks : 0;
  for (let i = 0; i < midiNotes.length; i++) {
    const delta = i === 0 ? durationTicks + totalArpDelay : 0;
    trackData.push(...toVarLen(delta), 0x80, midiNotes[i], 0);
  }

  // End of track
  trackData.push(0x00, 0xff, 0x2f, 0x00);

  // Build full file
  const header = [
    // MThd
    0x4d, 0x54, 0x68, 0x64,
    ...writeUint32(6),           // header length
    ...writeUint16(0),           // format 0
    ...writeUint16(1),           // one track
    ...writeUint16(ticksPerQuarter),
  ];

  const trackHeader = [
    // MTrk
    0x4d, 0x54, 0x72, 0x6b,
    ...writeUint32(trackData.length),
  ];

  const file = new Uint8Array(header.length + trackHeader.length + trackData.length);
  file.set(header, 0);
  file.set(trackHeader, header.length);
  file.set(trackData, header.length + trackHeader.length);

  return file;
}

/**
 * Trigger a browser download of a MIDI file.
 */
export function downloadMidi(
  notes: string[],
  chordName: string,
  octave: number = 4
): void {
  const midi = generateMidiFile({ notes, octave });
  if (midi.length === 0) return;

  const blob = new Blob([midi.buffer as ArrayBuffer], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chordName.replace(/[/\\#]/g, "_")}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
