import { Avatar } from "@/bretford/components/ui/avatar";
import { Tag } from "@/bretford/components/ui/badge";
import { Icon } from "@/bretford/components/ui/icon";
import { PanelHeader } from "@/bretford/components/source-detail/panel-header";
import { TableScroller } from "@/bretford/components/ui/table-scroller";
import { formatJoinDate, type Candidate, type Member } from "@/bretford/lib/sources-data";
import { cn } from "@/bretford/lib/cn";

/* Header cells: 40px grey strip, 14px medium soft text. The design clips the
   header row to a 12px radius; on a real <table> the end cells carry it. */
const th = "h-10 bg-disable px-3 py-[10px] text-left align-middle text-[14px] font-medium leading-none text-soft";

const td = "px-3 py-[10px] align-middle";

/* The LinkedIn cell is an <a> styled exactly like `Button` secondary, but
   full width with a left-aligned, truncating label. It navigates, so it stays
   a link rather than wrapping a button. */
const linkButton =
  "flex w-full min-w-0 items-center gap-1 overflow-clip rounded-[10px] bg-white p-[9px] " +
  "text-[14px] font-medium leading-none whitespace-nowrap text-soft shadow-card select-none " +
  "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
  "transition-[box-shadow,background-color] duration-200 hover:bg-subtle";

/**
 * Candidate panel (Figma 866:7369) — second panel of the source-detail content
 * column. Real <table> so the columns line up like the design: Candidate 300px,
 * Created by 140px, Join 140px, LinkedIn takes the remaining width.
 */
export function CandidateTable({ candidates, members }: { candidates: Candidate[]; members: Member[] }) {
  // `Candidate.createdBy` must name a member of this source; resolve it through
  // the member list so the tag always shows the member record's name.
  const memberByName = new Map(members.map((m) => [m.name, m]));

  return (
    <section
      data-motion="panel"
      className="flex w-full shrink-0 flex-col gap-4 overflow-clip rounded-card bg-white p-4 shadow-card-soft max-md:h-auto"
    >
      <PanelHeader icon="users-tile" title="Candidate" />

      {/* Below md the columns keep their widths and the wrapper scrolls sideways;
         TableScroller draws the slim scroll track from the mobile frame under it. */}
      <TableScroller>
        <table className="w-full table-fixed border-separate border-spacing-0 max-md:min-w-[720px]">
          <colgroup>
            <col className="w-[300px] max-md:w-[240px]" />
            <col className="w-[140px]" />
            <col className="w-[140px]" />
            <col />
          </colgroup>

          <thead>
            <tr>
              <th scope="col" className={cn(th, "rounded-l-[12px]")}>
                Candidate
              </th>
              <th scope="col" className={th}>
                Created by
              </th>
              <th scope="col" className={th}>
                Join
              </th>
              <th scope="col" className={cn(th, "rounded-r-[12px]")}>
                LinkedIn
              </th>
            </tr>
          </thead>

          <tbody>
            {candidates.map((candidate, i) => {
              const creator = memberByName.get(candidate.createdBy)?.name ?? candidate.createdBy;
              // Every row but the last has a 1px soft rule underneath (`rule-b`, the
              // inset hairline) rather than border-b so the row stays exactly 60px.
              const rule = i < candidates.length - 1 && "rule-b";

              return (
                <tr key={candidate.linkedin} data-motion="candidate-row" className="h-[60px]">
                  <td className={cn(td, rule)}>
                    <div className="flex items-center gap-3">
                      <Avatar name={candidate.name} src={candidate.photo} />
                      <div className="flex min-w-0 flex-col gap-[6px] leading-none whitespace-nowrap">
                        <span className="truncate text-[14px] font-medium text-loud">{candidate.name}</span>
                        <span className="truncate text-[12px] font-normal text-soft">{candidate.role}</span>
                      </div>
                    </div>
                  </td>

                  <td className={cn(td, rule)}>
                    <div className="flex items-center">
                      <Tag>{creator}</Tag>
                    </div>
                  </td>

                  <td className={cn(td, rule, "text-[14px] font-medium leading-none whitespace-nowrap text-normal")}>
                    {formatJoinDate(candidate.joined)}
                  </td>

                  <td className={cn("px-2 py-[10px] align-middle", rule)}>
                    <a href={candidate.linkedin} target="_blank" rel="noreferrer" className={linkButton}>
                      <span className="min-w-0 flex-1 truncate">{candidate.linkedin}</span>
                      <Icon name="copy" size={14} />
                    </a>
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
