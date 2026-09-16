import { Sidebar } from "@/bretford/components/library/sidebar";
import { LibraryHeader } from "@/bretford/components/library/header";
import { OverviewBar } from "@/bretford/components/source-detail/overview-bar";
import { SourceInfo } from "@/bretford/components/source-detail/source-info";
import { MemberTable } from "@/bretford/components/source-detail/member-table";
import { CandidateTable } from "@/bretford/components/source-detail/candidate-table";
import { PageMotion, type EntranceStep } from "@/bretford/components/motion/page-motion";
import type { SourceDetail } from "@/bretford/lib/sources-data";

/** Entrance choreography — same rhythm as the Library screen, tables last. */
const entrance: EntranceStep[] = [
  { target: "[data-motion=sidebar-brand]", at: 0, x: -12 },
  { target: "[data-motion=sidebar-item]", at: 80, x: -8, stagger: 25 },
  { target: "[data-motion=header-title]", at: 60, y: 8 },
  { target: "[data-motion=header-action]", at: 120, y: -6, stagger: 40 },
  { target: "[data-motion=overview-title]", at: 180, y: 6 },
  { target: "[data-motion=overview-action]", at: 200, y: 6, stagger: 40 },
  { target: "[data-motion=info-block]", at: 240, x: -10, stagger: 90 },
  { target: "[data-motion=panel]", at: 300, y: 16, stagger: 120 },
  // Table rows: opacity only — a transform on <tr> breaks table layout in some engines.
  { target: "[data-motion=member-row]", at: 520, stagger: 50, duration: 450 },
  { target: "[data-motion=candidate-row]", at: 620, stagger: 40, duration: 450 },
];

/**
 * Library › {source} — source details (Figma node 866:7241, 1440×1024).
 * Rendered for every slug in `sourceSlugs`; all content comes from `detail`.
 *
 * Layout: shared sidebar + header (breadcrumb mode), an "Overview" bar, then a
 * fixed 320px info column and a scrollable content column with the two tables.
 */
export function SourceDetailPage({ detail }: { detail: SourceDetail }) {
  return (
    <PageMotion steps={entrance} className="flex min-h-dvh w-full bg-base">
      <Sidebar />

      <main className="flex h-[calc(100dvh-16px)] min-w-0 flex-1 flex-col overflow-clip rounded-panel bg-white shadow-panel m-2">
        <LibraryHeader crumb={detail.title} />
        <OverviewBar />

        <div className="flex min-h-0 flex-1 items-start">
          <SourceInfo detail={detail} />

          <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
            <MemberTable members={detail.members} />
            <CandidateTable candidates={detail.candidates} members={detail.members} />
          </div>
        </div>
      </main>
    </PageMotion>
  );
}
