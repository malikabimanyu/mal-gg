import type Database from "better-sqlite3";
import { db } from "./db";
import { FACETS, FACET_BY_ID, getFacet, chipPredicate, type Facet, type Option, type Pred } from "./facets";
import type { Query, SortId } from "./query";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export type FounderRow = {
  id: number;
  name: string;
  title: string | null;
  role_bucket: string;
  avatar_url: string | null;
  x_handle: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  bio: string | null;
  is_company_account: number;
  company_id: number;
  company: string;
  slug: string;
  batch: string;
  batch_code: string | null;
  batch_season: string | null;
  status: string;
  industry: string | null;
  location: string | null;
  team_size: number | null;
  is_hiring: number;
  logo_url: string | null;
  one_liner: string | null;
  n_companies: number | null;
};

export type OptionCount = Option & { count: number };
export type FacetCounts = Record<string, OptionCount[]>;

export type Coverage = { role: number; bio: number; ex: number; school: number };

export type BatchBar = { rank: number; code: string; batch: string; n: number };

export type SearchResult = {
  rows: FounderRow[];
  total: number;
  companies: number;
  universe: number;
  facets: FacetCounts;
  coverage: Coverage;
  histogram: BatchBar[];
  batches: { min: number; max: number; peak: BatchBar | null };
  activeFilterCount: number;
  /** effective page after clamping to the last page */
  page: number;
};

// ---------------------------------------------------------------------------
// Dynamic facet options (industry tree, tags, locations, ex-company, school)
// ---------------------------------------------------------------------------

let hydrated = false;

