import type { SaveData } from "./save";

/**
 * Engine → React bridge. The engine owns the truth and pushes immutable snapshots; React reads
 * them with useSyncExternalStore and talks back only through the `GameApi` methods.
 */

export type Screen = "loading" | "menu" | "shop" | "running" | "paused" | "caught" | "over" | "credits";
export type PowerUpKind = "magnet" | "sneakers" | "multiplier" | "jetpack";

export interface GameSnapshot {
  screen: Screen;
  /** 0..1 while screen === "loading". */
  loadProgress: number;
  // live run values (HUD)
  score: number;
  coinsRun: number;
  multiplier: number;
  powerUps: { kind: PowerUpKind; remaining: number; duration: number }[];
  /** The cat is close behind (after a stumble). */
  chaseActive: boolean;
  // persistent (mirrors save.ts)
  coins: number;
  best: number;
  owned: string[];
  selected: string;
  /** Character shown on the shop stage. */
  previewId: string;
  /** A character model is still downloading for the stage (shop spinner). */
  previewLoading: boolean;
  muted: boolean;
  musicMuted: boolean;
  lastRun: { score: number; coins: number; newBest: boolean } | null;
  /** e.g. "Swipe ↑ to jump" during the first run. */
  tutorialHint: string | null;
}

/** Everything React may ask the engine to do. */
export interface GameApi {
  start(): void;
  pause(): void;
  resume(): void;
  toMenu(): void;
  openShop(): void;
  closeShop(): void;
  previewCharacter(id: string): void;
  buyCharacter(id: string): boolean;
  selectCharacter(id: string): void;
  setMuted(muted: boolean): void;
  setMusicMuted(muted: boolean): void;
  openCredits(): void;
  closeCredits(): void;
  dispose(): void;
}

export interface GameStore {
  get(): GameSnapshot;
  set(patch: Partial<GameSnapshot>): void;
  subscribe(listener: () => void): () => void;
}

export function initialSnapshot(save: SaveData): GameSnapshot {
  return {
    screen: "loading",
    loadProgress: 0,
    score: 0,
    coinsRun: 0,
    multiplier: 1,
    powerUps: [],
    chaseActive: false,
    coins: save.coins,
    best: save.best,
    owned: save.owned,
    selected: save.selected,
    previewId: save.selected,
    previewLoading: false,
    muted: save.muted,
    musicMuted: save.musicMuted,
    lastRun: null,
    tutorialHint: null,
  };
}

export function createGameStore(initial: GameSnapshot): GameStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => snapshot,
    set(patch) {
      let changed = false;
      for (const key in patch) {
        if (!Object.is(patch[key as keyof GameSnapshot], snapshot[key as keyof GameSnapshot])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      snapshot = { ...snapshot, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Stable stand-in for the engine that React can hold before (and between, under Strict Mode)
 * engine instances: calls are forwarded to whichever engine is attached, or dropped.
 */
export class GameController implements GameApi {
  private game: GameApi | null = null;
  attach(game: GameApi | null) {
    this.game = game;
  }
  start() { this.game?.start(); }
  pause() { this.game?.pause(); }
  resume() { this.game?.resume(); }
  toMenu() { this.game?.toMenu(); }
  openShop() { this.game?.openShop(); }
  closeShop() { this.game?.closeShop(); }
  previewCharacter(id: string) { this.game?.previewCharacter(id); }
  buyCharacter(id: string) { return this.game?.buyCharacter(id) ?? false; }
  selectCharacter(id: string) { this.game?.selectCharacter(id); }
  setMuted(muted: boolean) { this.game?.setMuted(muted); }
  setMusicMuted(muted: boolean) { this.game?.setMusicMuted(muted); }
  openCredits() { this.game?.openCredits(); }
  closeCredits() { this.game?.closeCredits(); }
  dispose() { this.game?.dispose(); }
}
