"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { animate, createScope, createTimeline, spring, stagger, utils } from "animejs";
import { prefersReducedMotion } from "@/bretford/lib/motion";

/**
 * One tween of the entrance timeline. `target` is a CSS selector scoped to the
 * page root (usually a `[data-motion=…]` attribute); `at` is the absolute start
 * time in ms so groups can overlap.
 */
export type EntranceStep = {
  target: string;
  at: number;
  /** Start offset on the x axis (px); animates to 0. */
  x?: number;
  /** Start offset on the y axis (px); animates to 0. Skip both for opacity-only (e.g. <tr>). */
  y?: number;
  /** Delay between matched elements (ms). */
  stagger?: number;
  duration?: number;
};

type PageMotionProps = {
  className?: string;
  /** Entrance choreography; every `[data-motion]` element should be covered by a step. */
  steps: EntranceStep[];
  children: ReactNode;
};

/** Elements whose hover lifts them by 2px (opt in elsewhere with `data-lift`). */
const LIFT_SELECTOR = "[data-motion=stat-card], [data-motion=source-card], [data-lift]";
/** Rows whose chevron-right nudges 3px on hover (opt in with `data-nudge`). */
const NUDGE_SELECTOR = "[data-nudge]";
const CHEVRON_SELECTOR = 'img[src*="chevron-right"]';
const BELL_SELECTOR = 'button[aria-label="Notifications"]';

/**
 * Page root that owns the anime.js scope: the staggered entrance timeline,
 * `[data-count]` count-ups and the delegated micro-interactions.
 * `[data-motion]` elements start at opacity 0 (globals.css, only once the root
 * carries the `js` class) and are revealed by the timeline — or forced visible
 * under reduced motion. The class is added by an inline script on the server
 * render (before first paint) and by a layout effect on client navigations,
 * so content never hides when JavaScript is unavailable.
 */
export function PageMotion({ className, steps, children }: PageMotionProps) {
  const root = useRef<HTMLDivElement>(null);
  // Steps are static per page; keep the mount-time value so edits don't restart the effect.
  const stepsRef = useRef(steps);

  useLayoutEffect(() => {
    root.current?.classList.add("js");
  }, []);

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const scope = createScope({ root: rootEl }).add(() => {
      if (prefersReducedMotion()) {
        // Jump straight to the resting state; no entrance, no micro-interactions.
        utils.set("[data-motion]", { opacity: 1 });
        return;
      }

      const revealAll = () => utils.set(rootEl.querySelectorAll("[data-motion]"), { opacity: 1 });
      const tl = buildEntrance(rootEl, stepsRef.current);
      // Safety net: nothing may stay hidden if a selector matched nothing or a tween was replaced.
      tl.then(revealAll);

      return bindMicroInteractions(rootEl);
    });

    return () => scope.revert();
  }, []);

  return (
    // suppressHydrationWarning: the inline script adds `js` before React hydrates.
    <div ref={root} data-page-motion suppressHydrationWarning className={className}>
      <script
        dangerouslySetInnerHTML={{ __html: "document.currentScript.parentElement.classList.add('js')" }}
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entrance                                                            */
/* ------------------------------------------------------------------ */

const FADE_IN: [number, number] = [0, 1];

function buildEntrance(rootEl: HTMLElement, steps: EntranceStep[]) {
  const tl = createTimeline({ defaults: { ease: "outExpo", duration: 600 } });

  for (const step of steps) {
    tl.add(
      step.target,
      {
        opacity: FADE_IN,
        ...(step.x !== undefined && { translateX: [step.x, 0] }),
        ...(step.y !== undefined && { translateY: [step.y, 0] }),
        ...(step.stagger !== undefined && { delay: stagger(step.stagger) }),
        ...(step.duration !== undefined && { duration: step.duration }),
      },
      step.at,
    );
  }

  // Numbers marked with data-count tick up from 0 while their card enters.
  const countAt = steps.find((s) => s.target.includes("stat-card"))?.at ?? 0;
  for (const el of rootEl.querySelectorAll<HTMLElement>("[data-count]")) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) continue;

    const counter = { v: 0 };
    tl.add(
      counter,
      {
        v: target,
        duration: 900,
        ease: "outExpo",
        modifier: utils.round(0),
        onRender: () => {
          el.textContent = String(counter.v);
        },
      },
      countAt,
    );
  }

  return tl;
}

