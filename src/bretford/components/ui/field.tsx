import type { ComponentProps } from "react";
import { cn } from "@/bretford/lib/cn";

/**
 * Input-shaped box from the source-detail screen ("Privacy", "Direct search
 * link"): near-white fill, #e0e0e0 border, 12px radius, hairline drop shadow.
 * Figma draws the 1px stroke *inside* its 12/10 padding, so the CSS box uses
 * 11/9 + border to land on the same 40px height and 12px text inset.
 * Put a read-only <input>, text, or an icon button inside.
 */
export function Field({
  padded = true,
  className,
  children,
  ...rest
}: ComponentProps<"div"> & {
  /** Set false to supply your own padding/width (default: 11/9 + w-full). */
  padded?: boolean;
}) {
  return (
    <div
      {...rest}
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-[#e0e0e0] bg-[#fefefe]",
        padded && "w-full px-[11px] py-[9px]",
        "text-[14px] leading-5 font-medium text-soft drop-shadow-[0px_1px_1px_rgba(16,24,40,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
