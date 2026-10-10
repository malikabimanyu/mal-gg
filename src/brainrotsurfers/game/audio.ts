import { asset } from "../lib/routes";

/**
 * Game audio: CC0 sample SFX + looping music (built by scripts/brainrotsurfers-audio-assets.mjs
 * into public/brainrotsurfers/audio/), a synthesised jetpack hiss and the cat's sung "OIIA OIIA".
 *
 * Browsers (iOS Safari above all) only let an AudioContext start inside a user gesture, so the
 * context is created on the first pointer/key event and decoding happens after that. Fetching
 * doesn't need a context: `preload()` pulls the SFX bytes during the loading screen and
 * `prefetchMusic()` the main track while the menu idles, so both decode instantly on the first
 * tap. Until a buffer is decoded — or if its file fails — the matching sound falls back to a
 * small WebAudio synth, so the game is never silent and never throws.
 *
 * Graph: sfx voices → sfxBus ─┐
 *        music → trackGain → duck → musicGain ─┴→ master → destination
 * Mute flags act on the gains at once (and skip creating voices while muted).
 */

export type SfxName =
  | "coin"
  | "jump"
  | "roll"
  | "swipe"
  | "land"
  | "stumble"
  | "crash"
  | "powerup"
  | "powerupEnd"
  | "click"
  | "purchase"
  | "error"
  | "newBest"
  | "gameOver";

export type LoopName = "jetpack";

export interface SfxOptions {
  /** Coin streak index: pitch rises with it. */
  streak?: number;
  /** Playback-rate style pitch multiplier. */
  pitch?: number;
  volume?: number;
}

/** What the dev hooks report (`__brDebug.state().audio`). */
export interface AudioDebugInfo {
  state: AudioContextState | "none";
  sfxTotal: number;
  sfxLoaded: number;
  sfxFailed: number;
  music: Record<TrackId, LoadState>;
  playing: TrackId | "synth" | null;
  /** Decoded length (s) of every loaded buffer, to sanity-check what the browser produced. */
  durations: Record<string, number>;
  /** Leading decoder padding found in each music buffer (s); loops start after it. */
  musicLead: Record<string, number>;
}

type TrackId = "main" | "climax";
type LoadState = "idle" | "loading" | "ready" | "failed";

const SFX_NAMES: readonly SfxName[] = [
  "coin",
  "jump",
  "roll",
  "swipe",
  "land",
  "stumble",
  "crash",
  "powerup",
  "powerupEnd",
  "click",
  "purchase",
  "error",
  "newBest",
  "gameOver",
];

/** Mix level per sound — the files are all peak-normalised to −1 dBFS by the asset script. */
const LEVEL: Record<SfxName, number> = {
  coin: 0.3,
  jump: 0.45,
  roll: 0.45,
  swipe: 0.28,
  land: 0.5,
  stumble: 0.75,
  crash: 0.9,
  powerup: 0.42,
  powerupEnd: 0.4,
  click: 0.35,
  purchase: 0.55,
  error: 0.45,
  newBest: 0.5,
  gameOver: 0.5,
};

/**
 * Both "Fever Stadium" files are exact 59-bar loops with no silence at either end (measured by
 * the asset script), so they loop sample-accurately between loopStart and loopStart + seconds.
 */
const TRACKS: Record<TrackId, { url: string; seconds: number; bpm: number }> = {
  main: { url: asset("/audio/music-main.mp3"), seconds: 85.818186, bpm: 165 },
  climax: { url: asset("/audio/music-climax.mp3"), seconds: 78.666667, bpm: 180 },
};
/** Run speed (m/s) at which the faster "climax" mix takes over (~2 min in), and prefetches. */
const CLIMAX_SPEED = 25;
const CLIMAX_PREFETCH_SPEED = 22;

const MASTER = 0.9;
const MUSIC = 0.4;
/** Music level while paused / during the caught sequence. */
const DUCKED = 0.22;

