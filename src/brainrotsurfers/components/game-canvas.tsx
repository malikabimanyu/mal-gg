"use client";

import { useEffect, useRef, useState } from "react";
import { Game } from "../game/engine";
import { installDebugHooks } from "../game/dev-hooks";
import { loadSave } from "../lib/save";
import { createGameStore, GameController, initialSnapshot } from "../lib/store";
import { Overlay } from "./ui/overlay";

/**
 * Owns the <canvas> and the engine's lifetime. The store and controller outlive engine
 * instances (Strict Mode mounts the effect twice in dev), so the UI never holds a stale engine.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [store] = useState(() => createGameStore(initialSnapshot(loadSave())));
  const [api] = useState(() => new GameController());
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const seedParam = new URLSearchParams(window.location.search).get("seed");
    const seed = seedParam && /^\d+$/.test(seedParam) ? Number(seedParam) : undefined;
    let game: Game;
    try {
      game = new Game(canvas, store, { seed });
    } catch (err) {
      // No WebGL context (blocked by policy, GPU blocklist, too many contexts, GPU crash).
      // (Reported from a microtask: this is the failure callback of an external system.)
      console.error(err);
      queueMicrotask(() => setUnsupported(true));
      return;
    }
    api.attach(game);
    const removeHooks = process.env.NODE_ENV !== "production" ? installDebugHooks(game) : () => {};
    return () => {
      removeHooks();
      api.attach(null);
      game.dispose();
    };
  }, [store, api]);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-label="Brainrot Surfers game" />
      {unsupported ? <UnsupportedCard /> : <Overlay store={store} api={api} />}
    </div>
  );
}

function UnsupportedCard() {
  return (
    <div className="br-safe absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_35%,var(--br-sky),var(--br-sky-deep)_70%,var(--br-sky-dark))]">
      <div
        role="alert"
        className="br-pop-in relative flex max-w-sm flex-col items-center gap-3 rounded-3xl border-[3px] border-br-ink bg-br-panel-solid p-6 pt-8 text-center font-br-display shadow-[0_6px_0_var(--br-ink)]"
      >
        <span aria-hidden className="absolute -top-7 flex size-14 items-center justify-center rounded-full border-[3px] border-br-ink bg-br-sun text-3xl text-br-ink shadow-[0_4px_0_var(--br-ink)]">
          !
        </span>
        <h2 className="br-stroke -rotate-2 text-4xl leading-none text-br-hot">NO 3D, NO SURF</h2>
        <p className="font-br-body text-[1rem] leading-snug text-br-paper/90">
          Your browser or device can&apos;t run WebGL, so the game can&apos;t start. Turn on hardware acceleration or try
          another browser.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="br-btn br-stroke-thin mt-1 min-h-12 rounded-2xl border-[3px] border-br-ink bg-br-go px-6 text-xl leading-none text-br-paper"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
