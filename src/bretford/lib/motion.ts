/**
 * Client-only motion helpers shared by the anime.js components. Call these
 * from effects/handlers, never during server rendering (`window` access).
 */
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
