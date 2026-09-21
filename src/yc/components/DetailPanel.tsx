import Link from "next/link";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { BatchPill } from "./BatchPill";
import { StatusPill } from "./StatusDot";
import { PanelChrome } from "./PanelChrome";
import { Logo } from "./Logo";
import { fmt, roleLabel } from "@/yc/lib/format";
import { toHref, type Query, BASE } from "@/yc/lib/query";
import type { FounderDetail } from "@/yc/lib/search";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="peek-section flex flex-col gap-4">
      <h3 className="text-[14px] font-medium leading-none tracking-[0.84px] text-yc-ink">{title}</h3>
      {children}
    </section>
  );
}

/** Label / value row. `dense` is the company-card variant (120px label column, 32px row). */
function Field({ label, dense = false, children }: { label: string; dense?: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid items-center gap-2 text-[14px] font-medium leading-none tracking-[-0.1px] ${dense ? "h-8 grid-cols-[120px_1fr]" : "h-9 grid-cols-[124px_1fr]"}`}>
      <span className="text-yc-ink-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-yc-ink">{children}</span>
    </div>
  );
}

type ChipTone = "neutral" | "accent" | "green" | "mono";
/** 24px chip. neutral = white ring; accent = soft indigo w/ inset ring; green = soft green w/ inset ring; mono = white ring + mono blue text (credentials, counts). */
function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: ChipTone }) {
  const t = {
    neutral: "bg-white px-2 text-yc-ink-2 shadow-yc-card",
    accent: "bg-[#eef2ff] pl-2 pr-2.5 text-yc-link shadow-[inset_0_0_0_1px_#c3cbe8]",
    green: "bg-yc-green-soft pl-2 pr-2.5 text-yc-green shadow-[inset_0_0_0_1px_#c3e8d7]",
    mono: "bg-white px-2 font-yc-mono text-yc-focus shadow-yc-card",
  }[tone];
  return <span className={`inline-flex h-6 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium leading-none tracking-[-0.1px] whitespace-nowrap ${t}`}>{children}</span>;
}

/** Background row's right-hand filter link: white ring chip, label + mono count. */
function CountChip({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-lg bg-white px-2 text-[12px] font-medium leading-none tracking-[-0.1px] whitespace-nowrap shadow-yc-card">
      <span className="text-yc-ink">{label}</span>
      <span className="font-yc-mono text-yc-focus">{fmt(count)}</span>
    </span>
  );
}

const ACTION = "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[14px] font-medium leading-none whitespace-nowrap shadow-yc-card max-md:px-2 max-md:text-[12px]";

export function DetailPanel({ f, query, prev, next, counts }: { f: FounderDetail; query: Query; prev: number | null; next: number | null; counts: Record<string, number> }) {
  const c = f.companyRow;
  const s = f.signals;
  const hasBio = !!(f.bio && f.bio.trim());
  const roleText = roleLabel(f.role_bucket, f.title);

  return (
    <PanelChrome query={query} prev={prev} next={next} name={f.name} contentKey={f.id}>
      {/* Header — right padding clears the ‹ › stepper that PanelChrome places absolutely. */}
      <div className="peek-section flex items-center gap-3 px-6 py-5 pr-[92px] max-md:px-4">
        <Avatar name={f.name} src={f.avatar_url} size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-none">
          <h2 className="truncate text-[20px] font-semibold tracking-[-0.1px] text-yc-ink">{f.name}</h2>
          <p className="flex min-w-0 items-center gap-1.5 text-[14px] font-medium">
            <span className="truncate tracking-[-0.1px] text-yc-ink-muted">{roleText}</span>
            <span className="text-[12px] font-normal text-yc-ink-3">·</span>
            <Link href={`${BASE}?q=${encodeURIComponent(c.name)}`} className="flex min-w-0 items-center gap-1.5 text-yc-link hover:underline">
              <Icon name="briefcase-02" size={14} />
              <span className="truncate">{c.name}</span>
            </Link>
          </p>
        </div>
        {f.position ? (
          <span className="font-yc-mono text-[12px] font-medium leading-none tracking-[-0.12px] text-yc-ink-muted whitespace-nowrap">
            {fmt(f.position.index + 1)} of {fmt(f.position.total)}
          </span>
        ) : null}
      </div>

      {/* Actions — full-width grey strip */}
      <div className="peek-section flex items-center gap-2 border-y border-yc-line-subtle bg-yc-subtle px-6 py-3 max-md:px-3">
        <a
          href={f.x_url ?? undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!f.x_url}
          className={`${ACTION} ${f.x_url ? "text-yc-ink hover:bg-yc-hover" : "pointer-events-none text-yc-ink-3"}`}
        >
          <Icon name="icon-x-logo" size={14} />
          {f.x_url ? "Open X" : "No X handle"}
        </a>
        <a href={f.linkedin_url ?? undefined} target="_blank" rel="noreferrer" className={`${ACTION} ${f.linkedin_url ? "text-yc-ink hover:bg-yc-hover" : "pointer-events-none text-yc-ink-3"}`}>
          <Icon name="devicon-linkedin" size={16} />
          LinkedIn
        </a>
        <a href={`https://www.ycombinator.com/companies/${c.slug}`} target="_blank" rel="noreferrer" className={`${ACTION} text-yc-ink hover:bg-yc-hover`}>
          Company
          <Icon name="icon-external-link" size={16} />
        </a>
      </div>
      {f.is_company_account ? (
        <p className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-yc-gold-soft px-3 py-2 text-[12px] font-medium leading-[1.4] text-yc-gold">
          <Icon name="alert-triangle" size={12} />
          This handle is the company’s account, listed on the founder profile — not a personal handle.
        </p>
      ) : null}

      <div className="flex flex-col gap-6 px-6 pb-6 pt-5 max-md:px-4">
        <Section title="PRIMARY INFO">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0 max-md:grid-cols-1">
            <Field label="Role">
              <span className="truncate">{roleText}</span>
              {f.role_bucket === "unknown" ? <span className="text-[12px] font-normal text-yc-ink-3 whitespace-nowrap">· not in title</span> : null}
            </Field>
            <Field label="Team size"><Icon name="users-01" size={14} />{c.team_size ?? "—"}</Field>
            <Field label="Batch"><BatchPill batch={c.batch} season={f.batch_season} /></Field>
            <Field label="Location"><Icon name="marker-pin-01" size={14} /><span className="truncate">{c.location ?? "Unknown"}</span></Field>
            <Field label="Company status"><StatusPill status={c.status} /></Field>
            <Field label="Stage">{c.stage ?? "—"}</Field>
          </div>
        </Section>

        <Section title="BIO">
          {hasBio ? (
            <p className="text-[14px] leading-[1.4] tracking-[-0.1px] text-yc-ink-muted">{f.bio}</p>
          ) : (
            <p className="text-[14px] leading-[1.4] tracking-[-0.1px] text-yc-ink-3">No bio on the YC profile. Background, credentials and discipline below are Unknown — nothing is inferred when the bio is missing.</p>
          )}
          {hasBio ? (
            <p className="flex items-center gap-1.5 text-[12px] font-medium leading-none text-yc-ink-muted">
              <Icon name="icon-info" size={12} />
              Ex-company, school and discipline below are derived from this bio. Nothing is inferred when the bio is missing.
            </p>
          ) : null}
        </Section>

        <Section title="BACKGROUND">
          {s && (s.ex_companies.length || s.schools.length) ? (
            <div className="flex flex-col gap-2">
              {s.ex_companies.map((e) => (
                <div key={e} className="flex h-8 items-center gap-2.5 leading-none">
                  <span className="flex size-6 items-center justify-center rounded-md border border-yc-line-subtle bg-yc-subtle"><Icon name="briefcase-02" size={14} /></span>
                  <span className="text-[14px] font-medium text-yc-ink">{e}</span>
                  <span className="text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted">matched in bio</span>
                  <Link href={`${BASE}?f=${encodeURIComponent(`ex:is:${e}`)}`} className="ml-auto">
                    <CountChip label={`ex-${e}`} count={counts[`ex:${e}`] ?? 0} />
                  </Link>
                </div>
              ))}
              {s.schools.map((sc) => (
                <div key={sc} className="flex h-8 items-center gap-2.5 leading-none">
                  <span className="flex size-6 items-center justify-center rounded-md border border-yc-line-subtle bg-yc-subtle"><Icon name="icon-graduation" size={14} /></span>
                  <span className="text-[14px] font-medium text-yc-ink">{sc}</span>
                  <span className="text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted">matched in bio</span>
                  <Link href={`${BASE}?f=${encodeURIComponent(`school:is:${sc}`)}`} className="ml-auto">
                    <CountChip label={sc} count={counts[`school:${sc}`] ?? 0} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] font-medium leading-none text-yc-ink-3">{hasBio ? "No notable employer or school mentioned in the bio." : "Unknown — no bio."}</p>
          )}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium leading-none tracking-[-0.1px] text-yc-ink-muted">Credentials</span>
              {s && (s.phd || s.mba || s.md || s.dropout || s.forbes) ? (
                <>
                  {s.forbes ? <Chip tone="mono">Forbes 30U30</Chip> : null}
                  {s.phd ? <Chip tone="mono">PhD</Chip> : null}
                  {s.mba ? <Chip tone="mono">MBA</Chip> : null}
                  {s.md ? <Chip tone="mono">MD</Chip> : null}
                  {s.dropout ? <Chip tone="mono">Dropout / Thiel</Chip> : null}
                </>
              ) : (
                <Chip>{hasBio ? "none mentioned" : "unknown"}</Chip>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium leading-none tracking-[-0.1px] text-yc-ink-muted">Discipline</span>
              {s?.discipline ? <Chip tone="accent">{s.discipline[0].toUpperCase() + s.discipline.slice(1)}</Chip> : <Chip>{hasBio ? "not detected" : "unknown"}</Chip>}
              <span className="text-[12px] font-medium leading-none tracking-[-0.1px] text-yc-ink-muted">Keyword match from the bio text, not a classifier.</span>
            </div>
          </div>
        </Section>

        <Section title="TRACK RECORD">
          <div className="flex flex-wrap gap-1.5">
            {f.n_companies && f.n_companies > 1 ? <Chip tone="accent">{f.n_companies}× YC founder</Chip> : null}
            {f.timeline.some((t) => !t.is_current && (t.status === "Acquired" || t.status === "Public")) ? <Chip tone="green">Verified prior exit</Chip> : null}
            {s?.serial ? <Chip tone="accent">Serial founder · self-declared</Chip> : null}
            {s?.exit_declared ? <Chip>Exit mentioned in bio</Chip> : null}
            {!(f.n_companies && f.n_companies > 1) && !s?.serial && !s?.exit_declared ? <Chip>First YC company on record</Chip> : null}
          </div>
          {/* Desktop keeps one column per company; mobile wraps two per row. */}
          {f.timeline.length > 1 ? (
            <ol className="relative grid md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] max-md:grid-cols-2 max-md:gap-y-4" style={{ "--cols": f.timeline.length } as React.CSSProperties}>
              <span className="absolute left-1 right-0 top-[3.5px] h-px bg-yc-line" aria-hidden />
              {f.timeline.map((t) => {
                const body = (
                  <>
                    <span className={`absolute left-0 top-0 size-2 rounded-full ${t.is_current ? "bg-yc-focus" : "bg-yc-line-strong"}`} />
                    <span className="font-yc-mono text-[10px] font-medium tracking-[-0.1px] text-yc-ink-muted">{t.batch_code ?? t.batch}</span>
                    <span className={`truncate text-[14px] font-medium ${t.is_current ? "text-yc-link" : "text-yc-ink group-hover:text-yc-link"}`}>{t.name}</span>
                    <span className="truncate text-[12px] font-medium tracking-[-0.1px] text-yc-ink-muted">{t.status}{t.is_current ? " · this entry" : ""}</span>
                  </>
                );
                // Other entries open the same person's founder row at that company.
                return t.is_current || !t.founder_id ? (
                  <li key={t.company_id} className="relative flex min-w-0 flex-col gap-2 pr-3 pt-5 leading-none">{body}</li>
                ) : (
                  <li key={t.company_id} className="relative min-w-0">
                    <Link href={toHref({ ...query, peek: t.founder_id })} scroll={false} className="group relative flex min-w-0 flex-col gap-2 pr-3 pt-5 leading-none" title={`Open ${f.name} at ${t.name}`}>
                      {body}
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </Section>

        <Section title="COMPANY CONTEXT">
          <div className="flex flex-col gap-3 rounded-xl border border-yc-line bg-yc-surface p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Logo src={c.logo_url} name={c.name} size={28} />
                  <span className="truncate text-[16px] font-semibold leading-none tracking-[-0.2px] text-yc-ink">{c.name}</span>
                </div>
                <StatusPill status={c.status} />
              </div>
              {c.is_hiring ? (
                <a href={`https://www.ycombinator.com/companies/${c.slug}/jobs`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                  <span className="flex h-6 items-center gap-1.5 rounded-lg bg-yc-green-soft pl-2 pr-2.5 text-[12px] font-medium leading-none tracking-[-0.1px] text-yc-green shadow-[inset_0_0_0_1px_#c3e8d7]">
                    <Icon name="icon-briefcase" size={12} />
                    Hiring
                  </span>
                  <Icon name="icon-external-link" size={16} />
                </a>
              ) : null}
            </div>
            {c.one_liner ? <p className="text-[12px] leading-[1.4] text-yc-ink-2">{c.one_liner}</p> : null}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0 border-t border-yc-line pt-3 max-md:grid-cols-1">
              <Field label="Industry" dense><Icon name="icon-building" size={14} /><span className="truncate">{c.industry ?? "—"}</span></Field>
              <Field label="Website" dense>
                {c.website ? (
                  <>
                    <Icon name="globe-02" size={14} />
                    <a href={c.website} target="_blank" rel="noreferrer" className="truncate text-yc-focus hover:underline">{c.website.replace(/^https?:\/\/(www\.)?/, "")}</a>
                  </>
                ) : "—"}
              </Field>
              <Field label="Team size" dense><Icon name="users-01" size={14} />{c.team_size ?? "—"}</Field>
              <Field label="X" dense>
                {c.twitter_url ? (
                  <>
                    <Icon name="icon-x-logo" size={14} />
                    <a href={c.twitter_url} target="_blank" rel="noreferrer" className="truncate text-yc-ink hover:underline">{c.twitter_url.replace(/^https?:\/\/(www\.)?/, "")}</a>
                  </>
                ) : "—"}
              </Field>
              <Field label="Location" dense><Icon name="marker-pin-01" size={14} /><span className="truncate">{c.location ?? "Unknown"}</span></Field>
              <Field label="Batch" dense><BatchPill batch={c.batch} season={f.batch_season} /></Field>
            </div>
            {c.tags.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[12px] leading-none text-yc-ink-3">Tags</span>
                {c.tags.slice(0, 6).map((t) => (
                  <Link key={t} href={`${BASE}?f=${encodeURIComponent(`tags:is:${t}`)}`}>
                    <Chip>{t}</Chip>
                  </Link>
                ))}
                {c.tags.length > 6 ? <span className="text-[12px] leading-none text-yc-ink-3">+{c.tags.length - 6}</span> : null}
              </div>
            ) : null}
            {f.cofounders.length ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-yc-line-subtle pt-3">
                <span className="mr-1 text-[12px] leading-none text-yc-ink-3">Co-founders</span>
                {f.cofounders.map((cf) => (
                  <Link key={cf.id} href={toHref({ ...query, peek: cf.id })} scroll={false}>
                    <Chip>
                      {cf.name}
                      {cf.x_handle ? <span className="font-yc-mono text-yc-ink-3">@{cf.x_handle}</span> : null}
                    </Chip>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {f.timeline.filter((t) => !t.is_current).length ? (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-medium leading-none tracking-[-0.1px] text-yc-ink-muted">
                Also founded · {f.timeline.filter((t) => !t.is_current).length} more YC {f.timeline.filter((t) => !t.is_current).length === 1 ? "company" : "companies"}
              </p>
              {f.timeline
                .filter((t) => !t.is_current)
                .slice()
                .reverse()
                .map((t) => {
                  const card = (
                    <div className="flex flex-col gap-2.5 rounded-xl border border-yc-line bg-yc-surface p-4 group-hover:bg-yc-hover">
                      <div className="flex items-center gap-2.5 max-md:flex-wrap">
                        <Logo src={t.logo_url} name={t.name} size={24} />
                        <span className="truncate text-[14px] font-semibold leading-none tracking-[-0.1px] text-yc-ink">{t.name}</span>
                        <StatusPill status={t.status} />
                        <BatchPill batch={t.batch} season={t.batch_season} className="ml-auto max-md:ml-0 max-md:basis-full max-md:self-start" />
                      </div>
                      {t.one_liner ? <p className="text-[12px] leading-[1.4] text-yc-ink-2">{t.one_liner}</p> : null}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium leading-none tracking-[-0.1px] text-yc-ink-muted">
                        <span className="flex items-center gap-1.5"><Icon name="icon-building" size={14} />{t.industry ?? "—"}</span>
                        <span className="flex items-center gap-1.5"><Icon name="marker-pin-01" size={14} />{t.location ?? "Unknown"}</span>
                        <span className="flex items-center gap-1.5"><Icon name="users-01" size={14} />{t.team_size ?? "—"}</span>
                        {t.founder_id ? <span className="ml-auto flex items-center gap-1 text-yc-link">Open this entry<Icon name="icon-chevron-right" size={12} /></span> : null}
                      </div>
                    </div>
                  );
                  return t.founder_id ? (
                    <Link key={t.company_id} href={toHref({ ...query, peek: t.founder_id })} scroll={false} className="group block">
                      {card}
                    </Link>
                  ) : (
                    <div key={t.company_id}>{card}</div>
                  );
                })}
            </div>
          ) : null}
        </Section>
      </div>
    </PanelChrome>
  );
}
