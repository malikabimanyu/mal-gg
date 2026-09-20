/** Company status chip: white ring chip with a 4px dot and mono label; colour by status (Active green, Public blue, Acquired purple, Inactive grey). */
const TONE: Record<string, { dot: string; text: string }> = {
  Active: { dot: "bg-[#0e9f6e]", text: "text-[#0e9f6e]" },
  Public: { dot: "bg-yc-blue", text: "text-yc-blue" },
  Acquired: { dot: "bg-yc-purple", text: "text-yc-purple" },
  Inactive: { dot: "bg-yc-ink-3", text: "text-yc-ink-muted" },
};
export function StatusPill({ status }: { status: string }) {
  const t = TONE[status] ?? TONE.Inactive;
  return (
    <span className={`inline-flex h-6 items-center justify-center gap-1.5 rounded-lg bg-white px-2 font-yc-mono text-[12px] font-medium leading-none whitespace-nowrap shadow-yc-card ${t.text}`}>
      <span className={`size-1 rounded-full ${t.dot}`} />
      {status}
    </span>
  );
}
