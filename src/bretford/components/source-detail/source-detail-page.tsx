import { Sidebar } from "@/bretford/components/library/sidebar";
import { MobileTopBar } from "@/bretford/components/library/mobile-topbar";
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
  // Mobile top bar (display:none on desktop) — separate targets so its buttons don't take stagger slots above
  { target: "[data-motion=topbar-brand]", at: 0, x: -12 },
  { target: "[data-motion=topbar-action]", at: 120, y: -6, stagger: 40 },
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
 * Below `md`: top bar instead of the sidebar, the columns stack and the page
 * itself scrolls.
 */
export function SourceDetailPage({ detail }: { detail: SourceDetail }) {
  return (
    <PageMotion steps={entrance} className="flex min-h-dvh w-full bg-base max-md:flex-col">
      <MobileTopBar />
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-clip bg-white shadow-panel m-2 rounded-[16px] md:h-[calc(100dvh-16px)] md:rounded-panel">
        <LibraryHeader crumb={detail.title} />
        <OverviewBar />

        <div className="flex min-h-0 flex-1 items-start max-md:flex-col">
          <SourceInfo detail={detail} />

          <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-5 max-md:h-auto max-md:w-full max-md:gap-4 max-md:overflow-visible max-md:p-4">
            <MemberTable members={detail.members} />
            <CandidateTable candidates={detail.candidates} members={detail.members} />
          </div>
        </div>
      </main>
    </PageMotion>
  );
}
