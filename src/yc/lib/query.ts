/**
 * The query model. Everything the page shows is a pure function of the URL.
 *
 *   ?q=stripe&view=table&sort=newest&page=2&one=1
 *   &f=status:is:Active|Public          any-of
 *   &f=batch:not:Winter 2027            none-of
 *   &f=team:between:1-25                inclusive numeric range
 *
 * One `f` param per facet; values are `|`-separated and URL-encoded.
 */

export type Op = "is" | "not" | "between";

export type Chip = {
  field: string;
  op: Op;
  values: string[];
};

export type View = "table" | "cards" | "people";

export const SORTS = [
  { id: "newest", label: "Newest batch" },
  { id: "oldest", label: "Oldest batch" },
  { id: "launched", label: "Recently launched" },
  { id: "team", label: "Largest team" },
  { id: "top", label: "Top companies first", hint: "91 top companies" },
  { id: "reachable", label: "Most reachable", hint: "personal handle + bio + known role" },
  { id: "relevance", label: "Relevance", hint: "needs a search query" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export type Query = {
  q: string;
  view: View;
  sort: SortId;
  page: number;
  pageSize: number;
  /** "One contact per company" — collapse founders to the best contact per company. */
  onePerCompany: boolean;
  chips: Chip[];
  /** Founder id opened in the side panel. */
  peek: number | null;
};

export const PAGE_SIZE = 20;

type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;
const all = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

export function parseChip(raw: string): Chip | null {
  // field:op:values — values may themselves contain ':' (URLs), so split on the first two only.
  const i = raw.indexOf(":");
  const j = raw.indexOf(":", i + 1);
  if (i < 0 || j < 0) return null;
  const field = raw.slice(0, i);
  const op = raw.slice(i + 1, j) as Op;
  const values = raw
    .slice(j + 1)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!["is", "not", "between"].includes(op) || !field || values.length === 0) return null;
  return { field, op, values };
}

export function serializeChip(c: Chip): string {
  return `${c.field}:${c.op}:${c.values.join("|")}`;
}

export function parseQuery(sp: SP): Query {
  const view = first(sp.view);
  const sort = first(sp.sort);
  const rawPage = Number(first(sp.page) ?? 1);
  const page = Number.isFinite(rawPage) ? Math.min(100_000, Math.max(1, Math.floor(rawPage))) : 1;
  const peekRaw = Number(first(sp.peek));
  const q = (first(sp.q) ?? "").trim();
  const sortId: SortId = SORTS.some((s) => s.id === sort) ? (sort as SortId) : "newest";
  return {
    q,
    view: view === "cards" || view === "people" ? view : "table",
    // Relevance needs text to rank against; without a query it silently means "newest".
    sort: sortId === "relevance" && !q ? "newest" : sortId,
    page,
    pageSize: PAGE_SIZE,
    onePerCompany: first(sp.one) === "1",
    chips: all(sp.f)
      .map(parseChip)
      .filter((c): c is Chip => c !== null),
    peek: Number.isFinite(peekRaw) && peekRaw > 0 ? peekRaw : null,
  };
}

export function toSearchParams(qy: Query): URLSearchParams {
  const p = new URLSearchParams();
  if (qy.q) p.set("q", qy.q);
  if (qy.view !== "table") p.set("view", qy.view);
  if (qy.sort !== "newest") p.set("sort", qy.sort);
  if (qy.page > 1) p.set("page", String(qy.page));
  if (qy.onePerCompany) p.set("one", "1");
  for (const c of qy.chips) p.append("f", serializeChip(c));
  if (qy.peek) p.set("peek", String(qy.peek));
  return p;
}

/** The directory is mounted at mal.gg/yc; every internal link, fetch and asset is prefixed. */
export const BASE = "/yc";

export function toHref(qy: Query): string {
  const s = toSearchParams(qy).toString();
  return s ? `${BASE}?${s}` : BASE;
}

/** Replace (or remove, when values is empty) the chip for `field`. Resets paging. */
export function withChip(qy: Query, field: string, op: Op, values: string[]): Query {
  const chips = qy.chips.filter((c) => c.field !== field);
  if (values.length) chips.push({ field, op, values });
  return { ...qy, chips, page: 1 };
}

export function withoutChip(qy: Query, field: string): Query {
  return { ...qy, chips: qy.chips.filter((c) => c.field !== field), page: 1 };
}

export function chipFor(qy: Query, field: string): Chip | undefined {
  return qy.chips.find((c) => c.field === field);
}

/** Toggle a single value inside an any-of chip (checkbox semantics). */
export function toggleValue(qy: Query, field: string, value: string): Query {
  const cur = chipFor(qy, field);
  if (!cur || cur.op !== "is") return withChip(qy, field, "is", [value]);
  const has = cur.values.includes(value);
  const values = has ? cur.values.filter((v) => v !== value) : [...cur.values, value];
  return withChip(qy, field, "is", values);
}
