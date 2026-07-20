/**
 * Chroma extraction from an FFT magnitude spectrum.
 *
 * Folds a linear-frequency magnitude spectrum (e.g. from a Web Audio
 * `AnalyserNode.getFloatFrequencyData`) into a 12-bin pitch-class profile by
 * mapping each usable bin to its nearest pitch class and summing energy.
 *
 * This intentionally uses the platform FFT rather than a heavier CQT/Essentia.js
 * dependency; the module is small and self-contained so a higher-fidelity
 * front-end (Essentia.js chroma/CQT) can replace it behind the same
 * `Float32Array -> number[12]` contract without touching the matcher.
 */

/** MIDI note 69 = A4 = 440 Hz. Frequency of MIDI note n. */
function midiToFreq(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

export interface ChromaOptions {
  /** Lowest frequency (Hz) to include. Default 55 (A1). */
  minHz?: number;
  /** Highest frequency (Hz) to include. Default 2000 (~B6). */
  maxHz?: number;
  /** Ignore bins quieter than this many dB below the frame peak. Default 40. */
  dynamicRangeDb?: number;
}

/**
 * Convert an FFT magnitude spectrum (in dB, as AnalyserNode provides) into a
 * normalized 12-bin chroma vector.
 *
 * @param spectrumDb - per-bin magnitude in dB (values are negative; -Infinity = silence)
 * @param sampleRate - audio context sample rate (Hz)
 * @param fftSize - the analyser FFT size (spectrumDb.length === fftSize / 2)
 */
export function chromaFromSpectrum(
  spectrumDb: Float32Array,
  sampleRate: number,
  fftSize: number,
  options: ChromaOptions = {},
): number[] {
  const { minHz = 55, maxHz = 2000, dynamicRangeDb = 40 } = options;
  const binHz = sampleRate / fftSize;
  const chroma = new Array(12).fill(0);

  // Peak dB in-band, so we can gate out the noise floor relative to it.
  let peak = -Infinity;
  const startBin = Math.max(1, Math.floor(minHz / binHz));
  const endBin = Math.min(spectrumDb.length - 1, Math.ceil(maxHz / binHz));
  for (let i = startBin; i <= endBin; i++) {
    if (spectrumDb[i] > peak) peak = spectrumDb[i];
  }
  if (peak === -Infinity) return chroma; // silence

  const floor = peak - dynamicRangeDb;
  for (let i = startBin; i <= endBin; i++) {
    const db = spectrumDb[i];
    if (db < floor) continue;
    const freq = i * binHz;
    // Nearest MIDI note -> pitch class.
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const pc = ((midi % 12) + 12) % 12;
    // dB -> linear amplitude; weight so louder partials count more.
    chroma[pc] += Math.pow(10, db / 20);
  }

  // Normalize to unit-max so downstream cosine matching is scale-free.
  const max = Math.max(...chroma);
  if (max > 0) for (let i = 0; i < 12; i++) chroma[i] /= max;
  return chroma;
}

/** Total in-band energy proxy — used to detect silence before matching. */
export function spectrumLoudness(
  spectrumDb: Float32Array,
  sampleRate: number,
  fftSize: number,
  minHz = 55,
  maxHz = 2000,
): number {
  const binHz = sampleRate / fftSize;
  const startBin = Math.max(1, Math.floor(minHz / binHz));
  const endBin = Math.min(spectrumDb.length - 1, Math.ceil(maxHz / binHz));
  let peak = -Infinity;
  for (let i = startBin; i <= endBin; i++) {
    if (spectrumDb[i] > peak) peak = spectrumDb[i];
  }
  return peak; // dB of the loudest in-band bin (-Infinity when silent)
}
