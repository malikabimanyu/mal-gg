"use client";
import { useState } from "react";

/** Company logo with an initial-letter fallback — YC's logo CDN 404s for a share of older companies. */
export function Logo({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  // yc.db stores YC's own placeholder path ("/company/thumb/missing.png") for companies without a logo.
  const usable = !!src && /^https?:\/\//.test(src);
  if (!usable || failed) {
    return (
      <span className="flex shrink-0 items-center justify-center rounded-md bg-yc-subtle font-medium text-yc-ink-2" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
        {name.trim()[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-md object-cover" style={{ width: size, height: size }} onError={() => setFailed(true)} />;
}
