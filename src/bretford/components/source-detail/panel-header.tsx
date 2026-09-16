import { Icon, type IconName } from "@/bretford/components/ui/icon";
import { cn } from "@/bretford/lib/cn";

/**
 * Panel title row shared by the Member and Candidate panels (Figma 866:7311 /
 * 866:7370): a 20px blue icon tile — same recipe as the Library stat-card
 * tiles in `components/library/stats.tsx` — followed by a 14px medium label.
 */
export function PanelHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="flex w-full items-center gap-[6px]">
      <span
        aria-hidden
        className={cn(
          "relative flex size-5 shrink-0 items-center justify-center overflow-clip rounded-[6px] border",
          "shadow-[0px_4px_4px_-3px_rgba(0,0,0,0.16),0px_2px_4px_0px_rgba(1,1,1,0.08)]",
          "border-accent-blue bg-accent-blue",
        )}
      >
        {/* Top-edge white highlight */}
        <span className="pointer-events-none absolute -top-[11px] -left-px h-[22px] w-5 bg-linear-to-b from-white/60 to-white/0" />
        <Icon name={icon} size={12} className="relative" />
        {/* Bottom-edge inset shade */}
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-tile" />
      </span>
      <h2 className="text-[14px] leading-none font-medium whitespace-nowrap text-normal">{title}</h2>
    </div>
  );
}
