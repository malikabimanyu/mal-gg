/** Batch label in the design's mono chip: white ring chip, text colour follows the season (Winter blue, Spring green, Summer orange, Fall purple). */
const TONE: Record<string, string> = {
  Winter: "text-yc-focus",
  Spring: "text-yc-green",
  Summer: "text-[#d67f02]",
  Fall: "text-[#a560f5]",
};
export function BatchPill({ batch, season, className = "" }: { batch: string; season?: string | null; className?: string }) {
  const tone = TONE[season ?? ""] ?? "text-yc-ink-muted";
  return (
    <span className={`inline-flex h-6 items-center justify-center rounded-lg bg-white px-2 font-yc-mono text-[12px] font-medium leading-none whitespace-nowrap shadow-yc-card ${tone} ${className}`}>{batch}</span>
  );
}
