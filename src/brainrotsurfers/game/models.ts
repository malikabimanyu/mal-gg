import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { CharacterDef } from "../lib/characters";
import { CHASER } from "../lib/characters";

/**
 * Character models: GLB loading (meshopt-compressed) with a per-engine cache, load-time fixes
 * from the CharacterDef (bone pose, morphs, material tints, root-motion lock), normalisation
 * (bbox → target height / max width, feet at y = 0, centred on x/z, facing −z) and a
 * procedural placeholder when the file is missing or broken, so the game never depends on assets.
 */

export interface LoadedModel {
  /** Normalised container: feet at y = 0, faces −z. Add it under an animator rig. */
  root: THREE.Group;
  clips: THREE.AnimationClip[];
  /** The skinned/animated object the clips target. */
  animRoot: THREE.Object3D;
  placeholder: boolean;
  /** The definition it was built from (motion style, clip names). */
  def: CharacterDef;
  /** Normalised visual size in metres (animation pivots, roll radius). */
  height: number;
  width: number;
}

const DEFAULT_HEIGHT = 1.75;

export class ModelLibrary {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF | null>>();
  private readonly owned = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  /** Skeletons of skinned clones (their bone textures are per clone). */
  private readonly skeletons = new Set<THREE.Skeleton>();
  private disposed = false;

  constructor() {
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * Loads (or reuses) the GLB and returns a fresh normalised instance; never rejects. Every call
   * builds new GPU-side objects, so callers should cache the result per character.
   */
  async load(def: CharacterDef): Promise<LoadedModel> {
    let pending = this.cache.get(def.model);
    if (!pending) {
      const p = this.loader.loadAsync(def.model).catch(() => {
        // A failed download is not remembered: the next load of this model tries again.
        if (this.cache.get(def.model) === p) this.cache.delete(def.model);
        return null;
      });
      pending = p;
      this.cache.set(def.model, pending);
    }
    const gltf = await pending;
    if (this.disposed) return this.placeholder(def);
    if (!gltf) return this.placeholder(def);
    try {
      const inst = cloneSkinned(gltf.scene) as THREE.Group;
      this.adopt(gltf.scene);
      inst.traverse((o) => {
        const sk = (o as THREE.SkinnedMesh).isSkinnedMesh ? (o as THREE.SkinnedMesh).skeleton : null;
        if (sk) this.skeletons.add(sk);
      });
      applyLook(inst, def);
      const clips = def.lockRoot ? gltf.animations.map((c) => lockRootMotion(c, def.lockRoot!)) : gltf.animations;
      return { ...normalise(inst, def, true), clips, animRoot: inst, placeholder: false, def };
    } catch {
      return this.placeholder(def);
    }
  }

  placeholder(def: CharacterDef): LoadedModel {
    const body = def.id === CHASER.id ? buildCat(def.accent) : buildBuddy(def.accent);
    this.adopt(body);
    return { ...normalise(body, def, false), clips: [], animRoot: body, placeholder: true, def };
  }

  private adopt(root: THREE.Object3D) {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) this.owned.add(mesh.geometry);
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      for (const m of mats) {
        this.owned.add(m);
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) this.owned.add(v);
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const r of this.owned) r.dispose();
    this.owned.clear();
    for (const sk of this.skeletons) sk.dispose();
    this.skeletons.clear();
    this.cache.clear();
  }
}

/** Exporters append a numeric suffix to node names ("DEF-upper_armL_0145"); defs may omit it. */
const nameMatches = (name: string, wanted: string) => name === wanted || name.startsWith(`${wanted}_`);

const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();

/**
 * One-off fixes on a fresh instance, before normalisation measures it: bone pose (in the raw
 * model's space, so a def can say "rotate the left arm down about z" without knowing each rig's
 * local bone axes), morph weights and material tints. Runs before any AnimationMixer binds, so
 * the posed state is the "rest" the mixer restores when a clip fades out.
 */
function applyLook(inst: THREE.Object3D, def: CharacterDef) {
  if (def.pose?.length) {
    inst.updateMatrixWorld(true);
    for (const p of def.pose) {
      let bone: THREE.Object3D | undefined;
      inst.traverse((o) => {
        if (!bone && nameMatches(o.name, p.bone)) bone = o;
      });
      if (!bone?.parent) continue;
      // local' = parentWorld⁻¹ · R · parentWorld · local (R expressed in the instance's space).
      bone.parent.getWorldQuaternion(_pq);
      _q.setFromEuler(new THREE.Euler(...p.rotate));
      bone.quaternion.premultiply(_pq.clone().invert().multiply(_q).multiply(_pq));
      bone.updateMatrixWorld(true);
    }
  }
  inst.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (def.morphs && mesh.morphTargetInfluences) {
      def.morphs.forEach((w, i) => {
        if (i < mesh.morphTargetInfluences!.length) mesh.morphTargetInfluences![i] = w;
      });
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // Materials are shared with the cached GLTF: adjust each one only once.
    for (const m of mats) {
      if (m.userData.brLook) continue;
      m.userData.brLook = true;
      const std = m as THREE.MeshStandardMaterial;
      // The scene has no environment map, so metallic texels would render near-black.
      if (std.isMeshStandardMaterial) std.metalness = 0;
      const tint = def.tint?.[m.name];
      if (!tint || !std.color) continue;
      if (tint.multiply) std.color.setRGB(std.color.r * tint.multiply[0], std.color.g * tint.multiply[1], std.color.b * tint.multiply[2]);
      // A flat emissive lifts the blacks that a multiply can't brighten.
      if (tint.lift && std.isMeshStandardMaterial) std.emissive.set(tint.lift);
      if (tint.roughness !== undefined && std.isMeshStandardMaterial) {
        std.roughness = tint.roughness;
        // A roughness texture would multiply the override back down.
        std.roughnessMap = null;
        std.needsUpdate = true;
      }
    }
  });
}