function tableExists(d: Database.Database, name: string): boolean {
  return !!d.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

export function hydrateFacets(): void {
  if (hydrated) return;
  const d = db();

  // Industry → Subindustry
  const subs = d
    .prepare(
      `SELECT industry, subindustry, COUNT(*) n FROM companies
       WHERE industry IS NOT NULL GROUP BY industry, subindustry ORDER BY industry, n DESC`,
    )
    .all() as Array<{ industry: string; subindustry: string | null; n: number }>;
  const industries = [...new Set(subs.map((s) => s.industry))].filter((i) => i !== "Unspecified");
  const indOpts: Option[] = [];
  for (const ind of industries) {
    indOpts.push({ value: ind, label: ind, sql: "c.industry = ?", params: [ind] });
    for (const s of subs.filter((x) => x.industry === ind && x.subindustry && x.subindustry.includes(" -> "))) {
      const child = s.subindustry!.split(" -> ")[1];
      indOpts.push({ value: s.subindustry!, label: child, sql: "c.subindustry = ?", params: [s.subindustry], parent: ind });
    }
  }
  indOpts.push({ value: "Unspecified", label: "Unspecified", sql: "c.industry = 'Unspecified'", note: "Missing classification" });
  FACET_BY_ID.industry.options = indOpts;

  // Tag families → canonical tags
  if (tableExists(d, "families")) {
    const fams = d.prepare("SELECT family, n FROM families ORDER BY sort_order").all() as Array<{ family: string; n: number }>;
    const tags = d.prepare("SELECT tag, family, n FROM tag_families ORDER BY n DESC").all() as Array<{ tag: string; family: string; n: number }>;
    const tagOpts: Option[] = [];
    for (const f of fams) {
      tagOpts.push({
        value: `family:${f.family}`,
        label: f.family,
        sql: "EXISTS (SELECT 1 FROM json_each(c.tag_families) WHERE value = ?)",
        params: [f.family],
      });
      for (const t of tags.filter((x) => x.family === f.family)) {
        tagOpts.push({
          value: t.tag,
          label: t.tag,
          sql: "EXISTS (SELECT 1 FROM json_each(c.tags_canon) WHERE value = ?)",
          params: [t.tag],
          parent: `family:${f.family}`,
        });
      }
    }
    tagOpts.push({ value: "untagged", label: "Untagged", sql: "json_array_length(c.tags_canon) = 0", note: "No tags in yc.db — classification is missing, not absent." });
    FACET_BY_ID.tags.options = tagOpts;
  }

  // Location: macro region → country → metro / city
  if (tableExists(d, "company_locations")) {
    const rows = d
      .prepare(
        `SELECT macro_region, country, metro, city, COUNT(DISTINCT company_id) n
         FROM company_locations GROUP BY macro_region, country, metro, city ORDER BY n DESC`,
      )
      .all() as Array<{ macro_region: string | null; country: string; metro: string | null; city: string | null; n: number }>;
    const locOpts: Option[] = [];
    const regions = new Map<string, number>();
    const countries = new Map<string, { region: string | null; n: number }>();
    const metros = new Map<string, { country: string; n: number }>();
    for (const r of rows) {
      if (r.macro_region) regions.set(r.macro_region, (regions.get(r.macro_region) ?? 0) + r.n);
      const c = countries.get(r.country) ?? { region: r.macro_region, n: 0 };
      c.n += r.n;
      countries.set(r.country, c);
      if (r.metro) {
        const m = metros.get(r.metro) ?? { country: r.country, n: 0 };
        m.n += r.n;
        metros.set(r.metro, m);
      }
    }
    for (const [region] of [...regions].sort((a, b) => b[1] - a[1])) {
      locOpts.push({ value: `region:${region}`, label: region, sql: "EXISTS (SELECT 1 FROM company_locations l WHERE l.company_id = c.id AND l.macro_region = ?)", params: [region] });
      for (const [country] of [...countries].filter(([, i]) => i.region === region).sort((a, b) => b[1].n - a[1].n)) {
        locOpts.push({ value: `country:${country}`, label: country, sql: "EXISTS (SELECT 1 FROM company_locations l WHERE l.company_id = c.id AND l.country = ?)", params: [country], parent: `region:${region}` });
        for (const [metro] of [...metros].filter(([, m]) => m.country === country).sort((a, b) => b[1].n - a[1].n)) {
          locOpts.push({ value: `metro:${metro}`, label: metro, sql: "EXISTS (SELECT 1 FROM company_locations l WHERE l.company_id = c.id AND l.metro = ?)", params: [metro], parent: `country:${country}`, note: "metro" });
        }
        const cities = rows.filter((r) => r.country === country && r.city && !r.metro).slice(0, 12);
        for (const r of cities) {
          locOpts.push({ value: `city:${r.city}~${country}`, label: r.city!, sql: "EXISTS (SELECT 1 FROM company_locations l WHERE l.company_id = c.id AND l.city = ? AND l.country = ?)", params: [r.city, country], parent: `country:${country}` });
        }
      }
    }
    locOpts.push({ value: "unknown", label: "Unknown location", sql: "NOT EXISTS (SELECT 1 FROM company_locations l WHERE l.company_id = c.id)" });
    FACET_BY_ID.location.options = locOpts;
  }

  // Ex-company / School — from the bio-signals tables (may not exist until that script has run)
  if (tableExists(d, "employers")) {
    const emp = d.prepare("SELECT name, grp, n FROM employers WHERE n >= 3 ORDER BY n DESC").all() as Array<{ name: string; grp: string; n: number }>;
    FACET_BY_ID.ex.options = emp.map((e) => ({
      value: e.name,
      label: e.name,
      note: e.grp,
      sql: "EXISTS (SELECT 1 FROM json_each(fs.ex_companies) WHERE value = ?)",
      params: [e.name],
    }));
  }
  if (tableExists(d, "schools")) {
    const sch = d.prepare("SELECT name, n FROM schools WHERE n >= 3 ORDER BY n DESC").all() as Array<{ name: string; n: number }>;
    FACET_BY_ID.school.options = sch.map((s) => ({
      value: s.name,
      label: s.name,
      sql: "EXISTS (SELECT 1 FROM json_each(fs.schools) WHERE value = ?)",
      params: [s.name],
    }));
  }
  hydrated = true;
}

// ---------------------------------------------------------------------------
// SQL assembly
// ---------------------------------------------------------------------------

const BASE_FROM = `
  FROM founders f
  JOIN companies c ON c.id = f.company_id
  LEFT JOIN founder_signals fs ON fs.founder_id = f.id
  LEFT JOIN persons p ON p.person_key = f.person_key`;

/** Turn free text into an FTS5 MATCH expression: each token as a quoted prefix. */
function ftsExpr(q: string): string {
  const toks = q
    .replace(/[^\p{L}\p{N}\s@.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^@/, "").replace(/"/g, ""))
    .filter((t) => t.length > 0);
  if (!toks.length) return "";
  return toks.map((t) => `"${t}"*`).join(" ");
}

function textPredicate(q: string): Pred | null {
  const s = q.trim();
  if (!s) return null;
  // @handle or pasted X URL → handle-only match
  const url = s.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})/i);
  const handle = url?.[1] ?? (s.startsWith("@") ? s.slice(1) : null);
  if (handle) return { sql: "lower(f.x_handle) LIKE ?", params: [`${handle.toLowerCase()}%`] };
  // pasted website → company match
  const domain = s.match(/^(https?:\/\/|www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.([a-z]{2,}))(?:\/.*)?$/i);
  const TLDS = new Set(["com", "io", "ai", "co", "org", "net", "dev", "app", "xyz", "so", "me", "sh", "tech", "health", "finance", "cloud", "one", "gg", "ly", "to", "us", "uk", "in", "ca", "de", "fr", "es", "id", "sg", "au", "jp", "kr", "br", "mx", "ng", "ke", "za", "ae", "il"]);
  if (domain && !s.includes(" ") && (domain[1] || TLDS.has(domain[3].toLowerCase()))) return { sql: "lower(c.website) LIKE ?", params: [`%${domain[2].toLowerCase()}%`] };
  const expr = ftsExpr(s);
  if (!expr) return null;
  return {
    sql: `(f.id IN (SELECT rowid FROM founders_fts WHERE founders_fts MATCH ?)
        OR c.id IN (SELECT rowid FROM companies_fts WHERE companies_fts MATCH ?))`,
    params: [expr, expr],
  };
}

