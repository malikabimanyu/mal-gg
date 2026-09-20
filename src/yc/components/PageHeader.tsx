export function PageHeader() {
  return (
    <header className="flex items-center gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-none">
        <h1 className="text-[20px] font-semibold tracking-[-0.2px] text-yc-ink">Founder Directory</h1>
        <p className="truncate text-[14px] font-medium text-yc-ink-muted">
          Built by{" "}
          <a href="https://www.keitoto.com" target="_blank" rel="noreferrer" className="text-yc-link hover:underline">
            Keitoto
          </a>
        </p>
      </div>
    </header>
  );
}
