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
  /** Left-hand notes (bass clef). Remaining notes go to right hand (treble clef). */
  lhNotes?: string[];
  octave?: number;
  lhOctave?: number;
  durationTicks?: number;
  velocity?: number;
  tempo?: number;
  arpeggiated?: boolean;
  arpDelayTicks?: number;
}

/** Build raw track bytes for a set of MIDI note numbers on a given channel. */
function buildTrackData(
  midiNotes: number[],
  channel: number,
  velocity: number,
  durationTicks: number,
  trackName: string,
  tempoEvent?: { microsecondsPerBeat: number },
  arpeggiated?: boolean,
  arpDelayTicks?: number,
): number[] {
  const data: number[] = [];
  const noteOn = 0x90 | channel;
  const noteOff = 0x80 | channel;

  // Tempo meta event (only on first track)
  if (tempoEvent) {
    const { microsecondsPerBeat } = tempoEvent;
    data.push(
      0x00, 0xff, 0x51, 0x03,
      (microsecondsPerBeat >> 16) & 0xff,
      (microsecondsPerBeat >> 8) & 0xff,
      microsecondsPerBeat & 0xff
    );
  }

  // Track name (ASCII only, VarLen-encoded length)
  const nameBytes = Array.from(trackName, (ch) => ch.charCodeAt(0) & 0x7f);
  data.push(0x00, 0xff, 0x03, ...toVarLen(nameBytes.length), ...nameBytes);

  // Note-on events
  if (arpeggiated && arpDelayTicks) {
    for (let i = 0; i < midiNotes.length; i++) {
      const delta = i === 0 ? 0 : arpDelayTicks;
      data.push(...toVarLen(delta), noteOn, midiNotes[i], velocity);
    }
  } else {
    for (let i = 0; i < midiNotes.length; i++) {
      data.push(...toVarLen(0), noteOn, midiNotes[i], velocity);
    }
  }

  // Note-off events
  const totalArpDelay = arpeggiated && arpDelayTicks ? (midiNotes.length - 1) * arpDelayTicks : 0;
  for (let i = 0; i < midiNotes.length; i++) {
    const delta = i === 0 ? durationTicks + totalArpDelay : 0;
    data.push(...toVarLen(delta), noteOff, midiNotes[i], 0);
  }

  // End of track
  data.push(0x00, 0xff, 0x2f, 0x00);
  return data;
}

/**
 * Generate a MIDI file as a Uint8Array containing a single chord.
 * When lhNotes is provided, produces a Format 1 file with LH on channel 0
 * (bass clef, octave 3) and RH on channel 1 (treble clef, octave 4).
 */
export function generateMidiFile(options: MidiChordOptions): Uint8Array {
  const {
    notes,
    lhNotes,
    octave = 4,
    lhOctave: lhOctaveOpt,
    durationTicks = 960,
    velocity = 90,
    tempo = 120,
    arpeggiated = false,
    arpDelayTicks = 120,
  } = options;

  const ticksPerQuarter = 480;
  const microsecondsPerBeat = Math.round(60_000_000 / tempo);

  if (lhNotes && lhNotes.length > 0) {
    // Format 1: separate LH (bass clef) and RH (treble clef) tracks
    const lhOctave = lhOctaveOpt ?? 3;
    const rhOctave = octave;
    const lhSet = new Set(lhNotes);
    const rhNotes = notes.filter((n) => !lhSet.has(n));

    const lhMidi = lhNotes.map((n) => noteToMidi(n, lhOctave)).filter((m): m is number => m != null);
    const rhMidi = rhNotes.map((n) => noteToMidi(n, rhOctave)).filter((m): m is number => m != null);

    if (lhMidi.length === 0 && rhMidi.length === 0) return new Uint8Array(0);

    const tracks: number[][] = [];

    if (lhMidi.length > 0) {
      tracks.push(buildTrackData(
        lhMidi, 0, velocity, durationTicks, "L.H.",
        { microsecondsPerBeat },
        arpeggiated, arpDelayTicks,
      ));
    }
    if (rhMidi.length > 0) {
      tracks.push(buildTrackData(
        rhMidi, 1, velocity, durationTicks, "R.H.",
        tracks.length === 0 ? { microsecondsPerBeat } : undefined,
        arpeggiated, arpDelayTicks,
      ));
    }

    const header = [
      0x4d, 0x54, 0x68, 0x64,
      ...writeUint32(6),
      ...writeUint16(1),              // format 1
      ...writeUint16(tracks.length),
      ...writeUint16(ticksPerQuarter),
    ];

    let totalSize = header.length;
    const trackChunks: number[][] = [];
    for (const track of tracks) {
      const chunk = [0x4d, 0x54, 0x72, 0x6b, ...writeUint32(track.length), ...track];
      trackChunks.push(chunk);
      totalSize += chunk.length;
    }

    const file = new Uint8Array(totalSize);
    let offset = 0;
    file.set(header, offset); offset += header.length;
    for (const chunk of trackChunks) {
      file.set(chunk, offset); offset += chunk.length;
    }
    return file;
  }

  // Single track (Format 0) — original behavior
  const midiNotes = notes
    .map((n) => noteToMidi(n, octave))
    .filter((m): m is number => m != null);

  if (midiNotes.length === 0) return new Uint8Array(0);

  const trackData = buildTrackData(
    midiNotes, 0, velocity, durationTicks, "Chord",
    { microsecondsPerBeat },
    arpeggiated, arpDelayTicks,
  );

  const header = [
    0x4d, 0x54, 0x68, 0x64,
    ...writeUint32(6),
    ...writeUint16(0),           // format 0
    ...writeUint16(1),
    ...writeUint16(ticksPerQuarter),
  ];

  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, ...writeUint32(trackData.length)];

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
  octave: number = 4,
  lhNotes?: string[],
  lhOctave?: number,
): void {
  const midi = generateMidiFile({ notes, octave, lhNotes, lhOctave });
  if (midi.length === 0) return;

  const blob = new Blob([midi.buffer as ArrayBuffer], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chordName.replace(/[^a-zA-Z0-9\-_ ]/g, "_").slice(0, 100)}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