/** Coin pitch ladder (semitones) climbed by consecutive coins, then held at the top. */
const COIN_STEPS = [0, 2, 4, 5, 7];
const COIN_RATES = Float32Array.from(COIN_STEPS, (s) => Math.pow(2, s / 12));
/** Simultaneous coin voices; the oldest is cut when a magnet vacuums up a whole line. */
const COIN_VOICES = 4;

/** Cat taunts while it chases close behind: first one shortly after the stumble, then spaced. */
const TAUNT_FIRST = 0.45;
const TAUNT_GAP = 2.6;

// ── Fallback synth (used until/unless a file decodes) ────────────────────────

type Tone = { type: OscillatorType; from: number; to: number; dur: number; gain: number; delay?: number };

const arp = (notes: number[], step: number, dur: number, gain: number): Tone[] =>
  notes.map((f, i) => ({ type: "square", from: f, to: f, dur, gain, delay: i * step }));

const SYNTH: Record<SfxName, Tone[]> = {
  coin: [{ type: "square", from: 1320, to: 1980, dur: 0.08, gain: 0.08 }],
  jump: [{ type: "triangle", from: 300, to: 760, dur: 0.16, gain: 0.18 }],
  roll: [{ type: "triangle", from: 520, to: 160, dur: 0.18, gain: 0.18 }],
  swipe: [{ type: "sawtooth", from: 900, to: 600, dur: 0.05, gain: 0.04 }],
  land: [{ type: "sine", from: 180, to: 70, dur: 0.1, gain: 0.25 }],
  stumble: [
    { type: "square", from: 220, to: 110, dur: 0.14, gain: 0.16 },
    { type: "square", from: 180, to: 90, dur: 0.14, gain: 0.14, delay: 0.09 },
  ],
  crash: [
    { type: "sawtooth", from: 160, to: 40, dur: 0.45, gain: 0.25 },
    { type: "square", from: 2400, to: 900, dur: 0.2, gain: 0.05, delay: 0.03 },
  ],
  powerup: arp([523, 659, 784, 1046], 0.07, 0.08, 0.08),
  powerupEnd: arp([784, 587, 392], 0.08, 0.1, 0.07),
  click: [{ type: "square", from: 880, to: 880, dur: 0.035, gain: 0.06 }],
  purchase: arp([988, 1319], 0.08, 0.2, 0.08),
  error: [{ type: "sawtooth", from: 140, to: 120, dur: 0.22, gain: 0.12 }],
  newBest: arp([523, 659, 784, 1046, 1319], 0.1, 0.14, 0.08),
  gameOver: arp([784, 659, 523, 392], 0.16, 0.2, 0.07),
};

/** Fallback chiptune if the music file can't load: bass + arpeggio, 16 sixteenth steps. */
const BASS = [0, null, 0, null, 7, null, 0, null, 5, null, 5, null, 3, null, 7, null];
const LEAD = [12, 19, 24, 19, 12, 19, 24, 27, 17, 24, 29, 24, 15, 22, 27, 31];
const SYNTH_BPM = 140;

// ── "OIIA" formant voice ─────────────────────────────────────────────────────

/**
 * Vowel = three formant peaks + a lowpass "brightness" (rounded o dark, i bright) + a level
 * trim: at a cat-high pitch the harmonics are ~600 Hz apart, so "o" (F1 on the fundamental)
 * comes out far louder than "i" (energy only up at F2/F3) — g evens the syllables out.
 */
type Vowel = { f: [number, number, number]; lp: number; g: number };
const VOWEL: Record<"o" | "i" | "a", Vowel> = {
  o: { f: [460, 860, 2600], lp: 1700, g: 0.45 },
  i: { f: [300, 2400, 3150], lp: 4800, g: 1 },
  a: { f: [820, 1260, 2650], lp: 3000, g: 0.8 },
};
/** Formant peak boosts (dB) and sharpness; the sawtooth's harmonics light them up. */
const FORMANT_GAIN = [10, 14, 10];
const FORMANT_Q = [2.5, 5, 6];

