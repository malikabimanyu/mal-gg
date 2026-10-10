"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CHARACTERS, CHASER, type CharacterDef } from "../../lib/characters";
import {
  AUDIO_CREDITS,
  AUDIO_NOTE,
  CHARACTER_NOTE,
  ENVIRONMENT_CREDITS,
  ENVIRONMENT_NOTE,
  FONT_CREDITS,
  MADE_BY,
  type Credit,
} from "../../lib/credits";
import type { GameApi } from "../../lib/store";
import { BrButton, textAccent } from "./button";
import { IconBack, IconExternal } from "./icons";

/** Licence/source fields render as links only when they are real URLs. */
const isUrl = (s: string) => /^https?:\/\//.test(s);

/**
 * Attributions required by the CC BY model licences (title, author, source, licence, changes),
 * plus the CC0 packs and the font as a courtesy. Grouped and scrollable on phones.
 */
export function CreditsScreen({ api }: { api: GameApi }) {
  const scroller = useRef<HTMLDivElement>(null);
  // Focused list: arrows, Space, PageDown/End scroll it straight away (keyboard users).
  useEffect(() => {
    scroller.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && !e.ctrlKey && !e.metaKey && !e.altKey) api.closeCredits();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  return (
    <div className="br-fade-in absolute inset-0 flex flex-col bg-[linear-gradient(to_bottom,rgb(27_16_53/0.78),rgb(27_16_53/0.9))] backdrop-blur-[2px]">
      <header className="br-safe flex shrink-0 items-center gap-3 pb-2!">
        <BrButton tone="glass" size="md" onClick={() => api.closeCredits()} label="Back to menu">
          <IconBack className="size-5" />
          BACK
        </BrButton>
        <h2 className="br-stroke flex-1 truncate pr-2 text-center font-br-display text-4xl leading-none text-br-sun br-short:text-3xl">
          CREDITS
        </h2>
        {/* Balances the back button so the title stays centred. */}
        <span aria-hidden className="hidden w-[104px] sm:block" />
      </header>

      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Credits list"
        className="br-scroll-y min-h-0 flex-1 overflow-y-auto px-[max(12px,env(safe-area-inset-left))] pb-[max(20px,env(safe-area-inset-bottom))] outline-none"
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pt-2">
          <Group title="Characters" note={CHARACTER_NOTE}>
            {CHARACTERS.map((c) => (
              <CharacterRow key={c.id} c={c} />
            ))}
          </Group>
          <Group title="Chaser" note={CHARACTER_NOTE}>
            <CharacterRow c={CHASER} />
          </Group>
          <Group title="Environment" note={ENVIRONMENT_NOTE}>
            {ENVIRONMENT_CREDITS.map((c) => (
              <CreditRow key={c.url} credit={c} />
            ))}
          </Group>
          <Group title="Audio" note={AUDIO_NOTE}>
            {AUDIO_CREDITS.map((c) => (
              <CreditRow key={c.url} credit={c} />
            ))}
          </Group>
          <Group title="Font">
            {FONT_CREDITS.map((c) => (
              <CreditRow key={c.url} credit={c} />
            ))}
          </Group>

          <footer className="flex flex-col items-center gap-1 py-4 text-center">
            <p className="br-stroke-thin font-br-display text-2xl leading-tight text-br-sun">{MADE_BY}</p>
            <p className="font-br-body text-sm text-br-mute">No accounts, no real-money purchases. Coins are earned by running.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border-[3px] border-br-ink bg-br-panel-solid/95 shadow-[0_5px_0_var(--br-ink)]">
      <h3 className="br-stroke-thin rounded-t-[21px] border-b-[3px] border-br-ink bg-br-grape px-4 py-2 font-br-display text-2xl leading-none">
        {title}
      </h3>
      <ul className="divide-y-2 divide-br-ink/60 px-4">{children}</ul>
      {note && <p className="px-4 pt-1 pb-3 font-br-body text-xs leading-snug text-br-mute italic">{note}</p>}
    </section>
  );
}

function CharacterRow({ c }: { c: CharacterDef }) {
  return (
    <li className="py-3">
      <div className="font-br-display text-lg leading-tight" style={{ color: textAccent(c.accent) }}>
        <span className="br-stroke-thin">{c.name}</span>
      </div>
      <CreditBody credit={c.credit} />
    </li>
  );
}

function CreditRow({ credit }: { credit: Credit }) {
  return (
    <li className="py-3">
      <div className="font-br-display text-lg leading-tight text-br-paper">{credit.title}</div>
      <CreditBody credit={credit} hideTitle />
    </li>
  );
}

function CreditBody({ credit, hideTitle = false }: { credit: Pick<Credit, "title" | "author" | "url" | "license" | "licenseUrl" | "detail">; hideTitle?: boolean }) {
  return (
    <div className="mt-1 font-br-body text-sm leading-snug text-br-paper/90">
      <p>
        {!hideTitle && <>“{credit.title}” </>}by <span className="font-semibold text-br-paper">{credit.author}</span>
        {credit.detail && <span className="text-br-mute"> · {credit.detail}</span>}
      </p>
      <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        <LinkOrText href={credit.licenseUrl}>{credit.license}</LinkOrText>
        {isUrl(credit.url) && <LinkOrText href={credit.url}>Source</LinkOrText>}
      </p>
    </div>
  );
}

function LinkOrText({ href, children }: { href: string; children: ReactNode }) {
  if (!isUrl(href)) return <span className="text-br-mute">{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      /* 44 px tall hit area with the same look (negative margins keep the line spacing). */
      className="pointer-events-auto -my-2.5 inline-flex min-h-11 items-center gap-1 rounded-md px-1 font-semibold text-br-sun underline decoration-2 underline-offset-2 hover:text-br-coin-light"
    >
      {children}
      <IconExternal />
    </a>
  );
}
