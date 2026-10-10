import * as THREE from "three";
import { CURVE } from "./config";

/**
 * Curved-world bend (the Subway Surfers horizon). Every world/character material gets a vertex
 * patch that drops and sways geometry by the square of its distance ahead of the camera:
 *   dz = max(0, camZ − world.z);  y −= dz²·curveY;  x += dz²·curveX(t)
 * The offset is applied in world space after skinning/instancing (it replaces
 * `#include <project_vertex>`), so skinned GLB characters bend like everything else. Purely
 * visual — collisions use straight-track maths. Uniform objects are shared by all patched
 * materials and updated once per frame.
 */

const PROJECT_VERTEX = /* glsl */ `
vec4 brWorld = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  brWorld = batchingMatrix * brWorld;
#endif
#ifdef USE_INSTANCING
  brWorld = instanceMatrix * brWorld;
#endif
brWorld = modelMatrix * brWorld;
float brDz = max( 0.0, uBrCamZ - brWorld.z );
brWorld.y -= brDz * brDz * uBrCurveY;
brWorld.x += brDz * brDz * uBrCurveX;
vec4 mvPosition = viewMatrix * brWorld;
gl_Position = projectionMatrix * mvPosition;
`;

const HEADER = /* glsl */ `
uniform float uBrCamZ;
uniform float uBrCurveY;
uniform float uBrCurveX;
`;

export interface Curve {
  readonly uniforms: {
    uBrCamZ: THREE.IUniform<number>;
    uBrCurveY: THREE.IUniform<number>;
    uBrCurveX: THREE.IUniform<number>;
  };
  /** Patches one material (idempotent). */
  patchMaterial(material: THREE.Material): void;
  /** Patches every material under `root` (skips objects with userData.noCurve). */
  patchObject(root: THREE.Object3D): void;
  /** Per frame: camera z and the slow left↔right sway. */
  update(camZ: number, time: number): void;
  /** Visual bend offset at a world z (for things positioned on the CPU, e.g. HTML labels). */
  offsetAt(z: number, out: THREE.Vector3): THREE.Vector3;
}

export function createCurve(): Curve {
  const uniforms = {
    uBrCamZ: { value: 0 },
    uBrCurveY: { value: CURVE.y },
    uBrCurveX: { value: 0 },
  };

  const onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uBrCamZ = uniforms.uBrCamZ;
    shader.uniforms.uBrCurveY = uniforms.uBrCurveY;
    shader.uniforms.uBrCurveX = uniforms.uBrCurveX;
    shader.vertexShader = HEADER + shader.vertexShader.replace("#include <project_vertex>", PROJECT_VERTEX);
  };

  const patchMaterial = (m: THREE.Material) => {
    if (m.userData.brCurved) return;
    m.userData.brCurved = true;
    m.onBeforeCompile = onBeforeCompile;
    // All patched materials share one program per base shader.
    m.customProgramCacheKey = () => "br-curve";
    m.needsUpdate = true;
  };

  return {
    uniforms,
    patchMaterial,
    patchObject(root) {
      root.traverse((o) => {
        if (o.userData.noCurve) return;
        const mesh = o as THREE.Mesh;
        if (!mesh.material) return;
        if (Array.isArray(mesh.material)) mesh.material.forEach(patchMaterial);
        else patchMaterial(mesh.material);
      });
    },
    update(camZ, time) {
      uniforms.uBrCamZ.value = camZ;
      uniforms.uBrCurveX.value = CURVE.x * Math.sin((time / CURVE.period) * Math.PI * 2);
    },
    offsetAt(z, out) {
      const dz = Math.max(0, uniforms.uBrCamZ.value - z);
      return out.set(dz * dz * uniforms.uBrCurveX.value, -dz * dz * uniforms.uBrCurveY.value, 0);
    },
  };
}
