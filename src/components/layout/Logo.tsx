export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
        <img
          src="/banha_logo.png"
          alt="BANHA logo"
          className="h-full w-full object-cover"
        />
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
