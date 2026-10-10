import { COIN, LANES, MOVE, OBSTACLE, POWERUP, TIMING, WORLD, speedAt, type Lane } from "./config";
import { CHUNKS } from "./chunks";
import type { Rng } from "./rng";
import type { Chunk, ObstacleData, ObstacleKind, Placement } from "./types";

/**
 * Turns the authored chunk library (chunks.ts) into world content ahead of the player:
 * difficulty-weighted selection, random mirror (lane 0↔2) and jump↔roll swap. Pure logic — the
 * engine supplies a SpawnSink that creates the actual pooled entities. Every variant used here
 * is proven passable by spawner.check.ts.
 */

export interface SpawnSink {
  obstacle(kind: ObstacleKind, lane: Lane, z0: number, len: number, speed: number, zMeet: number): void;
  coin(x: number, y: number, z: number): void;
  /** A guaranteed-free spot (the chunk's breather) where a power-up may go. */
  powerUpSlot(lane: Lane, z: number): void;
}

const mirrorLane = (l: Lane) => (2 - l) as Lane;

/** The placements of a chunk variant. */
export function variantItems(chunk: Chunk, mirror: boolean, swap: boolean): Placement[] {
  const doSwap = swap && chunk.swappable !== false;
  return chunk.items.map((p) => {
    const lane = mirror ? mirrorLane(p.lane) : p.lane;
    if (doSwap && (p.type === "jump" || p.type === "roll") && p.swap !== false) {
      return { ...p, lane, type: p.type === "jump" ? "roll" : "jump" };
    }
    if (doSwap && p.type === "coins" && p.shape === "arc") return { ...p, lane, shape: "line" };
    return { ...p, lane };
  });
}

/** Builds obstacle records for placements whose chunk starts at world z `startZ`. */
export function emitObstacles(items: readonly Placement[], startZ: number, sink: Pick<SpawnSink, "obstacle">): void {
  for (const p of items) {
    const z0 = startZ - p.z;
    switch (p.type) {
      case "jump":
        sink.obstacle("jump", p.lane, z0, OBSTACLE.jumpLen, 0, 0);
        break;
      case "roll":
        sink.obstacle("roll", p.lane, z0, OBSTACLE.rollLen, 0, 0);
        break;
      case "train":
        sink.obstacle("train", p.lane, z0, p.len, 0, 0);
        break;
      case "trainRamp":
        sink.obstacle("ramp", p.lane, z0, OBSTACLE.rampLen, 0, 0);
        sink.obstacle("train", p.lane, z0 - OBSTACLE.rampLen, p.len, 0, 0);
        break;
      case "trainMoving":
        sink.obstacle("trainMoving", p.lane, z0, p.len, p.speed, z0);
        break;
    }
  }
}

/** Jump arc shape: fraction of the arc before the barrier, and the jump's flight time. */
const ARC_LEAD = 0.35;
const JUMP_AIR = (2 * MOVE.jumpV) / MOVE.gravity;
const JUMP_APEX = (MOVE.jumpV * MOVE.jumpV) / (2 * MOVE.gravity);

/**
 * Coin positions for placements whose chunk starts at world z `startZ`. Arcs are re-fitted to
 * the actual jump at `speed`: a jump started at the arc's first coin follows the arc exactly
 * (authored arcs are centred on their barrier).
 */
export function emitCoins(items: readonly Placement[], startZ: number, sink: Pick<SpawnSink, "coin">, speed = 15): void {
  for (const p of items) {
    if (p.type !== "coins") continue;
    let from = p.z;
    let len = p.len;
    if (p.shape === "arc") {
      const barrier = p.z + p.len / 2;
      len = speed * JUMP_AIR;
      from = barrier - ARC_LEAD * len;
    }
    const n = Math.max(1, Math.floor(len / COIN.spacing) + 1);
    const x = LANES[p.lane];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const d = t * len;
      let y = COIN.y;
      if (p.shape === "arc") y += JUMP_APEX * 4 * t * (1 - t);
      else if (p.shape === "roof") y += OBSTACLE.trainH;
      else if (p.shape === "ramp") y += Math.min(1, d / OBSTACLE.rampLen) * OBSTACLE.trainH;
      sink.coin(x, y, startZ - from - d);
    }
  }
}

/** Plain obstacle records (for the checker / tests). */
export function toObstacleData(items: readonly Placement[], startZ: number): ObstacleData[] {
  const out: ObstacleData[] = [];
  emitObstacles(items, startZ, {
    obstacle(kind, lane, z0, len, speed, zMeet) {
      out.push(makeObstacle(kind, lane, z0, len, speed, zMeet));
    },
  });
  return out;
}

export function makeObstacle(kind: ObstacleKind, lane: Lane, z0: number, len: number, speed: number, zMeet: number): ObstacleData {
  const o: ObstacleData = { kind, lane, x: 0, z0: 0, len: 0, halfW: 0, bottom: 0, top: 0, speed: 0, zMeet: 0 };
  return setObstacle(o, kind, lane, z0, len, speed, zMeet);
}

