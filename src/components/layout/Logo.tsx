export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <path
            d="M9 22V10h6.2c2.6 0 4.4 1.4 4.4 3.6 0 1.5-.8 2.5-2 3 1.5.4 2.5 1.6 2.5 3.3 0 2.4-1.9 4.1-4.7 4.1H9zm3-7h2.8c1 0 1.6-.5 1.6-1.4s-.6-1.4-1.6-1.4H12v2.8zm0 4.7h3.1c1.1 0 1.8-.6 1.8-1.6s-.7-1.6-1.8-1.6H12v3.2z"
            fill="#DEAE20"
          />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-primary">BANHA</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Environmental Research
          </p>
        </div>
      )}
    </div>
  );
}
