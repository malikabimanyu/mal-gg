import * as THREE from "three";
import { CAMERA } from "./config";

/**
 * Camera rig. Poses are expressed relative to the player's z (x and y are absolute) so the
 * camera never lags behind a 33 m/s runner; blending between poses (menu → chase → caught)
 * damps those relative offsets. Adds lane-change roll and trauma-style shake.
 */
export type CameraMode = "menu" | "shop" | "chase" | "caught";

const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = "menu";
  private readonly rel = new THREE.Vector3(1.4, 2.0, -4.6);
  private readonly look = new THREE.Vector3(0, 1.0, 0);
  private readonly tRel = new THREE.Vector3();
  private readonly tLook = new THREE.Vector3();
  private readonly lookWorld = new THREE.Vector3();
  private baseY = 0;
  private roll = 0;
  private shakeAmp = 0;
  private time = 0;
  private portrait = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fovLandscape, aspect, 0.1, 500);
    this.resize(aspect);
  }

  /** Wider vertical FOV and a slightly higher/further camera on portrait screens. */
  resize(aspect: number): void {
    const c = this.camera;
    c.aspect = aspect;
    // Keep ~52° of horizontal view so all three lanes stay on screen.
    const wantH = THREE.MathUtils.degToRad(52);
    const vFromH = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(wantH / 2) / aspect));
    c.fov = THREE.MathUtils.clamp(vFromH, CAMERA.fovLandscape, CAMERA.fovPortraitMax);
    this.portrait = THREE.MathUtils.clamp((1 - aspect) / 0.5, 0, 1);
    c.updateProjectionMatrix();
  }

  shake(amount: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
  }

  /** Jump straight to the current mode's pose (no blend). */
  snap(px: number, groundY: number): void {
    this.target(px, groundY);
    this.rel.copy(this.tRel);
    this.look.copy(this.tLook);
    this.baseY = groundY;
  }

  private target(px: number, groundY: number) {
    const p = this.portrait;
    switch (this.mode) {
      case "menu":
        // Looking a little above the head keeps tall characters under the logo + tagline.
        this.tRel.set(px + 1.5, 2.1 + p * 0.5, -4.8 - p * 1.4);
        this.tLook.set(px - 0.2, 1.35 + p * 0.2, 0);
        break;
      case "shop":
        // Portrait: closer, so the character fills ~35 % of the height between the name block
        // and the buy button instead of floating small in the sky.
        this.tRel.set(px, 1.5 - p * 0.15, -3.9 + p * 0.65);
        this.tLook.set(px, 0.95 - p * 0.05, 0);
        break;
      case "chase":
        this.tRel.set(px * CAMERA.followX, groundY + CAMERA.height + p * 0.9, CAMERA.back + p * 1.6);
        this.tLook.set(px * CAMERA.followX * 1.1, groundY + CAMERA.lookHeight, -CAMERA.lookAhead);
        break;
      case "caught":
        // High and behind, offset toward the OUTSIDE of the track (left lane → further left) so
        // the camera never hangs over a neighbouring lane's train roof, which would hide the
        // knock-out. The centre lane leans right, just past the right lane's roof edge.
        this.tRel.set(px + (px < -0.1 ? -1.3 : 1.3), groundY + 5.4 + p * 1.2, 3.4 + p * 1.5);
        this.tLook.set(px, groundY + 0.5, -0.6);
        break;
    }
  }

  /**
   * @param groundY surface the player runs on (roof/ramp height), smoothed here
   * @param laneVel player's lateral velocity (roll)
   */
  update(dt: number, px: number, pz: number, groundY: number, laneVel: number): void {
    this.time += dt;
    this.baseY += (groundY - this.baseY) * damp(4, dt);
    this.target(px, this.baseY);
    const chase = this.mode === "chase";
    const kx = chase ? 10 : 3.2;
    const ky = chase ? 8 : 3.2;
    const kz = chase ? 6 : 3.2;
    this.rel.x += (this.tRel.x - this.rel.x) * damp(kx, dt);
    this.rel.y += (this.tRel.y - this.rel.y) * damp(ky, dt);
    this.rel.z += (this.tRel.z - this.rel.z) * damp(kz, dt);
    this.look.x += (this.tLook.x - this.look.x) * damp(kx, dt);
    this.look.y += (this.tLook.y - this.look.y) * damp(ky, dt);
    this.look.z += (this.tLook.z - this.look.z) * damp(kz, dt);

    const c = this.camera;
    c.position.set(this.rel.x, this.rel.y, pz + this.rel.z);
    this.shakeAmp = Math.max(0, this.shakeAmp - dt * 1.8);
    const s = this.shakeAmp * this.shakeAmp;
    if (s > 0) {
      c.position.x += Math.sin(this.time * 61) * s * 0.35;
      c.position.y += Math.cos(this.time * 47) * s * 0.3;
    }
    this.lookWorld.set(this.look.x, this.look.y, pz + this.look.z);
    c.lookAt(this.lookWorld);
    const targetRoll = chase ? THREE.MathUtils.clamp(-laneVel * 0.0035, -0.06, 0.06) : 0;
    this.roll += (targetRoll - this.roll) * damp(10, dt);
    c.rotateZ(this.roll);
  }

  shift(dz: number): void {
    // Poses are player-relative; only the camera object itself moves.
    this.camera.position.z += dz;
  }
}
