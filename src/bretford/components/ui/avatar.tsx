import Image from "next/image";
import { cn } from "@/bretford/lib/cn";

export type AvatarTone = "purple" | "orange";

const initialTone: Record<AvatarTone, string> = {
  purple: "border-[#e7ccff] bg-[#f1e1ff] text-[#b866ff]",
  orange: "border-[#ffdfcc] bg-[#ffece1] text-[#ff9e66]",
};

type AvatarProps = {
  /** Full name — used for the alt text and, without `src`, the initial letter. */
  name: string;
  /** Photo under /public (e.g. "/images/candidates/c1.png"). */
  src?: string;
  /** Tint for the initial-letter variant. */
  tone?: AvatarTone;
  /** Rendered size in px. The design uses 36 everywhere. */
  size?: number;
  className?: string;
};

/** 36px round avatar: a bordered photo, or a tinted circle with the initial. */
export function Avatar({ name, src, tone = "purple", size = 36, className }: AvatarProps) {
  if (src) {
    return (
      <span
        className={cn("relative block shrink-0 overflow-clip rounded-full border border-[#e0e0e0]", className)}
        style={{ width: size, height: size }}
      >
        <Image src={src} alt={name} width={size} height={size} className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border p-2",
        "text-[16px] leading-none font-semibold tracking-[-0.16px]",
        initialTone[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
