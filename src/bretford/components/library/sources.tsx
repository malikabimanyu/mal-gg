import Link from "next/link";
import { sourceHref } from "@/bretford/lib/routes";
import { Button } from "@/bretford/components/ui/button";
import { Chip, StatusBadge } from "@/bretford/components/ui/badge";
import { Icon } from "@/bretford/components/ui/icon";
import { sources, type Source } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

/**
 * Small 8×4 pill next to each source title. The colored drop shadow is tinted
 * with the pill's own color, so it lives here rather than in a shared token.
 */
const pillTone: Record<Source["tone"], string> = {
  orange:
    "bg-accent-orange shadow-[0px_2px_4px_0px_rgba(255,161,0,0.16),0px_1px_2px_0px_rgba(9,9,11,0.08)]",
  blue: "bg-accent-blue shadow-[0px_2px_4px_0px_rgba(66,155,255,0.16),0px_1px_2px_0px_rgba(9,9,11,0.08)]",
};

/** "Sources" — the row of four source cards under the stats (Figma 866:6978). */
export function SourcesSection() {
  return (
    <section className="flex w-full shrink-0 flex-col gap-4 rule-b p-4">
      <div className="flex w-full items-center justify-between">
        <h2 className="text-[16px] font-medium leading-none whitespace-nowrap text-loud">Sources</h2>
        <Button variant="ghost" aria-label="Expand sources">
          <Icon name="expand-01" />
        </Button>
      </div>

      <ul className="flex w-full items-center gap-4 max-md:flex-col max-md:items-stretch">
        {sources.map((source) => (
          <SourceCard key={source.slug} source={source} />
        ))}
      </ul>
    </section>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <li
      data-motion="source-card"
      className="relative flex min-w-0 flex-1 flex-col overflow-clip rounded-card bg-subtle p-[2px] shadow-card-soft"
    >
      {/* Top block: pill + title + menu, then description */}
      <div className="flex w-full flex-col justify-center gap-[6px] px-3 pt-[10px] pb-3">
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-[6px]">
            <span
              aria-hidden
              className={cn("pointer-events-none relative h-1 w-2 shrink-0 rounded-[3px]", pillTone[source.tone])}
            >
              <span className="absolute inset-0 rounded-[inherit] shadow-glow" />
            </span>
            <h3 className="text-[14px] font-medium leading-none whitespace-nowrap text-loud">
              {/* Stretched link: the whole card opens the source; the menu button stays above it (z-10) */}
              <Link
                href={sourceHref(source.slug)}
                className="outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-primary/40"
              >
                {source.title}
              </Link>
            </h3>
          </div>

          <button
            type="button"
            aria-label="More options"
            className={cn(
              "relative z-10 -m-1 flex shrink-0 items-center justify-center rounded-[6px] p-1",
              "outline-none transition-colors hover:bg-base focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
          >
            <Icon name="dots-vertical" />
          </button>
        </div>

        <p className="w-full text-[14px] font-normal leading-5 text-normal [word-break:break-word]">
          {source.description}
        </p>
      </div>

      {/* Bottom block: white meta card */}
      <dl className="flex w-full flex-col gap-3 overflow-clip rounded-[14px] bg-white p-3 shadow-card-soft">
        <div className="flex w-full items-center gap-2">
          <dt className="min-w-0 flex-1 text-[12px] font-normal leading-none text-loud">Status:</dt>
          <dd className="flex shrink-0">
            <StatusBadge status={source.status} weight="regular" />
          </dd>
        </div>
        <div className="flex w-full items-center gap-2">
          <dt className="min-w-0 flex-1 text-[12px] font-normal leading-none text-loud">Candidates:</dt>
          <dd className="flex shrink-0">
            <Chip className="font-normal">{source.candidates} candidates</Chip>
          </dd>
        </div>
        <div className="flex w-full items-center gap-2">
          <dt className="min-w-0 flex-1 text-[12px] font-normal leading-none text-loud">Created by:</dt>
          <dd className="flex shrink-0">
            <Chip className="font-normal">{source.createdBy}</Chip>
          </dd>
        </div>
      </dl>
    </li>
  );
}
