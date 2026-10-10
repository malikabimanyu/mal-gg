import * as THREE from "three";
import { LANES } from "../config";
import type { WorldPiece } from "./index";

/**
 * Three pairs of rails on sleepers, all instanced (2 draw calls). Instances are laid out once
 * in local space; the group snaps to the sleeper period, so no per-frame matrix updates.
 */
const PERIOD = 3.6;
const SLEEPER_GAP = 0.9;
const AHEAD = 230;
const BEHIND = 25;

export function createRails(): WorldPiece {
  const group = new THREE.Group();
  group.name = "rails";
  const segments = Math.ceil((AHEAD + BEHIND) / PERIOD);
  const sleepersPerSeg = Math.round(PERIOD / SLEEPER_GAP);
  const m = new THREE.Matrix4();

  const sleepers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.3, 0.14, 0.38),
    new THREE.MeshLambertMaterial({ color: "#7a5236" }),
    segments * sleepersPerSeg * LANES.length,
  );
  const rails = new THREE.InstancedMesh(
    // Subdivided along z so the curved-world bend stays smooth.
    new THREE.BoxGeometry(0.12, 0.16, PERIOD, 1, 1, 2),
    new THREE.MeshStandardMaterial({ color: "#c9ccd6", metalness: 0.6, roughness: 0.35 }),
    segments * 2 * LANES.length,
  );
  let si = 0;
  let ri = 0;
  for (let s = 0; s < segments; s++) {
    const z0 = BEHIND - s * PERIOD;
    for (const x of LANES) {
      for (let k = 0; k < sleepersPerSeg; k++) {
        m.makeTranslation(x, 0.05, z0 - k * SLEEPER_GAP);
        sleepers.setMatrixAt(si++, m);
      }
      for (const off of [-0.72, 0.72]) {
        m.makeTranslation(x + off, 0.2, z0 - PERIOD / 2);
        rails.setMatrixAt(ri++, m);
      }
    }
  }
  sleepers.frustumCulled = false;
  rails.frustumCulled = false;
  group.add(sleepers, rails);

  return {
    object: group,
    update(camZ) {
      group.position.z = Math.floor(camZ / PERIOD) * PERIOD;
    },
  };
}
