import type { Lane } from "./config";

/** Pure gameplay data shared by the engine, the chunk checker and the autopilot (no three). */

export type ObstacleKind = "jump" | "roll" | "train" | "trainMoving" | "ramp";

/**
 * One live obstacle. z0 is the near end (largest z, faces the player), the obstacle extends
 * `len` toward −z. A moving train's z0 is derived from the player's position each frame (see
 * collision.movingFront), so it always meets the player at `zMeet`.
 */
export interface ObstacleData {
  kind: ObstacleKind;
  lane: Lane;
  x: number;
  z0: number;
  len: number;
  halfW: number;
  bottom: number;
  top: number;
  /** trainMoving only: speed toward +z and the authored meeting point. */
  speed: number;
  zMeet: number;
}

export type CoinShape = "line" | "arc" | "ramp" | "roof";

/**
 * Authored chunk content. `z` is the distance ahead of the chunk start (positive), `len` runs
 * further ahead from there.
 * - jump / roll: barrier whose near face is at z.
 * - train: static train from z to z+len.
 * - trainRamp: ramp from z to z+7, then a static train from z+7 to z+7+len.
 * - trainMoving: train that meets the player at z (its near end arrives there exactly when the
 *   player does); `speed` m/s toward the player.
 * - coins: a coin line/arc over [z, z+len]. "arc" hops over a jump barrier, "ramp" climbs a
 *   ramp then runs along the roof, "roof" sits on a train roof.
 * - `swap: false` keeps a barrier from being flipped jump↔roll by the variant picker.
 */
export type Placement =
  | { type: "jump" | "roll"; lane: Lane; z: number; swap?: boolean }
  | { type: "train" | "trainRamp"; lane: Lane; z: number; len: number }
  | { type: "trainMoving"; lane: Lane; z: number; len: number; speed: number }
  | { type: "coins"; lane: Lane; z: number; len: number; shape: CoinShape };

export interface Chunk {
  id: string;
  /** 0 easy … 3 hard. */
  tier: 0 | 1 | 2 | 3;
  /** Content length; WORLD.breather is appended automatically. */
  length: number;
  items: Placement[];
  /** Allow the jump↔roll variant (validated by spawner.check.ts). Default true. */
  swappable?: boolean;
}

export type BodyAction = "left" | "right" | "up" | "down";
export type InputAction = BodyAction | "pause" | "confirm";
