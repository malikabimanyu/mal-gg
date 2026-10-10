import { Autopilot } from "./debug";
import type { Game } from "./engine";
import { CHARACTERS, isCharacterId } from "../lib/characters";
import { loadSave, SAVE_KEY, writeSave } from "../lib/save";
import type { PowerUpKind } from "../lib/store";

/**
 * Dev-only test hooks (never installed in production builds):
 *   window.__brDebug = { game, setInvincible(b), setSpeed(v | null), autopilot(b), powerUp(kind), state(),
 *                        unlockAll(), character(id) }
 * The smoke test drives long unattended runs with autopilot(true); the character pass uses
 * unlockAll() + character(id) to put every model on stage.
 */
export interface BrDebug {
  game: Game;
  setInvincible(on: boolean): void;
  setSpeed(v: number | null): void;
  autopilot(on: boolean): void;
  powerUp(kind: PowerUpKind): void;
  state(): ReturnType<Game["debugState"]> & { autopilotDecisions: number };
  /** Owns every character and sets coins to 99 999 (persisted). */
  unlockAll(): void;
  /** Unlocks if needed, selects and shows `id`; resolves once its model is on stage. */
  character(id: string): Promise<void>;
}

/**
 * Writes the save behind the engine's back, then replays the cross-tab `storage` event the
 * engine already listens to, so it adopts the new save exactly like a second tab's purchase.
 */
function patchSave(patch: (owned: string[]) => { owned: string[]; coins?: number }) {
  const save = loadSave();
  const next = patch(save.owned);
  writeSave({ ...save, owned: next.owned, coins: next.coins ?? save.coins });
  window.dispatchEvent(new StorageEvent("storage", { key: SAVE_KEY }));
}

declare global {
  interface Window {
    __brDebug?: BrDebug;
  }
}

export function installDebugHooks(game: Game): () => void {
  const hooks: BrDebug = {
    game,
    setInvincible: (on) => void (game.invincible = on),
    setSpeed: (v) => void (game.speedOverride = v),
    autopilot: (on) => void (game.autopilot = on ? (game.autopilot ?? new Autopilot()) : null),
    powerUp: (kind) => game.debugPowerUp(kind),
    state: () => ({ ...game.debugState(), autopilotDecisions: game.autopilot?.decisions ?? 0 }),
    unlockAll: () => patchSave(() => ({ owned: CHARACTERS.map((c) => c.id), coins: 99999 })),
    character: async (id) => {
      if (!isCharacterId(id)) throw new Error(`unknown character: ${id}`);
      patchSave((owned) => ({ owned: owned.includes(id) ? owned : [...owned, id] }));
      game.selectCharacter(id);
      game.previewCharacter(id);
      // previewLoading flips on synchronously when a download starts and off when it lands.
      for (let i = 0; i < 300 && game.store.get().previewLoading; i++) await new Promise((r) => setTimeout(r, 50));
    },
  };
  window.__brDebug = hooks;
  return () => {
    if (window.__brDebug === hooks) delete window.__brDebug;
  };
}
