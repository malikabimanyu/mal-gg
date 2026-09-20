/**
 * Facet registry. Every filter in the sidebar is declared here once and drives
 * three things: the chip → SQL predicate, the option list (with live counts),
 * and the sidebar rendering (group, label, kind).
 *
 * SQL runs against the base join:
 *   founders f  JOIN companies c ON c.id = f.company_id
 *               LEFT JOIN founder_signals fs ON fs.founder_id = f.id
 *               LEFT JOIN persons p ON p.person_key = f.person_key
 */
import type { Chip } from "./query";

export type Pred = { sql: string; params: unknown[] };

export type Option = {
  value: string;
  label: string;
  /** predicate that selects rows having this option */
  sql: string;
  params?: unknown[];
  /** rendered as a nested/indented option under `parent` */
  parent?: string;
  /** small explanatory caption under the option */
  note?: string;
  /** rendered in the "≈" style — derived-from-text counts */
  approx?: boolean;
};

export type FacetKind = "multi" | "range" | "tree" | "toggle";
export type Entity = "company" | "founder";

export type Facet = {
  id: string;
  label: string;
  group: string;
  entity: Entity;
  kind: FacetKind;
  /** shown right-aligned in the collapsed header, e.g. "9·59", "1 – 100+" */
  meta?: string;
  /** sidebar caption under the facet body */
  note?: string;
  /** static options; dynamic facets (tags, ex-company…) fill these at runtime */
  options: Option[];
  /** number of options visible before "Show more" */
  visible?: number;
  /** column used by `range` facets */
  rangeColumn?: string;
  /** which sections start expanded in the sidebar */
  defaultOpen?: boolean;
  /** coverage denominator: predicate for "known" rows (drives the % header) */
  knownSql?: string;
};

export const GROUPS = [
  "Company · Lifecycle",
  "Company · Classification",
  "Company · Structure",
  "Company · Location",
  "Company · Other",
  "Founder · Role",
  "Founder · Background",
  "Founder · Track record",
  "Founder · Profile",
] as const;

const eq = (col: string) => (v: string): Option => ({ value: v, label: v, sql: `${col} = ?`, params: [v] });

const TEAM_BUCKETS: Option[] = [
  { value: "1-5", label: "1–5", sql: "c.team_size BETWEEN 1 AND 5" },
  { value: "6-10", label: "6–10", sql: "c.team_size BETWEEN 6 AND 10" },
  { value: "11-25", label: "11–25", sql: "c.team_size BETWEEN 11 AND 25" },
  { value: "26-50", label: "26–50", sql: "c.team_size BETWEEN 26 AND 50" },
  { value: "51-100", label: "51–100", sql: "c.team_size BETWEEN 51 AND 100" },
  { value: "100+", label: "100+", sql: "c.team_size > 100" },
  { value: "unknown", label: "Unknown team size", sql: "(c.team_size IS NULL OR c.team_size = 0)" },
];

/** Age since batch start, in years, as a SQL expression. */
const AGE_YEARS = "((julianday('now') - julianday(c.batch_start)) / 365.25)";

