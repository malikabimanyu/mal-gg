import { Icon } from "@/bretford/components/ui/icon";
import { workspace } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";
import { BrandTile, FooterNav, NavList, SearchBox, focusRing } from "@/bretford/components/library/nav-list";

/**
 * Library sidebar (Figma `866:7240`) — 264px column on the page background.
 * Brand switcher on top, search + Main Menu + Collections in the middle,
 * Knowledge hub / Invite team / Settings pinned to the bottom.
 *
 * Desktop only: below `md` the same lists live in the drawer opened from the
 * mobile top bar (`mobile-topbar.tsx` / `mobile-menu.tsx`).
 */
export function Sidebar() {
  return (
    <aside className="flex h-dvh w-[264px] shrink-0 flex-col bg-base px-3 max-md:hidden">
      {/* 1. Brand block */}
      <div className="w-full py-3 shadow-[inset_0_-1px_0_0_#e5e0dc]">
        <button
          type="button"
          data-motion="sidebar-brand"
          aria-label={`${workspace.name} workspace — switch workspace`}
          className={cn(
            "flex w-full items-center overflow-clip rounded-card bg-white p-[10px] text-left shadow-panel",
            "transition-colors duration-150 hover:bg-subtle",
            focusRing,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center justify-between">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <BrandTile />
              <span className="text-[16px] font-medium leading-none whitespace-nowrap text-loud">
                {workspace.name}
              </span>
            </span>
            <Icon name="chevron-selector-vertical" size={14} />
          </span>
        </button>
      </div>

      {/* 2. Middle: search + menus on top, footer pinned to the bottom */}
      <div className="flex min-h-0 w-full flex-1 flex-col justify-between pt-3 pb-4">
        <div className="flex w-full flex-col gap-4">
          <SearchBox />
          <NavList />
        </div>

        {/* 3. Footer */}
        <FooterNav />
      </div>
    </aside>
  );
}
