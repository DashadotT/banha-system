import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
