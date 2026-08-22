/** Garis pemisah dengan wordmark "MAL" (Gasoek One) di tengah. */
export function Divider() {
  return (
    <div className="flex h-4 items-center" aria-hidden="true">
      <span className="h-px flex-1 bg-rule" />
      <span className="px-[7px] font-display text-[16px] leading-4 text-rule">
        MAL
      </span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}
