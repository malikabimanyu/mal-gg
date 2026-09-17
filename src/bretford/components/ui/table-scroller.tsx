"use client";

import { useEffect, useRef, type ReactNode } from "react";

const THUMB_WIDTH = 24;

/**
 * Sideways-scrolling wrapper for the wide tables below `md`.
 *
 * The mobile frames (Rolexis "Responsive - Source details") draw their own
 * scroll indicator under each table: an 8px-padded row with a 4px disable-grey
 * track and a 24px #d1d1d1 thumb. Phones hide overlay scrollbars, so the native
 * one is suppressed and the thumb is moved along the track from `scroll`.
 * On desktop (`md` and up) the wrapper is a plain block and the track is not
 * rendered, so the tables keep their exact layout.
 */
export function TableScroller({ className, children }: { className?: string; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !track || !thumb) return;

    const update = () => {
      const range = viewport.scrollWidth - viewport.clientWidth;
      // `.flex` would beat the [hidden] UA rule, so toggle display directly
      track.style.display = range <= 0 ? "none" : "";
      if (range <= 0) return;
      const progress = Math.min(1, Math.max(0, viewport.scrollLeft / range));
      thumb.style.transform = `translateX(${progress * (track.clientWidth - THUMB_WIDTH)}px)`;
    };

    update();
    viewport.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  return (
    <div className={className}>
      <div
        ref={viewportRef}
        className="max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Indicator row: p-8 around a 4px track (834:23604) */}
      <div ref={trackRef} aria-hidden className="flex w-full items-center p-2 md:hidden">
        <div className="relative h-1 min-w-px flex-1 overflow-clip rounded-full bg-disable">
          <div ref={thumbRef} className="absolute top-0 left-0 h-1 w-6 rounded-[99px] bg-[#d1d1d1]" />
        </div>
      </div>
    </div>
  );
}
