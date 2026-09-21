"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useQueryNav } from "@/yc/lib/nav";
import { FACETS, FACET_BY_ID, GROUPS, type Facet } from "@/yc/lib/facets";
import { toSearchParams, withChip, type Op, BASE } from "@/yc/lib/query";
import type { FacetCounts, OptionCount, BatchBar } from "@/yc/lib/search";
import { fmt } from "@/yc/lib/format";

const FACET_ICON: Record<string, string> = {
  location: "marker-pin-01",
  tags: "hash-02",
  industry: "icon-building",
  batch: "hash-02",
  status: "dot",
  role: "user-01",
  ex: "briefcase-02",
  school: "icon-graduation",
  team: "users-01",
};

const OPS: Array<{ id: Op; label: string; hint: string }> = [
  { id: "is", label: "is any of", hint: "OR within dimension" },
  { id: "not", label: "is not", hint: "excludes matches" },
];

export function AddFilterPopover({
  facetId,
  facets,
  histogram,
  onClose,
}: {
  facetId?: string;
  facets: FacetCounts;
  histogram: BatchBar[];
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(facetId ?? null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      // The trigger (chip / Add filter button) shares a data-popover-root wrapper with us; let it toggle.
      if (ref.current?.contains(t) || ref.current?.closest("[data-popover-root]")?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      className="yc-fade-in absolute left-0 top-[calc(100%+6px)] z-50 w-[460px] rounded-xl border border-yc-line bg-yc-surface shadow-[0_20px_40px_-1px_rgba(0,0,0,.14),0_4px_8px_rgba(0,0,0,.08),0_1px_2px_rgba(0,0,0,.06)] max-md:fixed max-md:inset-x-2 max-md:bottom-2 max-md:top-auto max-md:z-[80] max-md:max-h-[85vh] max-md:w-auto max-md:overflow-y-auto"
    >
      {picked ? (
        <OptionEditor facet={FACET_BY_ID[picked]} counts={facets[picked] ?? []} histogram={histogram} onClose={onClose} onBack={facetId ? undefined : () => setPicked(null)} />
      ) : (
        <FacetPicker onPick={setPicked} />
      )}
    </div>
  );
}

function FacetPicker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = FACETS.filter((f) => f.group !== "Quick" && f.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-2">
      <div className="mx-1 mt-1 mb-2 flex h-8 items-center gap-2 rounded-lg border border-yc-line px-2.5">
        <Icon name="search-md" size={14} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a filter" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-yc-ink-3" />
      </div>
      <div className="max-h-[420px] overflow-y-auto yc-thin-scroll">
        {GROUPS.map((g) => {
          const items = list.filter((f) => f.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mb-1">
              <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-yc-ink-3">{g}</p>
              {items.map((f) => (
                <button key={f.id} onClick={() => onPick(f.id)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] leading-none hover:bg-yc-hover">
                  <span className="flex items-center gap-2 font-medium text-yc-ink">
                    <Icon name={FACET_ICON[f.id] ?? "dot"} size={14} />
                    {f.label}
                  </span>
                  {f.meta ? <span className="font-yc-mono text-yc-ink-3">{f.meta}</span> : null}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const POPOVER_SHADOW = "shadow-[0_12px_12px_rgba(0,0,0,.05),0_4px_5px_rgba(0,0,0,.05),0_1px_1px_rgba(0,0,0,.06)]";

function Row({
  o,
  depth,
  step = 20,
  on,
  onToggle,
  expandable,
  expanded,
  onExpand,
}: {
  o: OptionCount;
  depth: number;
  /** horizontal indent per nesting level (20 → pl-28 children; 24 → pl-32 under an expander) */
  step?: number;
  on: boolean;
  onToggle: () => void;
  /** family rows get a chevron expander before the checkbox */
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  return (
    <div
      className={`flex h-9 w-full items-center gap-2 pr-2 leading-none hover:bg-yc-hover ${on ? "rounded-xl bg-yc-selected" : "rounded-md"}`}
      style={{ paddingLeft: 8 + depth * step }}
    >
      {expandable ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          className="flex size-4 shrink-0 items-center justify-center rounded"
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={expanded}
        >
          <Icon name={expanded ? "chevron-down-3a597b" : "chevron-right"} size={16} />
        </button>
      ) : null}
      <button type="button" onClick={onToggle} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left" role="option" aria-selected={on}>
        <span className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] ${on ? "bg-[var(--yc-accent-blue)]" : "border border-yc-line-strong bg-yc-surface"}`}>
          {on ? <Icon name="icon-check" size={12} /> : null}
        </span>
        <span className={`truncate text-[14px] font-medium ${on ? "text-yc-ink" : "text-yc-ink-2"}`}>{o.label}</span>
        {o.note ? <span className="max-w-[180px] shrink-0 truncate rounded bg-yc-blue-soft px-1.5 py-0.5 text-[10px] font-medium leading-none text-yc-blue">{o.note}</span> : null}
        <span className="ml-auto shrink-0 pl-2 font-yc-mono text-[12px] font-medium text-yc-ink-muted">
          {o.approx ? "≈" : ""}
          {fmt(o.count)}
        </span>
      </button>
    </div>
  );
}

function GroupHeader({ label, right }: { label: string; right: string }) {
  return (
    <div className="flex h-8 items-center justify-between px-2 text-[12px] font-medium leading-none text-yc-ink-3">
      <span className="tracking-[0.72px]">{label}</span>
      <span>{right}</span>
    </div>
  );
}

function OptionEditor({
  facet,
  counts,
  histogram,
  onClose,
  onBack,
}: {
  facet: Facet;
  counts: OptionCount[];
  histogram: BatchBar[];
  onClose: () => void;
  onBack?: () => void;
}) {
  const { query, push } = useQueryNav();
  const existing = query.chips.find((c) => c.field === facet.id);
  const [op, setOp] = useState<Op>(existing?.op === "not" ? "not" : "is");
  const [sel, setSel] = useState<string[]>(existing?.values ?? []);
  const [q, setQ] = useState("");
  const [opOpen, setOpOpen] = useState(false);
  const [live, setLive] = useState<{ total: number } | null>(null);
  // Family expanders (tags) — user overrides on top of the computed default.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Roots whose "N more …" link was clicked; children are no longer sliced.
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  // Batch is a range facet: offer the list of batches as single-select ranges.
  const options: OptionCount[] = useMemo(() => {
    if (facet.kind === "range") {
      return [...histogram].reverse().map((b) => ({ value: `${b.rank}-${b.rank}`, label: b.batch, sql: "", count: b.n }));
    }
    return counts;
  }, [facet, counts, histogram]);

  // Live count for the pending selection.
  useEffect(() => {
    const next = withChip(query, facet.id, op, sel);
    const sp = toSearchParams(next);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${BASE}/api/count?${sp.toString()}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then(setLive)
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query, facet.id, op, sel]);

  const toggle = (v: string) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const apply = () => {
    push(withChip(query, facet.id, op, sel));
    onClose();
  };

  const ql = q.trim().toLowerCase();
  // Word-start matches first ("AI & ML", "AI Assistant"), then anything containing the text ("Retail").
  const matches = ql
    ? options
        .filter((o) => o.label.toLowerCase().includes(ql))
        .sort((a, b) => {
          const aw = new RegExp(`(^|[^a-z])${ql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(a.label.toLowerCase()) ? 0 : 1;
          const bw = new RegExp(`(^|[^a-z])${ql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(b.label.toLowerCase()) ? 0 : 1;
          return aw - bw || b.count - a.count;
        })
    : [];
  const byParent = new Map<string | undefined, OptionCount[]>();
  for (const o of options) {
    const arr = byParent.get(o.parent) ?? [];
    arr.push(o);
    byParent.set(o.parent, arr);
  }
  const roots = byParent.get(undefined) ?? [];
  const selectedSet = new Set(sel);
  const otherCount = query.chips.filter((c) => c.field !== facet.id).length;

  const isTags = facet.id === "tags";
  const step = isTags ? 24 : 20;
  const searchable = options.length > 8;
  const matchNoun = (() => {
    const one = matches.length === 1;
    if (facet.id === "location") {
      // "1 city" / "3 countries" when every match is the same kind of place; otherwise fall back to "matches".
      const kinds = new Set(matches.map((m) => m.value.split(":")[0]));
      const k = kinds.size === 1 ? [...kinds][0] : undefined;
      if (k === "city") return one ? "city" : "cities";
      if (k === "country") return one ? "country" : "countries";
      if (k === "region") return one ? "region" : "regions";
      if (k === "metro") return one ? "metro" : "metros";
    }
    return one ? "match" : "matches";
  })();

  // Tags families collapse by default except the first one or any holding a selected/matching tag.
  const isOpen = (r: OptionCount, idx: number) => {
    if (r.value in expanded) return expanded[r.value];
    if (idx === 0) return true;
    const kids = byParent.get(r.value) ?? [];
    return kids.some((c) => selectedSet.has(c.value) || (ql && c.label.toLowerCase().includes(ql)) || (byParent.get(c.value) ?? []).some((g) => selectedSet.has(g.value)));
  };
  const sliceFor = (r: OptionCount) => (r.value.startsWith("family:") || r.value.startsWith("region:") ? 6 : 12);
  const moreLabel = (n: number, r: OptionCount) => (isTags ? `${n} more ${n === 1 ? "tag" : "tags"} in the ${r.label} family` : `${n} more in ${r.label}`);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex h-12 items-center gap-2 border-b border-yc-line-subtle pl-3 pr-2">
        {onBack ? (
          <button onClick={onBack} className="flex size-6 items-center justify-center rounded-md text-yc-ink-3 hover:bg-yc-hover" aria-label="Back">
            <Icon name="icon-chevron-left" size={12} />
          </button>
        ) : (
          <Icon name={FACET_ICON[facet.id] ?? "dot"} size={16} />
        )}
        <span className="text-[12px] font-semibold leading-none text-yc-ink">{facet.label}</span>
        {facet.kind !== "toggle" && (
          <div className="relative">
            <button
              onClick={() => setOpOpen((o) => !o)}
              className="flex h-6 items-center gap-1.5 rounded-md bg-white px-1.5 text-[12px] font-medium leading-none text-yc-focus shadow-[0_1px_2px_rgba(82,88,102,.06),0_0_0_1px_#3177f0,0_1px_2px_rgba(0,0,0,.04)]"
              aria-haspopup="listbox"
              aria-expanded={opOpen}
            >
              <span className="px-0.5">{OPS.find((x) => x.id === op)?.label}</span>
              <Icon name="chevron-down-3825e9" size={14} />
            </button>
            {opOpen ? (
              <div className={`absolute left-0 top-[calc(100%+4px)] z-10 flex w-[220px] flex-col rounded-lg border border-yc-line bg-yc-surface p-1 ${POPOVER_SHADOW}`} role="listbox">
                {OPS.map((o) => {
                  const active = o.id === op;
                  return (
                    <button
                      key={o.id}
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setOp(o.id);
                        setOpOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 p-2 text-left hover:bg-yc-hover ${active ? "rounded-lg bg-yc-subtle" : "rounded-md"}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1 leading-none">
                        <span className="text-[12px] font-medium text-yc-ink">{o.label}</span>
                        <span className="text-[10px] text-yc-ink-muted">{o.hint}</span>
                      </span>
                      {active ? <Icon name="check" size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
        <button onClick={onClose} className="ml-auto flex size-6 items-center justify-center rounded-md text-yc-ink-3 hover:bg-yc-hover" aria-label="Close">
          <Icon name="x-close" size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col px-2 pt-2.5 pb-2">
        {searchable ? (
          <div className="flex h-9 items-center gap-2 rounded-xl border border-yc-focus bg-white px-2">
            <Icon name="search-md" size={14} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${facet.label.toLowerCase()}`}
              className="min-w-0 flex-1 bg-transparent text-[14px] leading-none text-yc-ink outline-none placeholder:text-yc-ink-3"
            />
            {facet.id === "location" ? <span className="shrink-0 text-[12px] leading-none text-yc-ink-3">city · country · region</span> : null}
          </div>
        ) : null}

        {isTags ? (
          <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#eef2ff] px-3 py-2 text-[12px] leading-[1.4] text-yc-link">
            <span className="flex shrink-0 items-center pt-0.5">
              <Icon name="star-05" size={14} />
            </span>
            <span className="min-w-0 flex-1">“AI” and “Artificial Intelligence” are one tag here. Searching ai also matches genai, llm and agents inside the AI family.</span>
          </div>
        ) : null}

        <div className={`max-h-[380px] overflow-y-auto yc-thin-scroll ${searchable || isTags ? "mt-1" : ""}`} role="listbox" aria-multiselectable>
          {ql ? (
            <>
              <GroupHeader label={`Matches for “${q.trim()}”`} right={`${matches.length} ${matchNoun}`} />
              {matches.slice(0, 40).map((o) => (
                <Row key={o.value} o={o} depth={0} step={step} on={selectedSet.has(o.value)} onToggle={() => toggle(o.value)} />
              ))}
              {!matches.length ? <p className="px-2 py-3 text-[12px] text-yc-ink-3">Nothing in {facet.label.toLowerCase()} matches “{q.trim()}”.</p> : null}
            </>
          ) : (
            <>
              {sel.length ? <GroupHeader label="Selected" right={`${sel.length} of ${options.length}`} /> : null}
              {isTags && !sel.length ? <GroupHeader label="Tag families" right="ranked by matches" /> : null}
              {roots.map((r, idx) => {
                const kids = byParent.get(r.value) ?? [];
                const expandable = isTags && kids.length > 0;
                const open = expandable ? isOpen(r, idx) : true;
                const limit = sliceFor(r);
                const shown = showAll[r.value] ? kids : kids.slice(0, limit);
                const hidden = kids.length - shown.length;
                return (
                  <div key={r.value}>
                    <Row
                      o={r}
                      depth={0}
                      step={step}
                      on={selectedSet.has(r.value)}
                      onToggle={() => toggle(r.value)}
                      expandable={expandable}
                      expanded={open}
                      onExpand={() => setExpanded((m) => ({ ...m, [r.value]: !open }))}
                    />
                    {open
                      ? shown.map((c) => (
                          <div key={c.value}>
                            <Row o={c} depth={1} step={step} on={selectedSet.has(c.value)} onToggle={() => toggle(c.value)} />
                            {(byParent.get(c.value) ?? []).slice(0, 6).map((g) => (
                              <Row key={g.value} o={g} depth={2} step={step} on={selectedSet.has(g.value)} onToggle={() => toggle(g.value)} />
                            ))}
                          </div>
                        ))
                      : null}
                    {open && hidden > 0 ? (
                      <button
                        type="button"
                        onClick={() => setShowAll((m) => ({ ...m, [r.value]: true }))}
                        className="flex h-7 w-full items-center pr-2 text-left text-[12px] font-medium leading-none text-yc-link hover:underline"
                        style={{ paddingLeft: 8 + step + 2 }}
                      >
                        {moreLabel(hidden, r)}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </>
          )}
          {facet.note ? <p className="px-2 pt-2 text-[12px] font-medium leading-[1.4] text-yc-ink-muted">{facet.note}</p> : null}
        </div>
      </div>

      {/* Footer */}
      <div className="flex h-14 items-center gap-2 border-t border-yc-line-subtle bg-yc-subtle px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1 leading-none">
          <p className="text-[16px] font-medium text-yc-ink">{live ? fmt(live.total) : "…"} results</p>
          <p className="text-[12px] text-yc-ink-muted">
            with your {otherCount} other {otherCount === 1 ? "filter" : "filters"}
          </p>
        </div>
        <button onClick={onClose} className="h-8 rounded-lg border border-yc-line bg-white px-3 text-[12px] font-medium leading-none text-yc-ink">
          Cancel
        </button>
        <button onClick={apply} className="h-8 rounded-lg bg-yc-ink px-3 text-[12px] font-medium leading-none text-white">
          Apply filter
        </button>
      </div>
    </div>
  );
}
