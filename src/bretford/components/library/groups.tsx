import { Button } from "@/bretford/components/ui/button";
import { Icon } from "@/bretford/components/ui/icon";
import { groups } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

/**
 * Groups panel — right card of the bottom row (Figma node 866:7169).
 *
 * White card with a "Group" title + expand button, then a divided list of
 * talent-pool groups. Each row is a real <button> (rows are clickable in the
 * design) showing a 40px icon tile, the group name and a 12px meta line
 * (sources · candidates · database) with a chevron on the right.
 */
export function GroupsPanel() {
  return (
    <section
      aria-labelledby="groups-title"
      className="flex h-full min-w-0 flex-1 flex-col gap-4 overflow-clip rounded-card bg-white p-4 shadow-card-soft max-md:h-auto"
    >
      <div className="flex w-full items-center justify-between">
        <h2 id="groups-title" className="text-[16px] leading-none font-medium whitespace-nowrap text-loud">
          Group
        </h2>
        <Button variant="ghost" aria-label="Expand groups">
          <Icon name="expand-01" />
        </Button>
      </div>

      <ul className="flex w-full flex-col">
        {groups.map((group, index) => {
          const isFirst = index === 0;
          const isLast = index === groups.length - 1;

          return (
            <li key={group.name} data-motion="group-item" data-nudge="" className="w-full">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 text-left outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  // The 1px divider is an inside stroke in Figma, so it sits
                  // inside the 16px bottom padding: rows are 56/72/72/72/72.
                  isFirst ? "pb-[15px]" : isLast ? "py-4" : "pt-4 pb-[15px]",
                  !isLast && "border-b border-line-soft",
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-clip rounded-[12px] bg-base">
                    <Icon name="layers-three-02" size={24} />
                  </span>

                  <span className="flex flex-col gap-2">
                    <span className="text-[14px] leading-none font-medium whitespace-nowrap text-loud">
                      {group.name}
                    </span>
                    <span className="flex items-center gap-[6px] text-[12px] leading-none font-normal whitespace-nowrap text-normal">
                      <span>{group.sources} sources</span>
                      <Icon name="dot-separator" size={3} />
                      <span>{group.candidates} candidates</span>
                      <Icon name="dot-separator" size={3} />
                      <span>{group.databases} database</span>
                    </span>
                  </span>
                </span>

                {/* The mobile frame has no trailing chevron on group rows. */}
                <Icon name="chevron-right" className="max-md:hidden" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
