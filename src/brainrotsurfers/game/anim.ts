import * as THREE from "three";
import type { MotionStyle } from "../lib/characters";
import type { LoadedModel } from "./models";

/**
 * Procedural character animation on a wrapper rig, so it works for ANY model (placeholder or
 * GLB) without bones: run hop + lean + squash/stretch + sway, jump stretch/tuck, roll flip,
 * stumble wobble, lane lean, idle breathing. When the def maps a clip to the current mode it
 * plays through an AnimationMixer and the procedural layer only adds the whole-body motion;
 * modes without a clip fade the clip out, and the mixer then restores the (posed) rest state.
 * Per-character flavour (hop height, waddle, swim wiggle, banking, pirouettes) comes from
 * `CharacterDef.motion`.
 *
 * Rig: root (placed at the feet by the entity; yaw) → lift (hop/hover offset, squash scale about
 * the feet) → pivot (at mid-height: lean, flip, wobble) → holder (offset back down) → model.
 */

export type AnimMode = "idle" | "shop" | "run" | "air" | "roll" | "jet" | "caught";

export interface AnimInput {
  mode: AnimMode;
  /** Forward speed (run cadence, clip time scale). */
  speed: number;
  /** Lateral velocity (m/s): lean into lane changes. */
  laneVel: number;
  vy: number;
  /** 0..1 progress through the current roll. */
  rollProgress: number;
  /** 1 right after a stumble, decaying to 0. */
  stumble: number;
  hover: boolean;
}

export interface ClipNames {
  run?: string;
  idle?: string;
  jump?: string;
  roll?: string;
  caught?: string;
}

/** Run speed the clip speeds and cadences are tuned at (config start speed). */
const BASE_SPEED = 15;
/** Uniform-ish scale while rolling: a 1.85 m character tucks under the 1.15 m roll bar. */
const ROLL_TUCK = 0.58;
/** One pirouette lasts about as long as a normal jump's rise and fall. */
const SPIN_JUMP_TIME = 0.55;

const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

const DEFAULT_MOTION: Required<Omit<MotionStyle, "spinJump" | "clipSpeed">> = {
  hop: 0.16,
  cadence: 1,
  lean: 0.14,
  squash: 0.12,
  sway: 0.06,
  swim: 0,
  bank: 1,
};

export class CharacterAnimator {
  readonly root = new THREE.Group();
  private readonly lift = new THREE.Group();
  private readonly pivot = new THREE.Group();
  private readonly holder = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private clipNames: ClipNames = {};
  private motion: MotionStyle = {};
  private phase = 0;
  private time = 0;
  private airT = 0;
  private sx = 1;
  private sy = 1;
  private leanX = 0;
  private leanZ = 0;
  private flip = 0;
  private hopY = 0;
  private yaw = 0;
  private mode: AnimMode | null = null;

  constructor() {
    this.root.add(this.lift);
    this.lift.add(this.pivot);
    this.pivot.add(this.holder);
    this.setPivot(0.85);
  }

  /** Lean/flip about the body's middle, so a roll spins in place instead of digging in. */
  private setPivot(y: number) {
    this.pivot.position.y = y;
    this.holder.position.y = -y;
  }

  /**
   * Swaps the displayed model (removes the previous one; disposal belongs to ModelLibrary).
   * Clip names and motion style come from the model's def unless `clips` overrides them.
   */
  setModel(loaded: LoadedModel, clips?: ClipNames): void {
    if (this.model) this.holder.remove(this.model);
    this.mode = null;
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.actions.clear();
    this.current = null;
    this.model = loaded.root;
    this.holder.add(loaded.root);
    this.clipNames = clips ?? loaded.def.clips ?? {};
    this.motion = loaded.def.motion ?? {};
    this.setPivot(loaded.height / 2);
    // Only mapped clips get actions: unmapped ones (T-poses, death throes) never play.
    const wanted = new Set(Object.values(this.clipNames).filter(Boolean));
    const usable = loaded.clips.filter((c) => wanted.has(c.name));
    if (usable.length) {
      this.mixer = new THREE.AnimationMixer(loaded.animRoot);
      for (const clip of usable) {
        const action = this.mixer.clipAction(clip);
        if (clip.name === this.clipNames.caught) {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }
        this.actions.set(clip.name, action);
      }
    }
    this.reset();
  }

  /** Adds an accessory to the body (holder space: feet at y = 0); it leans, flips and squashes with it. */
  attach(obj: THREE.Object3D): void {
    this.holder.add(obj);
  }

  get hasClips(): boolean {
    return this.mixer !== null;
  }

  /** Cross-fades to `name`, or fades the current clip out (back to the rest pose) when unset. */
  private playClip(name: string | undefined, timeScale: number) {
    if (!this.mixer) return;
    const next = name ? this.actions.get(name) : undefined;
    if (!next) {
      if (this.current) {
        this.current.fadeOut(0.2);
        this.current = null;
      }
      return;
    }
    next.timeScale = timeScale;
    if (next === this.current) return;
    next.reset().fadeIn(0.15).play();
    this.current?.fadeOut(0.15);
    this.current = next;
  }

