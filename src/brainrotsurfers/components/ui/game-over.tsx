"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CHARACTERS } from "../../lib/characters";
import type { GameApi, GameSnapshot } from "../../lib/store";
import { BrButton, CoinIcon, fmt, textAccent } from "./button";
import { IconCart, IconHome, IconPlay, IconTrophy } from "./icons";

/** Counts 0 → target over `ms` (ease-out); instant under reduced motion. */
function useCountUp(target: number, ms = 900, delay = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setV(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - t0) / ms));
      setV(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

/** "caught" shows only the headline over the knock-out; "over" adds the results card. */
export function GameOverScreen({ s, api, caught }: { s: GameSnapshot; api: GameApi; caught: boolean }) {
  const run = s.lastRun;
  return (
    <div
      className={`br-safe absolute inset-0 flex flex-col items-center gap-4 br-short:gap-2 ${
        caught
          ? // Headline in the top band: the knock-out and the cat stay visible at screen centre.
            "pointer-events-none justify-start pt-[12vh]"
          : "br-fade-in justify-center-safe overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgb(27_16_53/0.35),rgb(27_16_53/0.75))]"
      }`}
    >
      <h2 className="br-slam br-logo shrink-0 font-br-display text-[min(6rem,22vw)] leading-none text-br-hot br-short:text-5xl">OIIA&apos;D!</h2>
      {!caught && run && <Results s={s} api={api} run={run} />}
    </div>
  );
}

function Results({ s, api, run }: { s: GameSnapshot; api: GameApi; run: NonNullable<GameSnapshot["lastRun"]> }) {
  const score = useCountUp(run.score, 900, 150);
  const coins = useCountUp(run.coins, 700, 350);
  // The cheapest character still locked, as a reason to go again (or to the shop).
  const next = CHARACTERS.filter((c) => !s.owned.includes(c.id)).sort((a, b) => a.price - b.price)[0];
  const missing = next ? next.price - s.coins : 0;

  return (
    <>
      <div className="br-rise-in relative flex w-[min(20rem,100%)] shrink-0 flex-col gap-2 rounded-3xl border-[3px] border-br-ink bg-br-panel-solid/95 p-5 font-br-display shadow-[0_6px_0_var(--br-ink)] br-short:w-auto br-short:flex-row br-short:items-center br-short:gap-6 br-short:px-6 br-short:py-2.5">
        <Row label="SCORE">
          <span className="br-stroke text-4xl tabular-nums br-short:text-3xl">{fmt(score)}</span>
        </Row>
        <Row label="COINS">
          <span className="flex items-center gap-2">
            <CoinIcon className="size-7" />
            <span className="br-stroke-thin text-3xl tabular-nums text-br-sun br-short:text-2xl">{fmt(coins)}</span>
          </span>
        </Row>
        <Row label="BEST">
          <span className="flex items-center gap-2">
            <IconTrophy className="size-6 text-br-hot" />
            <span className="br-stroke-thin text-3xl tabular-nums br-short:text-2xl">{fmt(s.best)}</span>
          </span>
        </Row>
        {run.newBest && (
          <span
            className="br-stamp br-stroke-thin absolute -top-5 -right-4 rounded-xl border-[3px] border-br-ink bg-br-sun px-3 py-1.5 text-xl leading-none shadow-[0_4px_0_var(--br-ink)] br-short:-top-8 br-short:-right-10 br-short:px-2 br-short:py-1 br-short:text-[1rem]"
            style={{ animationDelay: "0.9s" }}
          >
            NEW BEST!
          </span>
        )}
      </div>

      {next && (
        // Plain inline text (not flex): wraps as one sentence on phones, "!" stays on the name.
        <p className="br-rise-in br-stroke-thin max-w-[22rem] shrink-0 text-center font-br-display text-lg leading-tight text-balance br-short:hidden" style={{ animationDelay: "0.2s" }}>
          {missing > 0 ? (
            <>
              <CoinIcon className="mr-1 inline-flex size-5 align-[-0.2em]" />
              {fmt(missing)} more to unlock <span style={{ color: textAccent(next.accent) }}>{next.name}</span>
            </>
          ) : (
            <>
              You can unlock <span style={{ color: textAccent(next.accent) }}>{next.name}</span>!
            </>
          )}
        </p>
      )}

      <div className="br-rise-in flex shrink-0 flex-col items-stretch gap-3 br-short:flex-row br-short:items-center br-short:gap-2" style={{ animationDelay: "0.15s" }}>
        <BrButton size="lg" className="br-shine br-short:min-h-12 br-short:px-5 br-short:text-xl" onClick={() => api.start()}>
          <IconPlay className="size-7 br-short:size-6" />
          PLAY AGAIN
        </BrButton>
        <div className="flex gap-3 br-short:gap-2">
          <BrButton tone="coin" className="flex-1" onClick={() => api.openShop()}>
            <IconCart />
            SHOP
            {missing <= 0 && next && <span aria-hidden className="br-wiggle absolute -top-2.5 -right-2.5 size-5 rounded-full border-[3px] border-br-ink bg-br-hot" />}
          </BrButton>
          <BrButton tone="grape" className="flex-1" onClick={() => api.toMenu()}>
            <IconHome />
            HOME
          </BrButton>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 br-short:flex-col br-short:items-center br-short:gap-0.5">
      <span className="text-lg leading-none text-br-mute">{label}</span>
      {children}
    </div>
  );
}
