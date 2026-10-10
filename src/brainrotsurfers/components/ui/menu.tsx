"use client";

import { CHARACTERS } from "../../lib/characters";
import type { GameApi, GameSnapshot } from "../../lib/store";
import { BrButton, CoinIcon, fmt, Pill } from "./button";
import { IconCart, IconInfo, IconMusic, IconPlay, IconSound, IconTrophy } from "./icons";

/**
 * Title screen over the idling character (stage centre stays clear in portrait and landscape).
 * Taps on empty space reach the canvas, where the engine starts a run.
 */
export function MenuScreen({ s, api }: { s: GameSnapshot; api: GameApi }) {
  // Nudge towards the shop when a new character is affordable.
  const affordable = CHARACTERS.filter((c) => !s.owned.includes(c.id) && c.price <= s.coins).length;

  return (
    <div className="br-safe br-fade-in pointer-events-none absolute inset-0 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-2.5 pl-1">
          <Pill icon={<CoinIcon className="size-11" />} className="min-w-24">
            <span className="br-stroke-thin tabular-nums">{fmt(s.coins)}</span>
          </Pill>
          <Pill
            icon={
              <span className="flex size-11 items-center justify-center rounded-full border-[3px] border-br-ink bg-br-hot text-br-paper">
                <IconTrophy className="size-6" />
              </span>
            }
            className="min-w-24"
          >
            <span className="sr-only">Best</span>
            <span className="br-stroke-thin tabular-nums">{fmt(s.best)}</span>
          </Pill>
        </div>
        <div className="flex gap-2">
          <BrButton tone="glass" size="icon" label="Sound effects" pressed={!s.muted} onClick={() => api.setMuted(!s.muted)}>
            <IconSound off={s.muted} />
          </BrButton>
          <BrButton tone="glass" size="icon" label="Music" pressed={!s.musicMuted} onClick={() => api.setMusicMuted(!s.musicMuted)}>
            <IconMusic off={s.musicMuted} />
          </BrButton>
        </div>
      </div>

      {/* Height-capped logo: on a landscape phone a width-based size would bury the character. */}
      <h1 className="mt-[3vh] flex flex-col items-center text-center font-br-display leading-[0.86] br-short:pointer-events-none br-short:absolute br-short:inset-x-0 br-short:top-[max(18px,env(safe-area-inset-top))] br-short:mt-0">
        <span className="br-logo-bob flex flex-col items-center br-short:flex-row br-short:gap-3">
          <span className="br-logo text-[min(4.1rem,17vw,9.5vh)] text-br-sun sm:text-[min(6.5rem,12vh)] br-short:text-[min(2.5rem,11vh)]">BRAINROT</span>
          <span className="br-logo text-[min(4.1rem,17vw,9.5vh)] text-br-paper sm:text-[min(6.5rem,12vh)] br-short:text-[min(2.5rem,11vh)]">SURFERS</span>
        </span>
      </h1>
      {/* A pill, so it reads as a deliberate label even where a tall character's head reaches it. */}
      <p className="br-stroke-thin mx-auto mt-2 rounded-full border-2 border-br-ink bg-br-panel px-3 py-1 text-center font-br-display text-[1rem] leading-none text-br-paper shadow-[0_3px_0_var(--br-ink)] br-short:hidden">
        Outrun the <span className="text-br-hot">OIIA</span> cat!
      </p>

      <div className="mt-auto flex flex-col items-center gap-4 pb-1 br-short:flex-row br-short:items-end br-short:justify-center br-short:gap-3">
        <BrButton size="lg" onClick={() => api.start()} className="br-pulse br-shine min-w-60 br-short:order-2 br-short:min-w-0">
          <IconPlay className="size-7" />
          TAP TO PLAY
        </BrButton>
        <div className="flex items-center justify-center gap-3 br-short:contents">
          <BrButton tone="coin" onClick={() => api.openShop()} className="min-w-36 br-short:order-1 br-short:min-w-0">
            <IconCart />
            SHOP
            {affordable > 0 && (
              <span
                aria-label={`${affordable} new character${affordable > 1 ? "s" : ""} affordable`}
                className="br-wiggle absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full border-[3px] border-br-ink bg-br-hot text-sm"
              >
                {affordable}
              </span>
            )}
          </BrButton>
          <BrButton tone="sky" onClick={() => api.openCredits()} className="br-short:order-3">
            <IconInfo />
            CREDITS
          </BrButton>
        </div>
      </div>
    </div>
  );
}
