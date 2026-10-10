import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { OBSTACLE, SHADOW_Y } from "../config";
import type { Curve } from "../curve";
import type { PowerUpKind } from "../../lib/store";
import type { EnvAssets } from "../world/env-assets";
import {
  blobTexture, coinFaceTexture, glowTexture, labelTexture, stripeTexture, trainFrontTexture, trainSideTexture, TextureBag,
} from "../world/textures";

/**
 * VISUAL SEAM for gameplay entities. Gameplay code only relies on these signatures and on the
 * origin conventions below — replace the bodies (e.g. with GLB props) freely:
 * - Obstacles: origin at lane centre x = 0, ground y = 0, z = 0 at the NEAR end (the face the
 *   player meets); the object extends toward −z. Sizes follow config.OBSTACLE. Moving trains
 *   get their own look (driver cab + blazing headlights) so they read as "coming at you".
 * - Coins: one InstancedMesh; the coin system writes instance matrices (unit coin, upright,
 *   spinning about y). Coin shadows: a second InstancedMesh of flat quads.
 * - Power-up pickups: origin at their centre; the system bobs/spins the returned object.
 * - Blob shadow: a flat quad at y = 0 sized w×d; the caller moves/scales it.
 * Every material is patched for the curved world here, and everything created is disposed by
 * `dispose()`.
 *
 * Two looks: procedural placeholders (always available, built synchronously) and the env models
 * (Kenney kits via world/env-assets.ts). Every factory returns a holder whose contents are
 * rebuilt when `useEnv()` arrives, so objects made before loading finished upgrade in place.
 * Model geometry is merged per object and cached per shape (e.g. per train style × length), so
 * pooled instances share it: a train is 1 draw call + its blob shadow.
 */
export interface VisualKit {
  createTrainMesh(len: number, moving?: boolean): THREE.Object3D;
  createRampMesh(): THREE.Object3D;
  createJumpBarrierMesh(): THREE.Object3D;
  createRollBarrierMesh(): THREE.Object3D;
  createCoinMesh(capacity: number): THREE.InstancedMesh;
  createCoinShadowMesh(capacity: number): THREE.InstancedMesh;
  createPowerUpMesh(kind: PowerUpKind): THREE.Object3D;
  createBlobShadow(w: number, d: number): THREE.Mesh;
  /**
   * The jetpack worn on the runner's back while flying: tanks + flickering flames. Origin at the
   * middle of its back face (+z side of the pack is what touches the body), about 0.6 m tall.
   */
  createJetpackGear(): THREE.Object3D;
  /** Per frame: blinks the moving-train lamps and flickers the jet flames. */
  tick(time: number): void;
  /** Switches to the env models (null keeps the placeholders); upgrades existing objects. */
  useEnv(env: EnvAssets | null): void;
  dispose(): void;
}

/**
 * Train looks from the env GLB (front cab + two alternating middle cars, z normalised to 1).
 * Parked trains are flat-faced at both ends — only the square cab is; the others use a middle
 * car's end — so roof, face and collision box line up (the runner lands on the roof, a jump
 * into the face crashes at the face). Moving trains lead with a driver cab: a sloped nose is
 * fine at closing speed and makes them read differently from parked ones.
 */
const PARKED_STYLES = ["subway", "square", "city", "bullet"] as const;
const MOVING_STYLES = ["bullet", "city", "subway"] as const;
/** How far (normalised) a car's end face sits inside its z extent; trains are lengthened by it. */
const FACE_INSET = 0.038;
/** Target car length; a train of `len` gets round(len / CAR) cars. */
const CAR = 6.4;
/** Gap between cars (the couplers sit in it). */
const CAR_GAP = 0.24;

const TRAIN_SKINS = [
  { body: "#e8473f", stripe: "#ffd23f" },
  { body: "#2f7df6", stripe: "#ffffff" },
  { body: "#22b07d", stripe: "#ffe066" },
  { body: "#f29f05", stripe: "#3b2a7a" },
  { body: "#9b5de5", stripe: "#00f5d4" },
];

