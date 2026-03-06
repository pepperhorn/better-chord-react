export type VoicingEra =
  | "Bebop"
  | "Cool"
  | "Hard Bop"
  | "Modal"
  | "Post-Bop"
  | "Modern";

export type VoicingStyle =
  | "Shell"
  | "Rootless Type A"
  | "Rootless Type B"
  | "Quartal"
  | "Upper Structure"
  | "Drop 2"
  | "Drop 2+4"
  | "Spread"
  | "4-Note Closed";

export type VoicingQuality =
  | "maj7"
  | "min7"
  | "dom7"
  | "m7b5"
  | "dim7"
  | "min6"
  | "maj6"
  | "sus4"
  | "alt"
  | "6/9"
  | "m6/9";

export type Hand = "LH" | "RH";

export interface VoicingEntry {
  id: string;
  name: string;
  quality: VoicingQuality;

  /** Semitone offsets relative to root. e.g. [3, 7, 10, 14] = b3, 5, b7, 9 */
  intervals: number[];

  /**
   * Hand assignment per interval. Same length as intervals array.
   * "LH" = left hand, "RH" = right hand.
   * If omitted, all notes are assigned to LH.
   */
  hands?: Hand[];

  tags: {
    era: VoicingEra;
    style: VoicingStyle;
    artist?: string;
    source?: string;
  };

  /** Recommended MIDI range for the lowest sounding note */
  range?: {
    min: number; // default ~48 (C3)
    max: number; // default ~72 (C5)
  };
}

/** A realized note with pitch, hand assignment, and pitch class */
export interface RealizedNote {
  note: string;       // e.g. "Eb3"
  midi: number;       // e.g. 51
  pitchClass: string; // e.g. "D#" (normalized to sharps)
  hand: Hand;         // "LH" or "RH"
}

export interface VoicingQuery {
  quality?: VoicingQuality;
  era?: VoicingEra;
  style?: VoicingStyle;
  artist?: string;
}
