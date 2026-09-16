import type { ComponentProps } from "react";
import { asset } from "@/bretford/lib/asset";

/**
 * Every icon exported from the Figma file lives in /public/icons as its own SVG
 * (colors are baked into the file, so there is no `currentColor` support).
 */
export type IconName =
  | "bell-01"
  | "chevron-down"
  | "chevron-right"
  | "chevron-selector-vertical"
  | "chevron-up"
  | "coins-stacked-02"
  | "container"
  | "copy"
  | "database-blue"
  | "database-green"
  | "database-orange"
  | "dot-blue"
  | "dot-green"
  | "dot-orange"
  | "dot-separator"
  | "dots-horizontal"
  | "dots-horizontal-strong"
  | "dots-vertical"
  | "engineering"
  | "expand-01"
  | "file-search"
  | "file-search-02"
  | "folder"
  | "folder-emoji"
  | "globe"
  | "globe-add"
  | "help-circle"
  | "home-line"
  | "layers-three-02"
  | "logo-blob"
  | "logo-mark"
  | "mail-01"
  | "monitor-02"
  | "package-plus"
  | "palette"
  | "plus"
  | "plus-stroke"
  | "route"
  | "search-lg"
  | "send-03"
  | "settings-01"
  | "settings-04"
  | "share-06"
  | "solar-library-bold"
  | "tree-line"
  | "user-plus-01"
  | "user-tile"
  | "users-03"
  | "users-plus"
  | "users-tile"
  | "x-close"
  | "x-close-primary";

type IconProps = Omit<ComponentProps<"img">, "src" | "alt" | "width" | "height"> & {
  name: IconName;
  /** Rendered size in px (square). Defaults to 14, the most common size in the design. */
  size?: number;
  /** Accessible label. Omit for purely decorative icons. */
  label?: string;
};

export function Icon({ name, size = 14, label, className, style, ...rest }: IconProps) {
  return (
    // Static SVG assets straight from Figma — next/image adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(`/icons/${name}.svg`)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      draggable={false}
      className={["block shrink-0 select-none", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
}
