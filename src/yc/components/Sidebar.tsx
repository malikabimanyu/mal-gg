"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { FacetSection } from "./FacetSection";
import { useQueryNav } from "@/yc/lib/nav";
import { FACETS, GROUPS } from "@/yc/lib/facets";
import type { FacetCounts, BatchBar, Coverage } from "@/yc/lib/search";

export type SidebarData = { facets: FacetCounts; histogram: BatchBar[]; batches: { min: number; max: number; peak: BatchBar | null }; coverage: Coverage };

export function Sidebar({ data }: { data: SidebarData }) {
  const { query, push } = useQueryNav();
  const [find, setFind] = useState("");
  const f = find.trim().toLowerCase();
  const facets = FACETS.filter((x) => x.group !== "Quick" && (!f || x.label.toLowerCase().includes(f) || x.group.toLowerCase().includes(f)));

  return (
    <aside id="filters-panel" className="yc-panel flex w-[340px] shrink-0 flex-col self-start overflow-hidden" aria-label="Filters">
      <div className="flex h-[52px] items-center gap-2 border-b border-[#e3e5eb] pl-4 pr-5">
        <span className="text-[14px] font-medium tracking-[-0.1px] text-yc-ink">Filters</span>
        <span className="relative flex items-center justify-center rounded-md bg-yc-subtle px-1.5 py-1 font-yc-mono text-[12px] font-medium text-yc-focus shadow-[inset_0_0_0_0.8px_rgba(49,119,240,0.4)]">{query.chips.length}</span>
        <button onClick={() => push({ ...query, chips: [], page: 1 })} className="ml-auto text-[14px] font-medium tracking-[-0.1px] text-yc-focus hover:underline">
          Reset
        </button>
      </div>
      <div className="border-b border-[#e3e5eb] py-3 pl-4 pr-5">
        <label className="yc-card flex h-8 items-center gap-1.5 rounded-lg px-2.5">
          <Icon name="search-md" size={14} />
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a filter" aria-label="Find a filter" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-yc-ink-muted" />
        </label>
      </div>
      <div className="flex flex-col pb-2">
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
    </aside>
  );
}
