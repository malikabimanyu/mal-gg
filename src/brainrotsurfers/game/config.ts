/**
 * Every gameplay tunable in one place. Units: metres, seconds, m/s. The player runs toward −z;
 * the camera sits behind at +z. Nothing in here imports three so the pure gameplay modules
 * (motor, collision, spawner, planner) stay runnable under plain Node for the chunk checker.
 */

/** Lane centres, left → right. */
export const LANES = [-2.4, 0, 2.4] as const;
export type Lane = 0 | 1 | 2;

export const PLAYER = {
  width: 0.9,
  depth: 0.9,
  height: 1.7,
  rollHeight: 0.85,
} as const;

export const MOVE = {
  /** Eased lane switch duration. */
  laneTime: 0.13,
  jumpV: 17,
  sneakersJumpV: 22,
  gravity: 58,
  /** Down while airborne slams to the ground, then rolls on landing. */
  slamV: -38,
  rollTime: 0.65,
  /** Within this much of an obstacle top you land on it instead of crashing into it. */
  landTol: 0.35,
  /** Max ramp step-up when entering a ramp from its side. */
  stepTol: 0.35,
  /** How long a jump/roll pressed too early (mid-air) waits to be applied. */
  bufferTime: 0.22,
} as const;

export const SPEED = {
  min: 15,
  max: 33,
  /** speed = min + (max − min)·(1 − e^(−t/tau)), t = seconds into the run. */
  tau: 150,
} as const;

export const OBSTACLE = {
  trainW: 2.1,
  trainH: 3.4,
  barrierW: 2.0,
  jumpH: 1.0,
  jumpLen: 0.4,
  rollBottom: 1.15,
  rollTop: 2.6,
  rollLen: 0.4,
  rampLen: 7,
  rampW: 2.0,
  /** Train lengths the visuals pool by; authored lengths must be one of these. */
  trainLengths: [12, 18, 24, 30] as readonly number[],
  movingSpeedMin: 9,
  movingSpeedMax: 14,
  /**
   * A moving train drives through its lane ahead of the meet point before reaching the
   * player; this much clear lane beyond the meet point keeps that drive-through hidden in fog.
   */
  movingCorridor: 70,
} as const;

/** Height of blob shadows on the track bed: just above the sleeper tops (0.12). */
export const SHADOW_Y = 0.14;

export const WORLD = {
  spawnAhead: 170,
  despawnBehind: 20,
  /** Floating origin: shift everything back by this much once the player passes −shift. */
  originShift: 2000,
  fogNear: 60,
  fogFar: 140,
  /** Empty stretch at the end of every chunk so any lane is reachable before the next one. */
  breather: 8,
  /** Distance before the first chunk of a run. */
  startGap: 30,
} as const;

export const CURVE = {
  y: 0.0016,
  x: 0.0012,
  /** Seconds for a full left↔right sway of the horizon. */
  period: 20,
} as const;

export const CAMERA = {
  height: 3.6,
  back: 6.5,
  lookAhead: 6,
  lookHeight: 1.0,
  /** Share of the player's x the camera follows. */
  followX: 0.6,
  fovLandscape: 60,
  fovPortraitMax: 75,
} as const;

export const CAT = {
  startGap: 2,
  hiddenGap: 14,
  chaseGap: 2.2,
  chaseTime: 4.5,
  spinRun: 2.5,
  spinCatch: 6,
} as const;

export const POWERUP = {
  durations: { magnet: 12, sneakers: 12, multiplier: 15, jetpack: 8 },
  gapMin: 450,
  gapMax: 700,
  magnetRange: 12,
  jetY: 8,
  /** Invulnerability after the jetpack runs out (covers the descent plus ~1 s). */
  jetInvuln: 1.5,
  pickupRadius: 1.2,
} as const;

export const COIN = {
  radius: 0.9,
  spacing: 2.2,
  /** Height of a ground coin's centre above the surface. */
  y: 0.75,
  pool: 640,
  /** Coins picked within this window count as a streak (pitch rises). */
  streakWindow: 0.45,
} as const;

export const TIMING = {
  /** Frame dt is clamped (the game slows down rather than tunnelling). */
  maxDt: 1 / 20,
  /** Physics substep. */
  substep: 1 / 60,
  hudInterval: 0.1,
  caughtTime: 1.6,
  stumbleCooldown: 0.6,
  /** First seconds of a run: easy chunks only. */
  easyTime: 10,
} as const;

export const speedAt = (t: number) => SPEED.min + (SPEED.max - SPEED.min) * (1 - Math.exp(-t / SPEED.tau));
