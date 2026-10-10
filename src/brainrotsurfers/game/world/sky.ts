import * as THREE from "three";
import { WORLD } from "../config";
import type { TextureBag } from "./textures";

/**
 * Sunny-afternoon sky: a gradient dome that follows the camera (not curved, not fogged),
 * matching linear fog so spawns fade in, plus hemisphere + sun lights. No shadow maps — blob
 * shadows sit under characters and trains instead.
 */
export const SKY = {
  top: "#2f8fff",
  horizon: "#bfe8ff",
  sun: "#fff4c4",
} as const;

export function createSky(scene: THREE.Scene, bag: TextureBag) {
  void bag;
  const horizon = new THREE.Color(SKY.horizon);
  scene.background = horizon.clone();
  scene.fog = new THREE.Fog(horizon.clone(), WORLD.fogNear, WORLD.fogFar);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(SKY.top) },
        uHorizon: { value: horizon.clone() },
        uSun: { value: new THREE.Color(SKY.sun) },
        uSunDir: { value: new THREE.Vector3(-0.35, 0.45, -1).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y * 2.2, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.7));
          float s = max(dot(normalize(vDir), uSunDir), 0.0);
          col += uSun * (pow(s, 400.0) * 1.2 + pow(s, 12.0) * 0.18);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.userData.noCurve = true;
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);

  const hemi = new THREE.HemisphereLight("#dff3ff", "#8a7a5a", 1.9);
  const sun = new THREE.DirectionalLight("#fff1d6", 2.4);
  sun.position.set(-6, 12, 4);
  scene.add(hemi, sun, sun.target);

  return {
    dome,
    /**
     * Keeps the sun over the camera's shoulder whichever way it looks — (fx, fz) is its
     * horizontal view direction. The chase camera looks down −z; the menu/shop cameras look
     * back at the character's face (+z), and a fixed sun would leave that face (and the cat)
     * in its own shadow. The direction is continuous, so camera blends never pop the light.
     */
    update(camPos: THREE.Vector3, fx: number, fz: number) {
      dome.position.copy(camPos);
      // 6 m to the camera's left, 4 m behind it, 12 m up; aimed 10 m ahead of it.
      sun.position.set(camPos.x + 6 * fz - 4 * fx, 12, camPos.z - 6 * fx - 4 * fz);
      sun.target.position.set(camPos.x + 10 * fx, 0, camPos.z + 10 * fz);
    },
  };
}