  update(dt: number, s: AnimInput): void {
    this.time += dt;
    const m = this.motion;
    const hop0 = m.hop ?? (this.clipNames.run ? 0.04 : DEFAULT_MOTION.hop);
    const bank = m.bank ?? DEFAULT_MOTION.bank;
    // Cadence and clip speed grow slower than speed (real runners lengthen their stride).
    const pace = Math.pow(Math.max(s.speed, 1) / BASE_SPEED, 0.6);
    let tsx = 1;
    let tsy = 1;
    let leanX = 0;
    // Lane-switch lean; laneVel peaks around 50 m/s, so clamp to a readable tilt.
    const maxBank = 0.32 * bank;
    let leanZ = Math.max(-maxBank, Math.min(maxBank, -s.laneVel * 0.012 * bank));
    let hop = 0;
    let flip = 0;
    let yaw = 0;
    let turn = 0;
    if (s.mode !== "air") this.airT = 0;

    switch (s.mode) {
      case "idle":
      case "shop": {
        const b = Math.sin(this.time * 2.4);
        tsy = 1 + b * 0.025;
        tsx = 1 - b * 0.012;
        hop = s.hover ? 0.35 + Math.sin(this.time * 2) * 0.08 : 0;
        leanZ = Math.sin(this.time * 1.3) * (s.hover ? 0.08 : 0.03);
        // Shop: a slow sway that keeps the face toward the camera most of the time.
        if (s.mode === "shop") turn = Math.sin(this.time * 0.55) * 0.45;
        this.playClip(this.clipNames.idle, 1);
        break;
      }
      case "run": {
        this.phase += dt * BASE_SPEED * pace * 0.62 * (m.cadence ?? DEFAULT_MOTION.cadence);
        const st = Math.abs(Math.sin(this.phase));
        if (s.hover) {
          hop = 0.45 + Math.sin(this.time * 5) * 0.07;
          leanX = -(m.lean ?? 0.06);
          // Lazy roll while cruising; lane changes bank on top of it.
          leanZ += Math.sin(this.time * 1.7) * 0.07;
          yaw = Math.sin(this.time * 1.1) * 0.05;
        } else {
          const sq = m.squash ?? DEFAULT_MOTION.squash;
          hop = st * hop0;
          // Squash on contact, stretch at the top of each hop.
          tsy = 1 + (st - 0.5) * sq;
          tsx = 1 - (st - 0.5) * sq * 0.5;
          leanX = -(m.lean ?? DEFAULT_MOTION.lean);
          leanZ += Math.sin(this.phase) * (m.sway ?? DEFAULT_MOTION.sway);
          yaw = Math.sin(this.phase) * (m.swim ?? DEFAULT_MOTION.swim);
        }
        this.playClip(this.clipNames.run, pace * (m.clipSpeed ?? 1));
        break;
      }
      case "air":
        this.airT += dt;
        tsy = s.vy > 0 ? 1.12 : 0.94;
        tsx = s.vy > 0 ? 0.92 : 1.04;
        leanX = s.vy > 0 ? -0.1 : 0.12;
        hop = s.hover ? 0.3 : 0;
        if (m.spinJump) yaw = Math.PI * 2 * smooth(Math.min(1, this.airT / SPIN_JUMP_TIME));
        this.playClip(this.clipNames.jump ?? this.clipNames.run, pace * (m.clipSpeed ?? 1) * 0.6);
        break;
      case "roll":
        flip = -Math.PI * 2 * s.rollProgress;
        // Tucked into a ball spinning about its middle: stays above the ground at any angle.
        tsy = ROLL_TUCK;
        tsx = ROLL_TUCK * 1.2;
        hop = s.hover ? 0.2 : 0.02;
        this.playClip(this.clipNames.roll ?? this.clipNames.run, pace * (m.clipSpeed ?? 1) * 1.4);
        break;
      case "jet":
        leanX = -0.35;
        hop = Math.sin(this.time * 5) * 0.08;
        this.playClip(this.clipNames.idle, 1);
        break;
      case "caught":
        if (this.clipNames.caught) {
          leanX = 0.15;
        } else {
          tsy = 0.4;
          tsx = 1.35;
          leanX = 0.3;
        }
        this.playClip(this.clipNames.caught, 1);
        break;
    }

    if (s.stumble > 0) leanZ += Math.sin(this.time * 32) * 0.3 * s.stumble;

    // A roll starts tucked: the hitbox drops to roll height on the same step, so easing the
    // squash in would push the head through a bar the runner clears.
    if (s.mode === "roll" && this.mode !== "roll") {
      this.sx = tsx;
      this.sy = tsy;
    }
    this.mode = s.mode;

    // Roll flips and jump spins are driven directly (they must finish exactly on time).
    this.flip = s.mode === "roll" ? flip : damp(this.flip, 0, 18, dt);
    this.yaw = s.mode === "air" && m.spinJump ? yaw : damp(this.yaw, yaw, 12, dt);
    const fast = s.mode === "roll" || s.mode === "air" ? 22 : 14;
    this.sx = damp(this.sx, tsx, fast, dt);
    this.sy = damp(this.sy, tsy, fast, dt);
    this.leanX = damp(this.leanX, leanX, 10, dt);
    this.leanZ = damp(this.leanZ, leanZ, 12, dt);
    this.hopY = s.mode === "run" && !s.hover ? hop : damp(this.hopY, hop, 10, dt);

    this.lift.position.y = this.hopY;
    this.lift.scale.set(this.sx, this.sy, this.sx);
    this.pivot.rotation.set(this.leanX + this.flip, 0, this.leanZ);
    this.root.rotation.y = turn + this.yaw;
    this.mixer?.update(dt);
  }

  /** Resets transient motion (new run, swapped character). */
  reset(): void {
    this.mode = null;
    this.phase = 0;
    this.flip = 0;
    this.airT = 0;
    this.yaw = 0;
    this.sx = this.sy = 1;
    this.leanX = this.leanZ = 0;
    this.hopY = 0;
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t);
