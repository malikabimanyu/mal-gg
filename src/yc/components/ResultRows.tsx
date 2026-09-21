"use client";
import Link from "next/link";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { BatchPill } from "./BatchPill";
import { roleLabel } from "@/yc/lib/format";
import { toHref, type Query } from "@/yc/lib/query";
import type { FounderRow } from "@/yc/lib/search";

const COLS = "grid-cols-[32px_minmax(220px,1.4fr)_120px_120px_130px_minmax(150px,1fr)_72px_minmax(160px,0.9fr)]";

/** Batch chip text colour follows the season, exactly as in the design's table rows. */
const SEASON_TEXT: Record<string, string> = { Winter: "text-[#3177f0]", Spring: "text-[#0e8f5e]", Summer: "text-[#d67f02]", Fall: "text-[#a560f5]" };

export function FounderTable({ rows, query, dense }: { rows: FounderRow[]; query: Query; dense?: boolean }) {
  return (
    <>
    {/* Mobile: one compact row per founder — name, company, role, batch, location, X. */}
    <ul className="md:hidden">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={toHref({ ...query, peek: r.id })}
            scroll={false}
            className={`flex items-center gap-3 border-b border-yc-line-subtle px-4 py-3 active:bg-yc-hover ${query.peek === r.id ? "bg-yc-row-selected" : ""}`}
          >
            <Avatar name={r.name} src={r.avatar_url} size={36} />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 leading-none">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-[15px] font-medium tracking-[-0.1px] text-yc-ink">{r.name}</span>
                {r.x_handle ? <span className="shrink-0 font-yc-mono text-[11px] text-yc-ink-3">@{r.x_handle}</span> : null}
              </span>
              <span className="truncate text-[12px] tracking-[-0.1px] text-yc-ink-muted">
                {roleLabel(r.role_bucket, r.title)} · {r.company}
              </span>
              <span className="flex items-center gap-2 text-[11px] text-yc-ink-3">
                <span className={`font-yc-mono font-medium ${SEASON_TEXT[r.batch_season ?? ""] ?? "text-yc-focus"}`}>{r.batch_code ?? r.batch}</span>
                <span className="truncate">{r.industry ?? "—"}{r.location ? ` · ${r.location.split(",")[0]}` : ""}</span>
              </span>
            </span>
            <Icon name="icon-chevron-right" size={12} />
          </Link>
        </li>
      ))}
    </ul>

    <div className="overflow-x-auto yc-thin-scroll max-md:hidden">
      <div className={`grid min-w-[1000px] ${COLS} h-12 items-center border-b border-yc-line bg-yc-subtle px-4 text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted`}>
        <span className="flex size-5 items-center justify-center rounded-lg border border-yc-line-strong bg-yc-surface" aria-hidden />
        {(["FOUNDER", "ROLE", "BATCH", "INDUSTRY", "LOCATION", "TEAM", "X_url"] as const).map((h) => {
          const sortedBy = h === "BATCH" && (query.sort === "newest" || query.sort === "oldest");
          return (
            <span key={h} className="flex items-center justify-between px-3">
              {h}
              {sortedBy ? <Icon name="chevron-down" size={12} /> : h === "X_url" ? null : <Icon name="chevron-selector-vertical" size={14} />}
            </span>
          );
        })}
      </div>
      {rows.map((r) => (
        <Link
          key={r.id}
          href={toHref({ ...query, peek: r.id })}
          scroll={false}
          className={`grid min-w-[1000px] ${COLS} items-center border-b border-yc-line-subtle bg-yc-surface px-4 leading-none hover:bg-yc-hover ${dense ? "h-[52px]" : "h-16"} ${query.peek === r.id ? "bg-yc-row-selected" : ""}`}
          aria-label={`${r.name} · ${r.company}`}
        >
          <span className="flex size-5 items-center justify-center rounded-lg border border-yc-line-strong bg-yc-surface" aria-hidden />
          <span className="flex min-w-0 items-center gap-2 px-3">
            <Avatar name={r.name} src={r.avatar_url} size={32} />
            <span className="flex min-w-0 flex-col gap-1.5">
              <span className="truncate text-[16px] font-medium tracking-[-0.1px] text-yc-ink">{r.name}</span>
              <span className="flex items-center gap-1.5 text-[14px] tracking-[-0.1px] text-yc-ink-muted">
                <Icon name="briefcase-grey" size={14} />
                <span className="truncate">{r.company}</span>
                {r.n_companies && r.n_companies > 1 ? <span className="rounded bg-yc-indigo-soft px-1 py-0.5 font-yc-mono text-[10px] font-medium text-yc-indigo">{r.n_companies}× YC</span> : null}
              </span>
            </span>
          </span>
          <span className="truncate px-3 text-[14px] font-medium tracking-[-0.1px] text-yc-ink-muted">{roleLabel(r.role_bucket, r.title)}</span>
          <span className="px-3">
            <span className={`yc-card inline-flex h-6 items-center rounded-lg px-2 font-yc-mono text-[12px] font-medium ${SEASON_TEXT[r.batch_season ?? ""] ?? "text-yc-focus"}`}>{r.batch}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 text-[14px] font-medium tracking-[-0.1px] text-yc-ink-muted">
            <Icon name="icon-building" size={14} />
            <span className="truncate">{r.industry ?? "—"}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 text-[14px] font-medium tracking-[-0.1px] text-yc-ink-muted">
            <Icon name="marker-pin-01" size={14} />
            <span className="truncate">{r.location ?? "Unknown"}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 text-[14px] font-medium tracking-[-0.1px] text-yc-ink-muted">
            <Icon name="users-01" size={14} />
            {r.team_size ?? "—"}
          </span>
          <span className="px-3">
            {r.x_handle ? (
              <span className="flex h-6 items-center gap-2 rounded-lg bg-white px-1.5 shadow-[0_1px_2px_0_rgba(82,88,102,0.06),0_0_1px_0_rgba(0,0,0,0.24),0_1px_2px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.02)]">
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted">https://x.com/{r.x_handle}</span>
                {r.is_company_account ? <Icon name="alert-triangle" size={12} /> : <Icon name="link-03" size={12} />}
              </span>
            ) : (
              <span className="text-[12px] text-yc-ink-3">—</span>
            )}
          </span>
        </Link>
      ))}
    </div>
    </>
  );
}

