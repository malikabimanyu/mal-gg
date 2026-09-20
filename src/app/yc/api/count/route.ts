import { NextResponse } from "next/server";
import { parseQuery } from "@/yc/lib/query";
import { runQuery } from "@/yc/lib/search";

export const dynamic = "force-dynamic";

/** Live "N results with your other filters" for popovers. Same URL grammar as the page. */
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const obj: Record<string, string | string[]> = {};
  for (const [k, v] of sp.entries()) {
    const cur = obj[k];
    obj[k] = cur === undefined ? v : Array.isArray(cur) ? [...cur, v] : [cur, v];
  }
  const qy = parseQuery(obj);
  const r = runQuery({ ...qy, pageSize: 1, page: 1 });
  return NextResponse.json({ total: r.total, companies: r.companies });
}
