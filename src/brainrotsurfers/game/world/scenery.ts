import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pickRng, type Rng } from "../rng";
import type { EnvAssets } from "./env-assets";
import type { WorldPiece } from "./index";
import { facadeTexture, type TextureBag } from "./textures";

/**
 * Both sides of the track.
 *
 * With the env models: pre-merged "street blocks" — 32 m of colourful Kenney buildings (front
 * row facing the track, a skyscraper behind), street lamps leaning over the wall, and
 * hedges/trees/cones/signals on the pavement — each block one geometry with the shared atlas
 * material, i.e. one draw call. A handful of block meshes per side leapfrog from behind the
 * camera to the far end, picking a new block variant each time, so the street never repeats
 * in an obvious rhythm and nothing is allocated while running.
 *
 * Placeholder (env failed to load): instanced coloured boxes + catenary poles.
 */
export interface Scenery extends WorldPiece {
  useEnv(env: EnvAssets | null): void;
  /** Frees the block variants (only the ones on screen are reachable from the scene). */
  dispose(): void;
}

const PER_SIDE = 26;
const AHEAD = 230;
const BEHIND = 30;
/** Street blocks only need to reach the fog (far ≈ 140 m, plus the horizon drop). */
const BLOCK_AHEAD = 150;
const BLOCK_BEHIND = 14;
const POLE_GAP = 24;
const COLORS = ["#ff6b6b", "#ffd93d", "#6bcbff", "#b18cff", "#ff9f43", "#4cd4a0", "#ff8fc7", "#f6f1e9"];

/** Street-block layout (metres from the track centre). */
const BLOCK = 32;
const VARIANTS_PER_SIDE = 6;
/** Blocks per side: enough to cover BEHIND + AHEAD with one spare. */
const BLOCKS_PER_SIDE = Math.ceil((BLOCK_AHEAD + BLOCK_BEHIND) / BLOCK) + 1;
const LAMP_X = 6.3;
const LAMP_GAP = 16;
const FRONTAGE_X = 10.5;
const BUILDINGS = ["bld-a", "bld-b", "bld-c", "bld-d", "bld-e", "bld-f", "bld-g", "bld-h", "bld-i", "bld-k"];
const SKYSCRAPERS = ["sky-a", "sky-b", "sky-c", "sky-e"];

