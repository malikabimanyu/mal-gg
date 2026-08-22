"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { animate, spring, utils } from "animejs";
import { logos } from "@/lib/site";
import { useReducedMotion } from "@/lib/motion";

/** Kecepatan jalan strip logo, dalam piksel per detik. Pelan, tapi tidak sampai terasa diam. */
const SPEED = 32;
/** Berapa lama satu tooltip bertahan sebelum keluar lagi. */
const TOOLTIP_HOLD = 2000;
/** Jeda antara satu tooltip keluar dan tooltip berikutnya masuk. */
const TOOLTIP_GAP = 300;
/** Selang pengecekan saat belum ada logo yang pas posisinya. */
const TOOLTIP_POLL = 400;
/** Strip diam dulu sesaat setelah halaman dibuka, baru mulai berjalan. */
const START_DELAY = 1000;
/** Jarak aman tooltip dari tepi strip — selebar fade mask di kiri-kanan. */
const EDGE_PADDING = 24;
/** Ruang di atas strip untuk tooltip; ditarik balik pakai margin negatif
 *  supaya tinggi layout strip tidak berubah. */
const TOOLTIP_ROOM = 36;

const tooltipLogos = logos.filter((logo) => logo.tooltip);

type Anim = ReturnType<typeof animate>;

/**
 * Tooltip funding (Figma node 176:227). Ikon calendar bawaan komponen diganti
 * crown.gif sesuai permintaan.
 *
 * Soal font: komponen Figma-nya menyebut SF Pro Rounded, tapi hasil render di
 * Figma sebenarnya grotesque biasa (terminal huruf rata, bukan rounded) — jadi
 * Figma pun jatuh ke fallback. Teksnya memakai Inter yang sudah dipakai halaman
 * ini, yang bentuknya paling dekat dengan render tersebut.
 */
function LogoTooltip({ owner, label }: { owner: string; label: string }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-[8px] -translate-x-1/2">
      <div
        data-tooltip-for={owner}
        className="flex items-center justify-center gap-[4px] rounded-full bg-card px-[9px] py-[5px] opacity-0 shadow-tooltip will-change-transform"
      >
        <Image
          src="/icons/crown.gif"
          alt=""
          width={64}
          height={64}
          unoptimized
          loading="eager"
          className="size-[14px] shrink-0"
        />
        <span className="px-[2px] text-[12px] leading-none font-medium whitespace-nowrap text-ink-soft">
          {label}
        </span>
      </div>
    </div>
  );
}

