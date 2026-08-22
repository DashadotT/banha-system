import {
  Activity,
  Archive,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Radio,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live-monitoring', label: 'Live Monitoring', icon: Radio },
  { to: '/recordings', label: 'Recordings', icon: ClipboardList },
  { to: '/assessments', label: 'Assessments', icon: ListChecks },
  { to: '/statistical-analysis', label: 'Statistical Analysis', icon: Activity },
  { to: '/archived-records', label: 'Archived Records', icon: Archive },
  { to: '/users', label: 'Users', icon: UsersIcon },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { profile, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-primary-900/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-white transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-surface lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-primary-50 hover:text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={isActive ? 'text-accent' : 'text-slate-400 group-hover:text-secondary'}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 rounded-md bg-surface px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-white">
              {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-primary">
                {profile?.full_name ?? 'Loading…'}
              </p>
              <p className="truncate text-[11px] capitalize text-slate-500">
                {profile?.role ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
