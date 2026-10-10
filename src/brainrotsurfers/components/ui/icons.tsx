import type { ReactNode } from "react";
import type { PowerUpKind } from "../../lib/store";

/**
 * Inline SVG icons for the overlay. Inline (not files) so they inherit `currentColor`, cost no
 * requests and can't flash in late over the 3D stage. All are decorative (`aria-hidden`): the
 * buttons that hold them carry the accessible name.
 */

type IconProps = { className?: string };

export const IconPause = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <rect x="5" y="4" width="5" height="16" rx="1.5" />
    <rect x="14" y="4" width="5" height="16" rx="1.5" />
  </svg>
);

export const IconPlay = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
  </svg>
);

export const IconSound = ({ off, className = "size-6" }: IconProps & { off: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    {off ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
  </svg>
);

export const IconMusic = ({ off, className = "size-6" }: IconProps & { off: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18V6l11-2v12" />
    <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
    <circle cx="17.5" cy="16" r="2.5" fill="currentColor" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

export const IconHome = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M11.3 3.3a1 1 0 0 1 1.4 0l8.5 8a1 1 0 0 1-.7 1.7H19v6.5a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6V21H6.5A1.5 1.5 0 0 1 5 19.5V13H3.5a1 1 0 0 1-.7-1.7z" />
  </svg>
);

export const IconBack = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14.5 5l-7 7 7 7" />
  </svg>
);

export const IconChevron = ({ dir, className = "size-7" }: IconProps & { dir: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      d={dir === "left" ? "M15.5 3.5L6.5 12l9 8.5z" : "M8.5 3.5l9 8.5-9 8.5z"}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconCart = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M2.5 3.5h2.3a1 1 0 0 1 1 .78L6.3 6.5h14a1 1 0 0 1 .96 1.27l-1.9 6.8a1.5 1.5 0 0 1-1.44 1.1H8.6l.35 1.6h9.55a1.25 1.25 0 1 1 0 2.5H8a1 1 0 0 1-.98-.79L4 6H2.5a1.25 1.25 0 0 1 0-2.5z" />
    <circle cx="9.5" cy="21" r="1.6" />
    <circle cx="17" cy="21" r="1.6" />
  </svg>
);

export const IconStar = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2.8l2.75 5.86 6.4.73-4.75 4.38 1.3 6.33L12 16.9 6.3 20.1l1.3-6.33L2.85 9.39l6.4-.73z" />
  </svg>
);

export const IconLock = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <rect x="4" y="9.5" width="16" height="12" rx="3" fill="currentColor" />
    <circle cx="12" cy="15.5" r="1.8" fill="var(--br-ink)" />
  </svg>
);

export const IconCheck = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const IconInfo = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 8.2a1.4 1.4 0 0 0-1.4 1.4v5a1.4 1.4 0 0 0 2.8 0v-5a1.4 1.4 0 0 0-1.4-1.4zm0-4.4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z" />
  </svg>
);

export const IconTrophy = ({ className = "size-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M6 3h12v2h3v2.5a4.5 4.5 0 0 1-4.1 4.48A6 6 0 0 1 13.5 15v2.5H17V21H7v-3.5h3.5V15a6 6 0 0 1-3.4-3.02A4.5 4.5 0 0 1 3 7.5V5h3zm0 4.2H5.2v.3a2.3 2.3 0 0 0 1.2 2zm12 0v2.3a2.3 2.3 0 0 0 1.2-2v-.3z" />
  </svg>
);

export const IconExternal = ({ className = "size-3.5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </svg>
);

/* ── Power-ups ─────────────────────────────────────────────────────────────── */

export const IconMagnet = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M5 3.5h4.5V12a2.5 2.5 0 0 0 5 0V3.5H19V12a7 7 0 0 1-14 0z" fill="var(--br-danger)" stroke="var(--br-ink)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M5 3.5h4.5v3.5H5zM14.5 3.5H19v3.5h-4.5z" fill="var(--br-paper)" stroke="var(--br-ink)" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const IconSneaker = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M2.5 15.5V9.8a1 1 0 0 1 1.3-.95l2.2.7c1.3.4 2.4-.2 3-1.4l.8-1.6a1 1 0 0 1 1.5-.3l1.6 1.3c.7.6.8 1.1 1.4 1.8 1.5 1.7 4.2 2 6.1 2.8a2 2 0 0 1 1.1 1.8v1.55z" fill="var(--br-go)" stroke="var(--br-ink)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M2.5 15.5h19.5v1.6a1.4 1.4 0 0 1-1.4 1.4H3.9a1.4 1.4 0 0 1-1.4-1.4z" fill="var(--br-paper)" stroke="var(--br-ink)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M11 9.5l1.6-1M12.6 11l1.6-1" stroke="var(--br-ink)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const IconMultiplier = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <circle cx="12" cy="12" r="10" fill="var(--br-hot)" stroke="var(--br-ink)" strokeWidth="1.6" />
    <text x="12" y="16.3" textAnchor="middle" fontSize="11.5" fontFamily="var(--font-br-lilita), sans-serif" fill="var(--br-paper)" stroke="var(--br-ink)" strokeWidth="1.6" paintOrder="stroke">
      2×
    </text>
  </svg>
);

export const IconJetpack = ({ className = "size-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M8.5 17.5c0 2 1.2 3.5 1.2 3.5s1.3-1.5 1.3-3.5zM13 17.5c0 2 1.2 3.5 1.2 3.5s1.3-1.5 1.3-3.5z" fill="var(--br-coin)" stroke="var(--br-ink)" strokeWidth="1.2" strokeLinejoin="round" />
    <rect x="6.5" y="4" width="5" height="13.5" rx="2.5" fill="var(--br-sky-deep)" stroke="var(--br-ink)" strokeWidth="1.6" />
    <rect x="12.5" y="4" width="5" height="13.5" rx="2.5" fill="var(--br-sky-deep)" stroke="var(--br-ink)" strokeWidth="1.6" />
    <path d="M7.5 7.5h3M13.5 7.5h3" stroke="var(--br-paper)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const POWER_UPS: Record<PowerUpKind, { label: string; color: string; Icon: (p: IconProps) => ReactNode }> = {
  magnet: { label: "Coin Magnet", color: "var(--br-danger)", Icon: IconMagnet },
  sneakers: { label: "Super Sneakers", color: "var(--br-go)", Icon: IconSneaker },
  multiplier: { label: "2× Score", color: "var(--br-hot)", Icon: IconMultiplier },
  jetpack: { label: "Jetpack", color: "var(--br-sky-deep)", Icon: IconJetpack },
};
