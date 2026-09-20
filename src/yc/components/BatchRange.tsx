"use client";
import { useMemo, useState } from "react";
import { useQueryNav } from "@/yc/lib/nav";
import { chipFor, withChip, withoutChip } from "@/yc/lib/query";
import type { BatchBar } from "@/yc/lib/search";
import { fmt } from "@/yc/lib/format";

/** Batch facet: preset chips, histogram and a dual-handle range over the real chronological batch list. */
export function BatchRange({ histogram, batches }: { histogram: BatchBar[]; batches: { min: number; max: number; peak: BatchBar | null } }) {
  const { query, push } = useQueryNav();
  const chip = chipFor(query, "batch");
  // An exclusion chip ("is not W27") keeps the slider at full range; only "is" ranges move the handles.
  const rangeChip = chip && chip.op !== "not" ? chip : undefined;
  const [cur] = (rangeChip?.values[0] ?? "").split("-").map(Number);
  const [, curHi] = (rangeChip?.values[0] ?? "").split("-").map(Number);
  const lo0 = Number.isFinite(cur) ? cur : batches.min;
  const hi0 = Number.isFinite(curHi) ? curHi : batches.max;
  // Local drag state, re-seeded whenever the URL-derived range changes (no effect needed).
  const [drag, setDrag] = useState<{ key: string; lo: number; hi: number }>({ key: `${lo0}-${hi0}`, lo: lo0, hi: hi0 });
  const seeded = drag.key === `${lo0}-${hi0}` ? drag : { key: `${lo0}-${hi0}`, lo: lo0, hi: hi0 };
  const lo = seeded.lo;
  const hi = seeded.hi;
  const setLo = (v: number) => setDrag({ key: seeded.key, lo: v, hi: seeded.hi });
  const setHi = (v: number) => setDrag({ key: seeded.key, lo: seeded.lo, hi: v });

  const byRank = useMemo(() => new Map(histogram.map((b) => [b.rank, b])), [histogram]);
  const maxN = Math.max(1, ...histogram.map((b) => b.n));
  const total = histogram.reduce((a, b) => a + b.n, 0);

  const commit = (a: number, b: number) => {
    const l = Math.min(a, b);
    const h = Math.max(a, b);
    if (l <= batches.min && h >= batches.max) push(withoutChip(query, "batch"));
    else push(withChip(query, "batch", "is", [`${l}-${h}`]));
  };

  // Presets are computed against the live histogram so the counts stay honest.
  const current = batches.max;
  const last4 = Math.max(batches.min, batches.max - 3);
  const first2024 = histogram.find((b) => /2024|2025|2026|2027/.test(b.batch))?.rank ?? batches.max;
  const sum = (a: number, b: number) => histogram.filter((x) => x.rank >= a && x.rank <= b).reduce((s, x) => s + x.n, 0);
  const presets = [
    { label: "Current", lo: current, hi: current, n: sum(current, current) },
    { label: "Last 4 batches", lo: last4, hi: batches.max, n: sum(last4, batches.max) },
    { label: "2024+", lo: first2024, hi: batches.max, n: sum(first2024, batches.max) },
  ];
  const isActive = (p: { lo: number; hi: number }) => lo === p.lo && hi === p.hi && !!rangeChip;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 text-[12px] font-medium tracking-[-0.1px]">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => (isActive(p) ? push(withoutChip(query, "batch")) : commit(p.lo, p.hi))}
            className={`yc-card flex h-7 items-center gap-1.5 rounded-lg px-2 leading-none ${isActive(p) ? "ring-1 ring-yc-focus" : ""}`}
            aria-pressed={isActive(p)}
          >
            <span className="text-yc-ink-2">{p.label}</span>
            <span className="font-yc-mono text-yc-focus">{fmt(p.n)}</span>
          </button>
        ))}
      </div>

      {/* Histogram: one bar per batch; bars inside the selected range use the accent. */}
      <div className="flex h-[52px] w-full items-end justify-between gap-px" aria-hidden>
        {histogram.map((b) => {
          const inRange = !!rangeChip && b.rank >= lo && b.rank <= hi;
          const h = Math.max(2, Math.round((b.n / maxN) * 48));
          return <div key={b.rank} title={`${b.batch} · ${fmt(b.n)}`} className={`min-w-[3px] flex-1 rounded-[1px] ${inRange ? "bg-[var(--yc-accent-blue)]/70" : "bg-yc-line-strong"}`} style={{ height: h }} />;
        })}
      </div>

      {/* Dual-handle range slider. */}
      <div className="relative h-6 w-full">
        <div className="absolute inset-x-0 top-[10px] h-1 rounded-sm bg-yc-line" />
        <div
          className="absolute top-[10px] h-1 rounded-sm bg-[var(--yc-accent-blue)]"
          style={{
            left: `${((lo - batches.min) / Math.max(1, batches.max - batches.min)) * 100}%`,
            right: `${100 - ((hi - batches.min) / Math.max(1, batches.max - batches.min)) * 100}%`,
          }}
        />
        <input type="range" className="dual" min={batches.min} max={batches.max} value={lo} onChange={(e) => setLo(Math.min(Number(e.target.value), hi))} onMouseUp={() => commit(lo, hi)} onTouchEnd={() => commit(lo, hi)} onKeyUp={() => commit(lo, hi)} aria-label="Oldest batch" />
        <input type="range" className="dual" min={batches.min} max={batches.max} value={hi} onChange={(e) => setHi(Math.max(Number(e.target.value), lo))} onMouseUp={() => commit(lo, hi)} onTouchEnd={() => commit(lo, hi)} onKeyUp={() => commit(lo, hi)} aria-label="Newest batch" />
      </div>
      <div className="flex justify-between font-yc-mono text-[11px] text-yc-ink-3">
        <span>{byRank.get(lo)?.code ?? byRank.get(batches.min)?.code}</span>
        <span>
          {batches.peak ? `peak ${batches.peak.code} · ${fmt(batches.peak.n)}` : `${fmt(total)} companies`}
        </span>
        <span>{byRank.get(hi)?.code ?? byRank.get(batches.max)?.code}</span>
      </div>
    </div>
  );
}
