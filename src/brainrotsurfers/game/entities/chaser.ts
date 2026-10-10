import * as THREE from "three";
import { CAMERA, CAT } from "../config";
import type { LoadedModel } from "../models";

const FALL_HOLD = 1.2;
const FALL_ACCEL = 6;
const FALL_VMAX = 10;
const RUN_SIDE = 0.75;

/**
 * The OIIA cat. Always spinning. Pure distance-behind logic: starts close, falls back out of
 * view, snaps in after a stumble (chase), zooms in when the player is caught.
 */
export class Chaser {
  readonly root = new THREE.Group();
  private readonly spinner = new THREE.Group();
  /** Metres behind the player. */
  gap: number = CAT.hiddenGap;
  /** Remaining chase seconds (> 0 = close behind, next stumble catches). */
  chaseT = 0;
  catching = false;
  private spin = 0;
  private x = 0;
  private y = 0;
  private bob = 0;
  /** Seconds since the run (or the last chase) started — drives the visible fall-back. */
  private sinceStart = 0;

  constructor() {
    this.root.add(this.spinner);
  }

  setModel(model: LoadedModel): void {
    this.spinner.clear();
    this.spinner.add(model.root);
  }

  get chaseActive(): boolean {
    return this.chaseT > 0;
  }

  resetForRun(): void {
    this.gap = CAT.startGap;
    this.chaseT = 0;
    this.catching = false;
    this.sinceStart = 0;
  }

  startChase(): void {
    this.chaseT = CAT.chaseTime;
    // Snap in from just behind the camera rather than flying through it from far back.
    this.gap = Math.min(this.gap, CAMERA.back + 0.4);
  }

  /** Places the cat relative to the player. `menu` parks it behind the character on stage. */
  update(dt: number, px: number, pz: number, groundY: number, mode: "run" | "menu" | "caught"): void {
    if (this.chaseT > 0) this.chaseT = Math.max(0, this.chaseT - dt);
    let target: number;
    let rate: number;
    if (mode === "menu") {
      target = 3.6;
      rate = 6;
    } else if (mode === "caught") {
      target = 0.9;
      rate = 5;
    } else if (this.chaseT > 0) {
      target = CAT.chaseGap;
      rate = 6;
    } else {
      target = CAT.hiddenGap;
      rate = 0;
    }
    if (mode === "run" && this.chaseT <= 0) {
      // Visible fall-back: hold right behind the runner while the camera settles, then drop
      // back with an ease-in (v = 6·t, capped) — about 2 s from startGap out of view.
      this.sinceStart += dt;
      const t = this.sinceStart - FALL_HOLD;
      if (t <= 0) this.gap += (CAT.startGap - this.gap) * (1 - Math.exp(-6 * dt));
      else this.gap = Math.min(target, this.gap + Math.min(FALL_VMAX, t * FALL_ACCEL) * dt);
    } else {
      this.gap += (target - this.gap) * (1 - Math.exp(-rate * dt));
    }
    const lag = mode === "caught" ? 4 : 7;
    // Running, the cat trails a little to the side (toward the track centre): straight behind,
    // it sits between the chase camera and the runner and hides the feet you time jumps by.
    const tx = mode === "caught" ? px + 0.9 : mode === "run" ? px + (px > 0.5 ? -RUN_SIDE : RUN_SIDE) : px;
    this.x += (tx - this.x) * (1 - Math.exp(-lag * dt));
    this.y += (groundY - this.y) * (1 - Math.exp(-5 * dt));
    const revs = mode === "caught" || this.chaseT > 0 ? CAT.spinCatch : CAT.spinRun;
    this.spin += dt * revs * Math.PI * 2;
    this.bob += dt * 9;
    this.spinner.rotation.y = this.spin;
    this.root.position.set(this.x, this.y + Math.abs(Math.sin(this.bob)) * 0.18, pz + this.gap);
    this.root.visible = mode !== "run" || this.gap < CAT.hiddenGap - 1.5;
  }

  snapTo(px: number, groundY: number): void {
    this.x = px;
    this.y = groundY;
  }
}
