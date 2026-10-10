/**
 * Headless long-run test of spawner + motor + collision + autopilot (no rendering):
 *   npx -y tsx src/brainrotsurfers/game/autopilot.sim.ts [seconds] [fps] [seed]
 * Mirrors the engine's run loop (frame dt, 1/60 substeps, moving trains, despawn) and reports
 * how far the autopilot gets — a cheap way to catch unfair chunks or physics regressions.
 */
import { Hit, movingFront } from "./collision";
import { speedAt, TIMING, WORLD } from "./config";
import { Autopilot } from "./debug";
import { applyAction, createBody, stepBody } from "./motor";
import { createRng } from "./rng";
import { makeObstacle, Spawner } from "./spawner";
import type { BodyAction, ObstacleData } from "./types";

const seconds = Number(process.argv[2] ?? 300);
const fps = Number(process.argv[3] ?? 60);
const seed = Number(process.argv[4] ?? 7);

const obstacles: ObstacleData[] = [];
const spawner = new Spawner(createRng(seed), {
  obstacle: (kind, lane, z0, len, speed, zMeet) => void obstacles.push(makeObstacle(kind, lane, z0, len, speed, zMeet)),
  coin: () => {},
  powerUpSlot: () => {},
});
const body = createBody(1, 0);
spawner.reset(0);
const pilot = new Autopilot();
const queue: BodyAction[] = [];
let t = 0;
let stumbles = 0;
let chaseT = 0;
let cooldown = 0;
const dt = Math.min(1 / fps, TIMING.maxDt);
let result = "survived";
const log: string[] = [];
outer: while (t < seconds) {
  t += dt;
  const speed = speedAt(t);
  spawner.update(body.z, t);
  for (const o of obstacles) if (o.kind === "trainMoving") o.z0 = movingFront(o, body.z, speed);
  pilot.update(dt, body, obstacles, obstacles.length, speed, (a) => queue.push(a));
  for (const a of queue) {
    applyAction(body, a);
    log.push(`${t.toFixed(2)} z=${body.z.toFixed(1)} ${a}`);
  }
  queue.length = 0;
  const n = Math.max(1, Math.ceil(dt / TIMING.substep - 1e-6));
  for (let i = 0; i < n; i++) {
    const hit = stepBody(body, obstacles, obstacles.length, speed, dt / n, 0, false);
    if (hit === Hit.Crash) {
      result = `CRASH at t=${t.toFixed(1)} z=${body.z.toFixed(1)} lane=${body.lane} y=${body.y.toFixed(2)}`;
      break outer;
    }
    if (hit === Hit.Stumble && cooldown <= 0) {
      stumbles++;
      cooldown = TIMING.stumbleCooldown;
      log.push(`${t.toFixed(2)} STUMBLE z=${body.z.toFixed(1)}`);
      if (chaseT > 0) {
        result = `CAUGHT (2nd stumble) at t=${t.toFixed(1)} z=${body.z.toFixed(1)}`;
        break outer;
      }
      chaseT = 4.5;
    }
  }
  chaseT -= dt;
  cooldown -= dt;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (o.z0 - o.len > body.z + 6.5 + WORLD.despawnBehind) obstacles.splice(i, 1);
  }
}
console.log(`${result}; t=${t.toFixed(1)} s, distance ${(-body.z).toFixed(0)} m, stumbles ${stumbles}, decisions ${pilot.decisions}, fps ${fps}`);
if (result !== "survived") {
  console.log(log.slice(-12).join("\n"));
  const near = obstacles.filter((o) => Math.abs(o.z0 - body.z) < 40).map((o) => `${o.kind} lane${o.lane} z0=${o.z0.toFixed(1)} len=${o.len}`);
  console.log(near.join("\n"));
  process.exit(1);
}
