"use client";

import { useEffect } from "react";
import type { GameApi, GameSnapshot } from "../../lib/store";
import { BrButton, CoinIcon, fmt } from "./button";
import { IconHome, IconMusic, IconPlay, IconSound } from "./icons";

/** Pause card. Esc/P/Enter resume via the engine's own key handling. */
export function PauseScreen({ s, api }: { s: GameSnapshot; api: GameApi }) {
  // Focus lands nowhere in particular: keep Space/Enter for the engine (resume).
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, []);

  return (
    <div className="br-safe br-fade-in absolute inset-0 flex flex-col items-center justify-center-safe gap-5 overflow-y-auto bg-br-scrim backdrop-blur-[3px] br-short:gap-3">
      <h2 className="br-stroke br-pop-in -rotate-2 font-br-display text-7xl leading-none text-br-sun br-short:text-5xl">PAUSED</h2>
      <div className="br-rise-in flex items-center gap-4 rounded-full border-[3px] border-br-ink bg-br-panel px-5 py-2 font-br-display text-2xl leading-none shadow-[0_4px_0_var(--br-ink)]">
        <span className="br-stroke-thin tabular-nums">{fmt(s.score)}</span>
        <span className="flex items-center gap-1.5">
          <CoinIcon className="size-7" />
          <span className="br-stroke-thin tabular-nums text-br-sun">{fmt(s.coinsRun)}</span>
        </span>
      </div>
      <div className="br-rise-in flex flex-col items-stretch gap-4 br-short:flex-row br-short:items-center br-short:gap-3">
        <BrButton size="lg" className="br-shine min-w-56 br-short:min-w-0" onClick={() => api.resume()}>
          <IconPlay className="size-7" />
          RESUME
        </BrButton>
        <div className="flex justify-center gap-3">
          <BrButton tone="grape" className="flex-1" onClick={() => api.toMenu()}>
            <IconHome />
            HOME
          </BrButton>
          <BrButton tone="glass" size="icon" label="Sound effects" pressed={!s.muted} onClick={() => api.setMuted(!s.muted)}>
            <IconSound off={s.muted} />
          </BrButton>
          <BrButton tone="glass" size="icon" label="Music" pressed={!s.musicMuted} onClick={() => api.setMusicMuted(!s.musicMuted)}>
            <IconMusic off={s.musicMuted} />
          </BrButton>
        </div>
      </div>
    </div>
  );
}
