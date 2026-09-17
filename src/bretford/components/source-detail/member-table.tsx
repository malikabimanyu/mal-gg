import { Avatar } from "@/bretford/components/ui/avatar";
import { Tag } from "@/bretford/components/ui/badge";
import { Icon } from "@/bretford/components/ui/icon";
import { PanelHeader } from "@/bretford/components/source-detail/panel-header";
import { TableScroller } from "@/bretford/components/ui/table-scroller";
import { formatJoinDate, type Member } from "@/bretford/lib/sources-data";
import { cn } from "@/bretford/lib/cn";

/* Header cells: 40px grey strip, 14px medium soft text. The design clips a
   wrapper at 12px; on a real <table> the radius goes on the end cells. */
const th = "h-10 bg-disable px-3 py-[10px] text-left align-middle text-[14px] font-medium leading-none text-soft";

const td = "px-3 py-[10px] align-middle";

/**
 * Member — first panel of the source-detail content column (Figma 866:7311).
 *
 * Real <table> so the columns line up like the design: Candidate 280px,
 * Status 140px, Join 140px, Connection takes the rest, 30px trailing actions.
 * Everything in the rows comes from `members`; only the column headers and
 * the "Member" labels are static.
 */
export function MemberTable({ members }: { members: Member[] }) {
  return (
    <section
      data-motion="panel"
      className="flex w-full shrink-0 flex-col gap-4 overflow-clip rounded-card bg-white p-4 shadow-card-soft max-md:h-auto"
    >
      <PanelHeader icon="user-tile" title="Member" />

      {/* Below md the wrapper scrolls sideways (728px = 240/140/140 + the widest
         Connection tag + 30px actions, so no tag bleeds into the next cell);
         TableScroller draws the slim scroll track from the mobile frame under it. */}
      <TableScroller>
        <table className="w-full table-fixed border-separate border-spacing-0 max-md:min-w-[728px]">
          <colgroup>
            <col className="w-[280px] max-md:w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[140px]" />
            <col />
            <col className="w-[30px]" />
          </colgroup>

          <thead>
            <tr>
              <th scope="col" className={cn(th, "rounded-l-[12px]")}>
                Candidate
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={th}>
                Join
              </th>
              <th scope="col" className={th}>
                Connection
              </th>
              <th scope="col" className={cn(th, "rounded-r-[12px]")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {members.map((member, i) => {
              // Every row but the last has a 1px soft rule underneath (`rule-b`, the
              // inset hairline) rather than border-b so the row stays exactly 60px
              // (Blink adds a cell border outside the row's specified height).
              const rule = i < members.length - 1 && "rule-b";

              return (
                <tr key={member.email} data-motion="member-row" className="h-[60px]">
                  <td className={cn(td, rule)}>
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} tone={member.tone} />
                      <div className="flex min-w-0 flex-col gap-[6px] leading-none whitespace-nowrap">
                        <span className="truncate text-[14px] font-medium text-loud">{member.name}</span>
                        <span className="truncate text-[12px] font-normal text-soft">{member.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className={cn(td, rule)}>
                    <div className="flex items-center">
                      <Tag>Member</Tag>
                    </div>
                  </td>

                  <td className={cn(td, rule, "text-[14px] font-medium leading-none whitespace-nowrap text-normal")}>
                    {formatJoinDate(member.joined)}
                  </td>

                  <td className={cn(td, rule)}>
                    <div className="flex items-center">
                      {member.connections > 0 ? (
                        <Tag tone="primary">{member.connections} connection uploaded</Tag>
                      ) : (
                        <Tag ring={false}>no connection uploaded</Tag>
                      )}
                    </div>
                  </td>

                  <td className={cn("px-2 py-[10px] align-middle", rule)}>
                    <div className="flex items-center justify-center">
                      {/* 14px glyph as drawn; the 24px hit area bleeds into the cell padding via negative margins */}
                      <button
                        type="button"
                        aria-label="Row actions"
                        className={cn(
                          "-mx-[5px] flex size-6 shrink-0 items-center justify-center rounded-[6px] outline-none",
                          "transition-colors duration-200 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/40",
                        )}
                      >
                        <Icon name="dots-horizontal" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroller>
    </section>
  );
}
