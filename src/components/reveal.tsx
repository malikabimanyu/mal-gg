"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, stagger, utils } from "animejs";
import { prefersReducedMotion } from "@/lib/motion";

type Scope = ReturnType<typeof createScope>;

/**
 * Entrance animation: tiap anak yang punya [data-reveal] naik + fade in
 * dengan stagger. Kondisi awal (opacity 0) diset di globals.css supaya
 * tidak ada kedipan sebelum JS jalan.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<Scope | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      utils.set(el.querySelectorAll("[data-reveal]"), { opacity: 1 });
      return;
    }

    scope.current = createScope({ root: el }).add(() => {
      animate("[data-reveal]", {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 620,
        ease: "outExpo",
        delay: stagger(90),
      });
    });

    return () => {
      scope.current?.revert();
    };
  }, []);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
