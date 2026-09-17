import Image from "next/image";
import Link from "next/link";
import { libraryHref } from "@/bretford/lib/routes";
import { Button, Divider } from "@/bretford/components/ui/button";
import { Icon } from "@/bretford/components/ui/icon";
import { credits } from "@/bretford/lib/library-data";
import { cn } from "@/bretford/lib/cn";

type LibraryHeaderProps = {
  /**
   * Current page inside the Library. When set, the title becomes the
   * "Library › {crumb}" breadcrumb from the source-detail screen (866:7241).
   */
  crumb?: string;
};

/**
 * Top bar of the white main panel (Figma node 866:6924).
 *
 * Left: page title or breadcrumb. Right: "New source" CTA, credits, help,
 * notifications and the profile avatar, separated by thin 12px rules.
 * Button/Divider primitives already carry the exact 9px padding, 10px radius
 * and ring/shadow recipe.
 */
export function LibraryHeader({ crumb }: LibraryHeaderProps) {
  return (
    // Mobile frames: the "Library" title bar is 64px (py-14), the breadcrumb bar keeps p-16 (68px).
    <header
      className={cn(
        "flex w-full shrink-0 items-center justify-between rule-b p-4",
        !crumb && "max-md:px-4 max-md:py-[14px]",
      )}
    >
      {crumb ? (
        <nav aria-label="Breadcrumb" data-motion="header-title">
          <ol className="flex items-center gap-[6px] text-[16px] leading-none font-medium whitespace-nowrap">
            <li>
              <Link
                href={libraryHref}
                className="block rounded-[6px] px-[2px] py-2 text-normal outline-none transition-colors hover:text-loud focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Library
              </Link>
            </li>
            <li aria-hidden className="flex size-[14px] items-center justify-center">
              {/* Figma rotates chevron-down into a right-pointing separator */}
              <Icon name="chevron-down" size={14} className="-rotate-90" />
            </li>
            <li aria-current="page">
              <h1 className="text-[16px] leading-none font-medium text-loud">{crumb}</h1>
            </li>
          </ol>
        </nav>
      ) : (
        <h1
          data-motion="header-title"
          className="text-[20px] leading-[1.2] font-semibold whitespace-nowrap text-loud max-md:text-[18px]"
        >
          Library
        </h1>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="primary" data-motion="header-action">
          <Icon name="globe-add" size={14} />
          {/* The mobile frame shows the CTA icon-only; the label stays for AT */}
          <span className="max-md:sr-only">New source</span>
        </Button>

        {/* Credits, help, bell and avatar live in the drawer / top bar on mobile */}
        <Divider className="max-md:hidden" />

        <Button variant="secondary" data-motion="header-action" className="max-md:hidden">
          <Icon name="coins-stacked-02" size={14} />
          {credits}
        </Button>
        <Button variant="secondary" aria-label="Help" data-motion="header-action" className="max-md:hidden">
          <Icon name="help-circle" size={14} />
        </Button>
        <Button variant="secondary" aria-label="Notifications" data-motion="header-action" className="max-md:hidden">
          <Icon name="bell-01" size={14} />
        </Button>

        <Divider className="max-md:hidden" />

        <button
          type="button"
          data-motion="header-action"
          className={
            "relative size-8 shrink-0 overflow-clip rounded-[10px] bg-tint-avatar max-md:hidden " +
            "shadow-[0px_0.938px_1.875px_0px_rgba(40,40,40,0.08),0px_0px_0px_0.938px_var(--color-tint-avatar)] " +
            "outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/40"
          }
        >
          <Image
            src="/bretford/images/avatar.png"
            alt="Profile"
            width={32}
            height={32}
            draggable={false}
            className="size-8 object-cover"
          />
        </button>
      </div>
    </header>
  );
}
