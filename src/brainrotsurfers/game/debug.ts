import { applyAction, copyBody, createBody, type Body } from "./motor";
import { explore } from "./planner";
import type { BodyAction, ObstacleData } from "./types";

/**
 * Dev-only autopilot: every decision tick it searches the next ~2.4 s with the same BFS the
 * chunk checker uses (one mask bit per possible first action) and takes the first action that
 * still has a surviving future. Used by the headless smoke test for long unattended runs.
 */
const FIRST: (BodyAction | null)[] = [null, "left", "right", "up", "down"];
const TICK = 0.05;
const HORIZON = 2.4;
const DT = 1 / 60;
/** Steps (of DT) the chosen first action must stay safe without another input. */
const QUIET = 6;

export class Autopilot {
  private t = 0;
  private readonly near: ObstacleData[] = [];
  decisions = 0;

  update(dt: number, body: Body, obstacles: readonly ObstacleData[], count: number, speed: number, act: (a: BodyAction) => void): void {
    this.t -= dt;
    if (this.t > 0 || body.jet > 0) return;
    this.t = TICK;
    // Only what the horizon can reach.
    this.near.length = 0;
    const reach = speed * HORIZON + 10;
    for (let i = 0; i < count; i++) {
      const o = obstacles[i];
      if (o.kind === "trainMoving" || (o.z0 - o.len < body.z + 3 && o.z0 > body.z - reach)) this.near.push(o);
    }
    const starts: Body[] = [];
    const masks: number[] = [];
    FIRST.forEach((a, i) => {
      const b = copyBody(createBody(), body);
      if (a && !applyChanges(b, a)) return;
      starts.push(b);
      masks.push(1 << i);
    });
    const plan = (quietSteps: number) => explore(starts, masks, this.near, this.near.length, {
      speed, dt: DT, decisionEvery: 4, steps: Math.round(HORIZON / DT), margin: 0.18, quietSteps,
    }, FIRST.length);
    // Prefer choices that need no follow-up before the next tick (+ a frame of slack).
    let res = plan(QUIET);
    if (!res.aliveMask) res = plan(1);
    this.decisions++;
    let pick = -1;
    for (let i = 0; i < FIRST.length; i++) {
      if (res.aliveMask & (1 << i)) {
        pick = i;
        break;
      }
    }
    if (pick < 0) {
      let best = -2;
      res.lastAlive.forEach((s, i) => {
        if (s > best) {
          best = s;
          pick = i;
        }
      });
    }
    const a = FIRST[pick];
    if (a) act(a);
  }
}

/** Applies `a` and reports whether it changed anything (no-op branches are skipped). */
function applyChanges(b: Body, a: BodyAction): boolean {
  if (a === "left" && b.lane === 0) return false;
  if (a === "right" && b.lane === 2) return false;
  if (a === "up" && !b.grounded) return false;
  if (a === "down" && (b.rollQueued || (b.grounded && b.rollT > 0.2))) return false;
  return applyAction(b, a) === "applied";
}
