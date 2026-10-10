import * as THREE from "three";
import type { Curve } from "../curve";
import type { Rng } from "../rng";
import type { EnvAssets } from "./env-assets";
import { createGround } from "./ground";
import { createRails } from "./rails";
import { createScenery } from "./scenery";
import { createSky } from "./sky";
import { TextureBag } from "./textures";

/**
 * The static-looking world around the track. Each piece is a factory returning a WorldPiece;
 * gameplay only calls update/shift — swap any factory for a nicer one without touching the
 * engine. Pieces that just follow the camera snap to their tiling period so nothing slides.
 */
export interface WorldPiece {
  readonly object: THREE.Object3D;
  /** camZ = the anchor z (camera z while it looks down the track); the piece keeps itself around it. */
  update(camZ: number, dt: number): void;
  /** Floating origin: everything moved by +dz. */
  shift?(dz: number): void;
}

export interface World {
  readonly pieces: WorldPiece[];
  readonly sky: ReturnType<typeof createSky>;
  /**
   * Per frame. Pieces cover a window around an anchor z: the camera's z while it looks down
   * the track, pushed back by up to VIEW_BACK as it turns to look behind (menu/shop face the
   * character), so the street, rails and buildings fill that view too.
   */
  update(camera: THREE.Camera, dt: number): void;
  shift(dz: number): void;
  /** Swaps in the env models once loaded (null keeps the placeholders). */
  useEnv(env: EnvAssets | null): void;
  dispose(): void;
}

/** How far past the camera (+z) the world is kept when it looks fully backwards. */
const VIEW_BACK = 130;

export function createWorld(scene: THREE.Scene, curve: Curve, rng: Rng): World {
  const dir = new THREE.Vector3();
  const bag = new TextureBag();
  const sky = createSky(scene, bag);
  const scenery = createScenery(bag, rng);
  const pieces: WorldPiece[] = [createGround(bag, rng), createRails(), scenery];
  for (const p of pieces) {
    curve.patchObject(p.object);
    scene.add(p.object);
  }
  return {
    pieces,
    sky,
    update(camera, dt) {
      camera.getWorldDirection(dir);
      const h = Math.hypot(dir.x, dir.z) || 1;
      const fx = dir.x / h;
      const fz = dir.z / h;
      sky.update(camera.position, fx, fz);
      const anchor = camera.position.z + Math.max(0, fz) * VIEW_BACK;
      for (const p of pieces) p.update(anchor, dt);
    },
    shift(dz) {
      for (const p of pieces) p.shift?.(dz);
    },
    useEnv(env) {
      scenery.useEnv(env);
    },
    dispose() {
      scenery.dispose();
      bag.dispose();
    },
  };
}
