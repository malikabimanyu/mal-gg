"use client";

import { Icon } from "@/bretford/components/ui/icon";
import { cn } from "@/bretford/lib/cn";

type CopyButtonProps = {
  /** Text written to the clipboard on click. */
  value: string;
  /** Accessible name; the button is icon-only. */
  label?: string;
  className?: string;
};

/**
 * 14px copy glyph that sits at the end of a read-only `Field` ("Direct search
 * link"). The only interactive bit of the info column, hence its own client
 * boundary — the column itself stays a server component.
 */
export function CopyButton({ value, label = "Copy link", className }: CopyButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        // The async clipboard API only exists in secure contexts; nothing to recover otherwise.
        navigator.clipboard?.writeText(value).catch(() => {});
      }}
      className={cn(
        "flex size-[14px] shrink-0 items-center justify-center rounded-[4px] outline-none",
        "transition-opacity duration-200 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <Icon name="copy" size={14} />
    </button>
  );
}
