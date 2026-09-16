import { asset } from "@/bretford/lib/asset";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "@/bretford/components/ui/icon";
import { collections, footerMenu, mainMenu, workspace } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

/* Section headings / action labels — chrome, not content, so they live here. */
const MAIN_MENU_LABEL = "Main Menu";
const COLLECTIONS_LABEL = "Collections";
const ADD_CONTENT_LABEL = "Add content";
const SEARCH_PLACEHOLDER = "Search...";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/**
 * Library sidebar (Figma `866:7240`) — 264px column on the page background.
 * Brand switcher on top, search + Main Menu + Collections in the middle,
 * Knowledge hub / Invite team / Settings pinned to the bottom.
 */
export function Sidebar() {
  return (
    <aside className="flex h-dvh w-[264px] shrink-0 flex-col bg-base px-3">
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
              <LogoTile />
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
          {/* 2a. Search */}
          <label
            data-motion="sidebar-item"
            className={cn(
              "flex w-full items-center gap-[6px] overflow-clip rounded-[10px] bg-disable px-2 py-[11px]",
              "shadow-[0px_1px_2px_0px_rgba(40,40,40,0.08),0px_0px_0px_1px_var(--color-line-warm)]",
              "focus-within:ring-2 focus-within:ring-primary/40",
            )}
          >
            <Icon name="search-lg" size={14} />
            <input
              type="text"
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="Search"
              autoComplete="off"
              className={cn(
                "h-[14px] min-w-0 flex-1 bg-transparent p-0 text-[14px] leading-none font-normal tracking-[-0.14px] text-loud",
                "outline-none placeholder:text-icon-soft",
              )}
              style={{ fontFeatureSettings: '"salt" 1' }}
            />
          </label>

          <div className="flex w-full flex-col gap-2">
            {/* 2b. Main Menu */}
            <nav aria-label={MAIN_MENU_LABEL} className="flex w-full flex-col">
              <SectionLabel>{MAIN_MENU_LABEL}</SectionLabel>
              {mainMenu.map((item) => (
                <NavRow key={item.label} icon={item.icon} label={item.label} active={item.active} inset />
              ))}
            </nav>

            {/* 2c. Collections */}
            <nav aria-label={COLLECTIONS_LABEL} className="flex w-full flex-col">
              <SectionLabel>{COLLECTIONS_LABEL}</SectionLabel>
              <div className="flex w-full flex-col gap-[2px]">
                {collections.map((collection) => {
                  const children = collection.children ?? [];
                  const expanded = children.length > 0;
                  return (
                    <div key={collection.label} className="contents">
                      <NavRow
                        icon={collection.icon}
                        label={collection.label}
                        aria-expanded={expanded ? true : undefined}
                        trailing={expanded ? <Icon name="chevron-up" size={14} /> : undefined}
                      />
                      {expanded && (
                        <div className="flex w-full items-start">
                          {/* 34px tree column: the vertical guide line stretches to the batches' height */}
                          <div className="relative w-[34px] shrink-0 self-stretch">
                            <Icon
                              name="tree-line"
                              size={34}
                              className="absolute inset-0"
                              style={{ width: "100%", height: "100%" }}
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                            {children.map((batch) => (
                              <NavRow key={batch} label={batch} nested />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <NavRow icon="plus" label={ADD_CONTENT_LABEL} />
              </div>
            </nav>
          </div>
        </div>

        {/* 3. Footer */}
        <nav aria-label="Workspace" className="flex w-full flex-col">
          {footerMenu.map((item) => (
            <NavRow key={item.label} icon={item.icon} label={item.label} active={item.active} inset />
          ))}
        </nav>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="w-full p-[10px] text-[12px] leading-none font-medium text-icon-soft">{children}</p>;
}

type NavRowProps = Omit<ComponentProps<"button">, "children"> & {
  label: string;
  icon?: IconName;
  /** Current page — grey pill + loud text (Library). */
  active?: boolean;
  /** Main-menu / footer rows wrap the label in an extra 2px inset; collection rows don't. */
  inset?: boolean;
  /** Child rows under an expanded collection: taller (py-10) and flush with the tree column. */
  nested?: boolean;
  /** Right-aligned element (e.g. the expand chevron). */
  trailing?: ReactNode;
};

function NavRow({ label, icon, active, inset, nested, trailing, className, ...rest }: NavRowProps) {
  return (
    <button
      type="button"
      data-motion="sidebar-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-[6px] overflow-clip rounded-[8px] text-left",
        nested ? "py-[10px]" : "px-[10px] py-[9px]",
        "text-[14px] leading-none font-medium",
        "transition-colors duration-150",
        active ? "bg-[#e0e0e0] text-loud" : "text-normal hover:bg-[#e8e8e8]",
        focusRing,
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      <span className={cn("min-w-0 flex-1", inset && "px-[2px]")}>{label}</span>
      {trailing}
    </button>
  );
}

/**
 * 28px workspace logo tile: white base → #668cff colour field with the
 * blurred blue blob rising from the bottom → frosted highlight + soft-light
 * noise → white "B" mark → inset rim highlight.
 */
function LogoTile() {
  return (
    <span
      aria-hidden
      className={cn(
        "relative isolate block size-[28px] shrink-0 overflow-clip rounded-[6px]",
        "shadow-[0px_0px_0px_0.147px_rgba(0,0,0,0.04),0px_0px_2.741px_0.49px_rgba(0,0,0,0.06)]",
      )}
    >
      <span className="absolute inset-0 rounded-[6px] bg-white" />

      {/* Colour variation: flat #668cff with the blob's top arc filling the tile */}
      <span className="absolute inset-0 overflow-clip bg-[#668cff]">
        <Icon
          name="logo-blob"
          size={156}
          className="absolute top-[71.8px] left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
        />
        <span className="absolute inset-0 bg-white/4 backdrop-blur-[3.789px]" />
        <span
          className="absolute inset-0 bg-top-left opacity-8 mix-blend-soft-light"
          style={{
            backgroundImage: `url(${asset("/images/logo-noise.png")})`,
            backgroundSize: "26.548px 26.548px",
          }}
        />
      </span>

      {/* White mark (18×16 glyph; the asset carries its own drop/inner shadow bleed) */}
      <Icon
        name="logo-mark"
        size={22}
        className="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
        style={{ width: 21.55, height: 19.55 }}
      />

      {/* Inset rim highlight */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_-0.49px_0px_1.762px_0.147px_rgba(255,255,255,0.06),inset_0.49px_0px_1.762px_0.147px_rgba(255,255,255,0.06),inset_0px_-0.49px_1.762px_0.147px_rgba(255,255,255,0.08),inset_0px_0.49px_1.762px_0.147px_rgba(255,255,255,0.36)]" />
    </span>
  );
}