function LogoRow({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul
      aria-hidden={duplicate || undefined}
      className="flex shrink-0 items-center gap-[32px] pr-[32px]"
    >
      {logos.map((logo) => (
        <li key={logo.name} className="relative shrink-0">
          <a
            href={logo.href}
            target="_blank"
            rel="noopener noreferrer"
            /* Salinan kedua cuma hiasan: selain disembunyikan dari pembaca
               layar, ia juga dilewati saat navigasi keyboard. */
            tabIndex={duplicate ? -1 : undefined}
            className="block transition-opacity duration-200 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-strong"
          >
            <Image
              src={logo.src}
              alt={duplicate ? "" : logo.name}
              width={logo.width}
              height={logo.height}
              unoptimized
              className="grayscale"
              style={{
                height: `calc(${logo.displayHeight}px * var(--logo-scale, 1))`,
                width: "auto",
              }}
            />
          </a>
          {logo.tooltip && (
            <LogoTooltip owner={logo.name} label={logo.tooltip} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Di Figma barisan logo ini lebarnya ~1427px di dalam kolom 558px dan
 * terpotong oleh kartu — jadi maksudnya memang strip berjalan.
 * Track berisi dua salinan identik lalu digeser sejauh satu salinan,
 * supaya loop-nya mulus tanpa lompatan.
 */
export function LogoMarquee() {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const anim = useRef<Anim | null>(null);

  // Reduced motion: strip berhenti dan jadi bisa di-scroll manual,
  // supaya logo yang di luar layar tetap bisa dilihat.
  const reduced = useReducedMotion();

  // --- strip berjalan ---
  useEffect(() => {
    const el = track.current;
    if (!el || reduced) return;

    const build = () => {
      anim.current?.revert();
      anim.current = null;

      const distance = el.scrollWidth / 2;
      if (distance <= 0) return;

      anim.current = animate(el, {
        translateX: [0, -distance],
        duration: (distance / SPEED) * 1000,
        // `delay` hanya berlaku sekali di awal; jeda antar-loop pakai
        // `loopDelay`, yang sengaja dibiarkan 0 supaya putarannya mulus.
        delay: START_DELAY,
        ease: "linear",
        loop: true,
      });
    };

    build();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      anim.current?.revert();
    };
  }, [reduced]);

  // --- tooltip funding, muncul bergiliran satu per satu ---
  useEffect(() => {
    const root = viewport.current;
    if (!root || tooltipLogos.length === 0) return;

    const all = () => root.querySelectorAll<HTMLElement>("[data-tooltip-for]");

    if (reduced) {
      utils.set(all(), { opacity: 1, scale: 1, translateY: 0 });
      return;
    }

    let disposed = false;
    let timer = 0;
    let current: Anim | null = null;

    // Tiap logo hanya boleh tampil sekali per putaran strip. Sesudah itu
    // gilirannya menunggu putaran berikutnya, bukan muncul-hilang berulang.
    const shownThisLap = new Set<string>();
    let lastX = 0;

    const trackX = () => {
      const el = track.current;
      if (!el) return 0;
      const value = getComputedStyle(el).transform;
      if (!value || value === "none") return 0;
      return new DOMMatrixReadOnly(value).m41;
    };

    /** translateX hanya mengecil selama satu putaran; kalau membesar berarti
     *  strip sudah kembali ke awal dan putaran baru dimulai. */
    const syncLap = () => {
      const x = trackX();
      if (x > lastX + 1) shownThisLap.clear();
      lastX = x;
    };

    /**
     * Cari salinan tooltip yang muat UTUH di dalam strip. Track berisi dua
     * salinan tiap logo, dan tooltip lebih lebar dari logonya — kalau logonya
     * sedang mepet tepi, tooltipnya tidak akan muat. Tooltip selalu tepat di
     * tengah logonya; kalau tidak muat, giliran ini dilewat, bukan digeser.
     */
    const findPlaceable = (owner: string): HTMLElement | null => {
      const box = root.getBoundingClientRect();
      for (const node of Array.from(
        root.querySelectorAll<HTMLElement>(`[data-tooltip-for="${owner}"]`),
      )) {
        const anchor = node.parentElement;
        if (!anchor) continue;
        const rect = anchor.getBoundingClientRect();
        if (
          rect.left >= box.left + EDGE_PADDING &&
          rect.right <= box.right - EDGE_PADDING
        ) {
          return node;
        }
      }
      return null;
    };

    const show = (el: HTMLElement, nextIndex: number) => {
      current = animate(el, {
        opacity: [0, 1],
        scale: [0.7, 1],
        translateY: [6, 0],
        ease: spring({ stiffness: 180, damping: 10 }),
      });

      timer = window.setTimeout(() => {
        if (disposed) return;
        current = animate(el, {
          opacity: 0,
          scale: 0.85,
          translateY: 4,
          duration: 260,
          ease: "inQuad",
        });
        timer = window.setTimeout(() => step(nextIndex), TOOLTIP_GAP);
      }, TOOLTIP_HOLD);
    };

    const step = (index: number) => {
      if (disposed) return;
      syncLap();

      // Coba ketiganya berurutan mulai dari giliran sekarang, lalu pakai yang
      // pertama belum tampil putaran ini dan posisinya pas.
      for (let offset = 0; offset < tooltipLogos.length; offset++) {
        const turn = index + offset;
        const logo = tooltipLogos[turn % tooltipLogos.length];
        if (shownThisLap.has(logo.name)) continue;

        const el = findPlaceable(logo.name);
        if (el) {
          shownThisLap.add(logo.name);
          show(el, turn + 1);
          return;
        }
      }

      // Belum ada yang pas — atau semuanya sudah tampil putaran ini.
      timer = window.setTimeout(() => step(index), TOOLTIP_POLL);
    };

    step(0);

    return () => {
      disposed = true;
      clearTimeout(timer);
      current?.cancel();
      utils.set(all(), { opacity: 0 });
    };
  }, [reduced]);

  return (
    <div
      ref={viewport}
      style={{
        paddingTop: `${TOOLTIP_ROOM}px`,
        marginTop: `-${TOOLTIP_ROOM}px`,
      }}
      className={
        reduced
          ? "overflow-x-auto [--logo-scale:0.85] sm:[--logo-scale:1]"
          : "marquee-mask overflow-hidden [--logo-scale:0.85] sm:[--logo-scale:1]"
      }
      onMouseEnter={() => anim.current?.pause()}
      onMouseLeave={() => anim.current?.play()}
      onFocus={() => anim.current?.pause()}
      onBlur={() => anim.current?.play()}
    >
      <div ref={track} className="flex w-max will-change-transform">
        <LogoRow />
        {!reduced && <LogoRow duplicate />}
      </div>
    </div>
  );
}
