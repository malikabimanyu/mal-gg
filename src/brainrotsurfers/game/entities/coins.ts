import * as THREE from "three";
import { COIN, OBSTACLE, POWERUP, SHADOW_Y, WORLD } from "../config";
import { bodyHeight } from "../collision";
import type { Body } from "../motor";
import type { VisualKit } from "./visuals";

/**
 * All coins in one InstancedMesh (+ one for their blob shadows). Data lives in typed arrays,
 * live slots are packed into the instance buffer each frame — no per-frame allocation.
 */
export class CoinField {
  readonly mesh: THREE.InstancedMesh;
  readonly shadows: THREE.InstancedMesh;
  private readonly x = new Float32Array(COIN.pool);
  private readonly y = new Float32Array(COIN.pool);
  private readonly z = new Float32Array(COIN.pool);
  private readonly shadowY = new Float32Array(COIN.pool);
  private readonly attract = new Uint8Array(COIN.pool);
  private readonly live = new Int32Array(COIN.pool);
  private liveCount = 0;
  private readonly free = new Int32Array(COIN.pool);
  private freeCount = 0;
  private spin = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly qFlat = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly sShadow = new THREE.Vector3(0.9, 1, 0.9);
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(kit: VisualKit, parent: THREE.Object3D) {
    this.mesh = kit.createCoinMesh(COIN.pool);
    this.shadows = kit.createCoinShadowMesh(COIN.pool);
    parent.add(this.shadows, this.mesh);
    this.clear();
  }

  get count(): number {
    return this.liveCount;
  }

  spawn(x: number, y: number, z: number): void {
    if (this.freeCount === 0) return;
    const i = this.free[--this.freeCount];
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.attract[i] = 0;
    const onGround = Math.abs(y - COIN.y) < 0.05;
    const onRoof = Math.abs(y - (OBSTACLE.trainH + COIN.y)) < 0.05;
    this.shadowY[i] = onGround ? SHADOW_Y : onRoof ? OBSTACLE.trainH + 0.03 : -1;
    this.live[this.liveCount++] = i;
  }

  /**
   * Moves attracted coins, collects touching ones, despawns passed ones and rebuilds the
   * instance buffers. Returns how many were collected this frame.
   */
  update(dt: number, b: Body, magnet: boolean, camZ: number): number {
    const cy = b.y + bodyHeight(b) / 2;
    const r2 = COIN.radius * COIN.radius;
    let collected = 0;
    const shrink = Math.max(0, 1 - dt * 7);
    for (let k = 0; k < this.liveCount; k++) {
      const i = this.live[k];
      if (magnet && !this.attract[i] && this.z[i] < b.z + 1 && this.z[i] > b.z - POWERUP.magnetRange) this.attract[i] = 1;
      if (this.attract[i]) {
        // Pull in player-relative space so the coin keeps up at any speed.
        let dx = this.x[i] - b.x;
        let dy = this.y[i] - cy;
        let dz = this.z[i] - b.z;
        const d = Math.hypot(dx, dy, dz);
        const f = d > 1e-3 ? Math.max(0, d * shrink - dt * 18) / d : 0;
        dx *= f; dy *= f; dz *= f;
        this.x[i] = b.x + dx;
        this.y[i] = cy + dy;
        this.z[i] = b.z + dz;
        this.shadowY[i] = -1;
      }
      const ex = this.x[i] - b.x;
      const ey = this.y[i] - cy;
      const ez = this.z[i] - b.z;
      const hit = ex * ex + ey * ey + ez * ez < r2;
      const behind = this.z[i] > camZ + WORLD.despawnBehind;
      if (hit || behind) {
        if (hit) collected++;
        this.free[this.freeCount++] = i;
        this.live[k] = this.live[--this.liveCount];
        k--;
      }
    }

    this.spin += dt * 4.2;
    this.q.setFromAxisAngle(this.up, this.spin);
    let shadowCount = 0;
    for (let k = 0; k < this.liveCount; k++) {
      const i = this.live[k];
      this.p.set(this.x[i], this.y[i], this.z[i]);
      this.mesh.setMatrixAt(k, this.m.compose(this.p, this.q, this.s));
      if (this.shadowY[i] >= 0) {
        this.p.y = this.shadowY[i];
        this.shadows.setMatrixAt(shadowCount++, this.m.compose(this.p, this.qFlat, this.sShadow));
      }
    }
    this.mesh.count = this.liveCount;
    this.shadows.count = shadowCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;
    return collected;
  }

  clear(): void {
    this.liveCount = 0;
    this.freeCount = 0;
    for (let i = COIN.pool - 1; i >= 0; i--) this.free[this.freeCount++] = i;
    this.mesh.count = 0;
    this.shadows.count = 0;
  }

  shift(dz: number): void {
    for (let k = 0; k < this.liveCount; k++) this.z[this.live[k]] += dz;
  }
}
