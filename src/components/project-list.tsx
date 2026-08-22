"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import { animate, spring, utils } from "animejs";
import { projects } from "@/lib/site";
import { prefersReducedMotion } from "@/lib/motion";

type Anim = ReturnType<typeof animate>;

/** Kemiringan dasar tombol (derajat) — dipasang lewat CSS, selalu ada. */
const TILT_BASE = -1.5;
/** Tambahan kemiringan di puncak ayunan, jadi total -1.5deg s/d -5.5deg. */
const TILT_SWING = -4;
/** Tinggi ayunan melayang (px) dan lamanya satu ayunan. */
const BOB = 7;
const BOB_MS = 1200;

export function ProjectList() {
  const floats = useRef<(HTMLElement | null)[]>([]);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const bobbing = useRef<(Anim | null)[]>([]);

  const toggle = useCallback((i: number, on: boolean) => {
    const float = floats.current[i];
    const card = cards.current[i];
    if (!float || !card) return;

    bobbing.current[i]?.cancel();
    bobbing.current[i] = null;
    float.style.pointerEvents = on ? "auto" : "none";

    // Reduced motion: tombolnya tetap muncul, hanya tanpa gerak melayang.
    if (prefersReducedMotion()) {
      utils.set(card, { opacity: on ? 1 : 0, scale: 1 });
      utils.set(float, { translateY: 0, rotate: 0 });
      return;
    }

    if (!on) {
      animate(card, { opacity: 0, scale: 0.92, duration: 200, ease: "inQuad" });
      animate(float, { translateY: 0, rotate: 0, duration: 260, ease: "outQuad" });
      return;
    }

    animate(card, {
      opacity: [0, 1],
      scale: [0.9, 1],
      ease: spring({ stiffness: 210, damping: 14 }),
    });

    // Ayunan naik-turun sambil sedikit berubah miring — ini yang bikin
    // tombolnya terasa mengambang, bukan sekadar muncul.
    //
    // Pakai `alternate` dan bukan dua keyframe: dengan keyframe, tiap
    // pengulangan direset ke nilai awal sehingga kemiringannya menyentak.
    // `alternate` memutar balik ayunan yang sama, jadi sambungannya mulus.
    bobbing.current[i] = animate(float, {
      translateY: -BOB,
      rotate: TILT_SWING,
      duration: BOB_MS,
      ease: "inOutSine",
      loop: true,
      alternate: true,
    });
  }, []);

  return (
    <ul className="flex flex-col gap-[24px]">
      {projects.map((project, i) => (
        <li
          key={project.name}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-[2px] text-[16px] leading-[26px] tracking-[-0.32px]"
        >
          <span
            className="relative inline-block"
            onMouseEnter={() => toggle(i, true)}
            onMouseLeave={() => toggle(i, false)}
            onFocus={() => toggle(i, true)}
            onBlur={() => toggle(i, false)}
          >
            <span className="text-ink">{project.name}</span>

            {/* Saat tersembunyi, pointer-events dimatikan supaya kotak link
                yang tak terlihat tidak menangkap hover atau klik. */}
            <span
              ref={(el) => {
                floats.current[i] = el;
              }}
              className="pointer-events-none absolute top-1/2 left-0 z-10 [translate:0_-50%]"
            >
              <a
                ref={(el) => {
                  cards.current[i] = el;
                }}
                href={project.badge.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ rotate: `${TILT_BASE}deg` }}
                className="flex items-center justify-center gap-[12px] rounded-[16px] bg-card px-[16px] py-[12px] opacity-0 shadow-pill will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-strong"
              >
                <Image
                  src={project.badge.icon}
                  alt=""
                  width={112}
                  height={112}
                  className="size-[28px] shrink-0 object-contain"
                />
                <span className="text-[16px] leading-none font-medium whitespace-nowrap text-ink-strong">
                  {project.badge.label}
                </span>
              </a>
            </span>
          </span>

          <span className="text-muted sm:text-right">{project.description}</span>
        </li>
      ))}
    </ul>
  );
}
