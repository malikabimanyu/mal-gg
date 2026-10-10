import type { Lane } from "./config";
import type { Chunk, CoinShape, Placement } from "./types";

/**
 * The authored chunk library. Lanes: 0 left, 1 centre, 2 right. z = metres ahead of the chunk
 * start. Rules (enforced by spawner.check.ts — run it after editing):
 * - every variant (mirror × jump↔roll swap) is passable from every entry lane at 15–33 m/s;
 * - first obstacle at z ≥ 10, nothing past `length` (an 8 m breather is appended);
 * - train lengths ∈ OBSTACLE.trainLengths; a moving train's lane stays clear (obstacles and
 *   coins) from its meet point to the chunk end, which is ≥ OBSTACLE.movingCorridor away.
 */

const J = (lane: Lane, z: number, swap = true): Placement => ({ type: "jump", lane, z, swap });
const R = (lane: Lane, z: number, swap = true): Placement => ({ type: "roll", lane, z, swap });
const T = (lane: Lane, z: number, len: number): Placement => ({ type: "train", lane, z, len });
/** Ramp at z..z+7, train from z+7. */
const TR = (lane: Lane, z: number, len: number): Placement => ({ type: "trainRamp", lane, z, len });
const TM = (lane: Lane, z: number, len: number, speed: number): Placement => ({ type: "trainMoving", lane, z, len, speed });
const C = (lane: Lane, z: number, len: number, shape: CoinShape = "line"): Placement => ({ type: "coins", lane, z, len, shape });
/** Coin arc over a jump barrier at z (re-fitted to the jump at spawn time, see emitCoins). */
const ARC = (lane: Lane, z: number): Placement => C(lane, z - 4.8, 10, "arc");

