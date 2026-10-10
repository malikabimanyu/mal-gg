import * as THREE from "three";
import { MOVE, SHADOW_Y } from "../config";
import { CharacterAnimator, type AnimInput, type AnimMode } from "../anim";
import { createBody, type Body } from "../motor";
import type { LoadedModel } from "../models";
import type { ClipNames } from "../anim";
import type { VisualKit } from "./visuals";

/**
 * The player: physical Body (motor.ts) + animated rig + blob shadow + the jetpack worn while
 * flying. Gameplay mutates `body`; `sync` copies it to the visuals once per frame. While the
 * body is invulnerable (after the jetpack) the character blinks, so passing through a train
 * reads as intended.
 */
export class Player {
  readonly body: Body = createBody();
  readonly anim = new CharacterAnimator();
  readonly shadow: THREE.Mesh;
  /** Jetpack on the character's back (shown while b.jet > 0). */
  readonly gear: THREE.Object3D;
  /** Seconds since the last stumble (drives the wobble). */
  stumbleT = 10;
  hover = false;
  caught = false;
  private shadowSize = 1.1;
  /** Reused every frame (no per-frame allocation). */
  private readonly animIn: AnimInput = {
    mode: "idle", speed: 0, laneVel: 0, vy: 0, rollProgress: 1, stumble: 0, hover: false,
  };

  constructor(kit: VisualKit) {
    this.shadow = kit.createBlobShadow(1.1, 1.1);
    this.gear = kit.createJetpackGear();
    this.gear.visible = false;
  }

  setModel(model: LoadedModel, clips?: ClipNames, hover = false): void {
    // Measure in the model's own space (a cached model may still hang under the rig).
    model.root.removeFromParent();
    model.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model.root);
    this.anim.setModel(model, clips);
    this.hover = hover;
    // Blob roughly as wide as the body (wings, katanas) but never thinner than the feet.
    this.shadowSize = Math.min(1.9, Math.max(1, model.width * 0.75));
    // Strap the jetpack between the shoulders: just behind the back (+z; models face −z), at
    // ~60 % of the height, sized to the character.
    const back = Number.isFinite(box.max.z) ? Math.min(box.max.z, 0.6) : 0.25;
    const k = THREE.MathUtils.clamp(model.height / 1.75, 0.7, 1.15);
    this.gear.scale.setScalar(k);
    this.gear.position.set(0, model.height * 0.6, back + 0.12 * k);
    this.anim.attach(this.gear);
  }

  addTo(parent: THREE.Object3D): void {
    parent.add(this.anim.root, this.shadow);
  }

  sync(dt: number, speed: number, idleMode: "idle" | "shop" | null, time = 0): void {
    const b = this.body;
    this.anim.root.position.set(b.x, b.y, b.z);
    this.gear.visible = !idleMode && b.jet > 0;
    // Blink (~8 Hz) while invulnerable on foot.
    this.anim.root.visible = idleMode !== null || b.invuln <= 0 || b.jet > 0 || Math.sin(time * 50) > -0.35;
    let mode: AnimMode;
    if (idleMode) mode = idleMode;
    else if (this.caught) mode = "caught";
    else if (b.jet > 0) mode = "jet";
    else if (b.rollT > 0) mode = "roll";
    else if (!b.grounded) mode = "air";
    else mode = "run";
    this.stumbleT += dt;
    const a = this.animIn;
    a.mode = mode;
    a.speed = speed;
    a.laneVel = idleMode ? 0 : b.laneVel;
    a.vy = b.vy;
    a.rollProgress = 1 - b.rollT / MOVE.rollTime;
    a.stumble = Math.max(0, 1 - this.stumbleT / 0.6);
    a.hover = this.hover;
    this.anim.update(dt, a);
    // Shadow on the surface below, shrinking with height. On the track it sits above the
    // sleeper tops, otherwise the sleepers hide all but thin strips of it.
    const h = Math.max(0, b.y - b.ground);
    const s = Math.max(0.35, 1 - h * 0.12);
    this.shadow.position.set(b.x, b.ground + (b.ground > 0 ? 0.03 : SHADOW_Y), b.z);
    this.shadow.scale.set(this.shadowSize * s, 1, 1.1 * s);
    this.shadow.visible = b.jet <= 0 || h < 6;
  }
}