/** Copy of `clip` whose `bone.position` track keeps its first-frame x/z: the clip plays in place. */
function lockRootMotion(clip: THREE.AnimationClip, bone: string): THREE.AnimationClip {
  const out = clip.clone();
  for (const t of out.tracks) {
    const dot = t.name.lastIndexOf(".");
    if (t.name.slice(dot + 1) !== "position" || !nameMatches(t.name.slice(0, dot), bone)) continue;
    const v = t.values;
    for (let i = 3; i < v.length; i += 3) {
      v[i] = v[0];
      v[i + 2] = v[2];
    }
  }
  return out;
}

/**
 * bbox → target height (or `maxWidth`, whichever is smaller), feet on y = 0, centred, facing
 * −z. Placeholders are built facing −z already, so they skip the GLB-only facing turn.
 */
export function normalise(
  model: THREE.Object3D,
  def: CharacterDef,
  isGlb: boolean,
): { root: THREE.Group; height: number; width: number } {
  const holder = new THREE.Group();
  const facing = new THREE.Group();
  facing.rotation.y = isGlb ? (def.rotationY ?? 0) : 0;
  facing.add(model);
  holder.add(facing);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(facing, true);
  const size = box.getSize(new THREE.Vector3());
  const target = def.height ?? DEFAULT_HEIGHT;
  let s = size.y > 1e-4 ? target / size.y : 1;
  if (isGlb && def.maxWidth && size.x * s > def.maxWidth) s = def.maxWidth / size.x;
  s *= def.scale ?? 1;
  facing.scale.setScalar(s);
  const center = box.getCenter(new THREE.Vector3());
  facing.position.set(-center.x * s, -box.min.y * s + (def.yOffset ?? 0), -center.z * s);
  holder.name = `model:${def.id}`;
  return { root: holder, height: size.y * s, width: size.x * s };
}

// ── Placeholders ─────────────────────────────────────────────────────────────

function googlyEyes(group: THREE.Group, y: number, z: number, spread: number, r: number) {
  const white = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  const black = new THREE.MeshBasicMaterial({ color: "#111111" });
  const eye = new THREE.SphereGeometry(r, 16, 12);
  const pupil = new THREE.SphereGeometry(r * 0.5, 12, 8);
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(eye, white);
    e.position.set(side * spread, y, z);
    const p = new THREE.Mesh(pupil, black);
    // Slightly cross-eyed for maximum brainrot.
    p.position.set(side * spread - side * r * 0.25, y + r * 0.1, z - r * 0.65);
    group.add(e, p);
  }
}

/** Accent-coloured capsule body + head + googly eyes; faces −z, feet at 0. */
function buildBuddy(accent: string): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).multiplyScalar(0.55), roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 6, 16), bodyMat);
  body.position.y = 0.34 + 0.275 + 0.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 14), bodyMat);
  head.position.y = 1.38;
  const footGeo = new THREE.CapsuleGeometry(0.1, 0.16, 4, 8).rotateX(Math.PI / 2);
  for (const x of [-0.16, 0.16]) {
    const f = new THREE.Mesh(footGeo, dark);
    f.position.set(x, 0.1, -0.05);
    g.add(f);
  }
  const armGeo = new THREE.CapsuleGeometry(0.07, 0.38, 4, 8);
  for (const side of [-1, 1]) {
    const a = new THREE.Mesh(armGeo, dark);
    a.position.set(side * 0.42, 0.85, 0);
    a.rotation.z = side * 0.35;
    g.add(a);
  }
  g.add(body, head);
  googlyEyes(g, 1.45, -0.27, 0.13, 0.1);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: "#3a1020" }));
  mouth.position.set(0, 1.28, -0.31);
  mouth.rotation.z = Math.PI;
  g.add(mouth);
  return g;
}

/** Grey cat-ish shape: body, head, ears, tail. Faces −z, feet at 0. */
function buildCat(accent: string): THREE.Group {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 });
  const pink = new THREE.MeshLambertMaterial({ color: "#ffb3c7" });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), fur);
  body.scale.set(1, 1.15, 0.95);
  body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), fur);
  head.position.set(0, 1.08, -0.05);
  const earGeo = new THREE.ConeGeometry(0.12, 0.26, 4);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, fur);
    ear.position.set(side * 0.19, 1.38, -0.02);
    ear.rotation.z = -side * 0.25;
    const inner = new THREE.Mesh(earGeo, pink);
    inner.scale.setScalar(0.55);
    inner.position.set(side * 0.19, 1.36, -0.07);
    inner.rotation.z = -side * 0.25;
    g.add(ear, inner);
  }
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.6, 4, 8), fur);
  tail.position.set(0.1, 0.75, 0.42);
  tail.rotation.x = -0.6;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), pink);
  nose.position.set(0, 1.03, -0.39);
  const legGeo = new THREE.CapsuleGeometry(0.08, 0.14, 4, 8);
  for (const x of [-0.18, 0.18]) {
    const l = new THREE.Mesh(legGeo, fur);
    l.position.set(x, 0.12, -0.08);
    g.add(l);
  }
  g.add(body, head, tail, nose);
  googlyEyes(g, 1.13, -0.3, 0.12, 0.085);
  return g;
}
