"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, utils, type JSAnimation } from "animejs";
import { Button } from "@/bretford/components/ui/button";
import { Icon } from "@/bretford/components/ui/icon";
import { cn } from "@/bretford/lib/cn";
import { orderBy, tabs, type Tab } from "@/bretford/lib/library-data";
import { prefersReducedMotion } from "@/bretford/lib/motion";

/**
 * Where the active pill should sit, relative to the control (which is the
 * pill's containing block). Sub-pixel rects, not offsetLeft/Width, so the pill
 * matches the text-sized button exactly.
 */
function measureActiveTab(control: HTMLElement) {
  const tab = control.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
  if (!tab) return null;
  const { left, width } = tab.getBoundingClientRect();
  return { translateX: left - control.getBoundingClientRect().left, width };
}

/**
 * Second bar of the white panel (Figma 866:6935): the All / Group / Database
 * segmented control on the left, and the three secondary actions on the right.
 * Owns the active-tab state, hence the client boundary.
 *
 * The white active pill is a single indicator element that slides between
 * tabs (anime.js); the tab buttons themselves are transparent.
 */
export function LibraryToolbar() {
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const control = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const slide = useRef<JSAnimation | null>(null);
  const mounted = useRef(false);

  // Position the pill before paint; animate only on later tab changes.
  useLayoutEffect(() => {
    if (!control.current || !indicator.current) return;
    const to = measureActiveTab(control.current);
    if (!to) return;

    slide.current?.cancel();
    const instant = !mounted.current || prefersReducedMotion();
    mounted.current = true;

    slide.current = instant
      ? utils.set(indicator.current, to)
      : animate(indicator.current, { ...to, duration: 350, ease: "outExpo" });
  }, [activeTab]);

  // Font/zoom changes on resize can move the tabs; snap the pill along. The
  // first measurement may happen in the fallback font (Geist is `swap`), so
  // re-snap once the web font has settled too.
  useEffect(() => {
    let active = true;
    const snap = () => {
      if (!active || !control.current || !indicator.current) return;
      const to = measureActiveTab(control.current);
      if (to) utils.set(indicator.current, to);
    };
    window.addEventListener("resize", snap);
    document.fonts?.ready.then(snap);
    return () => {
      active = false;
      window.removeEventListener("resize", snap);
    };
  }, []);

  return (
    <div className="flex w-full shrink-0 items-center justify-between rule-b p-4">
      {/* Segmented control */}
      <div
        ref={control}
        role="tablist"
        aria-label="Library view"
        data-motion="toolbar-tabs"
        className="relative flex shrink-0 items-center gap-[2px] rounded-[12px] bg-tab p-px"
      >
        {/* Sliding active pill: 30px tall inside the 1px padding, positioned via inline transform/width */}
        <span
          ref={indicator}
          aria-hidden
          className="pointer-events-none absolute inset-y-px left-0 rounded-[10px] bg-white shadow-btn"
          style={{ width: 0 }}
        >
          {/* Inner top glow from the design */}
          <span className="absolute inset-0 rounded-[inherit] shadow-glow" />
        </span>

        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative flex shrink-0 items-center justify-center overflow-clip whitespace-nowrap select-none",
                "text-[14px] font-medium leading-none transition-colors duration-200",
                "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active ? "rounded-[10px] px-4 py-2 text-loud" : "rounded-[8px] p-2 text-normal hover:text-loud",
              )}
            >
              {active ? (
                <span className="relative">{tab}</span>
              ) : (
                <span className="flex items-center justify-center px-[2px]">{tab}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" data-motion="toolbar-action">
          <Icon name="users-plus" size={14} />
          New group
        </Button>
        <Button variant="secondary" data-motion="toolbar-action">
          <Icon name="package-plus" size={14} />
          New database
        </Button>
        <Button variant="secondary" data-motion="toolbar-action">
          <Icon name="settings-04" size={14} />
          <span>
            {"Order by: "}
            <span className="text-loud">{orderBy}</span>
          </span>
        </Button>
      </div>
    </div>
  );
}
