import { Icon } from "@/bretford/components/ui/icon";
import { stats, type Stat } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

/** Tile fill + 1px border share the accent color (Figma 866:6954 / 6962 / 6971). */
const toneStyle: Record<Stat["tone"], string> = {
  blue: "border-accent-blue bg-accent-blue",
  pink: "border-accent-pink bg-accent-pink",
  indigo: "border-accent-indigo bg-accent-indigo",
};

/**
 * Stats row (Figma node 866:6950) — three equal-width stat cards under the
 * toolbar: "Total source", "Networking", "Applicant Tracking System (ATS)".
 */
export function StatsRow() {
  return (
    <div className="w-full shrink-0 rule-b p-4">
      <div className="flex w-full items-center gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div
      data-motion="stat-card"
      className="flex min-w-0 flex-1 flex-col items-start gap-6 overflow-clip rounded-card bg-white p-4 shadow-card-soft"
    >
      {/* Label row: 20px accent tile + 14px medium label */}
      <div className="flex w-full items-center gap-[6px]">
        <span
          aria-hidden
          className={cn(
            "relative flex size-5 shrink-0 items-center justify-center overflow-clip rounded-[6px] border",
            "shadow-[0px_4px_4px_-3px_rgba(0,0,0,0.16),0px_2px_4px_0px_rgba(1,1,1,0.08)]",
            toneStyle[stat.tone],
          )}
        >
          {/* Top-edge white highlight */}
          <span className="pointer-events-none absolute -top-[11px] -left-px h-[22px] w-5 bg-linear-to-b from-white/60 to-white/0" />
          <Icon name={stat.icon} size={12} className="relative" />
          {/* Bottom-edge inset shade */}
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-tile" />
        </span>
        <p className="text-[14px] leading-none font-medium wrap-break-word text-normal">{stat.label}</p>
      </div>

      {/* Value + hint */}
      <div className="flex w-full flex-col items-start justify-end gap-[6px] font-medium whitespace-nowrap">
        <p className="text-[16px] leading-none text-loud">
          <StatValue value={stat.value} />
        </p>
        <p className="text-[12px] leading-none text-soft">{stat.hint}</p>
      </div>
    </div>
  );
}

/**
 * Splits a leading integer ("6 connected" → 6 + " connected") into a
 * `[data-count]` span so the motion layer can count it up. The server renders
 * the final number, so there is no layout shift or hydration mismatch.
 */
function StatValue({ value }: { value: string }) {
  const match = /^(\d+)(.*)$/.exec(value);
  if (!match) return value;

  const [, count, rest] = match;
  return (
    <>
      <span data-count={count}>{count}</span>
      {rest}
    </>
  );
}
