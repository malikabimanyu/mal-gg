"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createTimeline, utils, type Timeline } from "animejs";
import { Button } from "@/bretford/components/ui/button";
import { Icon } from "@/bretford/components/ui/icon";
import { BrandTile, FooterNav, NavList, NavRow, SearchBox, focusRing } from "@/bretford/components/library/nav-list";
import { credits, workspace } from "@/bretford/lib/library-data";
import { prefersReducedMotion } from "@/bretford/lib/motion";

/** Drawer width from the Rolexis mobile frame; capped so a gutter of the page stays visible on tiny screens. */
const PANEL_WIDTH = 315;

/**
 * Hamburger button of the mobile top bar; owns the navigation drawer it opens.
 * The button is an entrance target (`topbar-action`, see mobile-topbar.tsx); the drawer is not.
 */
export function MobileMenuButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" aria-label="Open menu" data-motion="topbar-action" onClick={() => setOpen(true)}>
        <Icon name="menu-01" size={14} />
      </Button>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type MobileMenuProps = {
  open: boolean;
  /** Called once the close animation has finished and the dialog is closed. */
  onClose: () => void;
};

/**
 * Right-side navigation drawer (mobile only). Same recipe as the invite
 * modal: a native <dialog> for the top layer, focus trap, inert page and
 * Escape; the blurred overlay lives inside the dialog so anime.js can fade it
 * while the panel slides in from the right.
 *
 * Nothing in here carries `data-motion` — the drawer sits inside the
 * PageMotion root, so the entrance CSS would hide it for good.
 */
function MobileMenu({ open, onClose }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openTl = useRef<Timeline | null>(null);
  const exitTl = useRef<Timeline | null>(null);
  const closing = useRef(false);
  const finished = useRef(false);
  const titleId = useId();

  /* -------------------------------------------------------------- */
  /* Open: show the native dialog, lock page scroll, slide in        */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const dialog = dialogRef.current;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!dialog || !overlay || !panel || !open) return;

    closing.current = false;
    finished.current = false;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    // The page behind is inert but would still scroll under the overlay.
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    // Widening past `md` brings the sidebar back; the drawer has no place there.
    const desktop = window.matchMedia("(min-width: 768px)");
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches && dialog.open) dialog.close();
    };
    desktop.addEventListener("change", onDesktop);

    if (prefersReducedMotion()) {
      utils.set(overlay, { opacity: 1 });
      utils.set(panel, { translateX: 0 });
    } else {
      // Start off-screen now: the tweens below only apply their `from` value when they begin.
      utils.set(overlay, { opacity: 0 });
      utils.set(panel, { translateX: PANEL_WIDTH });
      openTl.current = createTimeline()
        .add(overlay, { opacity: [0, 1], duration: 250, ease: "outQuad" }, 0)
        .add(panel, { translateX: [PANEL_WIDTH, 0], duration: 320, ease: "outExpo" }, 0);
    }

    return () => {
      openTl.current?.cancel();
      openTl.current = null;
      desktop.removeEventListener("change", onDesktop);
      html.style.overflow = previousOverflow;
    };
  }, [open]);

  /* -------------------------------------------------------------- */
  /* Close: slide out, then close the native dialog                  */
  /* -------------------------------------------------------------- */
  /** Final step of every close path (exit timeline, reduced motion, browser-driven close). Idempotent. */
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    exitTl.current = null;
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close(); // returns focus to the hamburger button
    onClose();
  };

  const requestClose = () => {
    const dialog = dialogRef.current;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!dialog || !overlay || !panel || closing.current) return;
    closing.current = true;
    openTl.current?.cancel();

    if (prefersReducedMotion()) {
      finish();
      return;
    }
    exitTl.current = createTimeline({ onComplete: finish })
      .add(panel, { translateX: PANEL_WIDTH, duration: 200, ease: "inQuad" }, 0)
      .add(overlay, { opacity: 0, duration: 200, ease: "inQuad" }, 40);
  };

  /**
   * The native dialog closed — either our own `finish()` (no-op then) or the browser did it
   * itself (a second Escape during the exit is a non-cancelable `cancel`, the `md` media query
   * above, extensions…). The page is already interactive again, so settle state right now.
   */
  const onNativeClose = () => {
    // A `close` event is queued as a task; ignore one that arrives after the dialog was reopened.
    if (dialogRef.current?.open) return;
    closing.current = true;
    openTl.current?.cancel();
    exitTl.current?.complete(); // jumps to the exit end state and fires `finish` via onComplete
    finish();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Escape fires `cancel`; run our exit animation instead of the instant close. A second `cancel`
      // in a row is non-cancelable (close-watcher spec), so let it through and settle in onClose.
      onCancel={(event) => {
        if (closing.current) return;
        event.preventDefault();
        requestClose();
      }}
      onClose={onNativeClose}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-loud backdrop:bg-transparent"
    >
      {/* Blurred, dimmed page behind the drawer — a click on it closes */}
      <div
        ref={overlayRef}
        onClick={requestClose}
        className="absolute inset-0 bg-[rgba(187,182,182,0.24)] opacity-0 backdrop-blur-[4px]"
      />

      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 flex w-[315px] max-w-[84vw] flex-col overflow-y-auto overscroll-contain bg-white"
      >
        {/* Header: brand + close */}
        <div className="flex w-full shrink-0 items-center justify-between gap-2 rule-b p-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 p-[3px]">
            <BrandTile />
            <span id={titleId} className="text-[16px] font-medium leading-none tracking-[-0.16px] whitespace-nowrap text-loud">
              {workspace.name}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            aria-label="Close menu"
            // 36px hit area (header = 16 + 36 + 16 like the frame); pulled 8px right so the icon ends on the 16px inset
            className={`-mr-2 flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors hover:bg-subtle ${focusRing}`}
          >
            <Icon name="flex-align-left" size={20} />
          </button>
        </div>

        {/* Body: search + account rows + menus on top, workspace links at the bottom */}
        <div className="flex w-full flex-1 flex-col justify-between gap-4 px-4 pt-3 pb-3">
          <div className="flex w-full flex-col gap-4">
            <SearchBox dense />

            <div className="flex w-full flex-col gap-2">
              <nav aria-label="Account" className="flex w-full flex-col">
                <NavRow dense inset icon="bell-01" label="Notifications" />
                <NavRow dense inset icon="coins-stacked-02" label="Credits" trailing={<span>{credits}</span>} />
                <NavRow dense inset icon="help-circle" label="Helps" />
              </nav>

              <NavList dense />
            </div>
          </div>

          <FooterNav dense />
        </div>
      </div>
    </dialog>
  );
}
