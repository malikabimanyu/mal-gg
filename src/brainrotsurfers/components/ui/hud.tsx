"use client";

import type { GameApi, GameSnapshot } from "../../lib/store";
import { BrButton, CoinIcon, fmt } from "./button";
import { IconPause, POWER_UPS } from "./icons";

/**
 * In-run HUD: pause + power-up timers (left), score / coins / ×2 (right), tutorial bubble,
 * and the red "cat is behind you" alarm while the chaser is close after a stumble.
 *
 * Nothing may sit on the horizon band or the runner, where obstacles appear: the tutorial
 * bubble lives in the sky (top band of the score row on short landscape screens), and the
 * alarm sits low in portrait but up in the sky on wide screens, where the chasing cat fills
 * the bottom of the view.
 */
export function Hud({ s, api }: { s: GameSnapshot; api: GameApi }) {
  const hint = s.screen === "running" ? s.tutorialHint : null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {s.chaseActive && <div aria-hidden className="br-danger-vignette absolute inset-0" />}

      <div className="br-safe relative flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2.5">
          {/* Out of the Tab order: a stray Tab would park focus here and Space would pause
              instead of jumping. Keyboard players have P / Esc. */}
          <BrButton tone="glass" size="icon" label="Pause" tabIndex={-1} onClick={() => api.pause()}>
            <IconPause />
          </BrButton>
          {s.powerUps.map((p) => {
            const meta = POWER_UPS[p.kind];
            const frac = Math.max(0, Math.min(1, p.remaining / p.duration));
            const ending = p.remaining < 2.5;
            return (
              <div key={p.kind} className="br-pop-in flex items-center gap-1.5" aria-label={`${meta.label}: ${Math.ceil(p.remaining)} seconds left`}>
                <span className="flex size-10 items-center justify-center rounded-full border-[3px] border-br-ink bg-br-paper shadow-[0_3px_0_var(--br-ink)]">
                  <meta.Icon className="size-7" />
                </span>
                <span className={`h-4 w-24 overflow-hidden rounded-full border-[3px] border-br-ink bg-br-panel ${ending ? "br-pulse" : ""}`}>
                  <span
                    className="block h-full rounded-full shadow-[inset_0_3px_0_rgb(255_255_255/0.4)] transition-[width] duration-100 ease-linear"
                    style={{ width: `${frac * 100}%`, background: meta.color }}
                  />
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {s.multiplier > 1 && (
              <span className="br-pop-in br-stroke-thin rounded-xl border-[3px] border-br-ink bg-br-hot px-2 py-0.5 font-br-display text-2xl leading-none shadow-[0_3px_0_var(--br-ink)]">
                ×{s.multiplier}
              </span>
            )}
            <div className="br-stroke font-br-display text-[2.75rem] leading-none tabular-nums sm:text-6xl br-short:text-[2.4rem]" aria-label={`Score ${fmt(s.score)}`}>
              {fmt(s.score)}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span key={s.coinsRun} className={s.coinsRun > 0 ? "br-bump inline-flex" : "inline-flex"}>
              <CoinIcon className="size-8" />
            </span>
            <span className="br-stroke font-br-display text-3xl leading-none tabular-nums text-br-sun" aria-label={`${s.coinsRun} coins`}>
              {fmt(s.coinsRun)}
            </span>
          </div>
        </div>
      </div>

      {s.chaseActive && s.screen === "running" && (
        <div
          className="absolute inset-x-0 bottom-[max(9%,calc(env(safe-area-inset-bottom)+16px))] flex justify-center px-4 [@media(min-aspect-ratio:1/1)]:top-[13%] [@media(min-aspect-ratio:1/1)]:bottom-auto br-short:top-[max(72px,calc(env(safe-area-inset-top)+62px))]"
          role="alert"
        >
          <div className="br-pop-in br-pulse br-stroke-thin rotate-[-2deg] rounded-2xl border-[3px] border-br-ink bg-br-danger px-4 py-2 text-center font-br-display text-2xl leading-none shadow-[0_4px_0_var(--br-ink)] br-short:text-xl">
            THE CAT IS BEHIND YOU!
          </div>
        </div>
      )}

      {hint && (
        <div className="absolute inset-x-0 top-[22%] flex justify-center px-4 br-short:top-[max(10px,env(safe-area-inset-top))]">
          <div
            key={hint}
            className="br-pop-in relative max-w-[90vw] rounded-3xl border-[3px] border-br-ink bg-br-paper px-4 py-2.5 text-center font-br-display text-xl leading-tight whitespace-nowrap text-br-ink shadow-[0_5px_0_var(--br-ink)] sm:px-5 sm:py-3 sm:text-2xl br-short:max-w-[46vw] br-short:px-3 br-short:py-1.5 br-short:text-lg br-short:whitespace-normal"
          >
            <HintText text={hint} />
            {/* speech-bubble tail */}
            <span aria-hidden className="absolute -bottom-[11px] left-1/2 size-5 -translate-x-1/2 rotate-45 border-r-[3px] border-b-[3px] border-br-ink bg-br-paper" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Arrows in the hint bob and glow so the gesture reads at a glance. */
function HintText({ text }: { text: string }) {
  const parts = text.split(/([←→↑↓])/);
  return (
    <>
      {parts.map((p, i) =>
        /[←→↑↓]/.test(p) ? (
          <span key={i} className="br-hint-bob mx-0.5 inline-block rounded-lg bg-br-sky-deep px-1.5 text-br-paper" style={{ animationDelay: `${(i % 4) * 0.12}s` }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
