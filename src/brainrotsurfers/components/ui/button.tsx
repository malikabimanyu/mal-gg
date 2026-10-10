"use client";

import type { ReactNode, Ref } from "react";

/**
 * Chunky toy buttons: ink outline, glossy top highlight, hard drop shadow that collapses on
 * press (`.br-btn` in globals.css). Every size is ≥ 44 px tall for thumbs.
 */
export type Tone = "go" | "hot" | "coin" | "sky" | "grape" | "glass";

const TONES: Record<Tone, string> = {
  go: "bg-[linear-gradient(to_bottom,#7af59a,var(--br-go)_55%,var(--br-go-deep))] text-br-paper",
  hot: "bg-[linear-gradient(to_bottom,#ff8db5,var(--br-hot)_55%,var(--br-hot-deep))] text-br-paper",
  coin: "bg-[linear-gradient(to_bottom,var(--br-coin-light),var(--br-coin)_50%,var(--br-coin-deep))] text-br-paper",
  sky: "bg-[linear-gradient(to_bottom,#78b9ff,var(--br-sky-deep)_55%,var(--br-sky-dark))] text-br-paper",
  grape: "bg-[linear-gradient(to_bottom,#b493ff,var(--br-grape)_55%,var(--br-grape-deep))] text-br-paper",
  glass: "bg-br-panel text-br-paper backdrop-blur-sm",
};

const SIZES = {
  icon: "size-12 rounded-2xl text-xl",
  sm: "min-h-11 min-w-11 px-3 text-lg rounded-xl",
  md: "min-h-12 px-5 text-xl rounded-2xl",
  lg: "min-h-16 px-8 text-3xl rounded-3xl br-short:min-h-13 br-short:px-6 br-short:text-2xl",
} as const;

interface BrButtonProps {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  /** Accessible name for icon-only buttons. */
  label?: string;
  pressed?: boolean;
  /**
   * Looks and announces disabled but still takes clicks, so a "can't afford" tap can answer
   * with a shake + buzz instead of silently doing nothing.
   */
  softDisabled?: boolean;
  className?: string;
  /** −1 keeps it out of the Tab order (still tappable/clickable). */
  tabIndex?: number;
  ref?: Ref<HTMLButtonElement>;
}

export function BrButton({ children, onClick, tone = "go", size = "md", disabled = false, label, pressed, softDisabled = false, className = "", tabIndex, ref }: BrButtonProps) {
  return (
    <button
      ref={ref}
      tabIndex={tabIndex}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={softDisabled || undefined}
      disabled={disabled}
      onClick={(e) => {
        // Pointer clicks drop focus so Space/Enter go back to the game (jump), not this button.
        if (e.detail > 0) e.currentTarget.blur();
        onClick?.();
      }}
      className={`br-btn br-stroke-thin pointer-events-auto relative inline-flex shrink-0 items-center justify-center gap-2 border-[3px] border-br-ink font-br-display leading-none tracking-wide whitespace-nowrap disabled:cursor-not-allowed disabled:saturate-50 aria-disabled:saturate-[0.35] aria-disabled:brightness-90 ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Embossed gold coin. Sized by the caller (`size-*`). */
export function CoinIcon({ className = "size-6" }: { className?: string }) {
  return (
    <span aria-hidden className={`br-coin relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[55%] text-br-coin-deep/80">
        <path fill="currentColor" d="M12 2.8l2.75 5.86 6.4.73-4.75 4.38 1.3 6.33L12 16.9 6.3 20.1l1.3-6.33L2.85 9.39l6.4-.73z" />
      </svg>
    </span>
  );
}

/** Rounded counter pill (coins, best). The icon hangs over the left edge like a badge. */
export function Pill({ children, icon, className = "" }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div
      className={`relative inline-flex h-10 items-center gap-2 rounded-full border-[3px] border-br-ink bg-br-panel pr-4 font-br-display text-xl leading-none shadow-[0_4px_0_var(--br-ink)] backdrop-blur-sm ${
        icon ? "pl-12" : "pl-4"
      } ${className}`}
    >
      {icon && <span className="absolute -left-1 top-1/2 flex -translate-y-1/2 items-center">{icon}</span>}
      {children}
    </div>
  );
}

/** Formats counters the same way everywhere ("12,345"). */
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * Accent colours come from the character registry and some are dark (coffee brown, olive);
 * as text over the dark outline/panels they'd vanish, so lift dark ones towards white.
 */
export function textAccent(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum < 0.2 ? `color-mix(in oklab, ${hex}, white ${Math.round(55 - lum * 150)}%)` : hex;
}
