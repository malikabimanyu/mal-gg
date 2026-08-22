"use client";

import Image from "next/image";
import { animate } from "animejs";
import { XLogo } from "@/components/icons";
import { prefersReducedMotion } from "@/lib/motion";
import { site } from "@/lib/site";

const pill =
  "inline-flex items-center justify-center gap-[8px] rounded-[8px] bg-card px-[14px] py-[8px] " +
  "text-[14px] font-medium leading-none text-ink-strong shadow-pill will-change-transform " +
  "transition-shadow duration-300 hover:shadow-pill-hover " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-strong";

function lift(el: EventTarget & HTMLElement, up: boolean) {
  if (prefersReducedMotion()) return;
  animate(el, { translateY: up ? -2 : 0, duration: 280, ease: "outExpo" });
}

export function ActionButtons() {
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) =>
      lift(e.currentTarget, true),
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) =>
      lift(e.currentTarget, false),
    onFocus: (e: React.FocusEvent<HTMLAnchorElement>) =>
      lift(e.currentTarget, true),
    onBlur: (e: React.FocusEvent<HTMLAnchorElement>) =>
      lift(e.currentTarget, false),
  };

  return (
    <div className="flex flex-wrap items-start gap-[12px]">
      <a
        href={site.links.hire}
        target="_blank"
        rel="noopener noreferrer"
        className={pill}
        {...handlers}
      >
        <Image
          src="/icons/hire.png"
          alt=""
          width={20}
          height={20}
          className="size-[20px] object-contain"
        />
        Hire Us
      </a>

      <a
        href={site.links.sayHi}
        target="_blank"
        rel="noopener noreferrer"
        className={pill}
        {...handlers}
      >
        <XLogo className="h-[18px] w-[20px] shrink-0 text-ink" />
        Say hi
      </a>
    </div>
  );
}
