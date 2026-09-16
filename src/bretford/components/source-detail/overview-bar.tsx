import { Button } from "@/bretford/components/ui/button";
import { Icon } from "@/bretford/components/ui/icon";

/**
 * Second bar of the source-detail panel (Figma 866:7261): "Overview" on the
 * left, "Source" and "Share" secondary actions on the right. Same 64px recipe
 * as the Library toolbar (p-4 + 32px content + inside hairline).
 */
export function OverviewBar() {
  return (
    <div className="flex w-full shrink-0 items-center justify-between rule-b p-4">
      <h2 data-motion="overview-title" className="text-[16px] leading-none font-semibold whitespace-nowrap text-loud">
        Overview
      </h2>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="secondary" data-motion="overview-action">
          <Icon name="folder" size={14} />
          Source
        </Button>
        <Button variant="secondary" data-motion="overview-action">
          <Icon name="share-06" size={14} />
          Share
        </Button>
      </div>
    </div>
  );
}
