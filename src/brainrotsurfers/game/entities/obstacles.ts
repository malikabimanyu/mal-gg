import type * as THREE from "three";
import { WORLD, type Lane } from "../config";
import { movingFront } from "../collision";
import { makeObstacle, setObstacle } from "../spawner";
import type { ObstacleData, ObstacleKind } from "../types";
import type { VisualKit } from "./visuals";

/**
 * Live obstacles: a packed array of pure records (what collision reads) plus pooled meshes.
 * Trains are pooled per length. Despawned meshes stay in the scene, hidden, for reuse.
 */
const CAPACITY = 128;

export class ObstacleField {
  /** data[0..count) are live. */
  readonly data: ObstacleData[] = [];
  count = 0;
  private readonly meshes: (THREE.Object3D | null)[] = [];
  private readonly pools = new Map<string, THREE.Object3D[]>();

  constructor(private readonly kit: VisualKit, private readonly parent: THREE.Object3D) {
    for (let i = 0; i < CAPACITY; i++) {
      this.data.push(makeObstacle("jump", 0, 0, 0, 0, 0));
      this.meshes.push(null);
    }
  }

  private poolKey(kind: ObstacleKind, len: number) {
    // Moving trains look different (cab + headlights), so they pool separately.
    return kind === "train" || kind === "trainMoving" ? `${kind}:${len}` : kind;
  }

  private acquire(kind: ObstacleKind, len: number): THREE.Object3D {
    const key = this.poolKey(kind, len);
    const pool = this.pools.get(key);
    const m = pool?.pop();
    if (m) {
      m.visible = true;
      return m;
    }
    let obj: THREE.Object3D;
    switch (kind) {
      case "jump": obj = this.kit.createJumpBarrierMesh(); break;
      case "roll": obj = this.kit.createRollBarrierMesh(); break;
      case "ramp": obj = this.kit.createRampMesh(); break;
      default: obj = this.kit.createTrainMesh(len, kind === "trainMoving");
    }
    obj.userData.poolKey = key;
    this.parent.add(obj);
    return obj;
  }

  private release(obj: THREE.Object3D) {
    obj.visible = false;
    const key = obj.userData.poolKey as string;
    let pool = this.pools.get(key);
    if (!pool) this.pools.set(key, (pool = []));
    pool.push(obj);
  }

  spawn(kind: ObstacleKind, lane: Lane, z0: number, len: number, speed: number, zMeet: number): void {
    if (this.count >= CAPACITY) return;
    const i = this.count++;
    setObstacle(this.data[i], kind, lane, z0, len, speed, zMeet);
    const m = this.acquire(kind, len);
    m.position.set(this.data[i].x, 0, z0);
    this.meshes[i] = m;
  }

  /** Moves moving trains, despawns what is behind the camera. */
  update(playerZ: number, speed: number, camZ: number): void {
    for (let i = 0; i < this.count; i++) {
      const o = this.data[i];
      if (o.kind === "trainMoving") {
        o.z0 = movingFront(o, playerZ, speed);
        this.meshes[i]!.position.z = o.z0;
      }
      if (o.z0 - o.len > camZ + WORLD.despawnBehind) {
        this.removeAt(i);
        i--;
      }
    }
  }

  private removeAt(i: number) {
    this.release(this.meshes[i]!);
    const last = --this.count;
    if (i !== last) {
      // Swap the last live record into the hole (records are reused, never reallocated).
      const tmp = this.data[i];
      this.data[i] = this.data[last];
      this.data[last] = tmp;
      this.meshes[i] = this.meshes[last];
    }
    this.meshes[last] = null;
  }

  clear(): void {
    while (this.count > 0) this.removeAt(this.count - 1);
  }

  /**
   * Removes every obstacle the runner would be inside or on while its z is in [zFar, zNear]
   * (a moving train covers the stretch from its meeting point until it has passed). Used to
   * keep the jetpack's landing stretch empty.
   */
  clearRange(zFar: number, zNear: number, speed: number): void {
    for (let i = 0; i < this.count; i++) {
      const o = this.data[i];
      let near = o.z0;
      let far = o.z0 - o.len;
      if (o.kind === "trainMoving") {
        near = o.zMeet;
        far = o.zMeet - (o.len * speed) / Math.max(1, speed + o.speed);
      }
      if (far < zNear && near > zFar) {
        this.removeAt(i);
        i--;
      }
    }
  }

  shift(dz: number): void {
    for (let i = 0; i < this.count; i++) {
      const o = this.data[i];
      o.z0 += dz;
      o.zMeet += dz;
      this.meshes[i]!.position.z += dz;
    }
  }
}
