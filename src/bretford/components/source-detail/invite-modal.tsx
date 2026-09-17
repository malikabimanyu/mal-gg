"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { animate, createTimeline, stagger, utils, type Timeline } from "animejs";
import { Button } from "@/bretford/components/ui/button";
import { Field } from "@/bretford/components/ui/field";
import { Icon } from "@/bretford/components/ui/icon";
import { Select } from "@/bretford/components/ui/select";
import { cn } from "@/bretford/lib/cn";
import { memberRoles, type MemberRole } from "@/bretford/lib/library-data";
import { prefersReducedMotion } from "@/bretford/lib/motion";

type InviteRow = { id: number; email: string; role: MemberRole | "" };

type InviteModalProps = {
  open: boolean;
  /** Called once the close animation has finished and the dialog is closed. */
  onClose: () => void;
  /** Called (after the dialog has closed) with the invited emails when the form was submitted. */
  onSent?: (emails: string[]) => void;
};

const emptyRow = (id: number): InviteRow => ({ id, email: "", role: "" });

/**
 * Drop the inline opacity/transform anime.js leaves behind. A leftover
 * `transform: translateY(0)` makes each row its own stacking context, which
 * would paint the role dropdown underneath the rows and buttons after it.
 */
const clearMotionStyles = (elements: Iterable<Element>) => {
  for (const el of elements) {
    if (el instanceof HTMLElement) {
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
    }
  }
};

/**
 * "Adding Member" dialog (Figma 866:7958), opened from the Invite button.
 *
 * Built on the native <dialog> so the browser provides the top layer, focus
 * trap, inert page and Escape handling; the blurred overlay lives inside the
 * dialog so anime.js can fade it, while `::backdrop` stays transparent.
 */