/* ------------------------------------------------------------------ */
/* Micro-interactions                                                  */
/* ------------------------------------------------------------------ */

/**
 * All hover/press feedback is delegated from the root. `mouseenter` and
 * `mouseleave` don't bubble, so they're observed in the capture phase, which
 * still sees every element entered. Returns the listener cleanup.
 */
function bindMicroInteractions(rootEl: HTMLElement) {
  const pressed = new Set<HTMLButtonElement>();
  const releaseEase = spring({ stiffness: 300, damping: 14 });

  for (const bellIcon of rootEl.querySelectorAll(`${BELL_SELECTOR} img`)) {
    utils.set(bellIcon, { transformOrigin: "top center" });
  }

  const onEnter = (event: Event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;

    if (el.matches(LIFT_SELECTOR)) {
      animate(el, { translateY: -2, duration: 250, ease: "outExpo" });
    } else if (el.matches(NUDGE_SELECTOR)) {
      const chevron = el.querySelector(CHEVRON_SELECTOR);
      if (chevron) animate(chevron, { translateX: 3, duration: 250, ease: "outExpo" });
    } else if (el.matches(BELL_SELECTOR)) {
      const icon = el.querySelector("img");
      if (icon) {
        animate(icon, {
          rotate: [
            { to: -14, duration: 90 },
            { to: 12, duration: 90 },
            { to: -7, duration: 80 },
            { to: 0, duration: 120 },
          ],
          ease: "outQuad",
        });
      }
    }
  };

  const onLeave = (event: Event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;

    if (el.matches(LIFT_SELECTOR)) {
      animate(el, { translateY: 0, duration: 200, ease: "outQuad" });
    } else if (el.matches(NUDGE_SELECTOR)) {
      const chevron = el.querySelector(CHEVRON_SELECTOR);
      if (chevron) animate(chevron, { translateX: 0, duration: 200, ease: "outQuad" });
    }
  };

  const release = (btn: HTMLButtonElement) => {
    if (!pressed.delete(btn)) return;
    animate(btn, { scale: 1, ease: releaseEase });
  };

  // Primary button only: a right-click opens the context menu on mousedown and
  // can swallow the matching pointerup. Tabs are excluded — the sliding pill is
  // their feedback, and a scaled tab would be measured while shrunken
  // (getBoundingClientRect includes transforms) when the click lands.
  const onPointerDown = (event: Event) => {
    if ((event as PointerEvent).button !== 0) return;
    const btn = (event.target as Element | null)?.closest("button");
    if (!btn || btn.getAttribute("role") === "tab" || pressed.has(btn)) return;
    pressed.add(btn);
    animate(btn, { scale: 0.96, duration: 90, ease: "outQuad" });
  };

  // Any pointer up/cancel (or a context menu opening) releases whatever is
  // held — the pointer may have travelled off the button.
  const onPointerUp = () => {
    for (const btn of pressed) release(btn);
  };

  const onPointerLeave = (event: Event) => {
    const el = event.target;
    if (el instanceof HTMLButtonElement) release(el);
  };

  rootEl.addEventListener("mouseenter", onEnter, true);
  rootEl.addEventListener("mouseleave", onLeave, true);
  rootEl.addEventListener("pointerdown", onPointerDown);
  rootEl.addEventListener("pointerup", onPointerUp);
  rootEl.addEventListener("pointercancel", onPointerUp);
  rootEl.addEventListener("contextmenu", onPointerUp);
  rootEl.addEventListener("pointerleave", onPointerLeave, true);

  return () => {
    rootEl.removeEventListener("mouseenter", onEnter, true);
    rootEl.removeEventListener("mouseleave", onLeave, true);
    rootEl.removeEventListener("pointerdown", onPointerDown);
    rootEl.removeEventListener("pointerup", onPointerUp);
    rootEl.removeEventListener("pointercancel", onPointerUp);
    rootEl.removeEventListener("contextmenu", onPointerUp);
    rootEl.removeEventListener("pointerleave", onPointerLeave, true);
    pressed.clear();
  };
}