/**
 * One sung "o-i-i-a": [start, vowel, pitch × base, articulation level at the syllable start].
 * The two i's are re-articulated with a dip; "a" falls off at the end like the meme.
 */
const OIIA: readonly [number, keyof typeof VOWEL, number, number][] = [
  [0.0, "o", 0.84, 0],
  [0.15, "i", 1.12, 0.45],
  [0.29, "i", 1.06, 0.06],
  [0.43, "a", 0.94, 0.5],
];
const OIIA_LEN = 0.68;

type Decoded = { buffer: AudioBuffer; lead: number };
type MusicVoice = { src: AudioBufferSourceNode; gain: GainNode; track: TrackId; startedAt: number };

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private duck: GainNode | null = null;
  private coinGain: GainNode | null = null;
  private muted: boolean;
  private musicMuted: boolean;
  private disposed = false;
  private listening = false;
  private hiddenSuspended = false;

  private readonly sfx = new Map<SfxName, Decoded>();
  private sfxLoading = false;
  private sfxFailed = 0;

  private readonly tracks = new Map<TrackId, Decoded>();
  private readonly trackState: Record<TrackId, LoadState> = { main: "idle", climax: "idle" };
  private wantMusic = false;
  private ducked = false;
  private music: MusicVoice | null = null;
  /** The track that is fading out after a crossfade (stopped with the rest on stopMusic). */
  private fading: MusicVoice | null = null;

  // Fallback chiptune scheduler.
  private synthTimer: number | null = null;
  private nextStep = 0;
  private step = 0;

  // Preallocated coin voice ring (no per-coin allocation beyond the source node itself).
  private readonly coinSrc: (AudioBufferSourceNode | null)[] = new Array<AudioBufferSourceNode | null>(COIN_VOICES).fill(null);
  private readonly coinEnd = new Float64Array(COIN_VOICES);
  private coinNext = 0;

  private loopNodes: { stop(at: number): void; gain: GainNode } | null = null;
  private noise: AudioBuffer | null = null;
  private nextTauntAt = 0;
  private lastTauntCall = -1;

  /** Bytes fetched ahead of the context (url → body); each is taken once, since decode detaches it. */
  private readonly bytes = new Map<string, Promise<ArrayBuffer>>();

  /**
   * A touch pointerdown is not a user activation (Chrome refuses to start a context in it and
   * warns), so touch/pen unlock on pointerup/touchend instead; mouse and keys unlock at once.
   */
  private readonly unlock = (e: Event) => {
    if (e.type === "pointerdown" && (e as PointerEvent).pointerType !== "mouse") return;
    void this.ensure();
  };
  private readonly onVisibility = () => {
    const ctx = this.ctx;
    if (!ctx) return;
    if (document.visibilityState === "hidden") {
      if (ctx.state === "running") {
        this.hiddenSuspended = true;
        void ctx.suspend().catch(() => {});
      }
    } else if (this.hiddenSuspended) {
      this.hiddenSuspended = false;
      void ctx.resume().catch(() => {});
    }
  };

  constructor(opts: { muted: boolean; musicMuted: boolean }) {
    this.muted = opts.muted;
    this.musicMuted = opts.musicMuted;
  }

  /**
   * Creates/resumes the context on pointer/key gestures. The listeners stay for the engine's
   * lifetime: iOS can suspend ("interrupted") the context later, and only a gesture resumes it.
   */
  resumeOnGesture(): void {
    if (this.listening || typeof window === "undefined") return;
    this.listening = true;
    window.addEventListener("pointerdown", this.unlock, { passive: true });
    window.addEventListener("pointerup", this.unlock, { passive: true });
    window.addEventListener("keydown", this.unlock);
    window.addEventListener("touchend", this.unlock, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private ensure(): AudioContext | null {
    if (this.disposed || typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      let ctx: AudioContext;
      try {
        ctx = new Ctor();
      } catch {
        return null;
      }
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER;
      this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.coinGain = ctx.createGain();
      this.coinGain.gain.value = LEVEL.coin;
      this.coinGain.connect(this.sfxBus);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.musicMuted ? 0 : MUSIC;
      this.musicGain.connect(this.master);
      this.duck = ctx.createGain();
      this.duck.gain.value = this.ducked ? DUCKED : 1;
      this.duck.connect(this.musicGain);
      // Old iOS only unlocks output once a buffer has played inside the gesture.
      const blip = ctx.createBufferSource();
      blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      blip.connect(ctx.destination);
      blip.start();
      void this.loadSfx(ctx);
      if (this.wantMusic) this.beginMusic();
    }
    if (this.ctx.state !== "running" && document.visibilityState !== "hidden") void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  /**
   * Fetches every SFX file (≈64 KB) without decoding; the engine waits for it on the loading
   * screen. Never rejects: a failed file just keeps its synth fallback.
   */
  preload(): Promise<void> {
    return Promise.all(SFX_NAMES.map((name) => this.fetchAhead(sfxUrl(name)).catch(() => {}))).then(() => {});
  }

  /** Background-fetches the main music (~1 MB) so the first run starts with it; skipped while muted. */
  prefetchMusic(): void {
    if (this.musicMuted || this.trackState.main !== "idle") return;
    void this.fetchAhead(TRACKS.main.url).catch(() => {});
  }

  private fetchAhead(url: string): Promise<ArrayBuffer> {
    let p = this.bytes.get(url);
    if (!p) {
      p = fetchBytes(url);
      this.bytes.set(url, p);
      // A failed prefetch must not be cached: the decode on first tap retries the fetch.
      p.catch(() => {
        if (this.bytes.get(url) === p) this.bytes.delete(url);
      });
    }
    return p;
  }

  /** Decodes prefetched bytes when there are any, otherwise fetches now. */
  private fetchDecode(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const ahead = this.bytes.get(url);
    this.bytes.delete(url);
    return (ahead ?? fetchBytes(url)).then((data) => decode(ctx, data));
  }

  private async loadSfx(ctx: AudioContext) {
    if (this.sfxLoading) return;
    this.sfxLoading = true;
    await Promise.all(
      SFX_NAMES.map(async (name) => {
        try {
          const buffer = await this.fetchDecode(ctx, sfxUrl(name));
          if (this.ctx !== ctx) return;
          // Some decoders keep the MP3 encoder delay as leading silence: skip it on play.
          this.sfx.set(name, { buffer, lead: leadingSilence(buffer, 0.003, 0.06) });
        } catch {
          this.sfxFailed++;
        }
      }),
    );
  }

  private loadTrack(id: TrackId) {
    const ctx = this.ctx;
    if (!ctx || this.trackState[id] !== "idle") return;
    this.trackState[id] = "loading";
    const { url, seconds } = TRACKS[id];
    this.fetchDecode(ctx, url).then(
      (buffer) => {
        if (this.ctx !== ctx) return;
        // A gapless-aware decoder returns exactly the loop; otherwise skip the encoder delay.
        let lead = Math.abs(buffer.duration - seconds) < 0.003 ? 0 : leadingSilence(buffer, 0.001, 0.12);
        lead = Math.max(0, Math.min(lead, buffer.duration - seconds));
        this.tracks.set(id, { buffer, lead });
        this.trackState[id] = "ready";
        if (id === "main" && this.wantMusic && !this.music) this.beginMusic();
      },
      () => {
        if (this.ctx !== ctx) return;
        this.trackState[id] = "failed";
        if (id === "main" && this.wantMusic && !this.music) this.beginMusic();
      },
    );
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  play(name: SfxName, opts?: SfxOptions): void {
    if (name === "coin") {
      this.coin(opts?.streak ?? 0);
      return;
    }
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.muted || ctx.state !== "running") return;
    const s = this.sfx.get(name);
    const volume = opts?.volume ?? 1;
    const pitch = opts?.pitch ?? 1;
    if (!s) {
      this.synth(ctx, name, pitch, volume);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = pitch;
    const g = ctx.createGain();
    g.gain.value = LEVEL[name] * volume;
    src.connect(g).connect(this.sfxBus);
    src.start(ctx.currentTime, s.lead);
  }

  /** Coin pick-up; `streak` = coins in a row, climbing a short pitch ladder. */
  coin(streak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.coinGain || this.muted || ctx.state !== "running") return;
    const s = this.sfx.get("coin");
    const rate = COIN_RATES[Math.min(Math.max(0, streak | 0), COIN_RATES.length - 1)];
    if (!s) {
      this.synth(ctx, "coin", rate, 1);
      return;
    }
    const now = ctx.currentTime;
    const i = this.coinNext;
    this.coinNext = (i + 1) % COIN_VOICES;
    const old = this.coinSrc[i];
    // Cut the oldest voice only if it is still ringing (stopping an ended source is pointless).
    if (old && this.coinEnd[i] > now) old.stop(now);
    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = rate;
    src.connect(this.coinGain);
    src.start(now, s.lead);
    this.coinSrc[i] = src;
    this.coinEnd[i] = now + (s.buffer.duration - s.lead) / rate;
  }

  private synth(ctx: AudioContext, name: SfxName, pitch: number, volume: number) {
    const t0 = ctx.currentTime;
    for (const tone of SYNTH[name]) {
      const start = t0 + (tone.delay ?? 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.from * pitch, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to * pitch), start + tone.dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(tone.gain * volume, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
      osc.connect(g).connect(this.sfxBus!);
      osc.start(start);
      osc.stop(start + tone.dur + 0.02);
    }
  }

  // ── Jetpack loop ───────────────────────────────────────────────────────────

  /** Continuous sound while a state lasts: the jetpack's flame hiss + rumble with a flutter. */
  setLoop(name: LoopName, on: boolean): void {
    void name;
    const ctx = this.ctx;
    if (!on || !ctx || !this.sfxBus || this.muted) {
      if (this.loopNodes) {
        const { stop, gain } = this.loopNodes;
        this.loopNodes = null;
        if (ctx) {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
          stop(ctx.currentTime + 0.3);
        }
      }
      return;
    }
    if (this.loopNodes) return;
    const now = ctx.currentTime;
    this.noise ??= makeNoise(ctx);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    // Hiss: band-passed noise whose centre flutters (the flame), plus a low rumble.
    const hiss = ctx.createBiquadFilter();
    hiss.type = "bandpass";
    hiss.frequency.value = 1300;
    hiss.Q.value = 0.9;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 350;
    lfo.connect(lfoDepth).connect(hiss.frequency);
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.5;
    const rumble = ctx.createBiquadFilter();
    rumble.type = "lowpass";
    rumble.frequency.value = 220;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 1.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.18);
    src.connect(hiss).connect(hissGain).connect(gain);
    src.connect(rumble).connect(rumbleGain).connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, Math.random() * 1.5);
    lfo.start(now);
    this.loopNodes = {
      gain,
      stop: (at) => {
        src.stop(at);
        lfo.stop(at);
      },
    };
  }

  // ── The cat ────────────────────────────────────────────────────────────────

  /** The cat's sung "OIIA OIIA" (two bursts) — plays when it catches the player. */
  oiia(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.muted || ctx.state !== "running") return;
    const t0 = ctx.currentTime + 0.02;
    this.sing(ctx, t0, 560, 0.5);
    this.sing(ctx, t0 + OIIA_LEN + 0.06, 575, 0.5);
    this.nextTauntAt = t0 + 3;
  }

  /**
   * Call every frame while the cat chases close behind; it sings one quieter "oiia" now and
   * then (first ~0.45 s after the chase starts, then every ~2.6 s) — rate-limited here.
   */
  chaseTaunt(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    // A gap in calls means a new chase: schedule its first taunt shortly after the stumble.
    if (now - this.lastTauntCall > 0.5) this.nextTauntAt = Math.max(this.nextTauntAt, now + TAUNT_FIRST);
    this.lastTauntCall = now;
    if (now < this.nextTauntAt) return;
    this.nextTauntAt = now + TAUNT_GAP + Math.random() * 1.2;
    this.sing(ctx, now + 0.01, 600 + Math.random() * 60, 0.3);
  }

  /**
   * Formant synthesis of one "o-i-i-a": two detuned sawtooths (the glottal buzz) with delayed
   * vibrato, gliding between syllable pitches, through three peaking filters that move between
   * vowel formants and a lowpass that darkens the rounded "o". Syllables are articulated by
   * short level dips, so it reads as sung words rather than a siren.
   */
  private sing(ctx: AudioContext, t0: number, base: number, level: number) {
    const end = t0 + OIIA_LEN;
    const glide = 0.045;

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = "sawtooth";
    oscB.type = "sawtooth";
    oscB.detune.value = 9;
    const mixB = ctx.createGain();
    mixB.gain.value = 0.5;

    // Vibrato (in cents, so the depth doesn't depend on pitch), easing in like a singer's.
    const vib = ctx.createOscillator();
    vib.frequency.value = 6;
    const vibDepth = ctx.createGain();
    vibDepth.gain.setValueAtTime(0, t0);
    vibDepth.gain.linearRampToValueAtTime(10, t0 + 0.2);
    vibDepth.gain.linearRampToValueAtTime(38, end);
    vib.connect(vibDepth);
    vibDepth.connect(oscA.detune);
    vibDepth.connect(oscB.detune);

    const pre = ctx.createGain();
    pre.gain.value = 0.2;
    oscA.connect(pre);
    oscB.connect(mixB).connect(pre);

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 180;
    let node: AudioNode = pre.connect(hp);
    const formants = FORMANT_GAIN.map((gain, k) => {
      const f = ctx.createBiquadFilter();
      f.type = "peaking";
      f.gain.value = gain;
      f.Q.value = FORMANT_Q[k];
      node = node.connect(f);
      return f;
    });
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.8;
    node = node.connect(lp);

    const amp = ctx.createGain();
    node.connect(amp).connect(this.sfxBus!);

    amp.gain.setValueAtTime(0, t0);
    OIIA.forEach(([at, vowel, pitch, dip], i) => {
      const t = t0 + at;
      const v = VOWEL[vowel];
      const f0 = base * pitch;
      if (i === 0) {
        oscA.frequency.setValueAtTime(f0 * 0.94, t);
        oscB.frequency.setValueAtTime(f0 * 0.94, t);
        oscA.frequency.linearRampToValueAtTime(f0, t + 0.06);
        oscB.frequency.linearRampToValueAtTime(f0, t + 0.06);
        formants.forEach((f, k) => f.frequency.setValueAtTime(v.f[k], t));
        lp.frequency.setValueAtTime(v.lp, t);
        amp.gain.linearRampToValueAtTime(level * v.g, t + 0.03);
        return;
      }
      // Hold the previous syllable up to here, then glide pitch + formants into this one.
      const [, prevVowel, prevPitch] = OIIA[i - 1];
      const prev = VOWEL[prevVowel];
      for (const o of [oscA, oscB]) {
        o.frequency.setValueAtTime(base * prevPitch, t);
        o.frequency.linearRampToValueAtTime(f0, t + glide);
      }
      formants.forEach((f, k) => {
        f.frequency.setValueAtTime(prev.f[k], t);
        f.frequency.linearRampToValueAtTime(v.f[k], t + glide);
      });
      lp.frequency.setValueAtTime(prev.lp, t);
      lp.frequency.linearRampToValueAtTime(v.lp, t + glide);
      // Articulation dip between syllables (held briefly so "i-i" reads as two syllables).
      amp.gain.setValueAtTime(level * prev.g, t - 0.035);
      amp.gain.linearRampToValueAtTime(level * v.g * dip, t);
      amp.gain.setValueAtTime(level * v.g * dip, t + 0.012);
      amp.gain.linearRampToValueAtTime(level * v.g, t + 0.05);
    });
    // "a" sags in pitch and fades out.
    const last = OIIA[OIIA.length - 1];
    const tailFrom = t0 + last[0] + glide + 0.02;
    for (const o of [oscA, oscB]) {
      o.frequency.setValueAtTime(base * last[2], tailFrom);
      o.frequency.exponentialRampToValueAtTime(base * last[2] * 0.82, end);
    }
    amp.gain.setValueAtTime(level * VOWEL[last[1]].g, end - 0.12);
    amp.gain.linearRampToValueAtTime(0, end);

    for (const o of [oscA, oscB, vib]) {
      o.start(t0);
      o.stop(end + 0.05);
    }
  }

  // ── Music ──────────────────────────────────────────────────────────────────

  /** Starts the run music from the top (or just un-ducks it if it is already playing). */
  startMusic(): void {
    this.wantMusic = true;
    this.duckMusic(false);
    if (this.ctx) this.beginMusic();
  }

  /** Fades the music out and forgets the track (the next start begins from the top). */
  stopMusic(fade = 0.35): void {
    this.wantMusic = false;
    this.stopSynthMusic();
    const ctx = this.ctx;
    for (const v of [this.music, this.fading]) {
      if (!v || !ctx) continue;
      const now = ctx.currentTime;
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + fade);
      v.src.stop(now + fade + 0.05);
    }
    this.music = null;
    this.fading = null;
  }

  /** Lowers the music under the pause menu and the caught sequence. */
  duckMusic(on: boolean): void {
    this.ducked = on;
    if (this.duck && this.ctx) this.duck.gain.setTargetAtTime(on ? DUCKED : 1, this.ctx.currentTime, on ? 0.08 : 0.15);
  }

  /**
   * Called every running frame with the run speed: past CLIMAX_SPEED the faster climax mix
   * takes over, crossfading on the main loop's next bar line so the beat doesn't stumble.
   */
  setSpeed(speed: number): void {
    const ctx = this.ctx;
    const cur = this.music;
    if (!ctx || !cur || cur.track !== "main" || speed < CLIMAX_PREFETCH_SPEED) return;
    if (this.trackState.climax === "idle") this.loadTrack("climax");
    const climax = this.tracks.get("climax");
    if (!climax || speed < CLIMAX_SPEED || !this.duck) return;

    const now = ctx.currentTime;
    const bar = 240 / TRACKS.main.bpm;
    const pos = Math.max(0, now - cur.startedAt) % TRACKS.main.seconds;
    let at = now + (bar - (pos % bar));
    if (at - now < 0.05) at += bar;
    const fade = 240 / TRACKS.climax.bpm;

    cur.gain.gain.setValueAtTime(1, at);
    cur.gain.gain.linearRampToValueAtTime(0, at + fade);
    cur.src.stop(at + fade + 0.05);
    this.fading = cur;
    const next = this.startTrack(ctx, "climax", climax, at, fade);
    this.music = next;
  }

  private beginMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.wantMusic || this.music || this.synthTimer !== null) return;
    const main = this.tracks.get("main");
    // Music muted and nothing fetched yet: don't spend ~1 MB until it is switched back on.
    if (!main && this.musicMuted) return;
    if (main) {
      this.music = this.startTrack(ctx, "main", main, ctx.currentTime + 0.02, 0.25);
      return;
    }
    if (this.trackState.main === "failed") this.startSynthMusic();
    else this.loadTrack("main");
  }

  private startTrack(ctx: AudioContext, track: TrackId, d: Decoded, at: number, fadeIn: number): MusicVoice {
    const src = ctx.createBufferSource();
    src.buffer = d.buffer;
    src.loop = true;
    src.loopStart = d.lead;
    src.loopEnd = d.lead + TRACKS[track].seconds;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + fadeIn);
    src.connect(gain).connect(this.duck!);
    src.start(at, d.lead);
    return { src, gain, track, startedAt: at };
  }

  private startSynthMusic() {
    if (this.synthTimer !== null || !this.ctx) return;
    this.nextStep = this.ctx.currentTime + 0.05;
    this.step = 0;
    this.synthTimer = window.setInterval(() => this.scheduleSynth(), 60);
  }

  private stopSynthMusic() {
    if (this.synthTimer !== null) window.clearInterval(this.synthTimer);
    this.synthTimer = null;
  }

  private scheduleSynth() {
    const ctx = this.ctx;
    if (!ctx || !this.duck) return;
    const stepDur = 60 / SYNTH_BPM / 4;
    while (this.nextStep < ctx.currentTime + 0.2) {
      const i = this.step % 16;
      const bass = BASS[i];
      if (bass !== null) this.note(ctx, 110 * Math.pow(2, bass / 12), this.nextStep, stepDur * 1.8, "triangle", 0.5);
      if (i % 2 === 0 || this.step % 64 >= 32) this.note(ctx, 220 * Math.pow(2, LEAD[i] / 12), this.nextStep, stepDur * 0.8, "square", 0.08);
      this.nextStep += stepDur;
      this.step++;
    }
  }

  private note(ctx: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, gain: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(this.duck!);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  // ── Flags & lifetime ───────────────────────────────────────────────────────

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER, now, 0.015);
    }
    if (muted) this.setLoop("jetpack", false);
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(muted ? 0 : MUSIC, now, 0.015);
    }
    if (!muted && this.wantMusic) this.beginMusic();
    else if (!muted) this.prefetchMusic();
  }

  /** Dev/test: what decoded and what is playing. */
  debugInfo(): AudioDebugInfo {
    const durations: Record<string, number> = {};
    const musicLead: Record<string, number> = {};
    for (const [k, v] of this.sfx) durations[k] = round3(v.buffer.duration);
    for (const [k, v] of this.tracks) {
      durations[`music-${k}`] = round3(v.buffer.duration);
      musicLead[k] = round3(v.lead);
    }
    return {
      state: this.ctx?.state ?? "none",
      sfxTotal: SFX_NAMES.length,
      sfxLoaded: this.sfx.size,
      sfxFailed: this.sfxFailed,
      music: { ...this.trackState },
      playing: this.music?.track ?? (this.synthTimer !== null ? "synth" : null),
      durations,
      musicLead,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.stopMusic(0.05);
    this.setLoop("jetpack", false);
    this.disposed = true;
    if (this.listening) {
      window.removeEventListener("pointerdown", this.unlock);
      window.removeEventListener("pointerup", this.unlock);
      window.removeEventListener("keydown", this.unlock);
      window.removeEventListener("touchend", this.unlock);
      document.removeEventListener("visibilitychange", this.onVisibility);
      this.listening = false;
    }
    const ctx = this.ctx;
    this.ctx = null;
    this.sfx.clear();
    this.tracks.clear();
    this.bytes.clear();
    this.coinSrc.fill(null);
    if (ctx) void ctx.suspend().catch(() => {}).then(() => ctx.close().catch(() => {}));
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sfxUrl = (name: SfxName) => asset(`/audio/sfx/${name}.mp3`);

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.arrayBuffer();
}

/** Works with both the promise and the old callback-only (Safari) decodeAudioData signatures. */
function decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    p?.then(resolve, reject);
  });
}

/** Seconds of near-silence at the start of a buffer (decoder padding), up to `max`. */
function leadingSilence(buffer: AudioBuffer, threshold: number, max: number): number {
  const n = Math.min(buffer.length, Math.ceil(max * buffer.sampleRate));
  const chans: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) chans.push(buffer.getChannelData(c));
  for (let i = 0; i < n; i++) {
    for (const ch of chans) if (Math.abs(ch[i]) > threshold) return Math.max(0, i - 1) / buffer.sampleRate;
  }
  return 0;
}

/**
 * 2 s of soft (one-pole low-passed) noise for the jetpack. Its memory is a few samples, so the
 * loop seam is as random as any other point — no cross-fade needed.
 */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    y = y * 0.6 + (Math.random() * 2 - 1) * 0.4;
    d[i] = y * 1.6;
  }
  return buf;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
