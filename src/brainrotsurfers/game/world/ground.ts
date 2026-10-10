import * as THREE from "three";
import type { Rng } from "../rng";
import type { WorldPiece } from "./index";
import { gravelTexture, pavementTexture, vergeTexture, type TextureBag } from "./textures";

/**
 * Track bed, the low side walls, paved pavements up to the building frontage (x ≈ ±10.5, see
 * scenery.ts) and grass beyond. Follows the camera in 4 m steps.
 */
const AHEAD = 230;
const BEHIND = 30;
const TILE = 4;
/** Pavement from under the wall to just past the building frontage. */
const PAVE_X1 = 11.5;
const PAVE_W = PAVE_X1 - 4.8;

export function createGround(bag: TextureBag, rng: Rng): WorldPiece {
  const group = new THREE.Group();
  group.name = "ground";
  const len = AHEAD + BEHIND;
  const segs = Math.round(len / 2);

  const gravel = gravelTexture(bag, rng);
  gravel.repeat.set(9.6 / TILE, len / TILE);
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, len, 1, segs),
    new THREE.MeshLambertMaterial({ map: gravel }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, 0, BEHIND - len / 2);
  group.add(bed);

  const verge = vergeTexture(bag, rng);
  verge.repeat.set(40 / TILE, len / TILE);
  const vergeMat = new THREE.MeshLambertMaterial({ map: verge });
  const pave = pavementTexture(bag, rng);
  pave.repeat.set(PAVE_W / 2.5, len / 2.5);
  const paveMat = new THREE.MeshLambertMaterial({ map: pave });
  for (const side of [-1, 1]) {
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(40, len, 4, segs), vergeMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(side * (PAVE_X1 + 20), -0.02, BEHIND - len / 2);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(PAVE_W, len, 1, segs), paveMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(side * (PAVE_X1 - PAVE_W / 2), -0.01, BEHIND - len / 2);
    group.add(grass, walk);
  }

  // Low concrete walls between the bed and the verge.
  const wallMat = new THREE.MeshLambertMaterial({ color: "#d9d4e6" });
  const capMat = new THREE.MeshLambertMaterial({ color: "#f4c542" });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, len, 1, 1, segs), wallMat);
    wall.position.set(side * 5.1, 0.45, BEHIND - len / 2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, len, 1, 1, segs), capMat);
    cap.position.set(side * 5.1, 0.95, BEHIND - len / 2);
    group.add(wall, cap);
  }
  group.traverse((o) => (o.frustumCulled = false));

  return {
    object: group,
    update(camZ) {
      group.position.z = Math.floor(camZ / TILE) * TILE;
    },
  };
}