export function InviteModal({ open, onClose, onSent }: InviteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openTl = useRef<Timeline | null>(null);
  const exitTl = useRef<Timeline | null>(null);
  const closing = useRef(false);
  const finished = useRef(false);
  /** True when the pointer went down on the overlay while a role menu was open: that click only dismisses the menu. */
  const swallowClick = useRef(false);
  /** Emails captured on submit; delivered to `onSent` once the dialog has closed. */
  const sent = useRef<string[] | null>(null);
  const titleId = useId();
  const descId = useId();

  const [name, setName] = useState("");
  const [rows, setRows] = useState<InviteRow[]>([emptyRow(0)]);
  const nextId = useRef(1);
  const rowCount = useRef(rows.length);

  /* -------------------------------------------------------------- */
  /* Open: show the native dialog, reset the form, play the entrance */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const dialog = dialogRef.current;
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!dialog || !overlay || !panel || !open) return;

    closing.current = false;
    finished.current = false;
    if (!dialog.open) dialog.showModal();
    panel.querySelector<HTMLInputElement>("input[name=name]")?.focus();

    const items = panel.querySelectorAll("[data-modal-item]");
    if (prefersReducedMotion()) {
      utils.set([overlay, panel, ...items], { opacity: 1 });
      utils.set(panel, { scale: 1, translateY: 0 });
      return;
    }

    // Items start hidden now; `[0, 1]` alone would only zero them when their tween begins (120ms in).
    utils.set(items, { opacity: 0 });
    openTl.current = createTimeline({ onComplete: () => clearMotionStyles(items) })
      .add(overlay, { opacity: [0, 1], duration: 250, ease: "outQuad" }, 0)
      .add(panel, { opacity: [0, 1], scale: [0.96, 1], translateY: [8, 0], duration: 350, ease: "outExpo" }, 40)
      .add(items, { opacity: [0, 1], translateY: [6, 0], duration: 300, ease: "outQuad", delay: stagger(30) }, 120);

    return () => {
      openTl.current?.cancel();
      openTl.current = null;
    };
  }, [open]);

  /* Rows added via "Invite more": move focus into the new row (so screen readers announce it and the
     keyboard user lands in the field they asked for), then slide it in. */
  useEffect(() => {
    const panel = panelRef.current;
    const added = rows.length > rowCount.current;
    rowCount.current = rows.length;
    if (!added || !panel) return;

    const rowEls = panel.querySelectorAll<HTMLElement>("[data-invite-row]");
    const last = rowEls[rowEls.length - 1];
    if (!last) return;
    last.querySelector<HTMLInputElement>("input[type=email]")?.focus();
    if (prefersReducedMotion()) return;
    animate(last, {
      opacity: [0, 1],
      translateY: [-6, 0],
      duration: 300,
      ease: "outExpo",
      onComplete: () => clearMotionStyles([last]),
    });
  }, [rows.length]);

  /* -------------------------------------------------------------- */
  /* Close: play the exit, then close the native dialog             */
  /* -------------------------------------------------------------- */
  /** Final step of every close path (exit timeline, reduced motion, browser-driven close). Idempotent. */
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    exitTl.current = null;
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onClose();
    // Reset here (not on open) so the fresh row is already in the DOM when the entrance queries it.
    setRows([emptyRow(nextId.current++)]);
    setName("");
    if (sent.current) {
      const emails = sent.current;
      sent.current = null;
      onSent?.(emails);
    }
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
      .add(panel, { opacity: 0, scale: 0.98, translateY: 4, duration: 180, ease: "inQuad" }, 0)
      .add(overlay, { opacity: 0, duration: 200, ease: "inQuad" }, 40);
  };

  /**
   * The native dialog closed. Either our own `finish()` (then this is a no-op) or the browser did it
   * itself — a second Escape during the exit fires a non-cancelable `cancel`, `requestClose()`,
   * extensions… — in which case the page is already interactive again, so settle state right now
   * instead of ~200ms later when the exit timeline would have finished.
   */
  const onNativeClose = () => {
    // A `close` event is queued as a task; ignore one that arrives after the dialog was reopened.
    if (dialogRef.current?.open) return;
    closing.current = true;
    openTl.current?.cancel();
    exitTl.current?.complete(); // jumps to the exit end state and fires `finish` via onComplete
    finish();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Mock: a real app would POST `{ name, rows }` here.
    sent.current = rows.map((row) => row.email.trim()).filter(Boolean);
    requestClose();
  };

  const updateRow = (id: number, patch: Partial<InviteRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      // Escape fires `cancel`; run our exit animation instead of the instant close. A second `cancel`
      // in a row is non-cancelable (close-watcher spec), so let it through and settle in onClose.
      onCancel={(event) => {
        if (closing.current) return;
        event.preventDefault();
        requestClose();
      }}
      onClose={onNativeClose}
      // Mobile: the dialog itself scrolls when the panel outgrows the viewport (short phones, landscape,
      // keyboard up, many "Invite more" rows); the overlay goes fixed so it keeps covering the viewport.
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-loud backdrop:bg-transparent max-md:overflow-y-auto"
    >
      {/* Blurred, dimmed page behind the panel — a click on it closes, unless it was only dismissing an
          open role menu (like a native <select>, the dismissing click must not also discard the form) */}
      <div
        ref={overlayRef}
        onPointerDown={() => {
          swallowClick.current = !!panelRef.current?.querySelector('[role=combobox][aria-expanded="true"]');
        }}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          requestClose();
        }}
        className="absolute inset-0 bg-[rgba(187,182,182,0.24)] opacity-0 backdrop-blur-[4px] max-md:fixed"
      />

      {/* Mobile: min-h-full + my-auto keeps a short panel centred while a tall one scrolls within 20px margins */}
      <div className="pointer-events-none relative flex h-full w-full items-center justify-center max-md:h-auto max-md:min-h-full max-md:items-start max-md:py-5">
        {/* Mobile frame (Rolexis): 335px panel on a 375 screen = 20px side margins, no gap between header and body */}
        <div
          ref={panelRef}
          className="pointer-events-auto flex w-[540px] flex-col gap-[10px] rounded-[20px] bg-white opacity-0 shadow-[0px_2px_40px_0px_rgba(0,0,0,0.08)] max-md:my-auto max-md:w-[calc(100vw-40px)] max-md:gap-0"
        >
          {/* Header — mobile: p-4, 16px title / 14px subtitle (both wrap at 1.4), 24px close with a 16px icon */}
          <div className="flex w-full items-center justify-between p-5 shadow-[inset_0_-1px_0_0_var(--color-line)] max-md:items-start max-md:gap-3 max-md:p-4">
            <div className="flex flex-col gap-[6px] max-md:min-w-0 max-md:flex-1 max-md:gap-1">
              <h2 id={titleId} className="text-[18px] leading-none font-semibold text-loud max-md:text-[16px] max-md:leading-[1.4]">
                Adding Member
              </h2>
              <p id={descId} className="text-[16px] leading-none font-normal text-normal max-md:text-[14px] max-md:leading-[1.4]">
                Invite people to join and contribute to this network.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-[8px] outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40 max-md:size-6"
            >
              <Icon name="x-close" size={24} className="max-md:hidden" />
              <Icon name="x-close" size={16} className="md:hidden" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-6 p-5 max-md:p-4">
            {/* Inviter name */}
            <Field data-modal-item className="has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40">
              <input
                type="text"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                aria-label="Name"
                autoComplete="name"
                required
                className="min-w-0 flex-1 bg-transparent text-loud outline-none placeholder:text-[#d1d1d1]"
              />
            </Field>

            {/* Invitees */}
            <div className="flex w-full flex-col gap-2">
              <span data-modal-item className="text-[14px] leading-5 font-medium text-normal">
                Email
              </span>

              {rows.map((row, index) => (
                <div key={row.id} data-invite-row data-modal-item className="flex w-full items-start gap-2">
                  <Field className="min-w-0 flex-1 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(event) => updateRow(row.id, { email: event.target.value })}
                      placeholder="e.g viviantian@gmail.com"
                      aria-label={index === 0 ? "Email" : `Email ${index + 1}`}
                      required
                      className="min-w-0 flex-1 bg-transparent text-loud outline-none placeholder:text-[#d1d1d1]"
                    />
                  </Field>

                  <Select
                    value={row.role}
                    options={memberRoles}
                    onChange={(role) => updateRow(row.id, { role })}
                    placeholder="Choose role"
                    label={index === 0 ? "Role" : `Role ${index + 1}`}
                  />
                </div>
              ))}

              <button
                type="button"
                data-modal-item
                onClick={() => {
                  // id taken outside the updater: StrictMode runs updaters twice
                  const row = emptyRow(nextId.current++);
                  setRows((current) => [...current, row]);
                }}
                className="flex w-full items-center gap-[6px] rounded-[8px] px-[10px] py-[9px] text-left text-[14px] leading-none font-medium tracking-[-0.14px] text-normal outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon name="plus-stroke" size={14} />
                Invite more
              </button>
            </div>

            {/* Footer — mobile stacks the buttons full-width with Send Invite on top (visual order only; the
                DOM keeps Cancel → Send so Tab still reaches the primary action last) */}
            <div data-modal-item className="grid w-full grid-cols-2 gap-3 max-md:flex max-md:flex-col">
              <button
                type="button"
                onClick={requestClose}
                className={cn(
                  "flex h-11 items-center justify-center rounded-[14px] bg-white py-3 pr-[10px] pl-3",
                  "text-[14px] leading-5 font-medium text-loud outline-none",
                  "shadow-[0px_0px_0px_1px_#d1d1d1,0px_1px_2px_-1px_rgba(3,7,18,0.08),0px_4px_4px_0px_rgba(3,7,18,0.04)]",
                  "transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
              >
                Cancel
              </button>
              <Button type="submit" variant="primary" size="lg" className="focus-visible:ring-offset-2 max-md:order-first">
                Send Invite
              </Button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
