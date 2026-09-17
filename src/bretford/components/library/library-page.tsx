import { Sidebar } from "@/bretford/components/library/sidebar";
import { MobileTopBar } from "@/bretford/components/library/mobile-topbar";
import { LibraryHeader } from "@/bretford/components/library/header";
import { LibraryToolbar } from "@/bretford/components/library/toolbar";
import { StatsRow } from "@/bretford/components/library/stats";
import { SourcesSection } from "@/bretford/components/library/sources";
import { DatabasePanel } from "@/bretford/components/library/database-table";
import { GroupsPanel } from "@/bretford/components/library/groups";
import { PageMotion, type EntranceStep } from "@/bretford/components/motion/page-motion";

/**
 * Entrance choreography. Absolute positions (ms) so the sidebar, header,
 * toolbar and content groups overlap instead of running back to back; the
 * longest branch (group rows) ends around 1.3s.
 */
const entrance: EntranceStep[] = [
  { target: "[data-motion=sidebar-brand]", at: 0, x: -12 },
  { target: "[data-motion=sidebar-item]", at: 80, x: -8, stagger: 25 },
  { target: "[data-motion=header-title]", at: 60, y: 8 },
  { target: "[data-motion=header-action]", at: 120, y: -6, stagger: 40 },
  // Mobile top bar (display:none on desktop) — separate targets so its buttons don't take stagger slots above
  { target: "[data-motion=topbar-brand]", at: 0, x: -12 },
  { target: "[data-motion=topbar-action]", at: 120, y: -6, stagger: 40 },
  { target: "[data-motion=toolbar-tabs], [data-motion=toolbar-action]", at: 200, y: 6, stagger: 40 },
  { target: "[data-motion=stat-card]", at: 260, y: 16, stagger: 80 },
  { target: "[data-motion=source-card]", at: 380, y: 16, stagger: 70 },
  // Table rows: opacity only — a transform on <tr> breaks table layout in some engines.
  { target: "[data-motion=db-row]", at: 520, stagger: 40, duration: 450 },
  { target: "[data-motion=group-item]", at: 520, x: 10, stagger: 50 },
];

/**
 * Library — overview (Figma node 866:6922, 1440×1024).
 *
 * Layout: fixed 264px sidebar on the page background, then an 8px gutter, then
 * the white main panel (rounded 24, elevated) filling the rest of the viewport
 * with an 8px gutter all round (the sidebar sits flush left).
 *
 * Below `md` the sidebar gives way to a white top bar (brand, hamburger
 * drawer, avatar); the panel loses its fixed height so the page itself scrolls
 * and the bottom row stacks.
 *
 * `PageMotion` is the root element: it owns the anime.js scope for the
 * entrance timeline and the delegated micro-interactions.
 */
export function LibraryPage() {
  return (
    <PageMotion steps={entrance} className="flex min-h-dvh w-full bg-base max-md:flex-col">
      <MobileTopBar />
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-clip bg-white shadow-panel m-2 rounded-[16px] md:h-[calc(100dvh-16px)] md:rounded-panel">
        <LibraryHeader />
        <LibraryToolbar />
        <StatsRow />
        <SourcesSection />

        <div className="flex min-h-0 flex-1 gap-4 p-4 max-md:flex-col">
          <DatabasePanel />
          <GroupsPanel />
        </div>
      </main>
    </PageMotion>
  );
}