export function createVisualKit(curve: Curve): VisualKit {
  const bag = new TextureBag();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T) => (geometries.push(g), g);
  const mat = <T extends THREE.Material>(m: T) => {
    curve.patchMaterial(m);
    materials.push(m);
    return m;
  };

  // Shared resources.
  const blob = blobTexture(bag);
  const shadowMat = mat(new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
  const unitQuad = geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

  const skins = TRAIN_SKINS.map(({ body, stripe }) => {
    const side = trainSideTexture(bag, body, stripe);
    return {
      side,
      front: mat(new THREE.MeshLambertMaterial({ map: trainFrontTexture(bag, body, stripe) })),
      roof: mat(new THREE.MeshLambertMaterial({ color: new THREE.Color(body).multiplyScalar(0.8) })),
      body,
    };
  });
  let skinIndex = 0;

  const stripes = stripeTexture(bag);
  const barrierMat = mat(new THREE.MeshLambertMaterial({ map: stripes }));
  const postMat = mat(new THREE.MeshLambertMaterial({ color: "#3a3f55" }));
  const rampMat = mat(new THREE.MeshLambertMaterial({ color: "#8d93a8" }));
  const rampStripeMat = mat(new THREE.MeshLambertMaterial({ color: "#ffd23f" }));
  // Round gold coin with the HUD coin's star. No env map in the scene, so a "metal" coin would
  // read brown: the face texture doubles as an emissive map to keep it bright.
  const coinFace = coinFaceTexture(bag);
  const coinMat = mat(new THREE.MeshPhongMaterial({
    map: coinFace, emissive: "#ffffff", emissiveMap: coinFace, emissiveIntensity: 0.38, specular: "#fff1b0", shininess: 60,
  }));
  // Headlights, train-ahead glow and jet flames: additive, unlit, no depth write.
  const glow = glowTexture(bag);
  const lampMat = mat(new THREE.MeshBasicMaterial({ map: glow, color: "#ffc93a", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const beaconMat = mat(new THREE.MeshBasicMaterial({ map: glow, color: "#ff3b2f", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const beamMat = mat(new THREE.MeshBasicMaterial({ map: glow, color: "#ffd65a", transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  const flameMat = mat(new THREE.MeshBasicMaterial({ map: glow, color: "#ff9a2e", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const flameCoreMat = mat(new THREE.MeshBasicMaterial({ color: "#fff3b0", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glowQuad = geo(new THREE.PlaneGeometry(1, 1));

  const W = OBSTACLE.trainW;
  const H = OBSTACLE.trainH;

  /** Several placed copies of `part` merged into one geometry (one draw call). */
  const merged = (part: THREE.BufferGeometry, place: (m: THREE.Matrix4, i: number) => void, n: number) => {
    const m = new THREE.Matrix4();
    const copies: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      m.identity();
      place(m, i);
      copies.push(part.clone().applyMatrix4(m));
    }
    const out = mergeGeometries(copies) ?? part.clone();
    for (const c of copies) c.dispose();
    part.dispose();
    return geo(out);
  };
  // Static obstacle geometry is shared by every pooled instance of a kind.
  let rampGeo: { wedge: THREE.BufferGeometry; treads: THREE.BufferGeometry } | null = null;
  let jumpGeo: { board: THREE.BufferGeometry; legs: THREE.BufferGeometry } | null = null;
  let rollGeo: { bar: THREE.BufferGeometry; posts: THREE.BufferGeometry } | null = null;

  /**
   * Moving-train cue: two big headlight flares, a blinking red beacon and a pool of light on
   * the track in front (so it reads even before the train itself is clear in the fog).
   * Billboards are kept facing +z (toward the chase camera); `y` is the headlight height.
   */
  const movingLamps = (y: number, faceZ: number) => {
    const group = new THREE.Group();
    for (const x of [-0.58, 0.58]) {
      const l = new THREE.Mesh(glowQuad, lampMat);
      l.position.set(x, y, faceZ + 0.06);
      l.scale.setScalar(1.8);
      group.add(l);
    }
    const beacon = new THREE.Mesh(glowQuad, beaconMat);
    beacon.position.set(0, y + 0.55, faceZ + 0.08);
    beacon.scale.setScalar(1.3);
    beacon.name = "beacon";
    group.add(beacon);
    const beam = new THREE.Mesh(unitQuad, beamMat);
    beam.scale.set(2.8, 1, 14);
    beam.position.set(0, SHADOW_Y + 0.01, faceZ + 6.5);
    group.add(beam);
    group.renderOrder = 2;
    return group;
  };

  const fallback = {
    createTrainMesh(len: number, moving = false) {
      const skin = skins[skinIndex++ % skins.length];
      const group = new THREE.Group();
      // Body box: sides (px, nx) get the window texture, the rest the plain roof colour.
      // Index order of BoxGeometry is px, nx, py, ny, pz, nz — regroup into two draw calls.
      const box = geo(new THREE.BoxGeometry(W, H - 0.35, len, 1, 1, Math.max(2, Math.round(len / 2))));
      const sideCount = box.groups[0].count + box.groups[1].count;
      const total = box.index!.count;
      box.clearGroups();
      box.addGroup(0, sideCount, 0);
      box.addGroup(sideCount, total - sideCount, 1);
      const sideTex = skin.side.clone();
      sideTex.repeat.set(len / 6, 1);
      sideTex.needsUpdate = true;
      bag.track(sideTex);
      const sideMat = mat(new THREE.MeshLambertMaterial({ map: sideTex }));
      const body = new THREE.Mesh(box, [sideMat, skin.roof]);
      body.position.set(0, 0.35 + (H - 0.35) / 2, -len / 2);
      // Undercarriage + wheels strip.
      const under = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 0.86, 0.36, len - 0.6, 1, 1, Math.max(2, Math.round(len / 3)))), postMat);
      under.position.set(0, 0.18, -len / 2);
      // Front face with windshield, slightly proud of the body.
      const front = new THREE.Mesh(geo(new THREE.PlaneGeometry(W * 0.98, H - 0.4)), skin.front);
      front.position.set(0, 0.35 + (H - 0.4) / 2, 0.012);
      const shadow = new THREE.Mesh(unitQuad, shadowMat);
      shadow.scale.set(W + 1.2, 1, len + 1.6);
      shadow.position.set(0, SHADOW_Y, -len / 2);
      group.add(shadow, under, body, front);
      if (moving) group.add(movingLamps(1.0, 0.012));
      return group;
    },

    createRampMesh() {
      const L = OBSTACLE.rampLen;
      const w = OBSTACLE.rampW;
      if (!rampGeo) {
        // Wedge: rises from y 0 at z 0 to H at z −L. Built from a side profile, extruded along x.
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(L, 0);
        shape.lineTo(L, H);
        shape.closePath();
        const wedge = geo(new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, steps: 1 }));
        // Shape is in (x=distance, y=height); map distance → −z and extrusion → x.
        wedge.rotateY(Math.PI / 2);
        wedge.translate(-w / 2, 0, 0);
        // Yellow tread stripes along the slope, merged into one geometry.
        const slope = Math.atan2(H, L);
        const treads = merged(
          new THREE.BoxGeometry(w * 0.9, 0.04, 0.25),
          (m, i) => {
            const t = (i + 1) / 7;
            m.makeRotationX(slope).setPosition(0, t * H + 0.03, -t * L);
          },
          6,
        );
        rampGeo = { wedge, treads };
      }
      const group = new THREE.Group();
      group.add(new THREE.Mesh(rampGeo.wedge, rampMat), new THREE.Mesh(rampGeo.treads, rampStripeMat));
      return group;
    },

    createJumpBarrierMesh() {
      const w = OBSTACLE.barrierW;
      const group = new THREE.Group();
      if (!jumpGeo) {
        const legH = OBSTACLE.jumpH - 0.1;
        jumpGeo = {
          board: geo(new THREE.BoxGeometry(w, 0.45, 0.14)),
          legs: merged(
            new THREE.BoxGeometry(0.12, legH, 0.36),
            (m, i) => m.makeTranslation(i ? w / 2 - 0.15 : -w / 2 + 0.15, legH / 2, 0),
            2,
          ),
        };
      }
      const board = new THREE.Mesh(jumpGeo.board, barrierMat);
      board.position.set(0, OBSTACLE.jumpH - 0.25, -OBSTACLE.jumpLen / 2);
      const legs = new THREE.Mesh(jumpGeo.legs, postMat);
      legs.position.z = -OBSTACLE.jumpLen / 2;
      const shadow = new THREE.Mesh(unitQuad, shadowMat);
      shadow.scale.set(w + 0.4, 1, 1.0);
      shadow.position.set(0, SHADOW_Y, -OBSTACLE.jumpLen / 2);
      group.add(shadow, legs, board);
      return group;
    },

    createRollBarrierMesh() {
      const w = OBSTACLE.barrierW;
      const group = new THREE.Group();
      const barH = OBSTACLE.rollTop - OBSTACLE.rollBottom;
      if (!rollGeo) {
        rollGeo = {
          bar: geo(new THREE.BoxGeometry(w, barH, 0.16)),
          posts: merged(
            new THREE.BoxGeometry(0.16, OBSTACLE.rollTop, 0.2),
            (m, i) => m.makeTranslation(i ? w / 2 + 0.02 : -w / 2 - 0.02, OBSTACLE.rollTop / 2, 0),
            2,
          ),
        };
      }
      const bar = new THREE.Mesh(rollGeo.bar, barrierMat);
      bar.position.set(0, OBSTACLE.rollBottom + barH / 2, -OBSTACLE.rollLen / 2);
      const posts = new THREE.Mesh(rollGeo.posts, postMat);
      posts.position.z = -OBSTACLE.rollLen / 2;
      const shadow = new THREE.Mesh(unitQuad, shadowMat);
      shadow.scale.set(w + 0.5, 1, 0.9);
      shadow.position.set(0, SHADOW_Y, -OBSTACLE.rollLen / 2);
      group.add(shadow, posts, bar);
      return group;
    },

    createPowerUpMesh(kind: PowerUpKind) {
      const group = new THREE.Group();
      const glow = mat(new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, depthWrite: false }));
      const halo = new THREE.Mesh(geo(new THREE.SphereGeometry(0.62, 16, 12)), glow);
      group.add(halo);
      switch (kind) {
        case "magnet": {
          const red = mat(new THREE.MeshLambertMaterial({ color: "#ff3b3b" }));
          const tip = mat(new THREE.MeshLambertMaterial({ color: "#e8e8f0" }));
          const u = new THREE.Mesh(geo(new THREE.TorusGeometry(0.3, 0.1, 10, 20, Math.PI)), red);
          u.rotation.z = Math.PI;
          const tipGeo = geo(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10));
          for (const x of [-0.3, 0.3]) {
            const t = new THREE.Mesh(tipGeo, tip);
            t.position.set(x, 0.08, 0);
            group.add(t);
          }
          group.add(u);
          break;
        }
        case "sneakers": {
          const shoe = mat(new THREE.MeshLambertMaterial({ color: "#3fdc6e" }));
          const sole = mat(new THREE.MeshLambertMaterial({ color: "#ffffff" }));
          const a = new THREE.Mesh(geo(new THREE.BoxGeometry(0.34, 0.24, 0.6)), shoe);
          a.position.y = 0.05;
          const b = new THREE.Mesh(geo(new THREE.BoxGeometry(0.36, 0.08, 0.64)), sole);
          b.position.y = -0.1;
          const c = new THREE.Mesh(geo(new THREE.BoxGeometry(0.3, 0.2, 0.26)), shoe);
          c.position.set(0, 0.25, 0.15);
          group.add(a, b, c);
          break;
        }
        case "multiplier": {
          const face = mat(new THREE.MeshBasicMaterial({ map: labelTexture(bag, "2x", "#ff4f8b", "#ffffff") }));
          const disc = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24).rotateX(Math.PI / 2)), face);
          group.add(disc);
          break;
        }
        case "jetpack": {
          const tank = mat(new THREE.MeshLambertMaterial({ color: "#c0c6d6" }));
          const flame = mat(new THREE.MeshBasicMaterial({ color: "#ff9f1a" }));
          const tankGeo = geo(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 12));
          const flameGeo = geo(new THREE.ConeGeometry(0.1, 0.22, 10).rotateX(Math.PI));
          for (const x of [-0.17, 0.17]) {
            const t = new THREE.Mesh(tankGeo, tank);
            t.position.x = x;
            const f = new THREE.Mesh(flameGeo, flame);
            f.position.set(x, -0.42, 0);
            group.add(t, f);
          }
          break;
        }
      }
      return group;
    },

    createBlobShadow(w: number, d: number) {
      const m = new THREE.Mesh(unitQuad, shadowMat);
      m.scale.set(w, 1, d);
      m.renderOrder = 1;
      return m;
    },
  };
  // Faces (caps) show the coin texture; the rim samples its plain gold top row.
  const coinGeo = geo(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 32));
  {
    const uv = coinGeo.getAttribute("uv");
    const side = coinGeo.groups[0];
    for (let k = side.start; k < side.start + side.count; k++) uv.setXY(coinGeo.index!.getX(k), 0.5, 0.995);
    coinGeo.clearGroups();
    coinGeo.rotateX(Math.PI / 2);
  }

  // ── Env models ──────────────────────────────────────────────────────────────
  let env: EnvAssets | null = null;
  /** Every holder handed out, with the function that fills it for the current look. */
  const made: { holder: THREE.Group; fill(h: THREE.Group): void }[] = [];
  /** Merged env geometries (per train style × length), shared by pooled instances. */
  const mergedCache = new Map<string, THREE.BufferGeometry | null>();
  let trainStyle = 0;
  const flames: THREE.Object3D[] = [];

  const track = (fill: (h: THREE.Group) => void) => {
    const holder = new THREE.Group();
    fill(holder);
    made.push({ holder, fill });
    return holder;
  };
  const groundShadow = (w: number, d: number, z: number) => {
    const m = new THREE.Mesh(unitQuad, shadowMat);
    m.scale.set(w, 1, d);
    m.position.set(0, SHADOW_Y, z);
    return m;
  };

  /**
   * A train of `len` metres: at the near end (z = 0, toward the player) a driver cab when the
   * style has a flat one or the train is moving, otherwise a middle car's flat end; alternating
   * middle cars after it. Cars are stretched so the end FACES (not the car extents) sit at z = 0
   * and z = −len; x/y are already gameplay-sized in the GLB.
   */
  const trainGeometry = (e: EnvAssets, style: string, len: number, moving: boolean) => {
    const key = `${style}:${len}:${moving ? "m" : "p"}`;
    if (mergedCache.has(key)) return mergedCache.get(key)!;
    const n = Math.max(2, Math.round(len / CAR));
    const carLen = (len - CAR_GAP * (n - 1)) / (n - 2 * FACE_INSET);
    const start = FACE_INSET * carLen;
    const cab = moving || style === "square";
    const parts: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    const t = new THREE.Matrix4();
    let ok = true;
    for (let i = 0; i < n; i++) {
      const part = i === 0 && cab ? "front" : i % 2 ? "mid1" : "mid2";
      const src = e.geometry(`train-${style}-${part}`);
      if (!src) {
        ok = false;
        break;
      }
      m.makeTranslation(0, 0, start - (i * (carLen + CAR_GAP) + carLen / 2));
      // The far end shows a middle car's flat end (reversed so its coupler faces out).
      if (i === n - 1) m.multiply(t.makeRotationY(Math.PI));
      m.multiply(t.makeScale(1, 1, carLen));
      parts.push(src.clone().applyMatrix4(m));
    }
    const out = ok ? mergeGeometries(parts) : null;
    for (const p of parts) p.dispose();
    mergedCache.set(key, out);
    return out;
  };

  const haloGeo = geo(new THREE.SphereGeometry(0.72, 20, 14));
  const HALO: Record<PowerUpKind, string> = { magnet: "#ff6b6b", sneakers: "#4dff8f", multiplier: "#ff74c0", jetpack: "#ffcf4d" };
  const haloMats = new Map<PowerUpKind, THREE.Material>();
  const halo = (kind: PowerUpKind) => {
    let m = haloMats.get(kind);
    if (!m) {
      // Back faces only: the glow sits behind the model instead of washing over it.
      m = mat(new THREE.MeshBasicMaterial({ color: HALO[kind], transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
      haloMats.set(kind, m);
    }
    return new THREE.Mesh(haloGeo, m);
  };

  return {
    createTrainMesh(len, moving = false) {
      const styles = moving ? MOVING_STYLES : PARKED_STYLES;
      const style = styles[trainStyle++ % styles.length];
      return track((h) => {
        const g = env && trainGeometry(env, style, len, moving);
        if (!env || !g) return void h.add(fallback.createTrainMesh(len, moving));
        h.add(groundShadow(W + 1.2, len + 1.6, -len / 2), new THREE.Mesh(g, env.material));
        // Lamps sit on the cab's lower face (the bullet nose is furthest forward down there).
        if (moving) h.add(movingLamps(0.95, 0));
      });
    },

    createRampMesh() {
      return track((h) => {
        const g = env?.geometry("obs-ramp");
        if (!env || !g) return void h.add(fallback.createRampMesh());
        h.add(new THREE.Mesh(g, env.material));
      });
    },

    createJumpBarrierMesh() {
      return track((h) => {
        const g = env?.geometry("obs-jump");
        if (!env || !g) return void h.add(fallback.createJumpBarrierMesh());
        h.add(groundShadow(OBSTACLE.barrierW + 0.4, 1.0, -OBSTACLE.jumpLen / 2), new THREE.Mesh(g, env.material));
      });
    },

    createRollBarrierMesh() {
      return track((h) => {
        const g = env?.geometry("obs-roll");
        if (!env || !g) return void h.add(fallback.createRollBarrierMesh());
        h.add(groundShadow(OBSTACLE.barrierW + 0.5, 0.9, -OBSTACLE.rollLen / 2), new THREE.Mesh(g, env.material));
      });
    },

    createCoinMesh(capacity) {
      const mesh = new THREE.InstancedMesh(coinGeo, coinMat, capacity);
      mesh.frustumCulled = false;
      mesh.count = 0;
      return mesh;
    },

    createCoinShadowMesh(capacity) {
      const mesh = new THREE.InstancedMesh(unitQuad, shadowMat, capacity);
      mesh.frustumCulled = false;
      mesh.count = 0;
      return mesh;
    },

    createPowerUpMesh(kind) {
      return track((h) => {
        const g = env?.geometry(`pu-${kind}`);
        if (!env || !g) return void h.add(fallback.createPowerUpMesh(kind));
        h.add(halo(kind), new THREE.Mesh(g, env.glowMaterial));
      });
    },

    createBlobShadow: fallback.createBlobShadow,

    createJetpackGear() {
      const gear = new THREE.Group();
      const body = track((h) => {
        const g = env?.geometry("pu-jetpack");
        if (!env || !g) return void h.add(fallback.createPowerUpMesh("jetpack"));
        const pack = new THREE.Mesh(g, env.material);
        pack.scale.setScalar(0.62);
        h.add(pack);
      });
      // The placeholder pickup has a white halo sphere; worn gear never glows.
      body.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && (mesh.material as THREE.MeshBasicMaterial).transparent) mesh.visible = false;
      });
      gear.add(body);
      // Two flames under the tanks: a hot core cone + a soft glow billboard each.
      const cone = geo(new THREE.ConeGeometry(0.07, 0.42, 10).translate(0, -0.21, 0).rotateX(Math.PI));
      for (const x of [-0.16, 0.16]) {
        const flame = new THREE.Group();
        flame.name = "flame";
        flame.position.set(x, -0.3, 0);
        const core = new THREE.Mesh(cone, flameCoreMat);
        core.rotation.x = Math.PI;
        const halo = new THREE.Mesh(glowQuad, flameMat);
        halo.position.y = -0.3;
        halo.scale.set(0.5, 0.95, 1);
        flame.add(core, halo);
        gear.add(flame);
        flames.push(flame);
      }
      return gear;
    },

    tick(time) {
      // Beacons blink at ~3 Hz, headlights shimmer; flames flicker (every pooled instance shares
      // the materials, so this is a handful of uniform writes).
      const on = Math.sin(time * 19) > -0.2;
      beaconMat.opacity = on ? 1 : 0.15;
      lampMat.opacity = 0.85 + Math.sin(time * 31) * 0.15;
      for (let i = 0; i < flames.length; i++) {
        const f = flames[i];
        const k = 0.8 + 0.35 * Math.abs(Math.sin(time * 37 + i * 1.7)) + 0.15 * Math.sin(time * 61 + i);
        f.scale.set(1, k, 1);
      }
    },

    useEnv(e) {
      if (!e || env) return;
      env = e;
      for (const { holder, fill } of made) {
        holder.clear();
        fill(holder);
      }
    },

    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const g of mergedCache.values()) g?.dispose();
      mergedCache.clear();
      made.length = 0;
      bag.dispose();
      env?.dispose();
    },
  };
}
