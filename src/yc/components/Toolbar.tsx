"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { SearchBox } from "./SearchBox";
import { OPEN_FILTERS_EVENT } from "./Sidebar";
import { useQueryNav } from "@/yc/lib/nav";
import { SORTS, type View } from "@/yc/lib/query";

const VIEWS: Array<{ id: View; label: string; icon: string }> = [
  { id: "table", label: "Table", icon: "list" },
  { id: "cards", label: "Cards", icon: "grid-01" },
  { id: "people", label: "People", icon: "user-01" },
];

export function Toolbar({ filterCount }: { filterCount: number }) {
  const { query, push } = useQueryNav();
  return (
    <div className="flex items-center gap-3 max-md:flex-wrap">
      <SearchBox />

      {/* View switcher */}
      <div className="yc-card flex h-9 shrink-0 items-center bg-yc-subtle p-1 max-md:order-2" role="radiogroup" aria-label="View">
        {VIEWS.map((v) => {
          const active = query.view === v.id;
          return (
            <button
              key={v.id}
              role="radio"
              aria-checked={active}
              aria-label={v.label}
              onClick={() => push({ ...query, view: v.id, page: 1 })}
              className={`flex h-7 items-center gap-2 rounded-lg px-2 text-[12px] font-medium leading-none ${
                active ? "yc-card text-yc-ink" : "text-yc-ink-2 hover:text-yc-ink"
              }`}
            >
              <Icon name={v.icon} size={14} />
              <span className="max-md:sr-only">{v.label}</span>
            </button>
          );
        })}
      </div>

      <div className="max-md:order-3 max-md:ml-auto">
        <SortMenu />
      </div>

      <button
        className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border bg-yc-surface px-3 font-yc-mono text-[12px] font-medium leading-none max-md:order-4 ${
          filterCount ? "border-yc-focus text-yc-focus" : "border-yc-line text-yc-ink-2"
        }`}
        aria-label={`${filterCount} active filters`}
        onClick={() => {
          if (window.matchMedia("(max-width: 767px)").matches) window.dispatchEvent(new Event(OPEN_FILTERS_EVENT));
          else document.getElementById("filters-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <Icon name="filter-funnel-02" size={14} />
        {filterCount}
      </button>
    </div>
  );
}

function SortMenu() {
  const { query, push } = useQueryNav();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORTS.find((s) => s.id === query.sort) ?? SORTS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-xl border border-yc-line bg-yc-surface px-2.5 leading-none drop-shadow-[0_1px_1px_rgba(15,23,41,0.05)]"
      >
        <span className="flex items-center gap-1.5 text-[12px] text-yc-ink-3">
          <Icon name="switch-vertical-01" size={14} />
          <span className="max-md:hidden">Sort</span>
        </span>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-yc-ink">
          {current.label}
          <Icon name="chevron-down" size={14} />
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="yc-fade-in absolute right-0 top-[calc(100%+6px)] z-40 w-[340px] overflow-clip max-md:fixed max-md:inset-x-4 max-md:top-auto max-md:bottom-4 max-md:w-auto rounded-xl border border-yc-line bg-yc-surface p-0 shadow-[0_12px_24px_-6px_rgba(0,0,0,.05),0_4px_10px_-2px_rgba(0,0,0,.05),0_1px_2px_rgba(0,0,0,.06)]"
        >
          <p className="p-3 text-[12px] font-medium leading-none tracking-[0.72px] text-yc-ink-muted">SORT BY</p>
          <div className="flex flex-col gap-1 p-2">
            {SORTS.map((s) => {
              const disabled = s.id === "relevance" && !query.q;
              const active = s.id === query.sort;
              const hint = "hint" in s && s.hint ? s.hint : null;
              return (
                <button
                  key={s.id}
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => {
                    push({ ...query, sort: s.id, page: 1 });
                    setOpen(false);
                  }}
                  className={`flex w-full shrink-0 items-center justify-between gap-3 rounded-lg px-3 text-left leading-none hover:bg-yc-hover disabled:cursor-not-allowed disabled:opacity-50 ${
                    hint ? "h-11" : "h-9"
                  } ${active ? "bg-yc-selected" : ""}`}
                >
                  <span className="flex flex-col gap-1.5">
                    <span className="text-[14px] font-medium text-yc-ink">{s.label}</span>
                    {hint ? <span className="text-[12px] text-yc-ink-muted">{hint}</span> : null}
                  </span>
                  {active ? <Icon name="check" size={14} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
