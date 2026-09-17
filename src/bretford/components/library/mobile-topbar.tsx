import Image from "next/image";
import { Icon } from "@/bretford/components/ui/icon";
import { BrandTile, focusRing } from "@/bretford/components/library/nav-list";
import { MobileMenuButton } from "@/bretford/components/library/mobile-menu";
import { workspace } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

/**
 * Mobile top bar (Rolexis "Responsive - Library", 375 wide): the 60px white
 * strip that replaces the sidebar below `md`. Workspace switcher on the left,
 * hamburger (opens the navigation drawer) and profile avatar on the right.
 * Its elements are their own entrance targets (`topbar-brand` / `topbar-action`)
 * rather than sharing `sidebar-brand` / `header-action`: the bar is rendered
 * before <main>, so borrowing those names would put its (display:none) buttons
 * at the front of the desktop stagger and delay every visible header action.
 */
export function MobileTopBar() {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-2 rule-b bg-white px-4 py-3 md:hidden">
      <button
        type="button"
        data-motion="topbar-brand"
        aria-label={`${workspace.name} workspace — switch workspace`}
        className={cn(
          "flex min-w-0 items-center gap-1 rounded-[8px] text-left",
          "transition-colors duration-150 hover:bg-subtle",
          focusRing,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <BrandTile />
          <span className="text-[16px] font-medium leading-none tracking-[-0.16px] whitespace-nowrap text-loud">
            {workspace.name}
          </span>
        </span>
        <Icon name="chevron-selector-vertical" size={14} />
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <MobileMenuButton />

        <button
          type="button"
          data-motion="topbar-action"
          aria-label="Profile"
          className={cn(
            "relative size-9 shrink-0 overflow-clip rounded-[11px] bg-tint-avatar",
            "shadow-[0px_0.938px_1.875px_0px_rgba(40,40,40,0.08),0px_0px_0px_0.938px_var(--color-tint-avatar)]",
            "select-none",
            focusRing,
          )}
        >
          {/* The frame sits the 32px portrait 2px in / 4px down inside the 36px tile */}
          <Image
            src="/bretford/images/avatar.png"
            alt=""
            width={32}
            height={32}
            draggable={false}
            className="absolute top-[4px] left-[2px] size-8 object-cover"
          />
        </button>
      </div>
    </div>
  );
}