export const CHUNKS: readonly Chunk[] = [
  // ── Tier 0: one idea at a time ────────────────────────────────────────────
  {
    id: "t0-jump-centre", tier: 0, length: 34,
    items: [J(1, 18), ARC(1, 18), C(0, 10, 22), C(2, 26, 8)],
  },
  {
    id: "t0-roll-sides", tier: 0, length: 34,
    items: [R(0, 18), R(2, 18), C(1, 10, 22)],
  },
  {
    id: "t0-train-sides", tier: 0, length: 40,
    items: [T(0, 12, 24), T(2, 12, 24), C(1, 10, 28)],
  },
  {
    id: "t0-ramp-centre", tier: 0, length: 44,
    items: [TR(1, 12, 24), C(1, 12, 31, "ramp"), C(0, 14, 20), C(2, 14, 20)],
  },
  {
    id: "t0-stagger", tier: 0, length: 46,
    items: [J(0, 12), J(2, 26), R(1, 40), C(1, 10, 24), ARC(2, 26), C(0, 30, 14)],
  },
  {
    id: "t0-train-centre", tier: 0, length: 36,
    items: [T(1, 12, 18), J(0, 22), ARC(0, 22), C(2, 10, 24)],
  },

  // ── Tier 1: combinations ─────────────────────────────────────────────────
  {
    id: "t1-rows", tier: 1, length: 44,
    items: [J(0, 14), J(1, 14), R(2, 14), R(0, 34), J(1, 34), J(2, 34), ARC(1, 14), ARC(2, 34), C(1, 20, 10)],
  },
  {
    id: "t1-roof-highway", tier: 1, length: 66,
    items: [
      TR(1, 10, 30), T(0, 17, 30), T(2, 17, 30),
      C(1, 10, 37, "ramp"), C(0, 24, 18, "roof"), C(2, 24, 18, "roof"),
      J(1, 60), ARC(1, 60),
    ],
  },
  {
    id: "t1-zigzag", tier: 1, length: 78,
    items: [T(1, 10, 18), T(0, 38, 18), T(2, 60, 18), C(0, 10, 22), C(1, 34, 22), C(1, 60, 18)],
  },
  {
    id: "t1-wall-and-bars", tier: 1, length: 46,
    items: [T(0, 10, 30), J(1, 16), R(1, 34), J(2, 24), ARC(1, 16), ARC(2, 24), C(0, 10, 30, "roof")],
    swappable: false,
  },
  {
    id: "t1-moving-intro", tier: 1, length: 86,
    items: [TM(0, 18, 18, 10), J(1, 30), T(2, 36, 24), R(1, 56), ARC(1, 30), C(1, 40, 12), C(2, 10, 20)],
  },
  {
    id: "t1-ramp-side", tier: 1, length: 50,
    items: [TR(0, 10, 24), T(1, 17, 24), J(2, 20), R(2, 36), C(0, 10, 31, "ramp"), C(1, 22, 16, "roof"), ARC(2, 20)],
  },

  // ── Tier 2: needs a plan ─────────────────────────────────────────────────
  {
    id: "t2-rooftop-gap", tier: 2, length: 66,
    items: [
      TR(1, 10, 18), T(1, 41, 24), T(0, 17, 30), J(2, 24), R(2, 46),
      C(1, 10, 25, "ramp"), C(1, 43, 20, "roof"), ARC(2, 24),
    ],
  },
  {
    id: "t2-gauntlet", tier: 2, length: 74,
    items: [
      J(0, 12), R(1, 12), J(2, 12),
      R(0, 32), J(1, 32), R(2, 32),
      J(0, 52), J(1, 52), R(2, 52),
      R(0, 72), R(1, 72), J(2, 72),
      ARC(1, 32), ARC(0, 52), C(1, 58, 10),
    ],
  },
  {
    id: "t2-corridor", tier: 2, length: 62,
    items: [T(0, 10, 30), T(0, 40, 18), T(2, 10, 18), T(2, 28, 30), R(1, 20), J(1, 38), R(1, 56), ARC(1, 38), C(1, 10, 6), C(0, 12, 40, "roof")],
  },
  {
    id: "t2-moving-centre", tier: 2, length: 92,
    items: [
      TR(0, 12, 30), TM(1, 22, 24, 12), J(2, 18), R(2, 38), J(2, 58), T(2, 70, 18),
      C(0, 12, 37, "ramp"), ARC(2, 18), C(2, 44, 10), C(0, 52, 14),
    ],
  },
  {
    id: "t2-ramp-switch", tier: 2, length: 70,
    items: [TR(2, 10, 30), T(1, 17, 30), J(0, 18), R(0, 34), T(0, 52, 18), C(2, 10, 37, "ramp"), C(1, 20, 24, "roof"), ARC(0, 18)],
  },

  // ── Tier 3: fast and busy ────────────────────────────────────────────────
  {
    id: "t3-slalom", tier: 3, length: 70,
    items: [T(0, 10, 24), T(1, 10, 12), T(2, 32, 24), T(1, 44, 24), C(2, 10, 20), C(1, 24, 16), C(0, 38, 30)],
  },
  {
    id: "t3-roof-chain", tier: 3, length: 84,
    items: [
      TR(1, 10, 24), T(0, 38, 24), T(1, 46, 30), T(2, 60, 24),
      C(1, 10, 31, "ramp"), C(0, 40, 20, "roof"), C(1, 66, 10, "roof"),
    ],
  },
  {
    id: "t3-moving-gauntlet", tier: 3, length: 92,
    items: [
      TM(2, 22, 18, 14), J(0, 14), R(1, 14), R(0, 34), J(1, 34), T(0, 50, 24), J(1, 60), R(1, 78),
      ARC(0, 14), ARC(1, 34), ARC(1, 60),
    ],
  },
  {
    id: "t3-mixed", tier: 3, length: 66,
    items: [
      J(1, 12), T(0, 12, 18), R(2, 12), R(1, 28), T(2, 30, 18), J(0, 38), J(1, 46), R(0, 56), T(1, 54, 12),
      ARC(1, 12), ARC(0, 38),
    ],
  },
];
