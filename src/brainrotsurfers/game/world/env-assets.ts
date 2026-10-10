import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { asset } from "../../lib/routes";
import type { Curve } from "../curve";

/**
 * The environment models: one meshopt GLB with every prop as a named mesh, all sharing one
 * palette atlas (built by scripts/brainrotsurfers-env-assets.mjs from the Kenney kits + Poly
 * Pizza props). Because everything samples the same texture, a whole train, street block or
 * barrier merges into one geometry drawn with one material — one draw call each.
 *
 * Geometry is handed out "baked": float attributes with the node transform applied (meshopt
 * quantisation stores int16 positions plus a per-node dequantisation transform, which would
 * otherwise be lost when we merge geometries).
 */
export interface EnvAssets {
  /** The atlas material every env mesh uses (curve-patched). */
  readonly material: THREE.MeshLambertMaterial;
  /** Same atlas with an emissive lift, for coins and pickups that must pop (curve-patched). */
  readonly glowMaterial: THREE.MeshLambertMaterial;
  /** Baked geometry by mesh name; shared — clone before modifying. */
  geometry(name: string): THREE.BufferGeometry | undefined;
  /** UV offsets of the building wall-colour variants (index 0 = no offset). */
  readonly wallOffsets: readonly (readonly [number, number])[];
  dispose(): void;
}

const ENV_GLB = asset("/models/env/env.glb");
const ENV_ATLAS = asset("/models/env/env-atlas.png");

/** Loads the env GLB + atlas; resolves null (placeholders stay) if anything fails. */
export async function loadEnvAssets(curve: Curve): Promise<EnvAssets | null> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let atlas: THREE.Texture | null = null;
  try {
    const [gltf, tex] = await Promise.all([
      loader.loadAsync(ENV_GLB),
      new THREE.TextureLoader().loadAsync(ENV_ATLAS),
    ]);
    atlas = tex;
    // glTF UV convention (v down), flat palette swatches: no mipmaps, so distant faces never
    // blend with the neighbouring swatch (palette faces have no detail to alias).
    atlas.flipY = false;
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.generateMipmaps = false;
    atlas.minFilter = THREE.LinearFilter;
    atlas.magFilter = THREE.LinearFilter;
    atlas.needsUpdate = true;

    const geometries = new Map<string, THREE.BufferGeometry>();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      geometries.set(mesh.name, bake(mesh.geometry, mesh.matrixWorld));
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose();
    });
    const extras = gltf.scene.userData?.brEnv as { wallOffsets?: [number, number][] } | undefined;

    const material = new THREE.MeshLambertMaterial({ map: atlas });
    const glowMaterial = new THREE.MeshLambertMaterial({
      map: atlas,
      emissive: "#ffffff",
      emissiveMap: atlas,
      emissiveIntensity: 0.42,
    });
    curve.patchMaterial(material);
    curve.patchMaterial(glowMaterial);

    return {
      material,
      glowMaterial,
      geometry: (name) => geometries.get(name),
      wallOffsets: extras?.wallOffsets?.length ? extras.wallOffsets : [[0, 0]],
      dispose() {
        for (const g of geometries.values()) g.dispose();
        geometries.clear();
        material.dispose();
        glowMaterial.dispose();
        atlas?.dispose();
      },
    };
  } catch {
    atlas?.dispose();
    return null;
  }
}

/** Copies position/normal/uv into plain float arrays and applies `matrix`. */
function bake(src: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const a = src.getAttribute(name);
    if (!a) continue;
    const n = a.itemSize;
    const arr = new Float32Array(a.count * n);
    // getX/Y/Z de-normalise quantised (normalized int) attributes.
    for (let i = 0; i < a.count; i++) {
      arr[i * n] = a.getX(i);
      if (n > 1) arr[i * n + 1] = a.getY(i);
      if (n > 2) arr[i * n + 2] = a.getZ(i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  if (src.index) out.setIndex(new THREE.BufferAttribute(new Uint32Array(src.index.array), 1));
  out.applyMatrix4(matrix);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
