import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
    path: string;
    label: string;
    icon: string;
}

const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/live', label: 'Live Monitoring', icon: '📡' },
    { path: '/recordings', label: 'Recordings', icon: '🎙️' },
    { path: '/assessments', label: 'Assessments', icon: '📝' },
    { path: '/statistics', label: 'Statistical Analysis', icon: '📈' },
    { path: '/archived', label: 'Archived Records', icon: '📦' },
    { path: '/users', label: 'Users', icon: '👤' },
];

export function Sidebar() {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
    const closeMobile = () => setIsMobileOpen(false);

    return (
        <>
            {/* Mobile Hamburger */}
            <button
                onClick={toggleMobile}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                aria-label="Toggle navigation"
            >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Backdrop */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={closeMobile}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-full w-[280px] bg-[#002858] text-white z-45
          transition-transform duration-300 ease-in-out shadow-2xl
          lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
            >
                {/* Brand */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#DEAE20] rounded-lg flex items-center justify-center text-[#002858] font-extrabold text-xl">
                            B
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-white">BANHA</h1>
                            <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium">
                                Research System
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={closeMobile}
                            className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                                    ? 'bg-white/20 text-white shadow-lg'
                                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                                }
              `}
                        >
                            <span className="text-xl leading-none">{item.icon}</span>
                            {item.label}
                            {({ isActive }) => isActive && (
                                <span className="ml-auto w-1.5 h-8 bg-[#DEAE20] rounded-full" />
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User */}
                <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-sm">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {profile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-white/50">
                                {profile?.role || 'Researcher'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}