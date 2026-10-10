import { Hit } from "./collision";
import { applyAction, copyBody, createBody, stepBody, type Body } from "./motor";
import type { BodyAction, ObstacleData } from "./types";

/**
 * Breadth-first search over player states using the real motor/collision step. Each start
 * state carries a bit mask; states that converge merge their masks, so one search answers
 * "which starts can survive" for all of them at once. Used by spawner.check.ts (one bit per
 * entry lane) and by the dev autopilot (one bit per first action).
 */

export interface PlanOptions {
  speed: number;
  /** Simulation step; use the engine substep (1/60) so the search sees what the game sees. */
  dt: number;
  /** Actions may be taken every N steps. */
  decisionEvery: number;
  steps: number;
  /** Player box inflation, for a conservative answer. */
  margin: number;
  /**
   * No new actions before this step. The autopilot applies its first action itself (one start
   * per action), so the "do nothing" start must not sneak in an action at step 0 — and it
   * should only count as safe if nothing is needed until its next tick.
   */
  quietSteps?: number;
}

export interface PlanResult {
  /** OR of the masks still alive after the last step. */
  aliveMask: number;
  /** Per bit: last step at which some state carrying it was alive (−1 = dead at once). */
  lastAlive: number[];
}

const ACTIONS: (BodyAction | null)[] = [null, "left", "right", "up", "down"];

const q = (v: number, s: number) => Math.round(v * s);
/** Quantised state as one number (cheaper than string keys; all fields fit well under 2^53). */
const keyOf = (b: Body) => {
  let k = b.lane * 3 + b.prevLane;
  k = k * 11 + q(b.laneT, 10);
  k = k * 64 + (q(b.fromX, 10) + 32);
  k = k * 128 + Math.min(127, Math.max(0, q(b.y, 10)));
  k = k * 256 + Math.min(255, Math.max(0, q(b.vy, 2) + 128));
  k = k * 4 + (b.grounded ? 2 : 0) + (b.rollQueued ? 1 : 0);
  return k * 16 + q(b.rollT, 10);
};

/** Would this action change anything right now? (prunes no-op branches) */
function useful(b: Body, a: BodyAction): boolean {
  if (b.jet > 0) return a === "left" || a === "right";
  switch (a) {
    case "left": return b.lane > 0;
    case "right": return b.lane < 2;
    case "up": return b.grounded;
    case "down": return !b.rollQueued && (!b.grounded || b.rollT < 0.2);
  }
}

export function explore(
  starts: readonly Body[],
  masks: readonly number[],
  obstacles: readonly ObstacleData[],
  count: number,
  opts: PlanOptions,
  bits: number,
): PlanResult {
  let frontier: { body: Body; mask: number }[] = starts.map((s, i) => ({ body: copyBody(createBody(), s), mask: masks[i] }));
  const lastAlive = new Array<number>(bits).fill(-1);
  for (let step = 0; step < opts.steps && frontier.length; step++) {
    const next = new Map<number, { body: Body; mask: number }>();
    const decide = step >= (opts.quietSteps ?? 0) && step % opts.decisionEvery === 0;
    for (const { body, mask } of frontier) {
      for (const a of ACTIONS) {
        if (a && (!decide || !useful(body, a))) continue;
        const b = copyBody(createBody(), body);
        if (a) applyAction(b, a);
        const hit = stepBody(b, obstacles, count, opts.speed, opts.dt, opts.margin, false);
        if (hit !== Hit.None) continue;
        const key = keyOf(b);
        const prev = next.get(key);
        if (prev) prev.mask |= mask;
        else next.set(key, { body: b, mask });
      }
    }
    frontier = [...next.values()];
    let alive = 0;
    for (const s of frontier) alive |= s.mask;
    for (let i = 0; i < bits; i++) if (alive & (1 << i)) lastAlive[i] = step;
  }
  let aliveMask = 0;
  for (const s of frontier) aliveMask |= s.mask;
  return { aliveMask, lastAlive };
}
