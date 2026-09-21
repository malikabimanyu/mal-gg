"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useQueryNav } from "@/yc/lib/nav";
import { chipFor, withChip, withoutChip } from "@/yc/lib/query";
import type { FacetCounts } from "@/yc/lib/search";
import { fmt } from "@/yc/lib/format";

/**
 * The one-click controls from the design's "Quick Controls" row: On X, Hiring now,
 * One contact per company.
 */
/** One quick-control pill. `expanded` is only set for the menu-style pill. */
function Pill({ on, onClick, children, tone = "indigo", expanded }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "indigo" | "green"; expanded?: boolean }) {
  const isMenu = expanded !== undefined;
  return (
    <button
      onClick={onClick}
      aria-pressed={isMenu ? undefined : on}
      aria-haspopup={isMenu ? "menu" : undefined}
      aria-expanded={isMenu ? expanded : undefined}
      className={`flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border pl-4 pr-3 text-[12px] leading-3 drop-shadow-[0_1px_1px_rgba(15,23,41,0.05)] ${
        on ? (tone === "indigo" ? "border-yc-indigo bg-yc-indigo-soft text-yc-indigo" : "border-yc-green bg-yc-green-soft text-yc-green") : "border-yc-line bg-yc-surface text-yc-ink-2 hover:bg-yc-hover"
      }`}
    >
      {children}
    </button>
  );
}

export function QuickControls({ facets }: { facets: FacetCounts }) {
  const { query, push } = useQueryNav();
  const onx = chipFor(query, "onx");
  const moreChip = chipFor(query, "more");
  const hiring = moreChip?.op === "is" && moreChip.values.includes("hiring");
  const onxCount = facets.onx?.find((o) => o.value === (onx?.values[0] ?? "any"))?.count ?? 0;
  const hiringCount = facets.more?.find((o) => o.value === "hiring")?.count ?? 0;
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <div className="flex flex-wrap items-center gap-2 max-md:-mx-4 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-4 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
      <div className="relative" ref={menuRef}>
        <Pill on={!!onx} onClick={() => setMenu((m) => !m)} expanded={menu}>
          <Icon name="icon-x-logo" size={16} />
          <span>On X</span>
          <span className="font-medium">{onx ? facets.onx?.find((o) => o.value === onx.values[0])?.label : "Off"}</span>
          <span className="font-yc-mono text-[10px]">{fmt(onxCount)}</span>
          <Icon name="icon-chevron-down" size={16} />
        </Pill>
        {menu ? (
          <div className="yc-popover absolute left-0 top-[calc(100%+6px)] z-40 w-[240px] p-1">
            <button onClick={() => { push(withoutChip(query, "onx")); setMenu(false); }} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] hover:bg-yc-hover">
              <span>Off — everyone</span>
              {!onx ? <Icon name="check" size={12} /> : null}
            </button>
            {(facets.onx ?? []).map((o) => (
              <button key={o.value} onClick={() => { push(withChip(query, "onx", "is", [o.value])); setMenu(false); }} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] hover:bg-yc-hover">
                <span className="flex items-center gap-2">
                  {o.label}
                  <span className="font-yc-mono text-yc-ink-3">{fmt(o.count)}</span>
                </span>
                {onx?.values[0] === o.value ? <Icon name="check" size={12} /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Pill
        on={hiring}
        tone="green"
        onClick={() => {
          const cur = moreChip?.op === "is" ? moreChip.values : [];
          const next = hiring ? cur.filter((v) => v !== "hiring") : [...cur, "hiring"];
          push(withChip(query, "more", "is", next));
        }}
      >
        <Icon name="icon-briefcase" size={14} />
        Hiring now
        <span className="font-yc-mono text-[10px]">{fmt(hiringCount)}</span>
      </Pill>


      <Pill on={query.onePerCompany} onClick={() => push({ ...query, onePerCompany: !query.onePerCompany, page: 1 })}>
        <Icon name="users-01" size={14} />
        One contact per company
      </Pill>
    </div>
  );
}