/** Fills an (pooled) obstacle record. */
export function setObstacle(
  o: ObstacleData, kind: ObstacleKind, lane: Lane, z0: number, len: number, speed: number, zMeet: number,
): ObstacleData {
  o.kind = kind;
  o.lane = lane;
  o.x = LANES[lane];
  o.z0 = z0;
  o.len = len;
  o.speed = speed;
  o.zMeet = zMeet;
  switch (kind) {
    case "jump":
      o.halfW = OBSTACLE.barrierW / 2; o.bottom = 0; o.top = OBSTACLE.jumpH;
      break;
    case "roll":
      o.halfW = OBSTACLE.barrierW / 2; o.bottom = OBSTACLE.rollBottom; o.top = OBSTACLE.rollTop;
      break;
    case "ramp":
      o.halfW = OBSTACLE.rampW / 2; o.bottom = 0; o.top = OBSTACLE.trainH;
      break;
    default:
      o.halfW = OBSTACLE.trainW / 2; o.bottom = 0; o.top = OBSTACLE.trainH;
  }
  return o;
}

/** Tier weights for a run time: easy only at first, harder tiers fade in. */
export function tierWeights(t: number): [number, number, number, number] {
  if (t < TIMING.easyTime) return [1, 0, 0, 0];
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    Math.max(0.12, 1 - (t - TIMING.easyTime) / 45),
    clamp((t - TIMING.easyTime) / 25) * 1.2,
    clamp((t - 35) / 35) * 1.1,
    clamp((t - 80) / 60),
  ];
}

export class Spawner {
  /** World z where the next chunk starts (decreasing). */
  nextZ = 0;
  private lastId = "";
  private untilPowerUp = 0;
  /** A stretch [clearFar, clearNear] no chunk may touch (the jetpack's landing); far > near = none. */
  private clearFar = 0;
  private clearNear = -Infinity;
  private readonly byTier: Chunk[][] = [[], [], [], []];

  constructor(private readonly rng: Rng, private readonly sink: SpawnSink) {
    for (const c of CHUNKS) this.byTier[c.tier].push(c);
  }

  reset(playerZ: number): void {
    this.nextZ = playerZ - WORLD.startGap;
    this.lastId = "";
    this.untilPowerUp = this.powerUpGap() * 0.6;
    this.clearFar = 0;
    this.clearNear = -Infinity;
  }

  /**
   * Keeps world z in [zFar, zNear] empty: chunks that would reach into it are skipped and the
   * track simply stays clear past it (content already spawned there is the engine's to remove).
   */
  keepClear(zFar: number, zNear: number): void {
    this.clearFar = zFar;
    this.clearNear = zNear;
  }

  /** Spawns chunks until content reaches WORLD.spawnAhead in front of the player. */
  update(playerZ: number, runTime: number): void {
    let guard = 8;
    while (this.nextZ > playerZ - WORLD.spawnAhead && guard-- > 0) this.spawnChunk(runTime);
  }

  shift(dz: number): void {
    this.nextZ += dz;
    this.clearFar += dz;
    this.clearNear += dz;
  }

  private powerUpGap(): number {
    return POWERUP.gapMin + (POWERUP.gapMax - POWERUP.gapMin) * this.rng();
  }

  private pickChunk(runTime: number): Chunk {
    const w = tierWeights(runTime);
    let total = 0;
    for (let i = 0; i < 4; i++) if (this.byTier[i].length) total += w[i];
    let r = this.rng() * total;
    let tier = 0;
    for (let i = 0; i < 4; i++) {
      if (!this.byTier[i].length) continue;
      r -= w[i];
      if (r <= 0) {
        tier = i;
        break;
      }
    }
    const list = this.byTier[tier];
    let c = list[Math.floor(this.rng() * list.length)];
    if (c.id === this.lastId && list.length > 1) c = list[(list.indexOf(c) + 1) % list.length];
    return c;
  }

  private spawnChunk(runTime: number): void {
    const chunk = this.pickChunk(runTime);
    // A moving train still passes alongside for up to ~30 m after its chunk ends: keep margin.
    const reach = chunk.length + WORLD.breather + 30;
    if (this.nextZ > this.clearFar && this.nextZ - reach < this.clearNear) {
      this.nextZ = this.clearFar;
      return;
    }
    this.lastId = chunk.id;
    const items = variantItems(chunk, this.rng() < 0.5, this.rng() < 0.35);
    const start = this.nextZ;
    emitObstacles(items, start, this.sink);
    // Arcs fit the speed the player will have when they get there (~spawn distance ahead).
    emitCoins(items, start, this.sink, speedAt(runTime + WORLD.spawnAhead / speedAt(runTime)));
    const total = chunk.length + WORLD.breather;
    this.untilPowerUp -= total;
    if (this.untilPowerUp <= 0) {
      this.untilPowerUp = this.powerUpGap();
      this.sink.powerUpSlot(Math.floor(this.rng() * 3) as Lane, start - chunk.length - WORLD.breather / 2);
    }
    this.nextZ = start - total;
  }
}
