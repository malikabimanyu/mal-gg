import { Pagination } from "./Pagination";
import { Icon } from "./Icon";
import { EmptyState } from "./EmptyState";
import { FounderTable, CardGrid } from "./ResultRows";
import { fmt, pct } from "@/yc/lib/format";
import type { Query } from "@/yc/lib/query";
import type { SearchResult, Relaxation } from "@/yc/lib/search";

export function Results({ result, query, relax = [] }: { result: SearchResult; query: Query; relax?: Relaxation[] }) {
  const view = query.view;
  return (
    <section className="yc-panel flex min-w-0 flex-1 flex-col overflow-hidden max-md:w-full">
      <ResultsToolbar result={result} query={query} />
      {result.total === 0 ? (
        <EmptyState result={result} query={query} relax={relax} />
      ) : view === "cards" ? (
        <CardGrid rows={result.rows} query={query} />
      ) : (
        <FounderTable rows={result.rows} query={query} dense={view === "people"} />
      )}
      {result.total > 0 ? <Pagination total={result.total} pageSize={query.pageSize} page={result.page} /> : null}
    </section>
  );
}

function ResultsToolbar({ result, query }: { result: SearchResult; query: Query }) {
  const zero = result.total === 0;
  if (zero) {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-yc-line-subtle px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-[24px] font-semibold tracking-[-0.19px] text-yc-ink">0</span>
            <span className="text-[14px] text-yc-ink-2">founders</span>
            <span className="text-[12px] text-yc-ink-3">·</span>
            <span className="text-[14px] text-yc-ink-2">
              <span className="font-yc-mono">{fmt(result.companies)}</span> companies
            </span>
          </div>
          <span className="text-[12px] text-yc-ink-3">no rows match · {query.chips.length} filters active · AND across dimensions</span>
        </div>
        <button
          type="button"
          aria-disabled
          className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-yc-line bg-yc-surface px-2.5 text-[12px] font-medium leading-none text-yc-ink shadow-[0_1px_1px_rgba(15,23,41,.05)]"
        >
          <Icon name="columns-03" size={14} />
          <span className="flex items-center gap-1.5">
            Columns
            <Icon name="chevron-down" size={14} />
          </span>
        </button>
      </div>
    );
  }
  return (
    <div className="flex h-[52px] items-center justify-between border-b border-yc-line-subtle px-5 max-md:px-4">
      <div className="flex items-center gap-2 leading-none">
        <span className="text-[16px] font-medium tracking-[-0.1px] text-yc-ink">Founders</span>
        <span className="relative flex items-center rounded-lg bg-yc-subtle px-2.5 py-1.5 font-yc-mono text-[12px] font-medium text-yc-focus shadow-[inset_0_0_0_0.8px_rgba(49,119,240,0.4)]">{fmt(result.total)}</span>
      </div>
      <div className="flex items-center gap-2 text-[12px] font-medium leading-none max-md:hidden">
        <span className="text-yc-ink-3">Known for these results</span>
        {(
          [
            ["Role", result.coverage.role, coverageTip.role],
            ["Bio", result.coverage.bio, coverageTip.bio],
            ["Ex-company", result.coverage.ex, coverageTip.ex],
            ["School", result.coverage.school, coverageTip.school],
          ] as const
        ).map(([k, v, tip]) => (
          <span key={k} className="group relative yc-card flex h-6 items-center gap-2 rounded-lg px-2">
            <span className="text-yc-ink-muted">{k}</span>
            <span className="font-yc-mono text-yc-ink">{pct(v)}</span>
            <span
              role="tooltip"
              className="hidden group-hover:block absolute right-0 top-[calc(100%+8px)] z-30 w-[422px] rounded-lg bg-yc-ink p-4 text-left text-[14px] font-normal leading-[1.4] text-white shadow-[0_12px_24px_-6px_rgba(0,0,0,.2)]"
            >
              {tip(pct(v))}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

const coverageTip: Record<"role" | "bio" | "ex" | "school", (n: string) => string> = {
  role: (n) =>
    `Role is parsed from founder titles in yc.db. Known for ${n} of these rows — the rest have no title at all, mostly 2019–2023. Those rows stay in the result and are counted as Unknown, never as No.`,
  bio: (n) => `Bio coverage: ${n} of these founders have a bio on their YC profile. Every bio-derived facet (ex-company, school, credentials, discipline) is Unknown for the rest.`,
  ex: (n) => `Ex-company is matched from bios with employment context (ex-, formerly, worked at). ${n} of these rows have at least one match.`,
  school: (n) => `School is matched from bios, case-sensitive for acronyms. ${n} of these rows have at least one match.`,
};
