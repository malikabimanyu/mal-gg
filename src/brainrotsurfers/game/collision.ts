import { MOVE, PLAYER } from "./config";
import type { ObstacleData } from "./types";
import type { Body } from "./motor";

/**
 * AABB collision between the player body and lane obstacles. The curved-world bend is purely
 * visual, so everything here is straight-track maths. `resolve` reports the worst hit and the
 * highest surface under the player (`body.ground`); motor.stepBody applies the result.
 */

export const Hit = {
  None: 0,
  /** Side hit caused by a lane change: bounce back to the previous lane. */
  Stumble: 1,
  /** Head-on: caught. */
  Crash: 2,
} as const;
export type Hit = (typeof Hit)[keyof typeof Hit];

/** Near end of a moving train for a player at `pz` running at `speed`. */
export function movingFront(o: ObstacleData, pz: number, speed: number): number {
  return o.zMeet - (o.speed * (pz - o.zMeet)) / Math.max(1, speed);
}

/** Ramp surface height at z (0 at its near end, full height where the train starts). */
export function rampHeight(o: ObstacleData, z: number): number {
  const t = (o.z0 - z) / o.len;
  return t <= 0 ? 0 : t >= 1 ? o.top : t * o.top;
}

export const bodyHeight = (b: Body) => (b.rollT > 0 ? PLAYER.rollHeight : PLAYER.height);

/**
 * Tests the body against `count` obstacles. `margin` inflates the player box (the checker and
 * autopilot use a small margin so the real game is always a little more forgiving than the
 * proof). Invulnerable bodies never get hit: they pass through solids (body.ghost) instead of
 * being popped onto their tops, which would teleport a runner 3.4 m onto a roof in one frame.
 */
export function resolve(
  b: Body,
  obstacles: readonly ObstacleData[],
  count: number,
  speed: number,
  margin: number,
  invulnerable: boolean,
): Hit {
  // Hits use the inflated box; standing support uses the true one — otherwise a margin would
  // make roofs longer and gaps shorter, i.e. *more* forgiving than the real game.
  const hw = PLAYER.width / 2;
  const hd = PLAYER.depth / 2;
  const hwHit = hw + margin;
  const hdHit = hd + margin;
  const h = bodyHeight(b) + margin;
  let ground = 0;
  let hit: Hit = Hit.None;
  b.ghost = false;
  // Ramps first: a grounded body rides the ramp surface *this* step, so reaching the train's
  // front edge at the top of the ramp is a landing, not a head-on hit (at 33 m/s one step
  // climbs ~0.27 m).
  if (b.grounded) {
    for (let i = 0; i < count; i++) {
      const o = obstacles[i];
      if (o.kind !== "ramp" || b.z - hd >= o.z0 || b.z + hd <= o.z0 - o.len) continue;
      const reach = o.halfW + hw;
      if (Math.abs(b.x - o.x) >= reach || Math.abs(b.prevX - o.x) >= reach) continue;
      const hr = rampHeight(o, b.z);
      if (hr > b.y) b.y = hr;
    }
  }
  for (let i = 0; i < count; i++) {
    const o = obstacles[i];
    const z0 = o.kind === "trainMoving" ? movingFront(o, b.z, speed) : o.z0;
    const z1 = z0 - o.len;
    if (b.z - hdHit >= z0 || b.z + hdHit <= z1) continue;
    const dx = Math.abs(b.x - o.x);
    const reach = o.halfW + hwHit;
    if (dx >= reach) continue;
    const wasBeside = Math.abs(b.prevX - o.x) >= reach;
    const supports = dx < o.halfW + hw && b.z - hd < z0 && b.z + hd > z1;

    if (o.kind === "ramp") {
      const hr = rampHeight(o, b.z);
      if (b.y >= hr - MOVE.stepTol || !wasBeside) {
        if (supports && hr > ground) ground = hr;
      } else if (invulnerable) {
        b.ghost = true;
      } else {
        hit = Hit.Stumble;
        b.hitX = o.x;
      }
      continue;
    }
    // Above (or landing on) the top: it is a floor. An overhead bar gets no tolerance — you
    // can clear it (sneakers) but never "land" on it from below.
    const tol = o.kind === "roll" ? 0 : MOVE.landTol;
    if (b.y >= o.top - tol || b.prevY >= o.top - tol) {
      if (supports && o.top > ground) ground = o.top;
      continue;
    }
    // Under it (rolling below an overhead bar).
    if (b.y + h <= o.bottom) continue;
    if (invulnerable) {
      b.ghost = true;
      continue;
    }
    if (wasBeside) {
      hit = Hit.Stumble;
      b.hitX = o.x;
    } else return Hit.Crash;
  }
  b.ground = ground;
  return hit;
}
