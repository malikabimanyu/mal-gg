"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { animate, utils } from "animejs";
import { Field } from "@/bretford/components/ui/field";
import { Icon } from "@/bretford/components/ui/icon";
import { cn } from "@/bretford/lib/cn";
import { prefersReducedMotion } from "@/bretford/lib/motion";

type SelectProps<T extends string> = {
  value: T | "";
  options: readonly T[];
  onChange: (value: T) => void;
  placeholder: string;
  /** Accessible name of the control. */
  label: string;
  /** Trigger width; the menu matches it. Defaults to the design's 125px. */
  className?: string;
};

type MenuState = "closed" | "open" | "closing";

/** Where the floating menu goes: viewport coordinates of the trigger's bottom edge. */
type MenuPlacement = { left: number; top: number; width: number };

const MENU_GAP = 4;

/**
 * Custom single-select (Rolexis UI kit, node 782:22837): a Field-shaped
 * trigger with a chevron and a floating listbox of 31px rows that highlight
 * on hover / keyboard focus. Implements the APG "select-only combobox"
 * pattern — focus stays on the trigger, `aria-activedescendant` tracks the
 * highlighted option, first-letter type-ahead jumps between options.
 *
 * The listbox is portaled to the enclosing <dialog> (top layer) or <body>
 * and positioned `fixed`, so no ancestor overflow/stacking context can clip
 * or cover it.
 */
