"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { parseQuery, toHref, type Query } from "./query";

/** Client-side bridge: the URL is the single source of truth for the whole page. */
export function useQueryNav() {
  const sp = useSearchParams();
  const router = useRouter();
  const [pending, start] = useTransition();

  const query = useMemo(() => {
    const obj: Record<string, string | string[]> = {};
    for (const [k, v] of sp.entries()) {
      const cur = obj[k];
      obj[k] = cur === undefined ? v : Array.isArray(cur) ? [...cur, v] : [cur, v];
    }
    return parseQuery(obj);
  }, [sp]);

  const push = useCallback(
    (next: Query, opts: { replace?: boolean; scroll?: boolean } = {}) => {
      const href = toHref(next);
      start(() => {
        if (opts.replace) router.replace(href, { scroll: opts.scroll ?? false });
        else router.push(href, { scroll: opts.scroll ?? false });
      });
    },
    [router],
  );

  return { query, push, pending };
}
