import { CopyButton } from "@/bretford/components/source-detail/copy-button";
import { InviteButton } from "@/bretford/components/source-detail/invite-button";
import { Avatar } from "@/bretford/components/ui/avatar";
import { Button } from "@/bretford/components/ui/button";
import { Field } from "@/bretford/components/ui/field";
import { Icon } from "@/bretford/components/ui/icon";
import type { SourceDetail, SourceIcon } from "@/bretford/lib/sources-data";
import { cn } from "@/bretford/lib/cn";

/* The three stacked blocks share 20/16 padding and an inside bottom hairline
   (rule-b, so the 64px title row stays 64px). */
const block = "w-full rule-b px-5 py-4";

/* Read-only fields still take keyboard focus: ring the whole input-shaped box
   (only for the input — the copy button inside carries its own ring). */
const fieldFocus = "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40";

const readOnlyInput = "min-w-0 truncate bg-transparent outline-none";

/** 1px soft rule between the About / Privacy / Direct-link groups. */
function Hairline() {
  return <span aria-hidden className="block h-px w-full shrink-0 bg-line-soft" />;
}

/** 20px box so a 16px SVG and a 16px emoji glyph line up with the title the same way. */
function SourceGlyph({ icon }: { icon: SourceIcon }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      {icon.kind === "icon" ? (
        <Icon name={icon.name} size={16} />
      ) : (
        <span aria-hidden className="text-[16px] leading-none">
          {icon.char}
        </span>
      )}
    </span>
  );
}

function connectionsLabel(connections: number) {
  return connections > 0 ? `${connections} connection uploaded` : "no connection uploaded";
}

/**
 * Left info column of the source-detail panel (Figma 866:7266): fixed 320px,
 * three stacked blocks — title row, About / Privacy / Direct search link,
 * and the member list with the Invite action. Everything comes from `detail`.
 * Below md it becomes a full-width block that stacks above the tables (no
 * right rule, grows with its content instead of scrolling).
 */
export function SourceInfo({ detail }: { detail: SourceDetail }) {
  return (
    // Below md the frame stacks the three blocks with a 4px gap between them (834:23503)
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto max-md:h-auto max-md:w-full max-md:gap-1 max-md:overflow-visible md:rule-r">
      {/* Title row: 20px glyph + 14px semibold title, options button on the right */}
      <div data-motion="info-block" className={cn(block, "flex shrink-0 items-center gap-4")}>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <SourceGlyph icon={detail.icon} />
          <h2 className="text-[14px] leading-none font-semibold whitespace-nowrap text-loud">{detail.title}</h2>
        </div>
        {/* Ghost on desktop; the mobile frame draws it as a 36px secondary pill with a vertical glyph */}
        <Button
          variant="ghost"
          aria-label="Source options"
          className="max-md:rounded-[11px] max-md:border-0 max-md:p-[11px] max-md:shadow-card"
        >
          <Icon name="dots-horizontal-strong" className="max-md:hidden" />
          <Icon name="dots-vertical" className="md:hidden" />
        </Button>
      </div>

      {/* Details: About / Privacy / Direct search link, separated by hairlines */}
      <div data-motion="info-block" className={cn(block, "flex shrink-0 flex-col gap-4")}>
        <div className="flex w-full flex-col gap-3 text-[14px] font-medium text-normal">
          <p className="leading-none">About</p>
          <p className="leading-[1.44] tracking-[-0.14px] wrap-break-word" style={{ fontFeatureSettings: '"salt" 1' }}>
            {detail.about}
          </p>
        </div>

        <Hairline />

        <div className="flex w-full flex-col gap-2">
          <p className="text-[14px] leading-5 font-medium text-normal">Privacy</p>
          <Field className={fieldFocus}>
            <input
              readOnly
              value={detail.privacy}
              aria-label="Privacy"
              className={cn(readOnlyInput, "w-full text-soft placeholder:text-soft")}
            />
          </Field>
        </div>

        <Hairline />

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col gap-2 text-[14px]">
            <p className="leading-none font-normal text-soft">Direct search link</p>
            <p className="leading-5 font-medium text-normal">Create a new search over this group</p>
          </div>
          <Field className={fieldFocus}>
            <input
              readOnly
              value={detail.searchLink}
              aria-label="Direct search link"
              className={cn(readOnlyInput, "flex-1")}
            />
            <CopyButton value={detail.searchLink} />
          </Field>
        </div>
      </div>

      {/* Members: fills the remaining height; list rows are 36px avatars in 56px rows */}
      <div data-motion="info-block" className={cn(block, "flex flex-1 flex-col gap-5")}>
        <div className="flex w-full flex-col gap-3">
          <p className="text-[14px] leading-none font-medium text-loud">Member</p>

          <ul className="flex w-full flex-col">
            {detail.members.map((member) => (
              <li key={member.email} className="flex w-full items-center gap-2 overflow-hidden px-2 py-[10px]">
                <Avatar name={member.name} tone={member.tone} />

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 self-stretch overflow-hidden leading-none whitespace-nowrap">
                  <p className="text-[14px] font-medium text-loud">{member.name}</p>
                  {/* Desktop shows the upload count; the mobile frame shows the email instead */}
                  <p className="text-[12px] font-normal text-normal">
                    <span className="max-md:hidden">{connectionsLabel(member.connections)}</span>
                    <span className="md:hidden">{member.email}</span>
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Member options"
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-[4px] outline-none",
                    "transition-opacity duration-200 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-primary/40",
                  )}
                >
                  <Icon name="dots-horizontal" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <InviteButton />
      </div>
    </aside>
  );
}
