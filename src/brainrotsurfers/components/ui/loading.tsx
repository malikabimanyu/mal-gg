"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "Jump over low barriers. Roll under high ones.",
  "Ramps take you onto train roofs. The view is great up there.",
  "Stumble twice and the OIIA cat gets you.",
  "Swipe down mid-air to slam back to the ground.",
  "The magnet pulls coins from every lane.",
  "Super Sneakers: jump higher, land on trains.",
  "2× doubles your score, not your coins.",
  "Coins buy new brainrot friends in the SHOP.",
  "Tung Tung Tung Sahur never misses sahur.",
  "Bombardiro Crocodilo doesn't run. It hovers.",
];

/**
 * Shown while the engine chunk downloads (game-mount) and while the first models load.
 * Tips rotate every few seconds; the first one is fixed so server and client markup match.
 */
export function LoadingScreen({ progress }: { progress: number }) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <div className="br-safe absolute inset-0 flex flex-col items-center justify-center gap-7 overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,var(--br-sky),var(--br-sky-deep)_70%,var(--br-sky-dark))] br-short:gap-4">
      {/* Sunburst behind the logo. */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 size-[180vmax] -translate-x-1/2 -translate-y-1/2 opacity-25 [background:repeating-conic-gradient(var(--br-paper)_0_10deg,transparent_10deg_20deg)] [mask-image:radial-gradient(circle,#000_10%,transparent_45%)]"
      />
      <h1 className="br-logo-bob relative flex flex-col items-center text-center font-br-display leading-[0.86] br-short:flex-row br-short:gap-3">
        <span className="br-logo text-[min(4.5rem,18vw,11vh)] text-br-sun sm:text-8xl br-short:text-5xl">BRAINROT</span>
        <span className="br-logo text-[min(4.5rem,18vw,11vh)] text-br-paper sm:text-8xl br-short:text-5xl">SURFERS</span>
      </h1>

      <div className="relative flex w-[min(20rem,80vw)] flex-col items-center gap-2">
        <div
          className="h-7 w-full overflow-hidden rounded-full border-[3px] border-br-ink bg-br-panel p-[3px] shadow-[0_4px_0_var(--br-ink)]"
          role="progressbar"
          aria-label="Loading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="br-stripes h-full rounded-full bg-br-coin shadow-[inset_0_3px_0_rgb(255_255_255/0.5)] transition-[width] duration-300"
            style={{ width: `${Math.max(8, pct)}%` }}
          />
        </div>
        <p className="br-stroke-thin font-br-display text-xl leading-none tabular-nums">LOADING… {pct}%</p>
      </div>

      <p
        key={tip}
        className="br-rise-in relative max-w-sm rounded-2xl border-[3px] border-br-ink bg-br-paper px-4 py-2.5 text-center font-br-display text-lg leading-snug text-br-ink shadow-[0_4px_0_var(--br-ink)] br-short:text-[1rem]"
        aria-live="polite"
      >
        <span className="text-br-hot">TIP:</span> {TIPS[tip]}
      </p>
    </div>
  );
}
