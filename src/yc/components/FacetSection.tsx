"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { BatchRange } from "./BatchRange";
import { useQueryNav } from "@/yc/lib/nav";
import type { Facet } from "@/yc/lib/facets";
import { chipFor, toggleValue, withChip, withoutChip } from "@/yc/lib/query";
import type { OptionCount, BatchBar, Coverage } from "@/yc/lib/search";
import { fmt, pct } from "@/yc/lib/format";

/** Open/closed state per section — always collapsed on load; only lives for the current page session. */
function useOpen(initial: boolean): [boolean, (v: boolean) => void] {
  return useState(initial);
}

export function FacetSection({
  facet,
  counts,
  histogram,
  batches,
  coverage,
}: {
  facet: Facet;
  counts: OptionCount[];
  histogram: BatchBar[];
  batches: { min: number; max: number; peak: BatchBar | null };
  coverage: Coverage;
}) {
  const { query, push } = useQueryNav();
  const [open, setOpen] = useOpen(!!facet.defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const chip = chipFor(query, facet.id);
  const selected = new Set(chip?.values ?? []);

  // Header summary: selected labels (link colour) or "Any".
  const summary = (() => {
    if (facet.kind === "range") {
      if (!chip) {
        const a = histogram.find((b) => b.rank === batches.min)?.code ?? "";
        const b = histogram.find((b) => b.rank === batches.max)?.code ?? "";
        return { text: `${a} – ${b}`, active: false };
      }
      const [lo, hi] = (chip.values[0] ?? "").split("-").map(Number);
      const a = histogram.find((b) => b.rank === lo)?.code ?? lo;
      const b = histogram.find((b) => b.rank === hi)?.code ?? hi;
      const text = lo === hi ? String(a) : `${a} – ${b}`;
      return { text: chip.op === "not" ? `not ${text}` : text, active: true };
    }
    if (!chip?.values.length) return { text: "Any", active: false };
    const labels = chip.values.map((v) => counts.find((o) => o.value === v)?.label ?? v.replace(/^(metro|city|country|region|family):/, "").split("|")[0]);
    return { text: (chip.op === "not" ? "not " : "") + (labels.length > 1 ? `${labels[0]} +${labels.length - 1}` : labels[0]), active: true };
  })();

  // Right-hand meta: with a selection, that option's live count (design: "Active · 4,289");
  // otherwise the facet's own meta (option count, "9·59", "1 – 100+").
  const selectedCount0 = chip && facet.kind !== "range" && chip.op === "is" && chip.values.length === 1 ? counts.find((o) => o.value === chip.values[0])?.count : undefined;
  const metaRight = selectedCount0 !== undefined ? fmt(selectedCount0) : facet.meta ?? (facet.kind === "range" ? String(histogram.length) : counts.length ? String(counts.filter((c) => !c.parent).length) : "");

  const knownPct = facet.id === "role" ? coverage.role : facet.knownSql ? coverage.bio : null;
  const selectedCount = facet.kind === "range" ? (chip ? 1 : 0) : selected.size;

  return (
    <section className="w-full" aria-labelledby={`facet-${facet.id}`}>
      <button
        id={`facet-${facet.id}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 pl-3 pr-5 text-left hover:bg-yc-hover/60"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
          <span className="truncate text-[14px] font-medium tracking-[-0.1px] text-yc-ink">{facet.label}</span>
        </span>
        <span className={`truncate text-[12px] font-medium tracking-[-0.1px] ${summary.active ? "text-yc-link" : "text-yc-ink-muted"}`}>{summary.text}</span>
        {metaRight ? <span className="font-yc-mono text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted">{metaRight}</span> : null}
      </button>

      {open ? (
        <div className="flex w-full flex-col gap-2 pb-3 pl-6 pr-5 pt-1.5">
          {facet.kind === "range" ? (
            <BatchRange histogram={histogram} batches={batches} />
          ) : facet.kind === "toggle" ? (
            <ToggleRow facet={facet} counts={counts} />
          ) : facet.kind === "tree" ? (
            <TreeOptions facet={facet} counts={counts} selected={selected} showAll={showAll} onShowAll={() => setShowAll(true)} />
          ) : (
            <FlatOptions facet={facet} counts={counts} selected={selected} showAll={showAll} onShowAll={() => setShowAll(true)} />
          )}

          {facet.id === "status" ? (
            <div className="-mt-1 w-full border-t border-[#e3e5eb] pt-1">
              <GraveyardToggle />
            </div>
          ) : null}

          {knownPct !== null && facet.kind !== "toggle" ? (
            <div className="flex flex-col gap-2 pt-1">
              <p className="text-[12px] font-medium tracking-[-0.1px] text-yc-ink-3">
                {facet.id === "role" ? "Role" : facet.label} known for {pct(knownPct)} of these results
              </p>
              <div className="h-1 w-[120px] overflow-hidden rounded-sm bg-yc-line">
                <div className="h-full rounded-sm bg-[var(--yc-accent-blue)]" style={{ width: `${Math.round(knownPct * 100)}%` }} />
              </div>
            </div>
          ) : null}

          {facet.note && facet.kind !== "tree" ? <p className="text-[11px] leading-[1.45] text-yc-ink-3">{facet.note}</p> : null}
          {selectedCount > 0 && facet.kind !== "range" ? (
            <button onClick={() => push(withoutChip(query, facet.id))} className="self-start text-[11px] font-medium text-yc-link hover:underline">
              Clear {facet.label.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function OptionRow({ o, on, depth = 0, onToggle }: { o: OptionCount; on: boolean; depth?: number; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="checkbox"
      aria-checked={on}
      className={`flex h-8 w-full items-center gap-3 rounded-[10px] px-2 text-left leading-none hover:bg-yc-hover ${on ? "bg-[#f2f3f5]" : ""}`}
      style={{ marginLeft: depth * 16, width: `calc(100% - ${depth * 16}px)` }}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${on ? "border-yc-focus bg-yc-focus" : "border-yc-line-strong bg-yc-surface"}`}>
          {on ? <Icon name="icon-check" size={12} /> : null}
        </span>
        <span className={`truncate text-[12px] font-medium tracking-[-0.1px] ${on ? "text-yc-ink" : "text-yc-ink-muted"}`}>{o.label}</span>
        {/unknown|unspecified|untagged|no bio/i.test(o.label) ? <Icon name="info-circle" size={12} /> : null}
        {o.note && !o.parent && o.note.length < 14 ? <span className="rounded bg-yc-subtle px-1 py-0.5 text-[10px] text-yc-ink-3">{o.note}</span> : null}
      </span>
      <span className="font-yc-mono text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted">
        {o.approx ? "≈" : ""}
        {fmt(o.count)}
      </span>
    </button>
  );
}

function FlatOptions({ facet, counts, selected, showAll, onShowAll }: { facet: Facet; counts: OptionCount[]; selected: Set<string>; showAll: boolean; onShowAll: () => void }) {
  const { query, push } = useQueryNav();
  const visible = facet.visible ?? 8;
  const unknown = counts.filter((c) => /unknown|^no$|untagged/i.test(c.value) || /unknown/i.test(c.label));
  const regular = counts.filter((c) => !unknown.includes(c));
  const shown = showAll ? regular : regular.slice(0, visible);
  const hidden = regular.length - shown.length;
  return (
    <div className="flex w-full flex-col gap-0.5">
      {shown.map((o) => (
        <OptionRow key={o.value} o={o} on={selected.has(o.value)} onToggle={() => push(toggleValue(query, facet.id, o.value))} />
      ))}
      {hidden > 0 ? (
        <button onClick={onShowAll} className="px-2 py-1.5 text-left text-[12px] font-medium text-yc-link hover:underline">
          {hidden} more {facet.label.toLowerCase()}{hidden === 1 ? "" : "s"}
        </button>
      ) : null}
      {unknown.length ? (
        <div className="mt-1 border-t border-yc-line-subtle pt-1">
          {unknown.map((o) => (
            <div key={o.value}>
              <OptionRow o={o} on={selected.has(o.value)} onToggle={() => push(toggleValue(query, facet.id, o.value))} />
              {o.note ? <p className="px-2 pt-1 text-[11px] leading-[1.45] text-yc-ink-3">{o.note}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TreeOptions({ facet, counts, selected, showAll, onShowAll }: { facet: Facet; counts: OptionCount[]; selected: Set<string>; showAll: boolean; onShowAll: () => void }) {
  const { query, push } = useQueryNav();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(counts.filter((c) => !c.parent).slice(0, 1).map((c) => c.value)));
  const [moreChildren, setMoreChildren] = useState<Set<string>>(new Set());
  const roots = counts.filter((c) => !c.parent && !/unknown|untagged|unspecified/i.test(c.value));
  const tail = counts.filter((c) => !c.parent && /unknown|untagged|unspecified/i.test(c.value));
  const childrenOf = (v: string) => counts.filter((c) => c.parent === v);
  const rootsShown = showAll ? roots : roots.slice(0, 4);

  const toggleExpand = (v: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });

  return (
    <div className="flex w-full flex-col gap-0.5">
      {rootsShown.map((r) => {
        const kids = childrenOf(r.value);
        const isOpen = expanded.has(r.value);
        const kidsShown = moreChildren.has(r.value) ? kids : kids.slice(0, 3);
        const rest = kids.length - kidsShown.length;
        const restCount = kids.slice(kidsShown.length).reduce((a, k) => a + k.count, 0);
        return (
          <div key={r.value}>
            <div className="flex items-center">
              {kids.length ? (
                <button onClick={() => toggleExpand(r.value)} aria-label={isOpen ? "Collapse" : "Expand"} className="flex size-6 shrink-0 items-center justify-center rounded text-yc-ink-3 hover:bg-yc-hover">
                  <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={12} />
                </button>
              ) : (
                <span className="size-6 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <OptionRow o={r} on={selected.has(r.value)} onToggle={() => push(toggleValue(query, facet.id, r.value))} />
              </div>
            </div>
            {isOpen && kids.length ? (
              <div className="ml-6 flex flex-col gap-0.5">
                {kidsShown.map((k) => {
                  const grand = childrenOf(k.value);
                  return (
                    <div key={k.value}>
                      <OptionRow o={k} on={selected.has(k.value)} depth={0} onToggle={() => push(toggleValue(query, facet.id, k.value))} />
                      {grand.slice(0, 6).map((g) => (
                        <OptionRow key={g.value} o={g} on={selected.has(g.value)} depth={1} onToggle={() => push(toggleValue(query, facet.id, g.value))} />
                      ))}
                    </div>
                  );
                })}
                {rest > 0 ? (
                  <button onClick={() => setMoreChildren((s) => new Set(s).add(r.value))} className="px-2 py-1.5 text-left text-[12px] font-medium text-yc-link hover:underline">
                    {rest} more · {fmt(restCount)}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      {roots.length > rootsShown.length ? (
        <button onClick={onShowAll} className="px-2 py-1.5 text-left text-[12px] font-medium text-yc-link hover:underline">
          Show all {roots.length} {facet.label.toLowerCase() === "industry" ? "industries" : facet.label.toLowerCase()}
        </button>
      ) : null}
      {tail.length ? (
        <div className="mt-1 border-t border-yc-line-subtle pt-1">
          {tail.map((o) => (
            <div key={o.value}>
              <div className="flex items-center">
                <span className="size-6 shrink-0" />
                <div className="min-w-0 flex-1">
                  <OptionRow o={o} on={selected.has(o.value)} onToggle={() => push(toggleValue(query, facet.id, o.value))} />
                </div>
              </div>
            </div>
          ))}
          {facet.note ? <p className="px-2 pt-1 text-[11px] leading-[1.45] text-yc-ink-3">{facet.note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({ facet, counts }: { facet: Facet; counts: OptionCount[] }) {
  const { query, push } = useQueryNav();
  const chip = chipFor(query, facet.id);
  const current = chip?.values[0];
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="yc-card flex h-8 items-center bg-yc-subtle p-0.5">
        {[{ value: undefined, label: "Any" }, ...counts.map((c) => ({ value: c.value, label: c.label }))].map((o) => {
          const on = current === o.value;
          return (
            <button
              key={o.label}
              onClick={() => push(o.value === undefined ? withoutChip(query, facet.id) : withChip(query, facet.id, "is", [o.value]))}
              className={`flex h-7 flex-1 items-center justify-center rounded-md text-[12px] font-medium ${on ? "yc-card text-yc-ink" : "text-yc-ink-2"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between px-1 text-[11px] text-yc-ink-3">
        {counts.map((c) => (
          <span key={c.value}>
            {c.label} <span className="font-yc-mono">{fmt(c.count)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function GraveyardToggle() {
  const { query, push } = useQueryNav();
  const chip = chipFor(query, "status");
  const showing = !chip || chip.values.includes("Inactive");
  return (
    <div className="flex h-8 items-center justify-between px-2">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-yc-ink-muted">
        Show graveyard
        <Icon name="info-circle" size={12} />
      </span>
      <button
        role="switch"
        aria-checked={showing}
        onClick={() => {
          if (showing) push(withChip(query, "status", "is", ["Active", "Acquired", "Public"]));
          else push(withoutChip(query, "status"));
        }}
        className={`relative h-5 w-9 rounded-full transition-colors ${showing ? "bg-yc-focus" : "bg-yc-line-strong"}`}
      >
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${showing ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
