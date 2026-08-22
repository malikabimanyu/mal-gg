"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { animate, utils } from "animejs";
import {
  CARD_GAP,
  CARD_HEIGHT,
  CARD_WIDTH,
  cardBack,
  deck,
} from "@/lib/cards";
import { prefersReducedMotion } from "@/lib/motion";

type Phase = "pick" | "shuffling" | "guess" | "reveal";

const STEP = CARD_WIDTH + CARD_GAP;
const ROW_WIDTH = deck.length * CARD_WIDTH + (deck.length - 1) * CARD_GAP;

const FLIP_MS = 420;
/** Jeda antar kartu saat membalik, biar terlihat berurutan bukan serempak. */
const FLIP_STAGGER = 55;
const SHUFFLE_PASSES = 4;
/** Durasi putaran pertama; tiap putaran berikutnya sedikit lebih singkat. */
const SHUFFLE_MS = 560;
const SHUFFLE_STEP = 40;
const RESTART_DELAY = 2600;

/** Volume efek suara. Cukup terdengar tanpa mendominasi halaman. */
const SFX_VOLUME = 0.35;

/** Fisher–Yates; diulang kalau hasilnya kebetulan sama persis dengan susunan awal. */
function shuffled(order: string[]): string[] {
  if (order.length < 2) return order;
  let next: string[];
  do {
    next = [...order];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
  } while (next.every((id, i) => id === order[i]));
  return next;
}

