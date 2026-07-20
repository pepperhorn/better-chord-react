/**
 * Live microphone chord listener.
 *
 * Wires the pipeline together: mic -> AnalyserNode FFT -> chroma -> template
 * match -> stabilizer -> "chord changed" callbacks. The UI decides what to do
 * with the events (show the current chord, or accumulate unique chords for a
 * record session); this class only produces a stable stream.
 */
import { chromaFromSpectrum, spectrumLoudness } from "./chroma";
import { matchChord } from "./templateMatch";
import type { ChordCandidate } from "./templateMatch";
import { ChordStabilizer } from "./stabilizer";
import type { StabilizerConfig } from "./stabilizer";

export interface ChordListenerOptions extends StabilizerConfig {
  /** AnalyserNode FFT size (power of two). Larger = finer low-freq resolution. Default 8192. */
  fftSize?: number;
  /** Frames below this dB peak are treated as silence. Default -70. */
  silenceFloorDb?: number;
  /** Minimum ms between analysis frames. Default 60. */
  frameIntervalMs?: number;
  /** Fired once each time a new stable chord is confirmed. */
  onChord?: (chord: ChordCandidate) => void;
  /** Fired every analyzed frame with the raw top candidate (or null). For meters/debug. */
  onFrame?: (candidate: ChordCandidate | null, chroma: number[]) => void;
  /** Fired if starting the microphone fails. */
  onError?: (err: Error) => void;
}

type TimeProvider = () => number;

export class ChordListener {
  private readonly opts: Required<Omit<ChordListenerOptions, "onChord" | "onFrame" | "onError" | "confirmFrames" | "minConfidence">> &
    Pick<ChordListenerOptions, "onChord" | "onFrame" | "onError">;
  private readonly stabilizer: ChordStabilizer;

  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private spectrum: Float32Array | null = null;
  private rafId: number | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private lastFrame = 0;
  private running = false;
  // Bumped by stop(); start() re-reads it after each await so a stop() that
  // lands mid-startup (e.g. overlay closed during the mic-permission prompt)
  // doesn't leave an orphaned stream/context/loop running.
  private startToken = 0;
  private readonly now: TimeProvider;

  constructor(options: ChordListenerOptions = {}) {
    this.opts = {
      fftSize: options.fftSize ?? 8192,
      silenceFloorDb: options.silenceFloorDb ?? -70,
      frameIntervalMs: options.frameIntervalMs ?? 60,
      onChord: options.onChord,
      onFrame: options.onFrame,
      onError: options.onError,
    };
    this.stabilizer = new ChordStabilizer({
      confirmFrames: options.confirmFrames,
      minConfidence: options.minConfidence,
    });
    this.now =
      typeof performance !== "undefined" ? () => performance.now() : () => Date.now();
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Request the mic and begin analysis. Resolves once running (or rejects). */
  async start(): Promise<void> {
    if (this.running) return;
    const token = ++this.startToken;
    // If stop() ran while we were awaiting, bail and release anything acquired.
    const abandoned = () => this.startToken !== token;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (abandoned()) { stream.getTracks().forEach((t) => t.stop()); return; }
      this.stream = stream;

      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (abandoned()) { this.stop(); return; }

      const source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.opts.fftSize;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);
      this.spectrum = new Float32Array(this.analyser.frequencyBinCount);

      this.stabilizer.reset();
      this.running = true;
      this.lastFrame = 0;
      this.loop();
    } catch (err) {
      this.stop();
      this.opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  /** Stop analysis and release the microphone. */
  stop(): void {
    this.running = false;
    this.startToken++; // abandon any start() awaiting mid-flight
    if (this.rafId != null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.rafId);
    }
    if (this.timerId != null) clearInterval(this.timerId);
    this.rafId = null;
    this.timerId = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    this.spectrum = null;
    if (this.ctx && this.ctx.state !== "closed") this.ctx.close();
    this.ctx = null;
  }

  /** The currently held stable chord, if any. */
  current(): ChordCandidate | null {
    return this.stabilizer.current();
  }

  private loop = (): void => {
    if (!this.running) return;
    // Prefer rAF when available (smooth, throttles in background); fall back to
    // setInterval in environments without it.
    if (typeof requestAnimationFrame !== "undefined") {
      this.rafId = requestAnimationFrame(this.loop);
      const t = this.now();
      if (t - this.lastFrame < this.opts.frameIntervalMs) return;
      this.lastFrame = t;
      this.analyzeFrame();
    } else if (this.timerId == null) {
      this.timerId = setInterval(() => this.analyzeFrame(), this.opts.frameIntervalMs);
    }
  };

  private analyzeFrame(): void {
    if (!this.analyser || !this.spectrum) return;
    // getFloatFrequencyData signature varies across TS DOM lib versions.
    (this.analyser.getFloatFrequencyData as (a: Float32Array) => void)(this.spectrum);
    const sampleRate = this.ctx?.sampleRate ?? 48000;
    const fftSize = this.opts.fftSize;

    const loud = spectrumLoudness(this.spectrum, sampleRate, fftSize);
    let top: ChordCandidate | null = null;
    let chroma: number[] = new Array(12).fill(0);
    if (loud >= this.opts.silenceFloorDb) {
      chroma = chromaFromSpectrum(this.spectrum, sampleRate, fftSize);
      top = matchChord(chroma, 1)[0] ?? null;
    }

    this.opts.onFrame?.(top, chroma);
    const { stable, changed } = this.stabilizer.update(top);
    if (changed && stable) this.opts.onChord?.(stable);
  }
}