export function CardGrid({ rows, query }: { rows: FounderRow[]; query: Query }) {
  return (
    <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Link key={r.id} href={toHref({ ...query, peek: r.id })} scroll={false} className="yc-card flex flex-col gap-3 rounded-xl p-4 hover:bg-yc-hover">
          <div className="flex items-center gap-3">
            <Avatar name={r.name} src={r.avatar_url} size={40} />
            <div className="flex min-w-0 flex-col gap-1.5 leading-none">
              <span className="truncate text-[15px] font-medium text-yc-ink">{r.name}</span>
              <span className="truncate text-[12px] text-yc-ink-muted">{roleLabel(r.role_bucket, r.title)} · {r.company}</span>
            </div>
            <BatchPill batch={r.batch_code ?? r.batch} season={r.batch_season} className="ml-auto" />
          </div>
          {r.one_liner ? <p className="line-clamp-2 text-[12px] leading-[1.45] text-yc-ink-2">{r.one_liner}</p> : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-yc-ink-muted">
            <span className="flex items-center gap-1"><Icon name="icon-building" size={12} />{r.industry ?? "—"}</span>
            <span className="flex items-center gap-1"><Icon name="marker-pin-01" size={12} />{r.location ?? "Unknown"}</span>
            <span className="flex items-center gap-1 font-yc-mono"><Icon name="users-01" size={12} />{r.team_size ?? "—"}</span>
            {r.x_handle ? <span className="ml-auto font-yc-mono text-yc-ink">@{r.x_handle}</span> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
