"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { animate } from "animejs";
import { Icon } from "@/bretford/components/ui/icon";
import { prefersReducedMotion } from "@/bretford/lib/motion";

type ToastProps = {
  message: string;
  /** Called after the exit animation; the parent unmounts the toast. */
  onDismiss: () => void;
  /** Auto-dismiss delay in ms; the timer pauses while hovered. */
  duration?: number;
};

/**
 * Bottom-right confirmation toast (Figma 866:7953): soft-blue pill with a
 * primary border and a dismiss cross. Portals to <body> so `position: fixed`
 * isn't captured by an animated (transformed) ancestor. Render it only while
 * there is something to say; remount (new `key`) to show a new message.
 */
const noSubscribe = () => () => {};
/** `document.body` on the client, null during SSR — without a setState-in-effect round-trip. */
const usePortalHost = () =>
  useSyncExternalStore(
    noSubscribe,
    () => document.body,
    () => null,
  );

export function Toast({ message, onDismiss, duration = 5000 }: ToastProps) {
  const host = usePortalHost();
  const el = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaving = useRef(false);

  const dismiss = () => {
    if (leaving.current) return;
    leaving.current = true;
    if (timer.current) clearTimeout(timer.current);
    const node = el.current;
    if (!node || prefersReducedMotion()) {
      onDismiss();
      return;
    }
    animate(node, { translateX: 12, opacity: 0, duration: 200, ease: "inQuad", onComplete: onDismiss });
  };

  const arm = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(dismiss, duration);
  };
  const pause = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  // Entrance + auto-dismiss, once the portal target exists.
  useEffect(() => {
    const node = el.current;
    if (!host || !node) return;
    if (prefersReducedMotion()) {
      node.style.opacity = "1";
    } else {
      animate(node, { translateY: [16, 0], opacity: [0, 1], duration: 450, ease: "outExpo" });
    }
    arm();
    return pause;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount
  }, [host]);

  if (!host) return null;

  return createPortal(
    <div
      ref={el}
      role="status"
      aria-live="polite"
      onMouseEnter={pause}
      onMouseLeave={arm}
      className="fixed right-6 bottom-6 z-50 flex w-[420px] max-w-[calc(100vw-48px)] items-center gap-2 overflow-clip rounded-[10px] border border-primary bg-[#eaf4ff] px-[11px] py-[11px] opacity-0 shadow-[0px_6px_10px_0px_rgba(0,0,0,0.06),0px_4px_32px_0px_rgba(0,0,0,0.12)]"
    >
      <p className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-primary">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-[5px] flex shrink-0 rounded-[4px] p-[5px] outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Icon name="x-close-primary" size={14} />
      </button>
    </div>,
    host,
  );
}
