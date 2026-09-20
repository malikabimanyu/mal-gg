import { Suspense } from "react";
import { PageHeader } from "@/yc/components/PageHeader";
import { Toolbar } from "@/yc/components/Toolbar";
import { ChipBar } from "@/yc/components/ChipBar";
import { QuickControls } from "@/yc/components/QuickControls";
import { Sidebar } from "@/yc/components/Sidebar";
import { Results } from "@/yc/components/Results";
import { DetailPanel } from "@/yc/components/DetailPanel";
import { parseQuery } from "@/yc/lib/query";
import { runQuery, getFounder, neighbourIds, relaxations } from "@/yc/lib/search";
import { db } from "@/yc/lib/db";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const query = parseQuery(sp);
  const result = runQuery(query);
  const relax = result.total === 0 ? relaxations(query) : [];

  const peek = query.peek ? getFounder(query.peek, query) : null;
  const nb = peek ? neighbourIds(query, peek.id) : { prev: null, next: null };
  // Facet totals for the "ex-Stripe 61" chips inside the panel.
  const chipCounts: Record<string, number> = {};
  if (peek?.signals) {
    for (const e of peek.signals.ex_companies) chipCounts[`ex:${e}`] = (db().prepare("SELECT n FROM employers WHERE name = ?").get(e) as { n: number } | undefined)?.n ?? 0;
    for (const s of peek.signals.schools) chipCounts[`school:${s}`] = (db().prepare("SELECT n FROM schools WHERE name = ?").get(s) as { n: number } | undefined)?.n ?? 0;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-8 py-8 max-md:px-4">
      <PageHeader />
      <Suspense>
        <Toolbar filterCount={query.chips.length} />
      </Suspense>
      <Suspense>
        <QuickControls facets={result.facets} />
      </Suspense>
      <Suspense>
        <ChipBar facets={result.facets} histogram={result.histogram} />
      </Suspense>
      <div className="flex items-start gap-4">
        <Suspense>
          <Sidebar data={{ facets: result.facets, histogram: result.histogram, batches: result.batches, coverage: result.coverage }} />
        </Suspense>
        <Results result={result} query={query} relax={relax} />
      </div>
      {peek ? <DetailPanel f={peek} query={query} prev={nb.prev} next={nb.next} counts={chipCounts} /> : null}
    </main>
  );
}
