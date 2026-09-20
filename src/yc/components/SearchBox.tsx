"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useQueryNav } from "@/yc/lib/nav";
import { toSearchParams, withChip, type Query, BASE } from "@/yc/lib/query";
import type { Suggestion } from "@/yc/lib/search";
import { fmt } from "@/yc/lib/format";

const KIND_ICON: Record<Suggestion["kind"], string> = {
  ex: "icon-building",
  bio: "user-01",
  company: "icon-building",
  handle: "at-sign",
  tag: "hash-02",
  school: "icon-graduation",
  location: "marker-pin-01",
  batch: "hash-02",
};

const SYNONYMS: Array<[string, string]> = [
  ["AI", "Artificial Intelligence"],
  ["genai", "Generative AI"],
  ["LLM", "Generative AI"],
  ["devtools", "Developer Tools"],
  ["CTO", "Founder / CTO"],
];

export function SearchBox() {
  const { query, push } = useQueryNav();
  const [value, setValue] = useState(query.q);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep the input in sync when the URL changes from elsewhere (chip removal, reset…) — but never
  // overwrite what the user is typing right now.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setValue(query.q);
  }, [query.q]);

  // ⌘K / Ctrl+K focuses the omnibox; "/" too when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced suggestions. Items are only meaningful while the box is open with ≥2 chars; the
  // render below guards on that so no clearing setState is needed here.
  useEffect(() => {
    if (!open || value.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      const sp = toSearchParams({ ...query, q: value, page: 1, peek: null });
      fetch(`${BASE}/api/suggest?${sp.toString()}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d: { items: Suggestion[] }) => setItems(d.items))
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
    // `query` is read for filter context only; re-fetching on every URL change would race typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const submit = (q: string) => {
    const text = q.trim();
    // Relevance only makes sense with a query: switch to it on submit, back to newest on clear.
    const sort = text ? (query.sort === "newest" ? "relevance" : query.sort) : query.sort === "relevance" ? "newest" : query.sort;
    push({ ...query, q: text, page: 1, sort });
    setOpen(false);
  };
  const pick = (s: Suggestion) => {
    let next: Query = { ...query, page: 1 };
    if (s.chip) next = withChip(next, s.chip.field, "is", [s.chip.value]);
    else if (s.q) next = { ...next, q: s.q };
    setValue(s.chip ? "" : (s.q ?? value));
    if (s.chip) next = { ...next, q: "" };
    push(next);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Backspace" && value === "" && query.chips.length) {
      // Backspace on an empty field removes the last chip.
      const chips = query.chips.slice(0, -1);
      push({ ...query, chips, page: 1 });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) pick(items[active]);
      else submit(value);
    }
  };

  const synonyms = SYNONYMS.filter(([a]) => value.trim() && a.toLowerCase().startsWith(value.trim().toLowerCase().slice(0, 3)));

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <div className={`yc-card flex h-9 items-center justify-between py-1 pl-3 pr-2 ${open ? "ring-1 ring-yc-focus" : ""}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon name="search-md" size={16} />
          <input
            ref={inputRef}
            id="omnibox"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search companies, founders, bios, ex-employers, @handles or URLs"
            className="min-w-0 flex-1 bg-transparent text-[12px] leading-none tracking-[-0.1px] text-yc-ink outline-none placeholder:text-yc-ink-muted"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="omnibox-listbox"
          />
        </div>
        {value ? (
          <button
            onClick={() => {
              setValue("");
              submit("");
              inputRef.current?.focus();
            }}
            className="mr-1 flex size-6 items-center justify-center rounded-md text-yc-ink-3 hover:bg-yc-hover"
            aria-label="Clear search"
          >
            <Icon name="x-close" size={12} />
          </button>
        ) : null}
        <kbd className="yc-card flex h-6 items-center gap-1 rounded-lg px-2 font-yc-mono text-[12px] font-medium leading-3 text-yc-ink-muted">
          <Icon name="icon-command" size={12} />K
        </kbd>
      </div>

      {open && value.trim().length >= 2 && (
        <div
          id="omnibox-listbox"
          role="listbox"
          className="yc-fade-in absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-yc-line bg-yc-surface shadow-[0_20px_40px_-1px_rgba(0,0,0,.14),0_4px_8px_rgba(0,0,0,.08),0_1px_2px_rgba(0,0,0,.06)]"
        >
          <div className="p-2">
            <div className="flex h-10 items-center justify-between px-2 leading-none">
              <span className="text-[14px] font-medium tracking-[0.84px] text-yc-ink-muted">Interpretations</span>
              <span className="text-[12px] font-medium text-yc-ink-muted">
                counted against your {query.chips.length} active {query.chips.length === 1 ? "filter" : "filters"}
              </span>
            </div>
            {items.length === 0 ? (
              <p className="px-3 pb-2 text-[12px] text-yc-ink-muted">Searching…</p>
            ) : (
              <ul>
                {items.map((s, i) => (
                  <li key={`${s.kind}-${s.label}`}>
                    <button
                      role="option"
                      aria-selected={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(s)}
                      className={`flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left leading-none ${active === i ? "bg-yc-selected" : "hover:bg-yc-hover"}`}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <Icon name={KIND_ICON[s.kind]} size={16} />
                        <span className={`truncate text-[14px] font-medium ${s.chip ? "text-yc-link" : "text-yc-ink"}`}>{s.label}</span>
                        {s.hint ? <span className="truncate text-[12px] text-yc-ink-muted">{s.hint}</span> : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="font-yc-mono text-[14px] font-medium text-yc-ink">{fmt(s.count)}</span>
                        <span className="text-[12px] text-yc-ink-3">
                          {s.kind === "company" ? "companies" : s.kind === "tag" || s.kind === "location" || s.kind === "batch" ? "companies" : "founders"}
                        </span>
                        {active === i ? <Icon name="corner-down-left" size={14} /> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {synonyms.length ? (
              <>
                <div className="flex h-9 items-center px-2 leading-none">
                  <span className="text-[12px] font-medium tracking-[0.72px] text-yc-ink-3">Synonyms expanded</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2 pb-2 pt-1">
                  {synonyms.map(([a, b]) => (
                    <span key={a} className="yc-card flex h-6 items-center gap-1.5 rounded-md bg-white pl-3 pr-2 text-[12px] leading-none">
                      <span className="font-yc-mono font-medium text-yc-ink">{a}</span>
                      <span className="text-yc-ink-3">↔</span>
                      <span className="font-medium text-yc-ink-2">{b}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <div className="flex h-10 items-center justify-between border-t border-yc-line-subtle bg-yc-subtle px-4 text-[12px] leading-none text-yc-ink-3">
            <span className="flex items-center gap-2">
              <Icon name="info-circle" size={12} />
              Search runs on top of active filters — nothing is cleared. Backspace on an empty field removes the last chip.
            </span>
            <span className="shrink-0 font-medium text-yc-ink-2">{query.chips.length} filters kept</span>
          </div>
        </div>
      )}
    </div>
  );
}
