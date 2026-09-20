import { NextResponse } from "next/server";
import { parseQuery } from "@/yc/lib/query";
import { suggest } from "@/yc/lib/search";

export const dynamic = "force-dynamic";

/** Omnibox interpretations, counted against the caller's active filters (same URL grammar as the page). */
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const obj: Record<string, string | string[]> = {};
  for (const [k, v] of sp.entries()) {
    const cur = obj[k];
    obj[k] = cur === undefined ? v : Array.isArray(cur) ? [...cur, v] : [cur, v];
  }
  const qy = parseQuery(obj);
  return NextResponse.json({ q: qy.q, items: suggest(qy.q, qy) });
}
