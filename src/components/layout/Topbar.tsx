import { Menu } from 'lucide-react';

export function Topbar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/90 px-4 py-3.5 backdrop-blur lg:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-primary hover:bg-surface lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-base font-semibold text-primary lg:text-lg">{title}</h1>
    </header>
  );
}
