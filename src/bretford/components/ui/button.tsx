import type { ComponentProps } from "react";
import { cn } from "@/bretford/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

type ButtonProps = ComponentProps<"button"> & {
  /**
   * primary   — dark gradient pill (“New source”)
   * secondary — white pill with 1px ring (“New group”, credits, help, bell)
   * ghost     — white pill on a white border, used for the section “expand” buttons
   */
  variant?: Variant;
  /** md — 32px toolbar pill (default). lg — 44px, radius 14, used for dialog footers. */
  size?: Size;
  /**
   * Below `md` the md primary/secondary pills grow to 36px touch targets (radius 11).
   * Pass `false` for the few md buttons the mobile frames keep at 32px (e.g. the
   * full-width Invite button).
   */
  touch?: boolean;
};

const base =
  "relative inline-flex shrink-0 items-center justify-center gap-1 overflow-clip " +
  "text-[14px] font-medium whitespace-nowrap select-none " +
  "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
  "transition-[box-shadow,background-color] duration-200";

const variants: Record<Variant, string> = {
  primary:
    "border border-[#27262b] bg-linear-to-b from-[#312f37] to-[#18171c] text-white " +
    "shadow-[0px_4px_4px_-3px_rgba(180,178,189,0.8),0px_2px_4px_0px_rgba(1,1,1,0.12)]",
  secondary: "bg-white text-normal shadow-card hover:bg-subtle",
  ghost: "border border-white bg-white text-normal shadow-btn hover:bg-subtle",
};

// md: every variant is 32px tall — 14px icon/text + 9px per side. Figma draws the
// bordered variants' 1px stroke *inside* that 9px, hence `p-2` for them.
// Below md the mobile frames grow primary/secondary to 36px (11px padding,
// radius 11) for touch; ghost "expand" buttons stay 32px.
const sizes: Record<Size, Record<Variant, string>> = {
  md: {
    primary: "rounded-[10px] p-2 leading-none",
    secondary: "rounded-[10px] p-[9px] leading-none",
    ghost: "rounded-[10px] p-2 leading-none",
  },
  lg: {
    primary: "h-11 rounded-[14px] px-4 leading-5",
    secondary: "h-11 rounded-[14px] px-4 leading-5",
    ghost: "h-11 rounded-[14px] px-4 leading-5",
  },
};

const touchSizes: Partial<Record<Variant, string>> = {
  primary: "max-md:rounded-[11px] max-md:p-[10px]",
  secondary: "max-md:rounded-[11px] max-md:p-[11px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  touch = true,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size][variant], size === "md" && touch && touchSizes[variant], className)}
      {...rest}
    >
      {children}
      {variant === "primary" && (
        // Top-edge highlight from the design (inset white glow)
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_4px_4px_0px_rgba(255,255,255,0.12)]"
        />
      )}
      {variant === "ghost" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-glow" />
      )}
    </button>
  );
}

/** Thin 12px vertical rule used between header actions. */
export function Divider({ className }: { className?: string }) {
  return <span aria-hidden className={cn("h-3 w-px shrink-0 bg-line", className)} />;
}
