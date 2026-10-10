"use client";

import { useSyncExternalStore } from "react";
import type { GameApi, GameStore } from "../../lib/store";
import { CreditsScreen } from "./credits";
import { GameOverScreen } from "./game-over";
import { Hud } from "./hud";
import { LoadingScreen } from "./loading";
import { MenuScreen } from "./menu";
import { PauseScreen } from "./pause";
import { ShopScreen } from "./shop";

/** Picks the UI layer for the engine's current screen. */
export function Overlay({ store, api }: { store: GameStore; api: GameApi }) {
  const s = useSyncExternalStore(store.subscribe, store.get, store.get);
  return (
    <div className="pointer-events-none absolute inset-0" data-screen={s.screen}>
      {s.screen === "loading" && <LoadingScreen progress={s.loadProgress} />}
      {s.screen === "menu" && <MenuScreen s={s} api={api} />}
      {(s.screen === "running" || s.screen === "paused") && (
        // Under the pause scrim the HUD is decoration: inert keeps it out of focus and taps.
        <div className="contents" inert={s.screen === "paused"}>
          <Hud s={s} api={api} />
        </div>
      )}
      {s.screen === "paused" && (
        <div className="pointer-events-auto absolute inset-0">
          <PauseScreen s={s} api={api} />
        </div>
      )}
      {(s.screen === "caught" || s.screen === "over") && (
        <div className={s.screen === "over" ? "pointer-events-auto absolute inset-0" : "absolute inset-0"}>
          <GameOverScreen s={s} api={api} caught={s.screen === "caught"} />
        </div>
      )}
      {s.screen === "shop" && <ShopScreen s={s} api={api} />}
      {s.screen === "credits" && (
        <div className="pointer-events-auto absolute inset-0">
          <CreditsScreen api={api} />
        </div>
      )}
    </div>
  );
}
