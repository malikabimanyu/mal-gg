import type * as THREE from "three";
import { POWERUP, WORLD } from "../config";
import type { Body } from "../motor";
import type { PowerUpKind } from "../../lib/store";
import type { VisualKit } from "./visuals";

/** Power-up pickups on the track: tiny pool per kind, bob + spin, radius pickup. */
const KINDS: PowerUpKind[] = ["magnet", "sneakers", "multiplier", "jetpack"];
const PER_KIND = 3;

interface Pickup {
  kind: PowerUpKind;
  obj: THREE.Object3D;
  live: boolean;
  x: number;
  y: number;
  z: number;
}

export class PowerUpField {
  private readonly pickups: Pickup[] = [];
  private t = 0;

  constructor(kit: VisualKit, parent: THREE.Object3D) {
    for (const kind of KINDS) {
      for (let i = 0; i < PER_KIND; i++) {
        const obj = kit.createPowerUpMesh(kind);
        obj.visible = false;
        parent.add(obj);
        this.pickups.push({ kind, obj, live: false, x: 0, y: 0, z: 0 });
      }
    }
  }

  /** True if a pickup of this kind is already on the track. */
  hasLive(kind: PowerUpKind): boolean {
    return this.pickups.some((p) => p.live && p.kind === kind);
  }

  spawn(kind: PowerUpKind, x: number, y: number, z: number): void {
    const p = this.pickups.find((q) => !q.live && q.kind === kind);
    if (!p) return;
    p.live = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.obj.visible = true;
  }

  /** Returns the kind picked up this frame, if any. */
  update(dt: number, b: Body, camZ: number): PowerUpKind | null {
    this.t += dt;
    let got: PowerUpKind | null = null;
    const cy = b.y + 0.8;
    for (const p of this.pickups) {
      if (!p.live) continue;
      const dx = p.x - b.x;
      const dy = p.y - cy;
      const dz = p.z - b.z;
      if (!got && dx * dx + dy * dy + dz * dz < POWERUP.pickupRadius * POWERUP.pickupRadius) {
        got = p.kind;
        p.live = false;
        p.obj.visible = false;
        continue;
      }
      if (p.z > camZ + WORLD.despawnBehind) {
        p.live = false;
        p.obj.visible = false;
        continue;
      }
      p.obj.position.set(p.x, p.y + Math.sin(this.t * 3 + p.z) * 0.15, p.z);
      p.obj.rotation.y = this.t * 2.5;
    }
    return got;
  }

  clear(): void {
    for (const p of this.pickups) {
      p.live = false;
      p.obj.visible = false;
    }
  }

  shift(dz: number): void {
    for (const p of this.pickups) p.z += dz;
  }
}
