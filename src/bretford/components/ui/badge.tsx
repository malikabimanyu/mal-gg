import type { ReactNode } from "react";
import { Icon, type IconName } from "@/bretford/components/ui/icon";
import { cn } from "@/bretford/lib/cn";

export type Status = "active" | "synced" | "archived";

const statusStyle: Record<Status, { dot: IconName; text: string; label: string }> = {
  active: { dot: "dot-green", text: "text-accent-green", label: "Active" },
  synced: { dot: "dot-blue", text: "text-primary", label: "Synced" },
  archived: { dot: "dot-orange", text: "text-accent-orange", label: "Archived" },
};

/** White chip with 1px ring — the base for every small pill in the design. */
export function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 overflow-clip rounded-[8px] bg-white px-[7px] py-[5px]",
        "text-[12px] leading-none whitespace-nowrap text-normal shadow-card",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Colored dot + status word (Active / Synced / Archived). */
export function StatusBadge({
  status,
  weight = "medium",
  className,
}: {
  status: Status;
  /** Table rows use medium; source cards use regular. */
  weight?: "medium" | "regular";
  className?: string;
}) {
  const s = statusStyle[status];
  return (
    <Chip className={cn(weight === "medium" ? "font-medium" : "font-normal", className)}>
      <Icon name={s.dot} size={6} />
      {/* color on an inner span so it can't lose to Chip's base `text-normal` in CSS order */}
      <span className={s.text}>{s.label}</span>
    </Chip>
  );
}

type TagTone = "neutral" | "primary";

const tagTone: Record<TagTone, string> = {
  // grey pill (status "Member", "Created by" chips) — ring added separately
  neutral: "bg-base text-normal",
  // soft blue pill, never ringed ("119 connection uploaded")
  primary: "bg-[#eaf4ff] text-primary",
};

/**
 * Compact 12px pill used in tables (source-detail screen). Unlike `Chip` it
 * sits on a tinted background and has no drop shadow.
 */
export function Tag({
  tone = "neutral",
  ring = true,
  className,
  children,
}: {
  tone?: TagTone;
  /** Set false for the ringless neutral variant ("no connection uploaded"). */
  ring?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center overflow-clip rounded-[8px] p-[6px]",
        "text-[12px] leading-none font-medium whitespace-nowrap",
        tagTone[tone],
        // shadow utilities can't be "cancelled" by class order, so only add the ring when wanted
        tone === "neutral" && ring && "shadow-[0px_0px_0px_1px_#ebebeb]",
        className,
      )}
    >
      <span className="px-[2px]">{children}</span>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-glow" />
    </span>
  );
}
