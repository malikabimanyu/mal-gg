/** Mount point of the Bretford dashboard inside mal.gg. */
export const BRETFORD_BASE = "/bretford/library";
export const libraryHref = BRETFORD_BASE;
export const sourceHref = (slug: string) => `${BRETFORD_BASE}/sources/${slug}`;
