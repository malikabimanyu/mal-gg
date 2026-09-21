"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { AddFilterPopover } from "./AddFilterPopover";
import { useQueryNav } from "@/yc/lib/nav";
import { getFacet, chipLabel } from "@/yc/lib/facets";
import { withoutChip, type Chip } from "@/yc/lib/query";
import type { FacetCounts, BatchBar } from "@/yc/lib/search";

function rangeLabel(chip: Chip, histogram: BatchBar[]): string {
  const [lo, hi] = (chip.values[0] ?? "").split("-").map(Number);
  const a = histogram.find((b) => b.rank === lo)?.batch ?? lo;
  const b = histogram.find((b) => b.rank === hi)?.batch ?? hi;
  return lo === hi ? String(a) : `${a} – ${b}`;
}

export function ChipBar({ facets, histogram }: { facets: FacetCounts; histogram: BatchBar[] }) {
  const { query, push } = useQueryNav();
  const [editing, setEditing] = useState<string | null>(null); // facet id being edited in the popover
  const [adding, setAdding] = useState(false);
  const chips = query.chips.filter((c) => getFacet(c.field));

  return (
    <div className="flex min-h-8 items-center gap-3 max-md:flex-wrap">
      <span className="text-[12px] font-medium tracking-[0.72px] text-yc-ink-muted max-md:hidden">ACTIVE</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const facet = getFacet(chip.field)!;
          const l = facet.kind === "range" ? { field: facet.label, op: chip.op === "not" ? "is not" : "is", value: rangeLabel(chip, histogram) } : chipLabel(chip, facet, facets[chip.field] ?? facet.options);
          return (
            <div key={chip.field} className="relative" data-popover-root>
              <div className="yc-card flex h-8 items-center gap-2 rounded-[10px] pl-3 pr-2 text-[12px] leading-none">
                <button
                  onClick={() => setEditing(editing === chip.field ? null : chip.field)}
                  className="flex items-center gap-1.5 hover:opacity-80"
                  aria-haspopup="dialog"
                  aria-expanded={editing === chip.field}
                >
                  <span className="text-yc-ink-muted">{l.field}</span>
                  <span className="text-yc-ink-muted">{l.op}</span>
                  <span className="max-w-[260px] truncate font-medium text-yc-ink">{l.value}</span>
                </button>
                <button
                  aria-label={`Remove ${l.field} filter`}
                  onClick={() => push(withoutChip(query, chip.field))}
                  className="flex size-5 items-center justify-center rounded-md text-yc-ink-3 hover:bg-yc-subtle hover:text-yc-ink"
                >
                  <Icon name="x-close" size={14} />
                </button>
              </div>
              {editing === chip.field ? (
                <AddFilterPopover facetId={chip.field} facets={facets} histogram={histogram} onClose={() => setEditing(null)} />
              ) : null}
            </div>
          );
        })}

        <div className="relative" data-popover-root>
          <button
            onClick={() => setAdding((a) => !a)}
            aria-haspopup="dialog"
            aria-expanded={adding}
            className="flex h-8 items-center gap-1.5 rounded-[10px] border border-dashed border-yc-focus/60 px-3 text-[12px] font-medium leading-none text-yc-focus hover:bg-yc-blue-soft/50"
          >
            <Icon name="plus" size={12} />
            Add filter
          </button>
          {adding ? <AddFilterPopover facets={facets} histogram={histogram} onClose={() => setAdding(false)} /> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[12px] leading-none max-md:basis-full max-md:justify-end">
        <span className="text-yc-ink-2">
          {chips.length} {chips.length === 1 ? "filter" : "filters"}
        </span>
        {chips.length ? (
          <button onClick={() => push({ ...query, chips: [], page: 1 })} className="font-medium text-yc-link hover:underline">
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
}