export function Select<T extends string>({ value, options, onChange, placeholder, label, className }: SelectProps<T>) {
  const [state, setState] = useState<MenuState>("closed");
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  /** False until the highlight has been placed once for the current open menu. */
  const highlightPlaced = useRef(false);
  const chevron = useRef<HTMLImageElement>(null);
  const id = useId();
  const optionId = (index: number) => `${id}-option-${index}`;
  const isOpen = state === "open";

  const open = () => {
    const anchor = root.current;
    const button = trigger.current;
    if (!anchor || !button) return;
    // APG select-only combobox: DOM focus must sit on the combobox while the
    // listbox is open, or `aria-activedescendant` is never announced and the
    // arrow/Enter/Escape keys land elsewhere. Chrome focuses a <button> on
    // click; Safari and Firefox on macOS do not, so do it explicitly.
    // (:focus-visible stays false after a pointer interaction, so no ring.)
    button.focus();
    const rect = anchor.getBoundingClientRect();
    setPlacement({ left: rect.left, top: rect.bottom + MENU_GAP, width: rect.width });
    setHost(anchor.closest("dialog") ?? document.body);
    setActive(Math.max(0, options.indexOf(value as T)));
    setState("open");
  };
  const close = () => setState((current) => (current === "open" ? "closing" : current));
  const choose = (index: number) => {
    onChange(options[index]);
    close();
  };

  /* Menu enter/exit + chevron flip. Animations run to the target value only,
     so reopening mid-exit continues from wherever the fade got to. */
  useEffect(() => {
    const list = menu.current;
    if (state === "closed" || !list) return;
    const reduced = prefersReducedMotion();
    const flip = (deg: number) => {
      if (!chevron.current) return;
      if (reduced) utils.set(chevron.current, { rotate: deg });
      else animate(chevron.current, { rotate: deg, duration: 200, ease: "outQuad" });
    };

    if (state === "open") {
      flip(180);
      // Fresh mount: start 4px up and hidden. A reopen mid-exit keeps its current values.
      if (!list.style.transform) utils.set(list, { opacity: 0, translateY: -4 });
      if (reduced) utils.set(list, { opacity: 1, translateY: 0 });
      else animate(list, { opacity: 1, translateY: 0, duration: 180, ease: "outQuad" });
      return;
    }

    flip(0);
    const done = () => {
      highlightPlaced.current = false;
      setState("closed");
    };
    if (reduced) {
      done();
      return;
    }
    const exit = animate(list, { opacity: 0, translateY: -4, duration: 120, ease: "inQuad", onComplete: done });
    return () => {
      exit.cancel();
    };
  }, [state]);

  /* The hover/active highlight is one element that glides between rows:
     snapped into place when the menu opens, animated on every later change. */
  useEffect(() => {
    const list = menu.current;
    const bar = highlight.current;
    if (state !== "open" || !list || !bar) return;
    const row = list.querySelector<HTMLElement>(`#${CSS.escape(optionId(active))}`);
    if (!row) return;
    const top = row.offsetTop;
    if (!highlightPlaced.current || prefersReducedMotion()) {
      utils.set(bar, { translateY: top });
      highlightPlaced.current = true;
      return;
    }
    animate(bar, { translateY: top, duration: 220, ease: "outExpo" });
    // optionId is stable for the component's lifetime (derived from useId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, state]);

  /* While open: an outside pointer closes; the menu is `fixed`, so a scroll or
     resize would leave it stranded — close instead of tracking. */
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [isOpen]);

  /** First-letter type-ahead: next option (after the active one) starting with the typed character. */
  const typeAhead = (char: string) => {
    const needle = char.toLowerCase();
    for (let offset = 1; offset <= options.length; offset++) {
      const index = (active + offset) % options.length;
      if (options[index].toLowerCase().startsWith(needle)) return index;
    }
    return null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!isOpen) return open();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((current) => (current + step + options.length) % options.length);
        return;
      }
      case "Home":
      case "End":
        event.preventDefault();
        if (!isOpen) open();
        setActive(event.key === "Home" ? 0 : options.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        return isOpen ? choose(active) : open();
      case "Escape":
        if (!isOpen) return;
        // Consume it: an open menu closes; the surrounding <dialog> must not.
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case "Tab":
        // APG: Tab commits the highlighted option, then focus moves on.
        if (isOpen) choose(active);
        return;
      default: {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        const match = typeAhead(event.key);
        if (match === null) return;
        event.preventDefault();
        if (!isOpen) open();
        setActive(match);
      }
    }
  };

  const onBlur = (event: FocusEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!root.current?.contains(next) && !menu.current?.contains(next)) close();
  };

  const listbox = state !== "closed" && host && placement && (
    <ul
      ref={menu}
      id={`${id}-listbox`}
      role="listbox"
      aria-label={label}
      style={placement}
      // Keep focus on the trigger for any press inside the menu (rows, padding,
      // gaps alike); a blur would close the menu before the click fires.
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-10 flex flex-col gap-1 rounded-[12px] border border-[#e0e0e0] bg-[#fefefe] p-[6px] pb-2 opacity-0 drop-shadow-[0px_1px_1px_rgba(16,24,40,0.05)]"
    >
      {/* Sliding hover highlight (Figma: 111×31, #f1f1f1, radius 8); rows sit above it */}
      <span
        ref={highlight}
        aria-hidden
        className="pointer-events-none absolute inset-x-[6px] top-0 h-[31px] rounded-[8px] bg-[#f1f1f1]"
      />
      {options.map((option, index) => (
        <li
          key={option}
          id={optionId(index)}
          role="option"
          aria-selected={option === value}
          data-active={index === active || undefined}
          // Rows go inert during the exit fade so a late click can't pick a value the user just dismissed.
          onMouseEnter={() => isOpen && setActive(index)}
          onClick={() => isOpen && choose(index)}
          className="relative flex h-[31px] cursor-pointer items-center rounded-[8px] px-2 text-[14px] leading-none font-medium text-normal"
        >
          {option}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className={cn("relative w-[125px] shrink-0", className)}>
      <Field padded={false} className="has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-primary/40">
        <button
          ref={trigger}
          type="button"
          role="combobox"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-listbox` : undefined}
          aria-activedescendant={isOpen ? optionId(active) : undefined}
          // Ignore a click that lands mid-exit (e.g. the click Firefox synthesizes
          // from a Space keyup) so it can never reopen a menu that just chose.
          onClick={() => {
            if (state === "closing") return;
            if (isOpen) close();
            else open();
          }}
          onKeyDown={onKeyDown}
          // Firefox activates a <button> on Space *keyup* even when the keydown
          // was prevented; cancelling the keyup suppresses that synthetic click.
          onKeyUp={(event) => {
            if (event.key === " ") event.preventDefault();
          }}
          onBlur={onBlur}
          className={cn(
            "flex w-full min-w-0 cursor-pointer items-center gap-2 px-[11px] py-[9px] text-left outline-none",
            value ? "text-loud" : "text-normal",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{value || placeholder}</span>
          <Icon ref={chevron} name="chevron-down" size={14} />
        </button>
      </Field>

      {listbox && createPortal(listbox, host)}
    </div>
  );
}
