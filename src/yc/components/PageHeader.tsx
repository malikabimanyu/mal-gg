import { fmt } from "@/yc/lib/format";

export function PageHeader({ total, universe, onePerCompany }: { total: number; universe: number; onePerCompany: boolean }) {
  return (
    <header className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-none">
        <h1 className="text-[20px] font-semibold tracking-[-0.2px] text-yc-ink">Founder Directory</h1>
        <p className="truncate text-[14px] font-medium text-yc-ink-muted">
          {onePerCompany ? "One contact per company · " : ""}
          {fmt(total)} of {fmt(universe)} founders match the current filters
        </p>
      </div>
    </header>
  );
}
