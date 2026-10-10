"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CHARACTERS, type CharacterDef } from "../../lib/characters";
import type { GameApi, GameSnapshot } from "../../lib/store";
import { BrButton, CoinIcon, fmt, Pill, textAccent } from "./button";
import { Confetti } from "./confetti";
import { IconBack, IconCheck, IconChevron, IconLock, IconStar } from "./icons";

const N = CHARACTERS.length;
/** Horizontal travel that turns a drag on the stage into ◀ / ▶. */
const SWIPE_PX = 40;
const CELEBRATE_MS = 2400;

/** Short chip label: the first word is already unique and recognisable ("Tralalero"). */
const shortName = (c: CharacterDef) => c.name.split(" ")[0];

type Status = "selected" | "owned" | "locked";

/**
 * Character shop over the live 3D stage (the engine previews whichever id is in `previewId`).
 * ◀ ▶ / ← → / A D / swipe on the stage browse, Enter buys or selects, Esc goes back. The shop
 * sells characters only; buying auto-selects (engine) and fires the celebration.
 */
export function ShopScreen({ s, api }: { s: GameSnapshot; api: GameApi }) {
  const index = Math.max(0, CHARACTERS.findIndex((c) => c.id === s.previewId));
  const c = CHARACTERS[index];
  const status: Status = s.selected === c.id ? "selected" : s.owned.includes(c.id) ? "owned" : "locked";
  const short = Math.max(0, c.price - s.coins);

  const [celebrate, setCelebrate] = useState<{ id: string; n: number; price: number } | null>(null);
  const [shakeN, setShakeN] = useState(0);

  const go = useCallback((d: number) => api.previewCharacter(CHARACTERS[(index + d + N) % N].id), [api, index]);

  const primary = useCallback(() => {
    if (status === "owned") api.selectCharacter(c.id);
    else if (status === "locked") {
      if (api.buyCharacter(c.id)) setCelebrate((p) => ({ id: c.id, n: (p?.n ?? 0) + 1, price: c.price }));
      else setShakeN((n) => n + 1); // the engine already played the error buzz
    }
  }, [api, c, status]);

  useEffect(() => {
    if (!celebrate) return;
    const t = window.setTimeout(() => setCelebrate(null), CELEBRATE_MS);
    return () => window.clearTimeout(t);
  }, [celebrate]);

  // Keyboard: ← → / A D browse, Enter = primary, Esc = back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Browser shortcuts aren't shop input; a held arrow shouldn't machine-gun previews.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const onControl = e.target instanceof Element && e.target.closest("button,a[href]");
      if (e.code === "ArrowLeft" || e.code === "KeyA") go(-1);
      else if (e.code === "ArrowRight" || e.code === "KeyD") go(1);
      else if (e.code === "Escape") api.closeShop();
      // Enter on a focused chip/button belongs to that control.
      else if ((e.code === "Enter" || e.code === "NumpadEnter") && !onControl) primary();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, go, primary]);

  // Swipe on the stage (not on the chip row, which scrolls, nor on buttons).
  useEffect(() => {
    let id: number | null = null;
    let x0 = 0;
    let y0 = 0;
    const down = (e: PointerEvent) => {
      if (id !== null) return;
      if (e.target instanceof Element && e.target.closest("[data-br-noswipe],button,a")) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - y0)) return;
      id = null; // one swipe = one step
      go(dx < 0 ? 1 : -1);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === id) id = null;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [go]);

  const justBought = celebrate?.id === c.id;

  return (
    <div className="br-safe pointer-events-none absolute inset-0 flex flex-col">
      {justBought && <Confetti key={celebrate.n} accent={c.accent} originY={0.5} />}

      {/* Top bar */}
      <div className="relative flex shrink-0 items-start justify-between gap-3">
        <BrButton tone="glass" onClick={() => api.closeShop()} label="Back to menu">
          <IconBack className="size-5" />
          BACK
        </BrButton>
        <div className="relative">
          <Pill icon={<CoinIcon className="size-11" />} className="min-w-28 justify-end">
            <span className="br-stroke-thin tabular-nums">{fmt(s.coins)}</span>
          </Pill>
          {celebrate && (
            <span key={celebrate.n} className="br-float-up br-stroke-thin absolute top-full right-3 mt-1 font-br-display text-2xl text-br-hot">
              −{fmt(celebrate.price)}
            </span>
          )}
        </div>
      </div>

      {/* Name block */}
      <div className="mt-3 flex shrink-0 flex-col items-center gap-2 text-center br-short:mt-0 br-short:gap-1">
        <div className="flex items-center gap-2 font-br-display text-sm leading-none">
          <span className="br-stroke-thin rounded-full border-2 border-br-ink bg-br-panel px-2.5 py-1 tabular-nums text-br-mute">
            {index + 1} / {N}
          </span>
          <StatusBadge key={`${c.id}-${status}`} status={status} />
        </div>
        <h2
          key={c.id}
          className="br-stroke br-pop-in max-w-[22ch] font-br-display text-[clamp(2rem,9vw,3.75rem)] leading-[0.95] text-balance br-short:text-[clamp(1.6rem,6vh,2.25rem)]"
          style={{ color: textAccent(c.accent) }}
          aria-live="polite"
        >
          {c.name}
        </h2>
        <p key={`t-${c.id}`} className="br-rise-in max-w-xs rounded-2xl text-balance border-2 border-br-ink bg-br-panel px-3 py-1.5 font-br-display text-[1rem] leading-tight text-br-paper br-short:hidden">
          {c.tagline}
        </p>
      </div>

      {/* Stage: arrows flank the character; spinner while its model loads. */}
      <div className="relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 items-center justify-between">
        <ArrowButton dir="left" onClick={() => go(-1)} />
        {s.previewLoading && (
          <div className="br-fade-in absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading character">
            <span className="br-spin block size-16 rounded-full border-[6px] border-br-ink/40 border-t-br-sun border-r-br-sun shadow-[0_0_0_3px_var(--br-ink)]" />
          </div>
        )}
        {justBought && (
          <div className="absolute inset-x-0 top-0 flex justify-center">
            <div key={celebrate.n} className="br-stamp br-stroke font-br-display text-[clamp(2.5rem,11vw,4.5rem)] leading-none text-br-sun">
              UNLOCKED!
            </div>
          </div>
        )}
        <ArrowButton dir="right" onClick={() => go(1)} />
      </div>

      {/* Action + chips */}
      <div className="flex shrink-0 flex-col items-center gap-3 br-short:gap-2">
        <div className="flex min-h-16 items-center br-short:min-h-13">
          {status === "selected" ? (
            <BrButton tone="glass" size="lg" disabled className="disabled:saturate-100">
              <IconCheck className="size-7 text-br-go" />
              SELECTED
            </BrButton>
          ) : status === "owned" ? (
            <BrButton size="lg" className="br-shine" onClick={primary}>
              SELECT
            </BrButton>
          ) : (
            <BrButton
              key={`buy-${shakeN}`}
              tone={short > 0 ? "glass" : "coin"}
              size="lg"
              softDisabled={short > 0}
              label={short > 0 ? `Locked: costs ${fmt(c.price)} coins, you need ${fmt(short)} more` : `Buy ${c.name} for ${fmt(c.price)} coins`}
              className={`${shakeN > 0 ? "br-shake" : ""} ${short > 0 ? "" : "br-shine"}`}
              onClick={primary}
            >
              {short > 0 ? <IconLock className="size-6 text-br-mute" /> : <span>BUY</span>}
              <CoinIcon className="size-8 br-short:size-7" />
              <span className="tabular-nums">{fmt(c.price)}</span>
            </BrButton>
          )}
        </div>
        {status === "locked" && short > 0 && (
          <p className="br-stroke-thin -mt-1 rounded-full bg-br-danger/90 px-3 py-0.5 font-br-display text-[1rem] leading-tight text-br-paper br-short:hidden">
            Need {fmt(short)} more coins
          </p>
        )}
        <ChipRow index={index} s={s} onPick={(id) => api.previewCharacter(id)} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "selected")
    return (
      <span className="br-pop-in br-stroke-thin inline-flex items-center gap-1 rounded-full border-2 border-br-ink bg-br-sun px-2.5 py-1">
        <IconStar className="size-3.5" /> SELECTED
      </span>
    );
  if (status === "owned")
    return (
      <span className="br-pop-in br-stroke-thin inline-flex items-center gap-1 rounded-full border-2 border-br-ink bg-br-go px-2.5 py-1">
        <IconCheck className="size-3.5" /> OWNED
      </span>
    );
  return (
    <span className="br-pop-in br-stroke-thin inline-flex items-center gap-1 rounded-full border-2 border-br-ink bg-br-ink-soft px-2.5 py-1 text-br-mute">
      <IconLock className="size-3.5" /> LOCKED
    </span>
  );
}