/** WHERE clause from every chip except `skipFacet` (for disjunctive facet counts). */
function buildWhere(qy: Query, skipFacet?: string): Pred {
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const chip of qy.chips) {
    if (chip.field === skipFacet) continue;
    const facet = getFacet(chip.field);
    if (!facet) continue;
    const p = chipPredicate(chip, facet);
    if (!p) continue;
    parts.push(p.sql);
    params.push(...p.params);
  }
  const t = textPredicate(qy.q);
  if (t) {
    parts.push(t.sql);
    params.push(...t.params);
  }
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

/** One-contact-per-company: rank founders within a company, keep rank 1. */
const CONTACT_RANK = `ROW_NUMBER() OVER (
  PARTITION BY f.company_id
  ORDER BY CASE f.role_bucket WHEN 'ceo' THEN 0 WHEN 'unknown' THEN 1 WHEN 'cto' THEN 2 WHEN 'product' THEN 3 WHEN 'coo' THEN 4 ELSE 5 END,
           (f.x_handle IS NOT NULL AND f.x_handle <> '' AND COALESCE(f.is_company_account,0) = 0) DESC,
           length(COALESCE(f.bio,'')) DESC, f.name)`;

function orderBy(sort: SortId, hasQuery: boolean): string {
  switch (sort) {
    case "oldest":
      return "c.batch_rank ASC, c.name COLLATE NOCASE, f.name COLLATE NOCASE";
    case "launched":
      return "CASE WHEN c.launched_at IS NULL OR date(c.launched_at,'unixepoch') = '2012-01-17' THEN 1 ELSE 0 END, c.launched_at DESC, f.name COLLATE NOCASE";
    case "team":
      return "c.team_size IS NULL OR c.team_size = 0, c.team_size DESC, c.batch_rank DESC, f.name COLLATE NOCASE";
    case "top":
      return "c.top_company DESC, c.batch_rank DESC, c.name COLLATE NOCASE, f.name COLLATE NOCASE";
    case "reachable":
      return `(f.x_handle IS NOT NULL AND f.x_handle <> '' AND COALESCE(f.is_company_account,0)=0) DESC,
              (COALESCE(fs.has_bio,0)) DESC, (f.role_bucket <> 'unknown') DESC, c.batch_rank DESC, f.name COLLATE NOCASE`;
    case "relevance":
      return hasQuery
        ? `(lower(f.name) LIKE lower(?) ) DESC, (lower(c.name) LIKE lower(?)) DESC, c.top_company DESC, c.batch_rank DESC`
        : "c.batch_rank DESC, c.name COLLATE NOCASE, f.name COLLATE NOCASE";
    default:
      return "c.batch_rank DESC, c.name COLLATE NOCASE, f.name COLLATE NOCASE";
  }
}