export function createScenery(bag: TextureBag, rng: Rng): Scenery {
  const group = new THREE.Group();
  group.name = "scenery";
  const facade = facadeTexture(bag);

  // ── Placeholder look ───────────────────────────────────────────────────────
  const count = PER_SIDE * 2;
  const buildings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1, 1, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ map: facade }),
    count,
  );
  buildings.frustumCulled = false;
  const zs = new Float32Array(count);
  const depths = new Float32Array(count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const color = new THREE.Color();
  const far = [BEHIND, BEHIND];

  const place = (i: number) => {
    const side = i % 2;
    const depth = 7 + rng() * 9;
    const width = 5 + rng() * 6;
    const height = 4 + rng() * 9;
    const gap = 1 + rng() * 4;
    const zNear = far[side] - gap;
    far[side] = zNear - depth;
    zs[i] = zNear - depth / 2;
    depths[i] = depth;
    pos.set((side ? 1 : -1) * (9.5 + width / 2 + rng() * 4), 0, zs[i]);
    scl.set(width, height, depth);
    buildings.setMatrixAt(i, m.compose(pos, q, scl));
    buildings.setColorAt(i, color.set(pickRng(rng, COLORS)));
  };
  for (let i = 0; i < count; i++) place(i);

  const poles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.14, 6.5, 6).translate(0, 3.25, 0),
    new THREE.MeshLambertMaterial({ color: "#5b5f73" }),
    Math.ceil((AHEAD + BEHIND) / POLE_GAP) * 2,
  );
  poles.frustumCulled = false;
  const poleGroup = new THREE.Group();
  let pi = 0;
  for (let z = BEHIND; z > -AHEAD; z -= POLE_GAP) {
    for (const x of [-6.2, 6.2]) poles.setMatrixAt(pi++, m.makeTranslation(x, 0, z));
  }
  poles.count = pi;
  poleGroup.add(poles);
  group.add(buildings, poleGroup);

  // ── Env street blocks ──────────────────────────────────────────────────────
  /** variants[side][k]; side 0 = left (x < 0), 1 = right. */
  const variants: THREE.BufferGeometry[][] = [[], []];
  const blocks: { mesh: THREE.Mesh; side: number; z: number }[] = [];
  let lastCamZ = 0;

  const useEnv = (env: EnvAssets | null) => {
    if (!env || blocks.length) return;
    for (let side = 0; side < 2; side++) {
      for (let k = 0; k < VARIANTS_PER_SIDE; k++) {
        const g = buildBlock(env, side ? 1 : -1, rng);
        if (g) variants[side].push(g);
      }
    }
    if (!variants[0].length || !variants[1].length) return;
    buildings.visible = false;
    poleGroup.visible = false;
    // One hidden holder per variant: the engine's warm-up frame renders hidden objects once, so
    // every variant is on the GPU before a block first swaps to it mid-run (no upload hitch).
    for (const list of variants) {
      for (const g of list) {
        const pre = new THREE.Mesh(g, env.material);
        pre.visible = false;
        pre.frustumCulled = false;
        pre.position.y = -500;
        group.add(pre);
      }
    }
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < BLOCKS_PER_SIDE; i++) {
        const mesh = new THREE.Mesh(variants[side][i % variants[side].length], env.material);
        // The curved-world bend moves vertices away from the bounds three would cull by.
        mesh.frustumCulled = false;
        // Stagger the two sides so block seams never line up across the track (the right side
        // starts half a block further back, so both still cover the camera).
        const z = lastCamZ + BLOCK_BEHIND + (side ? BLOCK / 2 : 0) - i * BLOCK;
        mesh.position.z = z;
        group.add(mesh);
        blocks.push({ mesh, side, z });
      }
    }
  };

  return {
    object: group,
    useEnv,
    dispose() {
      for (const list of variants) for (const g of list) g.dispose();
    },
    update(camZ) {
      lastCamZ = camZ;
      if (blocks.length) {
        // A block spans [z − BLOCK, z]; once it is entirely behind the window it leapfrogs to
        // the far end, and back again when the window jumps the other way (menu ⇄ run).
        const span = BLOCKS_PER_SIDE * BLOCK;
        const hi = camZ + BLOCK_BEHIND + BLOCK;
        for (const b of blocks) {
          let moved = false;
          while (b.z > hi) {
            b.z -= span;
            moved = true;
          }
          while (b.z <= hi - span) {
            b.z += span;
            moved = true;
          }
          if (moved) {
            b.mesh.position.z = b.z;
            b.mesh.geometry = pickRng(rng, variants[b.side]);
          }
        }
        return;
      }
      poleGroup.position.z = Math.floor(camZ / POLE_GAP) * POLE_GAP;
      // Recycle buildings that fell behind the camera to the far end of their side.
      let moved = false;
      for (let i = 0; i < count; i++) {
        if (zs[i] - depths[i] / 2 > camZ + BEHIND) {
          place(i);
          moved = true;
        }
      }
      if (moved) {
        buildings.instanceMatrix.needsUpdate = true;
        if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
      }
    },
    shift(dz) {
      for (const b of blocks) {
        b.z += dz;
        b.mesh.position.z = b.z;
      }
      far[0] += dz;
      far[1] += dz;
      for (let i = 0; i < count; i++) {
        zs[i] += dz;
        buildings.getMatrixAt(i, m);
        m.elements[14] += dz;
        buildings.setMatrixAt(i, m);
      }
      buildings.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * One street block for side `s` (−1 left, +1 right) spanning local z ∈ [−BLOCK, 0]: buildings
 * shoulder to shoulder along the frontage line (front doors toward the track), random wall
 * colours, a back-row skyscraper, lamps every LAMP_GAP, and pavement clutter between.
 */
function buildBlock(env: EnvAssets, s: number, rng: Rng): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const r = new THREE.Matrix4();
  // Native fronts face +z; turn them toward the track (left side faces +x, right side −x).
  const face = s < 0 ? Math.PI / 2 : -Math.PI / 2;
  const add = (name: string, x: number, z: number, rotY: number, uv?: readonly [number, number]) => {
    const src = env.geometry(name);
    if (!src) return null;
    const g = src.clone();
    if (uv && (uv[0] || uv[1])) {
      const a = g.getAttribute("uv");
      for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) + uv[0], a.getY(i) + uv[1]);
    }
    m.makeTranslation(x, 0, z).multiply(r.makeRotationY(rotY));
    parts.push(g.applyMatrix4(m));
    return src;
  };
  const size = (name: string) => env.geometry(name)?.boundingBox ?? null;

  // Front row. After the turn a building's native width runs along z and its depth along x.
  let z = -rng() * 1.5;
  let lastWall = -1;
  while (true) {
    const name = pickRng(rng, BUILDINGS);
    const bb = size(name);
    if (!bb) break;
    const width = bb.max.x - bb.min.x;
    const depth = bb.max.z - bb.min.z;
    if (z - width < -BLOCK) {
      // Fill the remainder with a tree so the frontage has no bare holes.
      if (z + BLOCK > 3) add("prop-tree", s * (FRONTAGE_X + 1.5), (z - BLOCK) / 2, 0);
      break;
    }
    let wall = Math.floor(rng() * env.wallOffsets.length);
    if (wall === lastWall) wall = (wall + 1) % env.wallOffsets.length;
    lastWall = wall;
    add(name, s * (FRONTAGE_X + depth / 2), z - width / 2, face, env.wallOffsets[wall]);
    z -= width + (rng() < 0.35 ? 1 + rng() * 2.5 : 0.15);
  }

  // Back row: one skyscraper per block, well behind the front buildings (skyline over the roofs),
  // kept inside the block's z-range so towers of neighbouring blocks never intersect.
  add(pickRng(rng, SKYSCRAPERS), s * (30 + rng() * 10), -BLOCK * (0.35 + rng() * 0.3), face, env.wallOffsets[Math.floor(rng() * env.wallOffsets.length)]);

  // Lamps leaning over the wall (the arm points −z natively → turn it toward the track).
  const lampTurn = s < 0 ? -Math.PI / 2 : Math.PI / 2;
  for (let lz = -LAMP_GAP / 2; lz > -BLOCK; lz -= LAMP_GAP) {
    if (rng() < 0.18) add("prop-signal", s * LAMP_X, lz, face);
    else add("prop-lamp", s * LAMP_X, lz, lampTurn);
  }

  // Pavement clutter between the lamps, kept clear of the wall and the lamp posts.
  for (let pz = -3; pz > -BLOCK + 3; ) {
    const roll = rng();
    const x = s * (7.6 + rng() * 1.2);
    if (roll < 0.3) {
      add("prop-hedge", x, pz - 1.5, Math.PI / 2);
      pz -= 4 + rng() * 3;
    } else if (roll < 0.48) {
      add(rng() < 0.5 ? "prop-tree" : "prop-pine", s * 8.4, pz - 1.6, rng() * Math.PI * 2);
      pz -= 5 + rng() * 4;
    } else if (roll < 0.58) {
      add("prop-dumpster", s * 8.4, pz - 1.4, face);
      pz -= 4 + rng() * 2;
    } else if (roll < 0.7) {
      for (let c = 0; c < 3; c++) add("prop-cone", x + s * 0.2 * c, pz - c * 0.9, 0);
      pz -= 4 + rng() * 2;
    } else if (roll < 0.78) {
      add("prop-jersey", s * 7.6, pz - 1.2, 0);
      pz -= 3.5 + rng() * 2;
    } else if (roll < 0.86) {
      add("prop-sign", s * 7.3, pz, face);
      pz -= 3 + rng() * 2;
    } else {
      pz -= 4 + rng() * 4;
    }
  }

  if (!parts.length) return null;
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}
