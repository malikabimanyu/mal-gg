"use client";
import { Icon } from "./Icon";
import { useQueryNav } from "@/yc/lib/nav";
import { fmt } from "@/yc/lib/format";

function Btn({ onClick, disabled, label, children, active }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex size-8 items-center justify-center rounded-lg border border-yc-line bg-yc-surface text-[12px] drop-shadow-[0_1px_0.75px_rgba(0,0,0,0.05)] disabled:opacity-40 ${active ? "font-semibold text-yc-ink ring-1 ring-yc-focus/40" : "font-medium text-yc-ink-2 hover:bg-yc-hover"}`}
    >
      {children}
    </button>
  );
}

export function Pagination({ total, pageSize, page: current, unit = "founders" }: { total: number; pageSize: number; page: number; unit?: string }) {
  const { query, push } = useQueryNav();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(current, pages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const go = (p: number) => push({ ...query, page: Math.max(1, Math.min(pages, p)) }, { scroll: true });

  return (
    <div className="flex items-center gap-3 border-t border-yc-line-subtle bg-yc-surface px-5 py-3">
      <p className="min-w-0 flex-1 text-[12px] text-yc-ink-2">
        Showing {fmt(from)}–{fmt(to)} of {fmt(total)} {unit}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Btn onClick={() => go(1)} disabled={page === 1} label="First page"><Icon name="chevron-left-double" size={12} /></Btn>
        <Btn onClick={() => go(page - 1)} disabled={page === 1} label="Previous page"><Icon name="icon-chevron-left" size={12} /></Btn>
        <Btn onClick={() => go(1)} label="Page 1" active={page === 1}>1</Btn>
        {page > 2 ? <span className="px-1 font-yc-mono text-[12px] text-yc-ink-3">…</span> : null}
        {page !== 1 && page !== pages ? <Btn onClick={() => go(page)} label={`Page ${page}`} active>{page}</Btn> : null}
        {page < pages - 1 ? <span className="px-1 font-yc-mono text-[12px] text-yc-ink-3">…</span> : null}
        {pages > 1 ? <Btn onClick={() => go(pages)} label={`Page ${pages}`} active={page === pages}>{fmt(pages)}</Btn> : null}
        <Btn onClick={() => go(page + 1)} disabled={page === pages} label="Next page"><Icon name="icon-chevron-right" size={12} /></Btn>
        <Btn onClick={() => go(pages)} disabled={page === pages} label="Last page"><Icon name="chevron-right-double" size={12} /></Btn>
      </nav>
    </div>
  );
}
