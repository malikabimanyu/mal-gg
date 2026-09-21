"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { FacetSection } from "./FacetSection";
import { useQueryNav } from "@/yc/lib/nav";
import { FACETS, GROUPS } from "@/yc/lib/facets";
import type { FacetCounts, BatchBar, Coverage } from "@/yc/lib/search";
import { fmt } from "@/yc/lib/format";

export type SidebarData = { facets: FacetCounts; histogram: BatchBar[]; batches: { min: number; max: number; peak: BatchBar | null }; coverage: Coverage; total: number };

/** Fired by the toolbar's funnel button; below `md` the sidebar opens as a drawer. */
export const OPEN_FILTERS_EVENT = "yc:open-filters";

export function Sidebar({ data }: { data: SidebarData }) {
  const { query, push } = useQueryNav();
  const [find, setFind] = useState("");
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const f = find.trim().toLowerCase();
  const facets = FACETS.filter((x) => x.group !== "Quick" && (!f || x.label.toLowerCase().includes(f) || x.group.toLowerCase().includes(f)));

  // Mobile drawer: open on the toolbar event, close on Escape / backdrop / "Show results".
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_FILTERS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FILTERS_EVENT, onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    drawer.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const body = (
    <>
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-[#e3e5eb] pl-4 pr-5">
        <span className="text-[14px] font-medium tracking-[-0.1px] text-yc-ink">Filters</span>
        <span className="relative flex items-center justify-center rounded-md bg-yc-subtle px-1.5 py-1 font-yc-mono text-[12px] font-medium text-yc-focus shadow-[inset_0_0_0_0.8px_rgba(49,119,240,0.4)]">{query.chips.length}</span>
        <button onClick={() => push({ ...query, chips: [], page: 1 })} className="ml-auto text-[14px] font-medium tracking-[-0.1px] text-yc-focus hover:underline">
          Reset
        </button>
        <button onClick={() => setOpen(false)} aria-label="Close filters" className="-mr-2 flex size-8 items-center justify-center rounded-lg text-yc-ink-3 hover:bg-yc-hover md:hidden">
          <Icon name="x-close" size={16} />
        </button>
      </div>
      <div className="shrink-0 border-b border-[#e3e5eb] py-3 pl-4 pr-5">
        <label className="yc-card flex h-8 items-center gap-1.5 rounded-lg px-2.5">
          <Icon name="search-md" size={14} />
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a filter" aria-label="Find a filter" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-yc-ink-muted" />
        </label>
      </div>
      <div className="flex min-h-0 flex-col pb-2 max-md:flex-1 max-md:overflow-y-auto yc-thin-scroll">
        {GROUPS.map((g) => {
          const items = facets.filter((x) => x.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="flex flex-col">
              <p className="px-4 pb-2 pt-4 text-[12px] font-medium tracking-[0.72px] text-yc-ink-3">{g}</p>
              {items.map((facet) => (
                <FacetSection key={facet.id} facet={facet} counts={data.facets[facet.id] ?? []} histogram={data.histogram} batches={data.batches} coverage={data.coverage} />
              ))}
            </div>
          );
        })}
      </div>
      {/* Mobile-only footer: apply is implicit (URL-driven), this just closes the sheet. */}
      <div className="shrink-0 border-t border-[#e3e5eb] bg-yc-surface p-3 md:hidden">
        <button onClick={() => setOpen(false)} className="flex h-10 w-full items-center justify-center rounded-xl bg-yc-ink text-[14px] font-medium text-white">
          Show {fmt(data.total)} founders
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: the 340px rail. */}
      <aside id="filters-panel" className="yc-panel flex w-[340px] shrink-0 flex-col self-start overflow-hidden max-md:hidden" aria-label="Filters">
        {body}
      </aside>

      {/* Mobile: bottom sheet over the page. */}
      {open ? (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button aria-label="Close filters" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/25" tabIndex={-1} />
          <div ref={drawer} tabIndex={-1} className="yc-panel yc-fade-in absolute inset-x-2 bottom-2 top-12 flex flex-col overflow-hidden rounded-2xl outline-none">
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}
