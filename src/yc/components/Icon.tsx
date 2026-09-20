import { BASE } from "@/yc/lib/query";
/** Icons exported from the Figma file (web/public/figma/*.svg). Sized explicitly; never `auto`. */
export function Icon({ name, size = 14, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-clip ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${BASE}/figma/${name}.svg`} alt="" className="absolute inset-0 block size-full max-w-none" draggable={false} />
    </span>
  );
}
