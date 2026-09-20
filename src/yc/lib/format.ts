export const fmt = (n: number | null | undefined): string => (n == null ? "—" : new Intl.NumberFormat("en-US").format(n));
export const pct = (x: number | null | undefined): string => (x == null ? "—" : `${Math.round(x * 100)}%`);

/** "Winter 2027" → "W27" (Spring is X, per YC's own notation). */
export function batchCode(batch: string): string {
  const m = batch.match(/^(Winter|Spring|Summer|Fall) (\d{4})$/);
  if (!m) return batch;
  return `${{ Winter: "W", Spring: "X", Summer: "S", Fall: "F" }[m[1]]}${m[2].slice(2)}`;
}

export function roleLabel(bucket: string | null | undefined, title: string | null | undefined): string {
  if (title && title !== "Founder") return title;
  const map: Record<string, string> = { ceo: "Founder/CEO", cto: "Founder/CTO", coo: "Founder/COO", product: "Founder/CPO", gtm: "Founder/GTM", finance: "Founder/CFO", science: "Founder/Chief Scientist", other: "Founder" };
  return map[bucket ?? ""] ?? "Founder";
}
