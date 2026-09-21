"use client";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { animate, createScope, createTimeline, stagger, utils, type Scope } from "animejs";
import { Icon } from "./Icon";
import { toHref, type Query } from "@/yc/lib/query";

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

const reducedMotion = (): boolean => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Client shell for the founder side panel: overlay, close, ‹ › stepper, keyboard, focus,
 * and the open / close / switch transitions (anime.js v4).
 *
 *  open   — scrim fades in, panel slides in from the right, sections cascade up
 *  switch — (stepper / co-founder link) the new founder's sections cascade in again
 *  close  — panel slides back out, scrim fades, THEN the URL drops `peek`
 */
export function PanelChrome({
  query,
  prev,
  next,
  name,
  contentKey,
  children,
}: {
  query: Query;
  prev: number | null;
  next: number | null;
  name: string;
  /** changes when a different founder is shown inside the already-open panel */
  contentKey: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scope = useRef<Scope | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  const firstKey = useRef(contentKey);

  const navigate = useCallback((href: string) => router.push(href, { scroll: false }), [router]);

  // Open: scrim + panel + first cascade. Reverting the scope on unmount cancels everything.
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    panel.current?.focus();

    scope.current = createScope({ root: root.current ?? undefined }).add((self) => {
      if (!self) return;
      if (reducedMotion()) {
        utils.set(".peek-scrim, .peek-panel, .peek-section", { opacity: 1, translateX: 0, translateY: 0 });
      } else {
        animate(".peek-scrim", { opacity: [0, 1], duration: 260, ease: "outQuad" });
        // Slide from just off the right edge; outExpo gives the "settles into place" feel.
        animate(".peek-panel", { translateX: [56, 0], opacity: [0, 1], duration: 560, ease: "outExpo" });
        animate(".peek-section", { translateY: [14, 0], opacity: [0, 1], duration: 480, ease: "outExpo", delay: stagger(45, { start: 140 }) });
      }

      // Exit — faster and eased-in so the dismissal reads as decisive.
      self.add("exit", () =>
        createTimeline()
          .add(".peek-panel", { translateX: [0, 40], opacity: [1, 0], duration: 220, ease: "inQuad" })
          .add(".peek-scrim", { opacity: 0, duration: 200, ease: "inQuad" }, "<<"),
      );
      // Switch — re-run the cascade for a new founder's sections.
      self.add("cascade", () => {
        animate(".peek-section", { translateY: [10, 0], opacity: [0, 1], duration: 380, ease: "outExpo", delay: stagger(35) });
      });
    });

    return () => {
      scope.current?.revert();
      opener.current?.focus?.();
    };
  }, []);

  // Switch founder inside the open panel: cascade the new content and scroll to the top.
  // Layout effect so the "from" state is applied before the browser paints the new nodes.
  useLayoutEffect(() => {
    if (contentKey === firstKey.current) return;
    panel.current?.scrollTo({ top: 0 });
    if (!reducedMotion()) scope.current?.methods.cascade?.();
  }, [contentKey]);

  const close = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    const href = toHref({ ...query, peek: null });
    if (reducedMotion() || !scope.current?.methods.exit) return navigate(href);
    try {
      // The timeline is thenable and resolves on complete. Race it against a hard cap so a
      // throttled rAF (background tab, hidden pane) can never leave the panel stuck open.
      await Promise.race([scope.current.methods.exit(), new Promise((r) => setTimeout(r, 400))]);
    } finally {
      navigate(href);
    }
  }, [query, navigate]);

  const go = useCallback((id: number | null) => id && navigate(toHref({ ...query, peek: id })), [query, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Tab focus trap: cycle within the dialog so the page behind the scrim is never reached.
      if (e.key === "Tab" && panel.current) {
        const focusables = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
        if (focusables.length) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement as HTMLElement | null;
          if (e.shiftKey && (active === first || active === panel.current)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return void close();
      if (isTyping(e.target)) return;
      if (e.key === "ArrowDown" || e.key === "j") go(next);
      else if (e.key === "ArrowUp" || e.key === "k") go(prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, close, go]);

  return (
    <div ref={root} className="fixed inset-0 z-[60]">
      {/* Start invisible; anime.js drives opacity/transform from here (reduced-motion snaps to the end state). */}
      <button aria-label="Close panel" onClick={close} className="peek-scrim absolute inset-0 bg-black/20 backdrop-blur-[1px]" style={{ opacity: 0 }} tabIndex={-1} />
      <div className="peek-panel absolute right-6 top-6 bottom-6 flex w-[min(720px,calc(100vw-48px))] flex-col will-change-transform max-md:inset-x-2 max-md:bottom-2 max-md:top-2 max-md:w-auto" style={{ opacity: 0 }}>
        <div className="pointer-events-none flex justify-end pb-1.5">
          <button onClick={close} aria-label="Close" className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white shadow-yc-popover hover:bg-yc-hover">
            <Icon name="x-close" size={20} />
          </button>
        </div>
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} — founder details`}
          tabIndex={-1}
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto yc-thin-scroll rounded-[20px] border border-yc-line bg-yc-surface shadow-[0_24px_56px_-12px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.07)] outline-none"
        >
          <div className="absolute right-6 top-[26px] z-10 flex items-center gap-1">
            <button onClick={() => go(prev)} disabled={!prev} aria-label="Previous founder" className="flex size-7 items-center justify-center rounded-lg bg-white shadow-yc-card hover:bg-yc-hover disabled:opacity-40">
              <Icon name="chevron-up" size={16} />
            </button>
            <button onClick={() => go(next)} disabled={!next} aria-label="Next founder" className="flex size-7 items-center justify-center rounded-lg bg-white shadow-yc-card hover:bg-yc-hover disabled:opacity-40">
              <Icon name="chevron-down" size={16} />
            </button>
          </div>
          {/* Keyed so a founder switch remounts the content and the cascade targets fresh nodes. */}
          <div key={contentKey} className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
