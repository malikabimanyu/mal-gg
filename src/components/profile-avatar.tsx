"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { prefersReducedMotion } from "@/lib/motion";
import { site } from "@/lib/site";

/** Pop-nya berulang 10x per detik saat di-hover, jadi sengaja pelan. */
const POP_VOLUME = 0.3;

/**
 * Foto diam (PNG) yang berubah jadi versi GIF saat di-hover.
 * GIF-nya baru dipasang setelah browser idle supaya tidak ikut
 * membebani first paint (ukurannya ~1.2 MB).
 */
export function ProfileAvatar() {
  const box = useRef<HTMLDivElement>(null);
  const gif = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLAudioElement>(null);
  const [gifMounted, setGifMounted] = useState(false);

  useEffect(() => {
    if (pop.current) pop.current.volume = POP_VOLUME;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setGifMounted(true), {
        timeout: 2500,
      });
      return () => window.cancelIdleCallback(id);
    }

    const id = window.setTimeout(() => setGifMounted(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  const hover = (active: boolean) => {
    const sound = pop.current;
    if (sound) {
      if (active) {
        sound.currentTime = 0;
        // Browser menolak memutar audio sebelum pengguna berinteraksi dengan
        // halaman. Kalau ditolak, biarkan diam — bukan error yang perlu ribut.
        void sound.play().catch(() => {});
      } else {
        sound.pause();
        sound.currentTime = 0;
      }
    }

    // Suara sengaja di luar gerbang ini: reduced-motion soal gerak, bukan bunyi.
    if (prefersReducedMotion()) return;
    if (gif.current) {
      animate(gif.current, {
        opacity: active ? 1 : 0,
        duration: active ? 260 : 200,
        ease: active ? "outQuad" : "inQuad",
      });
    }
    if (box.current) {
      animate(box.current, {
        scale: active ? 1.03 : 1,
        duration: 320,
        ease: "outExpo",
      });
    }
  };

  return (
    <div
      ref={box}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      className="relative size-[120px] overflow-hidden rounded-[8px] will-change-transform sm:size-[163px]"
    >
      <Image
        src="/profile/avatar.png"
        alt={site.name}
        fill
        priority
        sizes="163px"
        className="object-cover"
      />
      <audio ref={pop} src="/audio/pop.wav" loop preload="auto" className="hidden" />
      {gifMounted && (
        <div ref={gif} className="absolute inset-0 opacity-0">
          <Image
            src="/profile/avatar.gif"
            alt=""
            fill
            unoptimized
            sizes="163px"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
