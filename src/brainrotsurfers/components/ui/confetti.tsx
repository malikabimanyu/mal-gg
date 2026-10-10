"use client";

import { useEffect, useRef } from "react";

const PALETTE = ["#ffd23f", "#ff4f8b", "#3fdc6e", "#2f8fff", "#8a5cff", "#ffffff", "#ffc21a"];
const COUNT = 140;
const LIFE_MS = 2200;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
}

/**
 * One-shot confetti burst on a 2D canvas over the stage (purchase celebration). Canvas, not DOM
 * nodes, so 140 bits cost one layer. Skipped entirely under prefers-reduced-motion.
 */
export function Confetti({ accent, originY = 0.5 }: { accent: string; originY?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    const colors = [accent, accent, ...PALETTE];
    const scale = Math.min(1.4, Math.max(0.8, w / 600));
    const bits: Bit[] = Array.from({ length: COUNT }, (_, i) => {
      // Two cannons from the lower corners plus a pop from the centre.
      const fromCentre = i % 3 === 0;
      const side = i % 2 === 0 ? -1 : 1;
      const angle = fromCentre ? Math.random() * Math.PI * 2 : -Math.PI / 2 - side * (0.2 + Math.random() * 0.4);
      const speed = fromCentre ? 260 + Math.random() * 420 : 700 + Math.random() * 500;
      return {
        x: fromCentre ? w / 2 : side < 0 ? w * 0.06 : w * 0.94,
        y: fromCentre ? h * originY : h * 0.95,
        vx: Math.cos(angle) * speed * scale,
        vy: Math.sin(angle) * speed * scale,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        w: (6 + Math.random() * 7) * scale,
        h: (9 + Math.random() * 9) * scale,
        color: colors[i % colors.length],
        round: i % 5 === 0,
      };
    });

    let raf = 0;
    const t0 = performance.now();
    let last = t0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const age = now - t0;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = age > LIFE_MS - 500 ? Math.max(0, (LIFE_MS - age) / 500) : 1;
      for (const b of bits) {
        b.vy += 1100 * dt;
        b.vx *= 1 - 1.6 * dt;
        b.vy *= 1 - 0.9 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        if (b.round) {
          ctx.beginPath();
          ctx.arc(0, 0, b.w * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Flutter: squash one axis with the spin so strips look like they tumble.
          ctx.fillRect(-b.w / 2, (-b.h / 2) * Math.abs(Math.cos(b.rot * 1.7)), b.w, b.h * Math.abs(Math.cos(b.rot * 1.7)));
        }
        ctx.restore();
      }
      if (age < LIFE_MS) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [accent, originY]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