export function CardGame() {
  const row = useRef<HTMLDivElement>(null);
  /** layout[slot] = id kartu yang menempati slot itu. */
  const layout = useRef<string[]>(deck.map((card) => card.id));
  /** Naik tiap ronde; dipakai membatalkan urutan animasi yang sudah basi. */
  const run = useRef(0);

  const flipSfx = useRef<HTMLAudioElement>(null);
  const shuffleSfx = useRef<HTMLAudioElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [chosen, setChosen] = useState<string | null>(null);
  const [guess, setGuess] = useState<string | null>(null);

  useEffect(() => {
    for (const ref of [flipSfx, shuffleSfx]) {
      if (ref.current) ref.current.volume = SFX_VOLUME;
    }
  }, []);

  /**
   * Memutar ulang efek suara dari awal. Selalu dipicu oleh klik pengguna,
   * jadi tidak terganjal kebijakan autoplay browser; kalau tetap ditolak,
   * diabaikan diam-diam.
   */
  const play = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, []);

  /**
   * Posisi dasar tiap kartu diatur React lewat `left` dan tidak pernah berubah.
   * anime.js hanya menyentuh `transform`, jadi keduanya tidak saling menimpa.
   * Yang dianimasikan adalah selisih slot terhadap posisi dasar tersebut.
   */
  const cardAt = useCallback(
    (id: string) => row.current?.querySelector<HTMLElement>(`[data-card="${id}"]`) ?? null,
    [],
  );

  const scale = useCallback(() => {
    const width = row.current?.getBoundingClientRect().width ?? 0;
    return width ? width / ROW_WIDTH : 1;
  }, []);

  const place = useCallback(
    (order: string[], animated: boolean, duration = SHUFFLE_MS) => {
      const s = scale();
      const running: Promise<unknown>[] = [];

      order.forEach((id, slot) => {
        const el = cardAt(id);
        if (!el) return;

        const home = deck.findIndex((card) => card.id === id);
        const x = (slot - home) * STEP * s;

        if (!animated) {
          utils.set(el, { translateX: x, translateY: 0 });
          return;
        }

        running.push(
          animate(el, {
            translateX: { to: x, duration, ease: "inOutQuad" },
            // sedikit terangkat di tengah gerakan biar terasa "dikocok"
            translateY: [
              { to: -12 * s, duration: duration / 2, ease: "outQuad" },
              { to: 0, duration: duration / 2, ease: "inQuad" },
            ],
          }) as unknown as Promise<unknown>,
        );
      });

      return Promise.all(running);
    },
    [cardAt, scale],
  );

  const flip = useCallback(
    (faceDown: boolean, animated: boolean) => {
      const targets = deck
        .map((card) => cardAt(card.id)?.querySelector<HTMLElement>("[data-flip]"))
        .filter((el): el is HTMLElement => Boolean(el));

      if (!animated) {
        utils.set(targets, { rotateY: faceDown ? 180 : 0 });
        return Promise.resolve([]);
      }

      return Promise.all(
        targets.map(
          (el, i) =>
            animate(el, {
              rotateY: faceDown ? 180 : 0,
              duration: FLIP_MS,
              delay: i * FLIP_STAGGER,
              ease: "inOutQuad",
            }) as unknown as Promise<unknown>,
        ),
      );
    },
    [cardAt],
  );

  // Skala berubah saat breakpoint berganti, jadi posisi dihitung ulang.
  useEffect(() => {
    const onResize = () => place(layout.current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  const reset = useCallback(() => {
    run.current += 1;
    layout.current = deck.map((card) => card.id);
    setChosen(null);
    setGuess(null);
    setPhase("pick");
    place(layout.current, false);
    flip(false, false);
  }, [flip, place]);

  const onPick = useCallback(
    async (id: string) => {
      const ticket = (run.current += 1);
      const calm = prefersReducedMotion();

      setChosen(id);
      setPhase("shuffling");

      play(flipSfx);
      await flip(true, !calm);
      if (run.current !== ticket) return;

      const passes = calm ? 1 : SHUFFLE_PASSES;
      for (let i = 0; i < passes; i++) {
        layout.current = shuffled(layout.current);
        play(shuffleSfx);
        await place(layout.current, !calm, SHUFFLE_MS - i * SHUFFLE_STEP);
        if (run.current !== ticket) return;
      }

      setPhase("guess");
    },
    [flip, place, play],
  );

  const onGuess = useCallback(
    async (id: string) => {
      const ticket = (run.current += 1);
      const calm = prefersReducedMotion();

      setGuess(id);
      setPhase("reveal");

      play(flipSfx);
      await flip(false, !calm);
      if (run.current !== ticket) return;

      window.setTimeout(() => {
        if (run.current === ticket) reset();
      }, RESTART_DELAY);
    },
    [flip, play, reset],
  );

  const clickable = phase === "pick" || phase === "guess";
  const won = phase === "reveal" && guess === chosen;

  const status =
    phase === "pick"
      ? "Pick a card — any card"
      : phase === "shuffling"
        ? "Shuffling…"
        : phase === "guess"
          ? "Now, which one was yours?"
          : won
            ? "Spot on — that was yours"
            : "Not that one. Yours is ringed.";

  return (
    <div className="board-dots flex flex-col items-center gap-[10px] px-4 py-[14px] [--card-scale:1] sm:[--card-scale:2]">
      <div
        ref={row}
        className="relative"
        style={{
          width: `calc(${ROW_WIDTH}px * var(--card-scale))`,
          height: `calc(${CARD_HEIGHT}px * var(--card-scale))`,
        }}
      >
        {deck.map((card, i) => {
          const ring =
            phase !== "reveal"
              ? ""
              : card.id === chosen
                ? "shadow-[0_0_0_2px_#15803d]"
                : card.id === guess
                  ? "shadow-[0_0_0_2px_#b91c1c]"
                  : "";

          return (
            <button
              key={card.id}
              data-card={card.id}
              type="button"
              disabled={!clickable}
              onClick={() => (phase === "pick" ? onPick(card.id) : onGuess(card.id))}
              aria-label={
                phase === "pick" ? `Pick the ${card.label}` : `Card ${i + 1}`
              }
              className={`absolute top-0 rounded-[2px] [perspective:600px] transition-[translate] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-strong ${ring} ${
                clickable ? "cursor-pointer hover:[translate:0_-3px]" : "cursor-default"
              }`}
              style={{
                left: `calc(${i} * ${STEP}px * var(--card-scale))`,
                width: `calc(${CARD_WIDTH}px * var(--card-scale))`,
                height: `calc(${CARD_HEIGHT}px * var(--card-scale))`,
              }}
            >
              <div
                data-flip
                className="relative size-full [transform-style:preserve-3d]"
              >
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  <Image
                    src={card.src}
                    alt=""
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    unoptimized
                    className="size-full [image-rendering:pixelated]"
                  />
                </div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <Image
                    src={cardBack}
                    alt=""
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    unoptimized
                    className="size-full [image-rendering:pixelated]"
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <audio ref={flipSfx} src="/audio/flip.wav" preload="auto" className="hidden" />
      <audio ref={shuffleSfx} src="/audio/shuffle.wav" preload="auto" className="hidden" />

      <p
        aria-live="polite"
        className="text-[8px] leading-[12px] tracking-[0.2px] text-ink-soft"
      >
        {status}
      </p>
    </div>
  );
}
