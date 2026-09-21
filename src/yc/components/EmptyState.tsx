import Link from "next/link";
import { Icon } from "./Icon";
import { fmt } from "@/yc/lib/format";
import { toHref, type Query } from "@/yc/lib/query";
import type { SearchResult, Relaxation } from "@/yc/lib/search";

const KIND_ICON: Record<Relaxation["kind"], string> = { remove: "x-close", text: "star-05", or: "link-03" };

export function EmptyState({ result, query, relax = [] }: { result: SearchResult; query: Query; relax?: Relaxation[] }) {
  const n = query.chips.length + (query.q ? 1 : 0);
  return (
    <div className="flex flex-col items-center gap-6 px-12 py-16 max-md:px-4 max-md:py-10">
      <span className="flex size-[52px] items-center justify-center rounded-full border border-yc-line bg-yc-subtle">
        <Icon name="search-md" size={20} />
      </span>

      <div className="flex flex-col items-center gap-3">
        <h2 className="text-[20px] font-semibold leading-none tracking-[-0.16px] text-yc-ink">
          No founders match {n === 1 ? "this filter" : `these ${n} filters`}
        </h2>
        <p className="max-w-[520px] text-center text-[14px] leading-[1.5] text-yc-ink-2">
          Dimensions combine with AND, values inside one dimension with OR. Loosening one dimension brings results back — each option below is counted against the rest of your filters.
        </p>
      </div>

      <div className="flex w-full max-w-[680px] flex-col gap-2.5">
        {relax.map((r) => (
          <div key={r.title} className="flex items-center gap-2.5 rounded-xl border border-yc-line-strong bg-yc-surface p-3 shadow-[0_1px_0.75px_rgba(0,0,0,.05)] max-md:flex-wrap">
            <Icon name={KIND_ICON[r.kind]} size={20} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-none">
              <span className="text-[14px] font-medium leading-none text-yc-ink">{r.title}</span>
              <span className="text-[12px] leading-none text-yc-ink-muted">{r.detail}</span>
            </div>
            <span className="flex shrink-0 items-end gap-1.5 leading-none">
              <span className="font-yc-mono text-[16px] font-medium tracking-[-0.14px] text-yc-ink">{fmt(r.count)}</span>
              <span className="text-[12px] text-yc-ink-3">results</span>
            </span>
            <Link href={toHref(r.next)} className="flex h-8 shrink-0 items-center rounded-lg bg-yc-ink px-3 text-[12px] font-medium leading-none text-white">
              Apply
            </Link>
          </div>
        ))}
        {!relax.length ? <p className="text-center text-[12px] text-yc-ink-3">Even with every filter removed one at a time nothing matches — try clearing all.</p> : null}
      </div>

      <div className="flex items-center gap-2 text-[12px] font-medium leading-none">
        <Link
          href={toHref({ ...query, chips: [], q: "", page: 1 })}
          className="flex h-9 items-center rounded-xl border border-yc-line bg-yc-surface px-2.5 text-yc-ink shadow-[0_1px_1px_rgba(15,23,41,.05)]"
        >
          Clear all filters
        </Link>
        <Link href={toHref({ ...query, chips: [], q: "", page: 1, sort: "newest" })} className="flex h-9 items-center gap-1.5 px-3 text-yc-ink-2 hover:text-yc-ink">
          <Icon name="refresh-cw-01" size={14} />
          Reset to newest batch
        </Link>
      </div>
      <p className="text-[11px] text-yc-ink-3">{fmt(result.universe)} founders in the directory</p>
    </div>
  );
}
