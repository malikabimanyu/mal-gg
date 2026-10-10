/**
 * Chunk library validator. Run: `npx -y tsx src/brainrotsurfers/game/spawner.check.ts`
 * Exits non-zero if any chunk variant is impossible from any entry lane at any tested speed,
 * or breaks an authoring rule (see chunks.ts). Uses the real motor + collision step via a BFS
 * over player states (planner.ts) with a slightly inflated player box.
 */
import { COIN, OBSTACLE, WORLD, type Lane } from "./config";
import { CHUNKS } from "./chunks";
import { createBody } from "./motor";
import { explore } from "./planner";
import { emitCoins, toObstacleData, variantItems } from "./spawner";
import type { Chunk, Placement } from "./types";

const SPEEDS = [15, 20, 26, 33];
const MARGIN = 0.1;
const DT = 1 / 60;

const problems: string[] = [];
const fail = (chunk: Chunk, msg: string) => problems.push(`${chunk.id}: ${msg}`);

function itemEnd(p: Placement): number {
  switch (p.type) {
    case "jump": return p.z + OBSTACLE.jumpLen;
    case "roll": return p.z + OBSTACLE.rollLen;
    case "trainRamp": return p.z + OBSTACLE.rampLen + p.len;
    default: return p.z + p.len;
  }
}

function staticChecks(chunk: Chunk) {
  const ids = CHUNKS.filter((c) => c.id === chunk.id).length;
  if (ids > 1) fail(chunk, "duplicate id");
  for (const p of chunk.items) {
    if (p.type !== "coins" && p.z < 10) fail(chunk, `${p.type} at z=${p.z} < 10 (no room after the previous breather)`);
    if (itemEnd(p) > chunk.length + 0.01) fail(chunk, `${p.type} lane ${p.lane} ends at ${itemEnd(p)} > length ${chunk.length}`);
    if ((p.type === "train" || p.type === "trainRamp" || p.type === "trainMoving") && !OBSTACLE.trainLengths.includes(p.len)) {
      fail(chunk, `train length ${p.len} not in ${OBSTACLE.trainLengths.join("/")}`);
    }
    if (p.type === "trainMoving") {
      if (p.speed < OBSTACLE.movingSpeedMin || p.speed > OBSTACLE.movingSpeedMax) fail(chunk, `moving speed ${p.speed} out of range`);
      const corridor = chunk.length + WORLD.breather - p.z;
      if (corridor < OBSTACLE.movingCorridor) fail(chunk, `moving train corridor ${corridor} m < ${OBSTACLE.movingCorridor} m`);
      for (const q of chunk.items) {
        if (q !== p && q.lane === p.lane && itemEnd(q) > p.z) fail(chunk, `${q.type} at z=${q.z} sits in the moving train's corridor (lane ${p.lane})`);
      }
    }
  }
}

/** Coins must not sit inside solids (unreachable or visually clipping). */
function coinChecks(chunk: Chunk, items: Placement[], label: string, speed: number) {
  const obstacles = toObstacleData(items, 0);
  emitCoins(items, 0, {
    coin(x, y, z) {
      for (const o of obstacles) {
        if (o.kind === "trainMoving") continue;
        const inX = Math.abs(x - o.x) < o.halfW;
        const inZ = z < o.z0 + 0.3 && z > o.z0 - o.len - 0.3;
        if (!inX || !inZ) continue;
        if (o.kind === "ramp") continue;
        const r = 0.35;
        if (y + r > o.bottom && y - r < o.top) fail(chunk, `${label}: coin at z=${(-z).toFixed(1)} lane x=${x} inside ${o.kind}`);
      }
    },
  }, speed);
}

/** Survival mask for a chunk variant from each entry lane at one speed. */
function aliveMask(items: Placement[], length: number, speed: number) {
  const obstacles = toObstacleData(items, 0);
  const startZ = 2;
  const endZ = -(length + WORLD.breather);
  const steps = Math.ceil((startZ - endZ) / (speed * DT));
  const starts = ([0, 1, 2] as Lane[]).map((l) => createBody(l, startZ));
  return explore(starts, [1, 2, 4], obstacles, obstacles.length, { speed, dt: DT, decisionEvery: 4, steps, margin: MARGIN }, 3);
}

// Self-test: the checker must reject walls it cannot get through, and accept trivial chunks —
// otherwise a green run means nothing.
{
  const lanes: Lane[] = [0, 1, 2];
  const wall: Placement[] = lanes.map((lane) => ({ type: "train", lane, z: 12, len: 18 }));
  const jumpThenRoll: Placement[] = lanes.flatMap((lane): Placement[] => [
    { type: "jump", lane, z: 12 },
    { type: "roll", lane, z: 12.6 },
  ]);
  const hop: Placement[] = [{ type: "jump", lane: 1, z: 12 }, { type: "train", lane: 0, z: 10, len: 30 }, { type: "train", lane: 2, z: 10, len: 30 }];
  for (const speed of SPEEDS) {
    if (aliveMask(wall, 30, speed).aliveMask !== 0) problems.push(`self-test: train wall passable @${speed}`);
    if (aliveMask(jumpThenRoll, 14, speed).aliveMask !== 0) problems.push(`self-test: jump+roll wall passable @${speed}`);
    if (aliveMask(hop, 40, speed).aliveMask !== 7) problems.push(`self-test: single jump corridor rejected @${speed}`);
  }
}

let runs = 0;
const t0 = performance.now();
for (const chunk of CHUNKS) {
  staticChecks(chunk);
  const variants: [boolean, boolean][] = [[false, false], [true, false]];
  if (chunk.swappable !== false && chunk.items.some((p) => p.type === "jump" || p.type === "roll")) {
    variants.push([false, true], [true, true]);
  }
  for (const [mirror, swap] of variants) {
    const items = variantItems(chunk, mirror, swap);
    const label = `${mirror ? "mirror" : "plain"}${swap ? "+swap" : ""}`;
    for (const speed of [SPEEDS[0], SPEEDS[SPEEDS.length - 1]]) coinChecks(chunk, items, `${label} @${speed}`, speed);
    for (const speed of SPEEDS) {
      const startZ = 2;
      const res = aliveMask(items, chunk.length, speed);
      runs++;
      if (res.aliveMask !== 7) {
        for (let l = 0; l < 3; l++) {
          if (res.aliveMask & (1 << l)) continue;
          const diedAt = startZ - (res.lastAlive[l] + 1) * speed * DT;
          fail(chunk, `${label} @${speed} m/s: impossible from lane ${l} (dies near z=${(-diedAt).toFixed(1)})`);
        }
      }
    }
  }
}

const ms = Math.round(performance.now() - t0);
const tiers = [0, 1, 2, 3].map((t) => CHUNKS.filter((c) => c.tier === t).length);
console.log(`chunks: ${CHUNKS.length} (tiers ${tiers.join("/")}), BFS runs: ${runs}, ${ms} ms, coin spacing ${COIN.spacing} m`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("✓ every chunk variant is passable from every entry lane at", SPEEDS.join("/"), "m/s");
