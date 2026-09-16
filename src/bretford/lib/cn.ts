/** Tiny className joiner — drops falsy values so conditional classes read cleanly. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
