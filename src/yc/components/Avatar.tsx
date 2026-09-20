const PALETTE = [
  "bg-yc-indigo-soft text-yc-indigo",
  "bg-yc-blue-soft text-yc-blue",
  "bg-yc-green-soft text-yc-green",
  "bg-yc-gold-soft text-yc-gold",
  "bg-yc-orange-soft text-yc-orange",
  "bg-yc-pink-soft text-yc-pink",
  "bg-yc-purple-soft text-yc-purple",
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function tone(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * Founder avatar. YC's avatar URLs are presigned S3 links that expire within an hour of
 * the scrape, so the initials tile IS the avatar — matching the design's fallback.
 */
export function Avatar({ name, size = 28 }: { name: string; src?: string | null; size?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${tone(name)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