function ArrowButton({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <BrButton tone="sky" size="icon" label={dir === "left" ? "Previous character" : "Next character"} onClick={onClick} className="size-14 rounded-full br-short:size-12">
      <IconChevron dir={dir} className={`size-7 ${dir === "left" ? "-translate-x-0.5" : "translate-x-0.5"}`} />
    </BrButton>
  );
}

/** Scrollable name chips (44 px tall): every character reachable on a 375 px screen, all visible on desktop. */
function ChipRow({ index, s, onPick }: { index: number; s: GameSnapshot; onPick: (id: string) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the active chip centred in the row (manual scroll: scrollIntoView could also move
  // the fixed game root).
  useLayoutEffect(() => {
    const row = rowRef.current;
    const chip = chipRefs.current[index];
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  }, [index]);

  return (
    <div
      ref={rowRef}
      data-br-noswipe
      role="tablist"
      aria-label="Characters"
      className="br-scroll-x pointer-events-auto -mx-3 flex w-[calc(100%+24px)] max-w-6xl gap-2 overflow-x-auto px-3 pt-1 pb-2 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)]"
    >
      {CHARACTERS.map((ch, i) => {
        const active = i === index;
        const owned = s.owned.includes(ch.id);
        const selected = s.selected === ch.id;
        return (
          <button
            key={ch.id}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${ch.name}${selected ? ", selected" : owned ? ", owned" : `, ${fmt(ch.price)} coins`}`}
            onClick={(e) => {
              if (e.detail > 0) e.currentTarget.blur();
              onPick(ch.id);
            }}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border-[3px] border-br-ink pr-3 pl-1.5 font-br-display text-[1rem] leading-none transition-transform duration-100 ${
              active ? "-translate-y-0.5 bg-br-paper text-br-ink shadow-[0_4px_0_var(--br-ink)]" : "bg-br-panel text-br-paper shadow-[0_2px_0_var(--br-ink)]"
            }`}
          >
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-br-ink" style={{ background: ch.accent }}>
              {selected ? (
                <IconStar className="size-3.5 text-br-paper" />
              ) : owned ? (
                <IconCheck className="size-3.5 text-br-paper" />
              ) : (
                <IconLock className="size-3.5 text-br-paper" />
              )}
            </span>
            {shortName(ch)}
          </button>
        );
      })}
    </div>
  );
}
