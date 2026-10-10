import { LANES, MOVE, POWERUP, type Lane } from "./config";
import { Hit, resolve } from "./collision";
import type { BodyAction, ObstacleData } from "./types";

/**
 * The player's physical state as plain data, plus the step function shared by the engine, the
 * chunk checker and the dev autopilot — so what the checker proves is exactly what the game
 * plays. No three.js in here.
 */
export interface Body {
  x: number;
  y: number;
  z: number;
  vy: number;
  lane: Lane;
  /** Lane before the current switch (a side hit bounces back to it). */
  prevLane: Lane;
  fromX: number;
  /** Lane switch progress 0..1 (1 = settled). */
  laneT: number;
  grounded: boolean;
  /** Remaining roll seconds (> 0 = rolling, low hitbox). */
  rollT: number;
  /** Down was pressed mid-air: roll on landing. */
  rollQueued: boolean;
  prevX: number;
  prevY: number;
  prevZ: number;
  /** Highest surface under the player from the last resolve. */
  ground: number;
  /** Remaining jetpack seconds. */
  jet: number;
  /** Remaining invulnerability seconds. */
  invuln: number;
  sneakers: boolean;
  /** Lateral velocity of the last step (animation lean, camera roll). */
  laneVel: number;
  /** x of the obstacle behind the last side hit (set by collision.resolve on a stumble). */
  hitX: number;
  /** Overlapping a solid while invulnerable (set by collision.resolve): passing through it. */
  ghost: boolean;
}

export function createBody(lane: Lane = 1, z = 0): Body {
  const x = LANES[lane];
  return {
    x, y: 0, z, vy: 0, lane, prevLane: lane, fromX: x, laneT: 1, grounded: true, rollT: 0,
    rollQueued: false, prevX: x, prevY: 0, prevZ: z, ground: 0, jet: 0, invuln: 0,
    sneakers: false, laneVel: 0, hitX: x, ghost: false,
  };
}

export function copyBody(dst: Body, src: Body): Body {
  dst.x = src.x; dst.y = src.y; dst.z = src.z; dst.vy = src.vy; dst.lane = src.lane;
  dst.prevLane = src.prevLane; dst.fromX = src.fromX; dst.laneT = src.laneT;
  dst.grounded = src.grounded; dst.rollT = src.rollT; dst.rollQueued = src.rollQueued;
  dst.prevX = src.prevX; dst.prevY = src.prevY; dst.prevZ = src.prevZ; dst.ground = src.ground;
  dst.jet = src.jet; dst.invuln = src.invuln; dst.sneakers = src.sneakers; dst.laneVel = src.laneVel;
  dst.hitX = src.hitX; dst.ghost = src.ghost;
  return dst;
}

/**
 * What an action did: "applied", "buffer" (can't be used yet — jump while airborne — so the
 * caller retries it for MOVE.bufferTime) or "ignored" (a no-op: past the edge lane, up/down
 * while flying the jetpack). Only "applied" deserves a sound.
 */
export type ActionResult = "applied" | "buffer" | "ignored";

export function applyAction(b: Body, a: BodyAction): ActionResult {
  switch (a) {
    case "left":
    case "right": {
      const target = b.lane + (a === "left" ? -1 : 1);
      if (target < 0 || target > 2) return "ignored";
      b.prevLane = b.lane;
      b.lane = target as Lane;
      b.fromX = b.x;
      b.laneT = 0;
      return "applied";
    }
    case "up":
      if (b.jet > 0) return "ignored";
      if (!b.grounded) return "buffer";
      b.vy = b.sneakers ? MOVE.sneakersJumpV : MOVE.jumpV;
      b.grounded = false;
      b.rollT = 0;
      b.rollQueued = false;
      return "applied";
    case "down":
      if (b.jet > 0) return "ignored";
      if (b.grounded) {
        b.rollT = MOVE.rollTime;
        return "applied";
      }
      if (b.vy > MOVE.slamV) b.vy = MOVE.slamV;
      b.rollQueued = true;
      return "applied";
  }
}

const easeLane = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

/** Result flags of the last stepBody (beyond the hit): did the body land this step? */
export interface StepInfo {
  landed: boolean;
}

/**
 * One physics step: move, collide, bounce back on a side hit, land. `invincible` is the dev
 * hook; jetpack/invulnerability come from the body itself.
 */
export function stepBody(
  b: Body,
  obstacles: readonly ObstacleData[],
  count: number,
  speed: number,
  dt: number,
  margin: number,
  invincible: boolean,
  info?: StepInfo,
): Hit {
  b.prevX = b.x;
  b.prevY = b.y;
  b.prevZ = b.z;
  b.z -= speed * dt;

  if (b.laneT < 1) {
    b.laneT = Math.min(1, b.laneT + dt / MOVE.laneTime);
    b.x = b.fromX + (LANES[b.lane] - b.fromX) * easeLane(b.laneT);
  } else b.x = LANES[b.lane];
  b.laneVel = (b.x - b.prevX) / dt;

  if (b.rollT > 0) b.rollT = Math.max(0, b.rollT - dt);
  if (b.invuln > 0) b.invuln = Math.max(0, b.invuln - dt);

  if (b.jet > 0) {
    b.jet = Math.max(0, b.jet - dt);
    b.y += (POWERUP.jetY - b.y) * Math.min(1, dt * 3);
    b.vy = 0;
    b.grounded = false;
    b.rollT = 0;
    b.ground = 0;
    if (b.jet === 0) b.invuln = POWERUP.jetInvuln;
    if (info) info.landed = false;
    return Hit.None;
  }

  if (!b.grounded) {
    b.vy -= MOVE.gravity * dt;
    b.y += b.vy * dt;
  }

  const hit = resolve(b, obstacles, count, speed, margin, invincible || b.invuln > 0);
  // Invulnerability never runs out inside a train: it lasts until the body is clear of it.
  if (b.ghost && b.invuln > 0) b.invuln = Math.max(b.invuln, dt * 2);
  if (hit === Hit.Crash) return hit;
  if (hit === Hit.Stumble) {
    // Bounce away from what was hit, into the lane on the side we approached from. (Not
    // prevLane: two quick presses the same way make that the obstacle's own lane, and the body
    // would then grind against it every step.)
    const hitLane = Math.round(b.hitX / (LANES[2] - LANES[1])) + 1;
    const back = Math.max(0, Math.min(2, b.hitX > b.prevX ? hitLane - 1 : hitLane + 1)) as Lane;
    b.x = b.prevX;
    b.lane = back;
    b.prevLane = back;
    b.fromX = b.x;
    b.laneT = 0;
  }

  let landed = false;
  if (b.y <= b.ground) {
    landed = !b.grounded;
    b.y = b.ground;
    b.vy = 0;
    b.grounded = true;
    if (landed && b.rollQueued) {
      b.rollQueued = false;
      b.rollT = MOVE.rollTime;
    }
  } else if (b.grounded) {
    if (b.y - b.ground < 0.02) b.y = b.ground;
    else {
      // Walked off a roof: fall.
      b.grounded = false;
      b.vy = 0;
    }
  }
  if (info) info.landed = landed;
  return hit;
}