export const FACETS: Facet[] = [
  // ---------------- Company · Lifecycle ----------------
  {
    id: "batch",
    label: "Batch",
    group: "Company · Lifecycle",
    entity: "company",
    kind: "range",
    rangeColumn: "c.batch_rank",
    options: [],
  },
  {
    id: "status",
    label: "Status",
    group: "Company · Lifecycle",
    entity: "company",
    kind: "multi",
    options: ["Active", "Inactive", "Acquired", "Public"].map(eq("c.status")),
  },
  {
    id: "cohort",
    label: "Cohort age",
    group: "Company · Lifecycle",
    entity: "company",
    kind: "multi",
    meta: "5",
    options: [
      { value: "current", label: "Current batch", sql: "c.batch_rank = (SELECT MAX(batch_rank) FROM batches WHERE n >= 20)" },
      { value: "lt1", label: "< 1 year", sql: `${AGE_YEARS} < 1` },
      { value: "1-3", label: "1–3 years", sql: `${AGE_YEARS} >= 1 AND ${AGE_YEARS} < 3` },
      { value: "3-7", label: "3–7 years", sql: `${AGE_YEARS} >= 3 AND ${AGE_YEARS} < 7` },
      { value: "7+", label: "7+ years", sql: `${AGE_YEARS} >= 7` },
    ],
  },

  // ---------------- Company · Classification ----------------
  {
    id: "industry",
    label: "Industry",
    group: "Company · Classification",
    entity: "company",
    kind: "tree",
    meta: "9·59",
    note: "Unspecified is missing classification, not an industry. Excluded from industry counts.",
    options: [], // filled at runtime from companies.industry / subindustry
  },
  {
    id: "tags",
    label: "Tags",
    group: "Company · Classification",
    entity: "company",
    kind: "tree",
    meta: "337",
    options: [], // families → tags at runtime
  },
  {
    id: "ai",
    label: "AI-native",
    group: "Company · Classification",
    entity: "company",
    kind: "multi",
    meta: "3-state",
    options: [
      { value: "tag", label: "AI", note: "Tag-based · tag is AI", sql: "c.is_ai_tag = 1" },
      { value: "family", label: "AI family", note: "Tag family · AI + synonyms", sql: "c.is_ai_family = 1" },
      { value: "text", label: "AI (text)", note: "Text-based · bio or description", sql: "c.is_ai_text = 1", approx: true },
      { value: "agents", label: "Agents", sql: "c.is_agent = 1", approx: true },
      { value: "pre", label: "Pre-ChatGPT AI", note: "AI, batch ≤ S22", sql: "c.ai_vintage = 'pre-chatgpt'" },
      { value: "non", label: "Non-AI", sql: "c.is_ai_tag = 0 AND c.is_ai_family = 0 AND c.is_ai_text = 0" },
    ],
  },
  {
    id: "form",
    label: "Product form",
    group: "Company · Classification",
    entity: "company",
    kind: "multi",
    meta: "4",
    note: "Derived from tags plus subindustry, not from an atoms-vs-bits guess.",
    options: [
      { value: "hard_tech", label: "Hard tech", sql: "c.product_form = 'hard_tech'", approx: true },
      { value: "marketplace", label: "Marketplace", sql: "c.product_form = 'marketplace'", approx: true },
      { value: "api_infra", label: "API / Infra", sql: "c.product_form = 'api_infra'", approx: true },
      { value: "agent", label: "Agent / Copilot", sql: "c.product_form = 'agent'", approx: true },
      { value: "saas", label: "SaaS", sql: "c.product_form = 'saas'", approx: true },
      { value: "consumer", label: "Consumer app", sql: "c.product_form = 'consumer'", approx: true },
      { value: "open_source", label: "Open source", sql: "c.product_form = 'open_source'", approx: true },
    ],
  },

  // ---------------- Company · Structure ----------------
  {
    id: "team",
    label: "Team size",
    group: "Company · Structure",
    entity: "company",
    kind: "multi",
    meta: "1 – 100+",
    options: TEAM_BUCKETS,
  },
  {
    id: "hires",
    label: "Hires beyond founders",
    group: "Company · Structure",
    entity: "company",
    kind: "multi",
    meta: "4",
    options: [
      { value: "founders_only", label: "Founders only", sql: "c.hires_beyond_founders = 0" },
      { value: "1-5", label: "1–5 hires", sql: "c.hires_beyond_founders BETWEEN 1 AND 5" },
      { value: "6-20", label: "6–20 hires", sql: "c.hires_beyond_founders BETWEEN 6 AND 20" },
      { value: "20+", label: "20+ hires", sql: "c.hires_beyond_founders > 20" },
      { value: "founders_only_hiring", label: "Founders only & hiring", sql: "c.hires_beyond_founders = 0 AND c.is_hiring = 1" },
      { value: "le5_hiring", label: "≤ 5 hires & hiring", sql: "c.hires_beyond_founders <= 5 AND c.is_hiring = 1" },
    ],
  },
  {
    id: "work",
    label: "Work mode",
    group: "Company · Structure",
    entity: "company",
    kind: "multi",
    meta: "3",
    options: [
      { value: "fully_remote", label: "Remote", sql: "c.work_mode = 'fully_remote'" },
      { value: "hybrid", label: "Hybrid", sql: "c.work_mode = 'hybrid'" },
      { value: "in_office", label: "In-office", sql: "c.work_mode = 'in_office'" },
    ],
  },

  // ---------------- Company · Location ----------------
  {
    id: "location",
    label: "Location",
    group: "Company · Location",
    entity: "company",
    kind: "tree",
    meta: "Region",
    options: [], // region → country → metro/city at runtime
  },

  // ---------------- Company · Other ----------------
  {
    id: "more",
    label: "More",
    group: "Company · Other",
    entity: "company",
    kind: "multi",
    meta: "6",
    options: [
      { value: "top", label: "Top company", sql: "c.top_company = 1" },
      { value: "nonprofit", label: "Nonprofit", sql: "c.nonprofit = 1" },
      { value: "github", label: "Has GitHub", sql: "c.github_url IS NOT NULL AND c.github_url <> ''" },
      { value: "crunchbase", label: "Has Crunchbase", sql: "c.cb_url IS NOT NULL AND c.cb_url <> ''" },
      { value: "video", label: "Has pitch video", sql: "(c.has_app_video = 1 OR c.has_demo_day_video = 1)" },
      { value: "renamed", label: "Renamed or pivoted", sql: "c.has_nontrivial_rename = 1" },
      { value: "hiring", label: "Hiring now", sql: "c.is_hiring = 1" },
    ],
  },

  // ---------------- Founder · Role ----------------
  {
    id: "role",
    label: "Role",
    group: "Founder · Role",
    entity: "founder",
    kind: "multi",
    meta: "7",
    visible: 5,
    knownSql: "f.role_bucket <> 'unknown'",
    options: [
      { value: "ceo", label: "CEO", sql: "f.role_bucket = 'ceo'" },
      { value: "cto", label: "CTO", sql: "f.role_bucket = 'cto'" },
      { value: "coo", label: "COO", sql: "f.role_bucket = 'coo'" },
      { value: "product", label: "Product", sql: "f.role_bucket = 'product'" },
      { value: "gtm", label: "GTM", sql: "f.role_bucket = 'gtm'" },
      { value: "science", label: "Science / Medical", sql: "f.role_bucket = 'science'" },
      { value: "finance", label: "Finance", sql: "f.role_bucket = 'finance'" },
      { value: "other", label: "Other", sql: "f.role_bucket = 'other'" },
      { value: "unknown", label: "Unknown role", sql: "f.role_bucket = 'unknown'", note: "Title is a bare “Founder” — mostly 2019–2023 profiles." },
    ],
  },
  {
    id: "shape",
    label: "Team shape",
    group: "Founder · Role",
    entity: "company",
    kind: "multi",
    meta: "4",
    options: [
      { value: "solo", label: "Solo", sql: "c.n_founders = 1" },
      { value: "duo", label: "Duo", sql: "c.n_founders = 2" },
      { value: "trio", label: "Trio", sql: "c.n_founders = 3" },
      { value: "4+", label: "4+", sql: "c.n_founders >= 4" },
      { value: "has_cto", label: "Has CTO", sql: "c.has_cto = 1" },
      { value: "ceo_cto", label: "CEO + CTO", sql: "c.has_cto = 1 AND c.has_ceo = 1" },
      { value: "solo_hiring", label: "Solo & hiring", sql: "c.n_founders = 1 AND c.is_hiring = 1" },
      { value: "cto_unknown", label: "CTO unknown", sql: "c.roles_known = 0", note: "No founder on this company has a role in their title." },
    ],
  },

  // ---------------- Founder · Background ----------------
  {
    id: "ex",
    label: "Ex-company",
    group: "Founder · Background",
    entity: "founder",
    kind: "multi",
    visible: 8,
    knownSql: "fs.has_bio = 1",
    options: [], // from employers table at runtime
  },
  {
    id: "school",
    label: "School",
    group: "Founder · Background",
    entity: "founder",
    kind: "multi",
    meta: "~90",
    visible: 7,
    knownSql: "fs.has_bio = 1",
    options: [], // from schools table at runtime
  },
  {
    id: "cred",
    label: "Credentials",
    group: "Founder · Background",
    entity: "founder",
    kind: "multi",
    meta: "5",
    knownSql: "fs.has_bio = 1",
    options: [
      { value: "phd", label: "PhD", sql: "fs.phd = 1", approx: true },
      { value: "mba", label: "MBA", sql: "fs.mba = 1", approx: true },
      { value: "md", label: "MD", sql: "fs.md = 1", approx: true },
      { value: "dropout", label: "Dropout / Thiel Fellow", sql: "fs.dropout = 1" },
      { value: "forbes", label: "Forbes 30U30", sql: "fs.forbes = 1" },
    ],
  },
  {
    id: "discipline",
    label: "Discipline",
    group: "Founder · Background",
    entity: "founder",
    kind: "multi",
    meta: "3",
    knownSql: "fs.has_bio = 1",
    options: [
      { value: "engineer", label: "Engineer", sql: "fs.discipline = 'engineer'", approx: true },
      { value: "researcher", label: "Researcher", sql: "fs.discipline = 'researcher'" },
      { value: "designer", label: "Designer", sql: "fs.discipline = 'designer'", note: "Mentions design in the bio." },
      { value: "business", label: "Business", sql: "fs.discipline = 'business'", approx: true },
    ],
  },

  // ---------------- Founder · Track record ----------------
  {
    id: "track",
    label: "Track record",
    group: "Founder · Track record",
    entity: "founder",
    kind: "multi",
    meta: "3",
    options: [
      { value: "repeat", label: "Repeat YC founder", sql: "p.n_companies >= 2", approx: true, note: "2× YC · Also founded — shown as a timeline on the founder" },
      { value: "serial", label: "Serial founder", sql: "fs.serial = 1", approx: true },
      { value: "exit", label: "Verified prior exit", sql: "p.n_exits >= 1 AND p.n_companies >= 2" },
    ],
  },

  // ---------------- Founder · Profile ----------------
  {
    id: "bio",
    label: "Has bio",
    group: "Founder · Profile",
    entity: "founder",
    kind: "toggle",
    options: [
      { value: "yes", label: "Has bio", sql: "fs.has_bio = 1" },
      { value: "no", label: "No bio", sql: "(fs.has_bio IS NULL OR fs.has_bio = 0)" },
    ],
  },
  {
    id: "handle",
    label: "Personal vs company handle",
    group: "Founder · Profile",
    entity: "founder",
    kind: "toggle",
    options: [
      { value: "personal", label: "Personal only", sql: "(f.is_company_account IS NULL OR f.is_company_account = 0)" },
      { value: "any", label: "Any handle", sql: "1 = 1" },
    ],
  },
  // Quick controls (not rendered inside a group; live on the toolbar)
  {
    id: "onx",
    label: "On X",
    group: "Quick",
    entity: "founder",
    kind: "toggle",
    options: [
      { value: "any", label: "Any founder", sql: "f.x_handle IS NOT NULL AND f.x_handle <> ''" },
      { value: "ceo", label: "CEO on X", sql: "f.x_handle IS NOT NULL AND f.x_handle <> '' AND f.role_bucket = 'ceo'" },
      { value: "none", label: "Not on X", sql: "(f.x_handle IS NULL OR f.x_handle = '')" },
    ],
  },
];