const SELECT_ROW = `
  f.id, f.name, f.title, f.role_bucket, f.avatar_url, f.x_handle, f.x_url, f.linkedin_url, f.bio,
  COALESCE(f.is_company_account,0) AS is_company_account,
  c.id AS company_id, c.name AS company, c.slug, c.batch, c.batch_code, c.batch_season, c.status, c.industry,
  COALESCE(c.hq_city || CASE WHEN c.hq_country IS NOT NULL THEN ', ' || c.hq_country ELSE '' END, NULL) AS location,
  c.team_size, c.is_hiring, c.logo_url, c.one_liner, p.n_companies`;

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function runQuery(qy: Query): SearchResult {
  hydrateFacets();
  const d = db();
  const where = buildWhere(qy);

  // Candidate set (optionally collapsed to one contact per company), materialised as a CTE.
  const cte = qy.onePerCompany
    ? `WITH cand AS (SELECT f.id AS fid, ${CONTACT_RANK} AS rn ${BASE_FROM} ${where.sql})
       , sel AS (SELECT fid FROM cand WHERE rn = 1)`
    : `WITH sel AS (SELECT f.id AS fid ${BASE_FROM} ${where.sql})`;

  const totals = d
    .prepare(`${cte} SELECT COUNT(*) AS total, COUNT(DISTINCT f.company_id) AS companies FROM sel JOIN founders f ON f.id = sel.fid`)
    .get(...where.params) as { total: number; companies: number };

  const hasQuery = qy.q.trim().length > 0;
  const order = orderBy(qy.sort, hasQuery);
  const orderParams = qy.sort === "relevance" && hasQuery ? [`%${qy.q.trim()}%`, `%${qy.q.trim()}%`] : [];
  // Clamp to the last page so a stale ?page= never renders an empty table over a non-empty set.
  const pages = Math.max(1, Math.ceil(totals.total / qy.pageSize));
  const page = Math.min(qy.page, pages);
  const rows = d
    .prepare(
      `${cte} SELECT ${SELECT_ROW} ${BASE_FROM} JOIN sel ON sel.fid = f.id
       ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(...where.params, ...orderParams, qy.pageSize, (page - 1) * qy.pageSize) as FounderRow[];

  const universe = (d.prepare("SELECT COUNT(*) n FROM founders").get() as { n: number }).n;

  // Coverage over the current result set.
  const cov = d
    .prepare(
      `${cte} SELECT
         AVG(f.role_bucket <> 'unknown') AS role,
         AVG(COALESCE(fs.has_bio,0)) AS bio,
         AVG(CASE WHEN json_array_length(COALESCE(fs.ex_companies,'[]')) > 0 THEN 1 ELSE 0 END) AS ex,
         AVG(CASE WHEN json_array_length(COALESCE(fs.schools,'[]')) > 0 THEN 1 ELSE 0 END) AS school
       ${BASE_FROM} JOIN sel ON sel.fid = f.id`,
    )
    .get(...where.params) as Coverage;

  // Disjunctive facet counts: each facet counted with every OTHER chip applied.
  const facets = countAllFacets(d, qy);

  // Batch histogram: every batch keeps a bar (0 when empty); other filters applied, batch itself excluded.
  const hsel = materialize(d, qy, "batch", false);
  let histogram: BatchBar[];
  try {
    histogram = d
      .prepare(
        `SELECT b.batch_rank AS rank, b.batch_code AS code, b.batch,
                (SELECT COUNT(DISTINCT s.cid) FROM ${hsel} s JOIN companies c ON c.id = s.cid WHERE c.batch = b.batch) AS n
         FROM batches b WHERE b.batch_rank > 0 ORDER BY b.batch_rank`,
      )
      .all() as BatchBar[];
  } finally {
    d.exec(`DROP TABLE IF EXISTS ${hsel}`);
  }
  const ranks = histogram.map((h) => h.rank);
  const peak = histogram.reduce<BatchBar | null>((m, h) => (m === null || h.n > m.n ? h : m), null);

  return {
    rows,
    total: totals.total,
    companies: totals.companies,
    universe,
    facets,
    coverage: {
      role: cov?.role ?? 0,
      bio: cov?.bio ?? 0,
      ex: cov?.ex ?? 0,
      school: cov?.school ?? 0,
    },
    histogram,
    batches: { min: Math.min(...ranks, 1), max: Math.max(...ranks, 1), peak },
    activeFilterCount: qy.chips.length,
    page,
  };
}

/**
 * Facet counts, disjunctive (Algolia-style): every facet is counted with every OTHER
 * active chip applied. Facets without an active chip share one materialised candidate
 * set; only facets that have a chip need their own. Multi-valued JSON facets (tags,
 * ex-company, school, location) are counted with a single GROUP BY over json_each
 * instead of one correlated subquery per option.
 */
let tempSeq = 0;

function materialize(d: Database.Database, qy: Query, skipFacet?: string, dedupe = qy.onePerCompany): string {
  const where = buildWhere(qy, skipFacet);
  const name = `sel_${++tempSeq}`;
  const sql = dedupe
    ? `CREATE TEMP TABLE ${name} AS
       SELECT fid, cid FROM (SELECT f.id AS fid, c.id AS cid, ${CONTACT_RANK} AS rn ${BASE_FROM} ${where.sql}) WHERE rn = 1`
    : `CREATE TEMP TABLE ${name} AS SELECT f.id AS fid, c.id AS cid ${BASE_FROM} ${where.sql}`;
  d.prepare(sql).run(...where.params);
  d.exec(`CREATE INDEX ${name}_c ON ${name}(cid)`);
  return name;
}

const JSON_FACETS: Record<string, { col: string; entity: Entity; prefix?: string }> = {
  tags: { col: "c.tags_canon", entity: "company" },
  ex: { col: "fs.ex_companies", entity: "founder" },
  school: { col: "fs.schools", entity: "founder" },
};

type Entity = "company" | "founder";

function countAllFacets(d: Database.Database, qy: Query): FacetCounts {
  const out: FacetCounts = {};
  const active = new Set(qy.chips.map((c) => c.field));
  // With one-contact-per-company the count an option WILL produce is "companies with ≥1 founder
  // passing all filters incl. the option", so count DISTINCT companies over the un-deduped set.
  const shared = materialize(d, qy, undefined, false);
  const own: string[] = [];
  try {
    for (const facet of FACETS) {
      if (facet.kind === "range" || !facet.options.length) continue;
      let sel = shared;
      if (active.has(facet.id)) {
        sel = materialize(d, qy, facet.id, false);
        own.push(sel);
      }
      out[facet.id] = countOne(d, facet, sel, qy.onePerCompany ? "company" : facet.entity);
    }
  } finally {
    d.exec(`DROP TABLE IF EXISTS ${shared}`);
    for (const t of own) d.exec(`DROP TABLE IF EXISTS ${t}`);
  }
  return out;
}

function countOne(d: Database.Database, facet: Facet, sel: string, entity: Entity = facet.entity): OptionCount[] {
  const from = `FROM ${sel} s JOIN founders f ON f.id = s.fid JOIN companies c ON c.id = s.cid
                LEFT JOIN founder_signals fs ON fs.founder_id = f.id LEFT JOIN persons p ON p.person_key = f.person_key`;
  const idExpr = entity === "company" ? "c.id" : "f.id";

  // Multi-valued JSON columns: one GROUP BY, then map back onto options.
  const jf = JSON_FACETS[facet.id];
  if (jf) {
    const rows = d.prepare(`SELECT j.value AS v, COUNT(DISTINCT ${idExpr}) AS n ${from}, json_each(${jf.col}) j GROUP BY j.value`).all() as Array<{ v: string; n: number }>;
    const m = new Map(rows.map((r) => [r.v, r.n]));
    let fam = new Map<string, number>();
    if (facet.id === "tags") {
      const f2 = d.prepare(`SELECT j.value AS v, COUNT(DISTINCT c.id) AS n ${from}, json_each(c.tag_families) j GROUP BY j.value`).all() as Array<{ v: string; n: number }>;
      fam = new Map(f2.map((r) => [r.v, r.n]));
    }
    const untagged = facet.id === "tags" ? (d.prepare(`SELECT COUNT(DISTINCT c.id) n ${from} WHERE json_array_length(c.tags_canon) = 0`).get() as { n: number }).n : 0;
    return facet.options.map((o) => ({
      ...o,
      count: o.value === "untagged" ? untagged : o.value.startsWith("family:") ? fam.get(o.value.slice(7)) ?? 0 : m.get(o.value) ?? 0,
    }));
  }

  if (facet.id === "location") {
    const rows = d
      .prepare(
        `SELECT 'region:' || l.macro_region AS v, COUNT(DISTINCT c.id) n ${from} JOIN company_locations l ON l.company_id = c.id WHERE l.macro_region IS NOT NULL GROUP BY l.macro_region
         UNION ALL SELECT 'country:' || l.country, COUNT(DISTINCT c.id) ${from} JOIN company_locations l ON l.company_id = c.id GROUP BY l.country
         UNION ALL SELECT 'metro:' || l.metro, COUNT(DISTINCT c.id) ${from} JOIN company_locations l ON l.company_id = c.id WHERE l.metro IS NOT NULL GROUP BY l.metro
         UNION ALL SELECT 'city:' || l.city || '~' || l.country, COUNT(DISTINCT c.id) ${from} JOIN company_locations l ON l.company_id = c.id WHERE l.city IS NOT NULL GROUP BY l.city, l.country
         UNION ALL SELECT 'unknown', COUNT(DISTINCT c.id) ${from} WHERE NOT EXISTS (SELECT 1 FROM company_locations l WHERE l.company_id = c.id)`,
      )
      .all() as Array<{ v: string; n: number }>;
    const m = new Map(rows.map((r) => [r.v, r.n]));
    return facet.options.map((o) => ({ ...o, count: m.get(o.value) ?? 0 }));
  }

  // Small enum facets: one SUM(CASE…) column per option.
  const cols = facet.options.map((o, i) => `COUNT(DISTINCT CASE WHEN (${o.sql}) THEN ${idExpr} END) AS o${i}`).join(",\n");
  const params = facet.options.flatMap((o) => o.params ?? []);
  const r = d.prepare(`SELECT ${cols} ${from}`).get(...params) as Record<string, number>;
  return facet.options.map((o, i) => ({ ...o, count: r[`o${i}`] ?? 0 }));
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

export type FounderDetail = FounderRow & {
  signals: {
    ex_companies: string[];
    schools: string[];
    phd: number; mba: number; md: number; dropout: number; forbes: number;
    discipline: string | null;
    serial: number; exit_declared: number;
    hook: string | null;
    yc_mentions: string[];
  } | null;
  companyRow: {
    id: number; name: string; slug: string; status: string; one_liner: string | null; industry: string | null;
    subindustry: string | null; website: string | null; twitter_url: string | null; team_size: number | null;
    is_hiring: number; batch: string; batch_code: string | null; stage: string | null; location: string | null;
    tags: string[]; logo_url: string | null; long_description: string | null;
  };
  /** Every YC company this person founded (from identity linking), oldest first. */
  timeline: Array<{
    company_id: number; founder_id: number | null; name: string; slug: string; batch: string; batch_code: string | null;
    batch_season: string | null; status: string; is_current: number; one_liner: string | null; industry: string | null;
    team_size: number | null; location: string | null; logo_url: string | null; is_hiring: number;
  }>;
  cofounders: Array<{ id: number; name: string; role_bucket: string; x_handle: string | null }>;
  position: { index: number; total: number } | null;
};

export function getFounder(id: number, qy?: Query): FounderDetail | null {
  hydrateFacets();
  const d = db();
  const row = d.prepare(`SELECT ${SELECT_ROW} ${BASE_FROM} WHERE f.id = ?`).get(id) as FounderRow | undefined;
  if (!row) return null;

  const sig = tableExists(d, "founder_signals")
    ? (d.prepare("SELECT * FROM founder_signals WHERE founder_id = ?").get(id) as Record<string, unknown> | undefined)
    : undefined;
  const signals = sig
    ? {
        ex_companies: JSON.parse(String(sig.ex_companies ?? "[]")),
        schools: JSON.parse(String(sig.schools ?? "[]")),
        phd: Number(sig.phd ?? 0), mba: Number(sig.mba ?? 0), md: Number(sig.md ?? 0),
        dropout: Number(sig.dropout ?? 0), forbes: Number(sig.forbes ?? 0),
        discipline: (sig.discipline as string | null) ?? null,
        serial: Number(sig.serial ?? 0), exit_declared: Number(sig.exit_declared ?? 0),
        hook: (sig.hook as string | null) ?? null,
        yc_mentions: JSON.parse(String(sig.yc_mentions ?? "[]")),
      }
    : null;

  const c = d
    .prepare(
      `SELECT id, name, slug, status, one_liner, industry, subindustry, website, twitter_url, team_size, is_hiring, batch, batch_code, stage,
              COALESCE(hq_city || CASE WHEN hq_country IS NOT NULL THEN ', ' || hq_country ELSE '' END, all_locations) AS location,
              tags_canon, logo_url, long_description
       FROM companies WHERE id = ?`,
    )
    .get(row.company_id) as Record<string, unknown>;
  const companyRow = { ...(c as FounderDetail["companyRow"]), tags: JSON.parse(String(c.tags_canon ?? "[]")) };

  const timeline = tableExists(d, "person_companies") && row.n_companies && row.n_companies > 1
    ? (d
        .prepare(
          `SELECT pc.company_id, c.name, c.slug, c.batch, c.batch_code, c.batch_season, c.status, (c.id = ?) AS is_current,
                  c.one_liner, c.industry, c.team_size, c.logo_url, c.is_hiring,
                  COALESCE(c.hq_city || CASE WHEN c.hq_country IS NOT NULL THEN ', ' || c.hq_country ELSE '' END, NULL) AS location,
                  (SELECT f2.id FROM founders f2 WHERE f2.company_id = c.id AND f2.person_key = f.person_key LIMIT 1) AS founder_id
           FROM person_companies pc JOIN companies c ON c.id = pc.company_id
           JOIN founders f ON f.id = ? AND pc.person_key = f.person_key
           ORDER BY c.batch_rank`,
        )
        .all(row.company_id, id) as FounderDetail["timeline"])
    : [];

  const cofounders = d
    .prepare("SELECT id, name, role_bucket, x_handle FROM founders WHERE company_id = ? AND id <> ? ORDER BY name")
    .all(row.company_id, id) as FounderDetail["cofounders"];

  // Position inside the current result list (for the "1 of 2,148" stepper).
  let position: FounderDetail["position"] = null;
  if (qy) {
    const where = buildWhere(qy);
    const hasQuery = qy.q.trim().length > 0;
    const order = orderBy(qy.sort, hasQuery);
    const orderParams = qy.sort === "relevance" && hasQuery ? [`%${qy.q.trim()}%`, `%${qy.q.trim()}%`] : [];
    const cte = qy.onePerCompany
      ? `WITH cand AS (SELECT f.id AS fid, ${CONTACT_RANK} AS rn ${BASE_FROM} ${where.sql}), sel AS (SELECT fid FROM cand WHERE rn = 1)`
      : `WITH sel AS (SELECT f.id AS fid ${BASE_FROM} ${where.sql})`;
    const list = d
      .prepare(`${cte} SELECT f.id ${BASE_FROM} JOIN sel ON sel.fid = f.id ORDER BY ${order}`)
      .all(...where.params, ...orderParams) as Array<{ id: number }>;
    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) position = { index: idx, total: list.length };
  }

  return { ...row, signals, companyRow, timeline, cofounders, position };
}

/** Neighbours for the ‹ › stepper in the detail panel. */
export function neighbourIds(qy: Query, id: number): { prev: number | null; next: number | null } {
  const d = db();
  const where = buildWhere(qy);
  const hasQuery = qy.q.trim().length > 0;
  const order = orderBy(qy.sort, hasQuery);
  const orderParams = qy.sort === "relevance" && hasQuery ? [`%${qy.q.trim()}%`, `%${qy.q.trim()}%`] : [];
  const cte = qy.onePerCompany
    ? `WITH cand AS (SELECT f.id AS fid, ${CONTACT_RANK} AS rn ${BASE_FROM} ${where.sql}), sel AS (SELECT fid FROM cand WHERE rn = 1)`
    : `WITH sel AS (SELECT f.id AS fid ${BASE_FROM} ${where.sql})`;
  const list = d.prepare(`${cte} SELECT f.id ${BASE_FROM} JOIN sel ON sel.fid = f.id ORDER BY ${order}`).all(...where.params, ...orderParams) as Array<{ id: number }>;
  const i = list.findIndex((r) => r.id === id);
  return { prev: i > 0 ? list[i - 1].id : null, next: i >= 0 && i < list.length - 1 ? list[i + 1].id : null };
}

// ---------------------------------------------------------------------------
// Search suggestions (the dropdown under the omnibox)
// ---------------------------------------------------------------------------

export type Suggestion = {
  kind: "ex" | "bio" | "company" | "handle" | "tag" | "school" | "location" | "batch";
  label: string;
  hint?: string;
  count: number;
  /** what to do when picked: apply a chip or run text */
  chip?: { field: string; value: string };
  q?: string;
};

export function suggest(q: string, qy?: Query): Suggestion[] {
  hydrateFacets();
  const d = db();
  const s = q.trim();
  if (s.length < 2) return [];
  const like = `%${s.toLowerCase()}%`;
  const out: Suggestion[] = [];

  // Count inside the caller's active filters (text excluded) so "counted against your N filters" is true.
  const base = qy ? { ...qy, q: "" } : null;
  const sel = base && base.chips.length ? materialize(d, base, undefined, false) : null;
  const from = sel
    ? `FROM ${sel} s JOIN founders f ON f.id = s.fid JOIN companies c ON c.id = s.cid LEFT JOIN founder_signals fs ON fs.founder_id = f.id`
    : `FROM founders f JOIN companies c ON c.id = f.company_id LEFT JOIN founder_signals fs ON fs.founder_id = f.id`;
  const countF = (where: string, params: unknown[] = []): number => (d.prepare(`SELECT COUNT(DISTINCT f.id) n ${from} WHERE ${where}`).get(...params) as { n: number }).n;
  const countC = (where: string, params: unknown[] = []): number => (d.prepare(`SELECT COUNT(DISTINCT c.id) n ${from} WHERE ${where}`).get(...params) as { n: number }).n;

  try {
    const ex = FACET_BY_ID.ex.options.filter((o) => o.label.toLowerCase().includes(s.toLowerCase())).slice(0, 2);
    for (const o of ex) out.push({ kind: "ex", label: `Ex-company: ${o.label}`, hint: `worked at ${o.label} · from bios`, count: countF(o.sql, o.params), chip: { field: "ex", value: o.value } });

    const expr = ftsExpr(s);
    if (expr) {
      out.push({ kind: "bio", label: `Founder bio contains “${s}”`, hint: "free text across 9,165 bios", count: countF("f.id IN (SELECT rowid FROM founders_fts WHERE founders_fts MATCH ?)", [`bio:(${expr})`]), q: s });
      out.push({ kind: "company", label: `Company name contains “${s}”`, hint: "includes former names", count: countC("c.id IN (SELECT rowid FROM companies_fts WHERE companies_fts MATCH ?)", [`{name former_names}:(${expr})`]), q: s });
    }
    const handle = countF("lower(f.x_handle) LIKE ? AND COALESCE(f.is_company_account,0)=0", [like]);
    if (handle) out.push({ kind: "handle", label: `Handle contains “${s}”`, hint: "personal handles only", count: handle, q: `@${s}` });

    const tags = FACET_BY_ID.tags.options.filter((o) => !o.value.startsWith("family:") && o.label.toLowerCase().includes(s.toLowerCase())).slice(0, 2);
    for (const o of tags) out.push({ kind: "tag", label: `Tag: ${o.label}`, count: countC(o.sql, o.params), chip: { field: "tags", value: o.value } });

    const sch = FACET_BY_ID.school.options.filter((o) => o.label.toLowerCase().includes(s.toLowerCase())).slice(0, 1);
    for (const o of sch) out.push({ kind: "school", label: `School: ${o.label}`, count: countF(o.sql, o.params), chip: { field: "school", value: o.value } });

    const loc = FACET_BY_ID.location.options.filter((o) => o.label.toLowerCase().startsWith(s.toLowerCase())).slice(0, 2);
    for (const o of loc) out.push({ kind: "location", label: `Location: ${o.label}`, hint: o.value.split(":")[0], count: countC(o.sql, o.params), chip: { field: "location", value: o.value } });

    const b = s.match(/^([wxsf])(\d{2})$/i);
    if (b) {
      const row = d.prepare("SELECT batch, batch_rank FROM batches WHERE upper(batch_code) = ?").get(`${b[1].toUpperCase()}${b[2]}`) as { batch: string; batch_rank: number } | undefined;
      if (row) out.push({ kind: "batch", label: `Batch: ${row.batch}`, count: countC("c.batch_rank = ?", [row.batch_rank]), chip: { field: "batch", value: `${row.batch_rank}-${row.batch_rank}` } });
    }
  } finally {
    if (sel) d.exec(`DROP TABLE IF EXISTS ${sel}`);
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Zero-result relaxation ladder
// ---------------------------------------------------------------------------

export type Relaxation = {
  kind: "remove" | "text" | "or";
  title: string;
  detail: string;
  count: number;
  /** the query to apply */
  next: Query;
};

function rangeLabel(v: string): string {
  const [lo, hi] = v.split("-").map(Number);
  const rows = db().prepare("SELECT batch_rank, batch FROM batches WHERE batch_rank IN (?, ?)").all(lo, hi) as Array<{ batch_rank: number; batch: string }>;
  const a = rows.find((r) => r.batch_rank === lo)?.batch ?? lo;
  const b = rows.find((r) => r.batch_rank === hi)?.batch ?? hi;
  return lo === hi ? String(a) : `${a} – ${b}`;
}

/** For an empty result set: what single change brings rows back, with live counts. */
export function relaxations(qy: Query): Relaxation[] {
  hydrateFacets();
  const out: Relaxation[] = [];
  const countFor = (q: Query): number => {
    const where = buildWhere(q);
    const cte = q.onePerCompany
      ? `WITH cand AS (SELECT f.id AS fid, ${CONTACT_RANK} AS rn ${BASE_FROM} ${where.sql}), sel AS (SELECT fid FROM cand WHERE rn = 1)`
      : `WITH sel AS (SELECT f.id AS fid ${BASE_FROM} ${where.sql})`;
    return (db().prepare(`${cte} SELECT COUNT(*) n FROM sel`).get(...where.params) as { n: number }).n;
  };

  for (const chip of qy.chips) {
    const facet = getFacet(chip.field);
    if (!facet) continue;
    const next = { ...qy, chips: qy.chips.filter((c) => c.field !== chip.field), page: 1 };
    const n = countFor(next);
    if (n > 0) {
      const label = facet.kind === "range" ? rangeLabel(chip.values[0] ?? "") : chip.values.map((v) => facet.options.find((o) => o.value === v)?.label ?? v.replace(/^(metro|city|country|region|family):/, "").split("~")[0]).join(", ");
      out.push({
        kind: "remove",
        title: `Remove ${facet.label}: ${label}`,
        detail: `${facet.label} is the dimension that empties this set — every other filter stays.`,
        count: n,
        next,
      });
    }
  }
  if (qy.q.trim()) {
    const next = { ...qy, q: "", page: 1 };
    const n = countFor(next);
    if (n > 0) out.push({ kind: "text", title: `Drop the search “${qy.q.trim()}”`, detail: "Keep every filter, remove the free-text match.", count: n, next });
  }
  return out.sort((a, b) => a.count - b.count).slice(0, 4);
}
