import { Button } from "@/bretford/components/ui/button";
import { StatusBadge, type Status } from "@/bretford/components/ui/badge";
import { Icon, type IconName } from "@/bretford/components/ui/icon";
import { databases } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

/** 24px icon tile in the Name cell — tint and glyph follow the row status. */
const tile: Record<Status, { bg: string; icon: IconName }> = {
  active: { bg: "bg-tint-green", icon: "database-green" },
  synced: { bg: "bg-tint-blue", icon: "database-blue" },
  archived: { bg: "bg-tint-orange", icon: "database-orange" },
};

/* Header cells: 40px tall grey strip, 14px medium soft text. The first/last
   cell carry the 14px outer radius (the design clips a wrapper; on a real
   <table> the radius on the end cells is the equivalent). */
const th = "h-10 bg-disable px-3 py-[10px] text-left align-middle text-[14px] font-medium leading-none text-soft";

const td = "px-3 py-[10px] align-middle";

/**
 * Database — left panel of the bottom row (Figma 866:7077).
 *
 * Real <table> so the columns line up like the design: Name 240px, Record and
 * Status share the remaining width, 56px trailing actions column.
 */
export function DatabasePanel() {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col gap-4 overflow-clip rounded-card bg-white p-4 shadow-card-soft">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-[16px] font-medium leading-none text-loud">Database</h2>
        <Button variant="ghost" aria-label="Expand database">
          <Icon name="expand-01" />
        </Button>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[240px]" />
          <col />
          <col />
          <col className="w-[56px]" />
        </colgroup>

        <thead>
          <tr>
            <th scope="col" className={cn(th, "rounded-l-[14px]")}>
              Name
            </th>
            <th scope="col" className={th}>
              Record
            </th>
            <th scope="col" className={th}>
              Status
            </th>
            <th scope="col" className={cn(th, "rounded-r-[14px]")} />
          </tr>
        </thead>

        <tbody>
          {databases.map((row, i) => {
            const t = tile[row.status];
            // Every row but the last has a 1px soft rule underneath (as in the design).
            // Drawn as an inset shadow rather than border-b: Blink adds a cell's border
            // outside the row's specified height, which would make rows 53px instead of 52.
            const rule = i < databases.length - 1 && "shadow-[inset_0_-1px_0_0_var(--border-soft)]";

            return (
              <tr key={row.name} data-motion="db-row" className="h-[52px]">
                <td className={cn(td, rule)}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("flex size-6 shrink-0 items-center justify-center rounded-[6px]", t.bg)}
                    >
                      <Icon name={t.icon} size={12} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-none text-loud">
                      {row.name}
                    </span>
                  </div>
                </td>

                <td className={cn(td, rule, "text-[14px] font-medium leading-none whitespace-nowrap text-normal")}>
                  {row.records}
                </td>

                <td className={cn(td, rule)}>
                  <div className="flex items-center">
                    <StatusBadge status={row.status} />
                  </div>
                </td>

                <td className={cn(td, rule)}>
                  <button
                    type="button"
                    aria-label="Row actions"
                    className={cn(
                      "mx-auto flex size-8 items-center justify-center rounded-[8px] outline-none",
                      "transition-colors duration-200 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40",
                    )}
                  >
                    <Icon name="dots-horizontal" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