export const FACET_BY_ID: Record<string, Facet> = Object.fromEntries(FACETS.map((f) => [f.id, f]));

/** Prototype-safe lookup — a chip field like `constructor` must not resolve to a function. */
export function getFacet(id: string): Facet | undefined {
  return Object.hasOwn(FACET_BY_ID, id) ? FACET_BY_ID[id] : undefined;
}

/** Build the SQL predicate for one chip. Unknown values are ignored (never match everything by accident). */
export function chipPredicate(chip: Chip, facet: Facet): Pred | null {
  if (facet.kind === "range" && facet.rangeColumn) {
    const [lo, hi] = (chip.values[0] ?? "").split("-").map(Number);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    const sql = `${facet.rangeColumn} BETWEEN ? AND ?`;
    return { sql: chip.op === "not" ? `NOT (${sql})` : sql, params: [lo, hi] };
  }
  const opts = chip.values.map((v) => facet.options.find((o) => o.value === v)).filter((o): o is Option => !!o);
  if (!opts.length) return null;
  const sql = `(${opts.map((o) => `(${o.sql})`).join(" OR ")})`;
  const params = opts.flatMap((o) => o.params ?? []);
  return { sql: chip.op === "not" ? `NOT ${sql}` : sql, params };
}

/** Human label for a chip in the active-filters bar: "Status is Active", "Team size is any of 1–5 · 6–10". */
export function chipLabel(chip: Chip, facet: Facet, options: Array<{ value: string; label: string }> = facet.options): { field: string; op: string; value: string } {
  const opWord = chip.op === "not" ? "is not" : chip.values.length > 1 ? "is any of" : "is";
  if (facet.kind === "range") {
    return { field: facet.label, op: chip.op === "not" ? "is not" : "is", value: chip.values[0] ?? "" };
  }
  const labels = chip.values.map((v) => options.find((o) => o.value === v)?.label ?? v.replace(/^(metro|city|country|region|family):/, "").split("~")[0]);
  return { field: facet.label, op: opWord, value: labels.join(" · ") };
}
