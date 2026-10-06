import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Archive, BarChart2, Bell, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FileText, History, IdCard, LayoutDashboard, LocateFixed, LogOut, Map as MapIcon, MapPin, Megaphone, Menu, Moon, Settings, Shield, Sun, UserCog, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/common';
import { roleTheme } from './RoleThemeLayout';
import { cx } from '../utils/format';
import { can, ROLES, sectorAdminRoles } from '../utils/rbac';

export default function AppLayout() {
    const { user } = useAuth();
    const theme = roleTheme(user?.role);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('tarsis_dark_mode') === 'true');
    const toggleDarkMode = () => setDarkMode((value) => !value);

    useEffect(() => {
        localStorage.setItem('tarsis_dark_mode', darkMode ? 'true' : 'false');
    }, [darkMode]);

    return (
        <div data-role={theme.key} data-theme={darkMode ? 'dark' : 'light'} className={`${theme.shell} min-h-screen`}>
            <Header theme={theme} />
            <TopRightActions user={user} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
            <main className="min-w-0 px-3 py-4 sm:px-4 sm:py-5 lg:ml-56 lg:p-7">
                <Outlet />
            </main>
        </div>
    );
}

function Header({ theme }) {
    const { user, signedIn, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [logoutPromptOpen, setLogoutPromptOpen] = useState(false);

    const signOut = () => {
        setLogoutPromptOpen(true);
    };

    const confirmSignOut = () => {
        setLogoutPromptOpen(false);
        logout();
        window.location.assign('/');
    };

    const primary = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/my-profile', label: 'My Profile', icon: IdCard, show: (user) => user?.role === ROLES.FARMER },
        { to: '/registration', label: 'Registration', icon: Users },
        { to: '/admin/geo-mapping', label: 'Geo Mapping', icon: LocateFixed, show: (user) => can(user, 'manageGeoMapping') },
        { to: '/map', label: 'Barangay Map', icon: MapIcon, show: (user) => user?.role !== ROLES.SUPER_ADMIN && !sectorAdminRoles.includes(user?.role) },
        { to: '/track/assistance', label: 'Assistance Tracker', icon: FileText, show: (user) => user?.role === ROLES.FARMER },
        { to: '/track/insurance', label: 'Insurance Tracker', icon: Shield, show: (user) => user?.role === ROLES.FARMER },
        { to: '/assistance', label: 'Assistance', icon: FileText, show: (user) => can(user, 'manageAssistance') },
        { to: '/insurance', label: 'Insurance', icon: Shield, show: (user) => can(user, 'manageInsurance') },
        { to: '/notifications', label: 'Notifications', icon: Bell, show: (user) => can(user, 'manageNotifications') },
    ];

    const admin = [
        { to: '/admin/registrations', label: user?.role === ROLES.BARANGAY_STAFF ? 'My Barangay Registrants' : 'Registrants', icon: Users, show: (user) => can(user, 'viewBarangayScope') },
        { to: '/admin/barangays', label: user?.role === ROLES.BARANGAY_STAFF ? 'Barangay Schedule' : 'Barangays', icon: MapPin, show: (user) => can(user, 'viewBarangayScope') },
        { to: '/admin/tracking', label: 'Tracking', icon: ClipboardList, show: (user) => user?.role !== ROLES.SUPER_ADMIN && !sectorAdminRoles.includes(user?.role) && (can(user, 'manageAssistance') || can(user, 'manageInsurance')) },
        { to: '/admin/reports', label: 'Reports', icon: BarChart2, show: (user) => can(user, 'manageReports') },
        { to: '/admin/archived/registrants', label: 'Archived Registrants', icon: Archive, group: 'Archived', show: (user) => can(user, 'manageReports') },
        { to: '/admin/archived/assistance', label: 'Archived Assistance Applications', icon: Archive, group: 'Archived', show: (user) => can(user, 'manageReports') },
        { to: '/admin/archived/insurance', label: 'Archived Insurance Applications', icon: Archive, group: 'Archived', show: (user) => can(user, 'manageReports') },
        { to: '/admin/audit-logs', label: 'Audit Logs', icon: History, show: (user) => can(user, 'viewAuditLogs') },
        { to: '/admin/users', label: 'Users', icon: UserCog, show: (user) => can(user, 'manageUsers') },
        { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, show: (user) => can(user, 'manageAnnouncements') },
    ];

    const visiblePrimary = primary.filter((item) => !item.show || item.show(user));
    const visibleAdmin = admin.filter((item) => item.show(user));

    useEffect(() => {
        setMobileOpen(false);
    }, [user?.id]);

    useEffect(() => {
        document.body.classList.toggle('overflow-hidden', mobileOpen);
        return () => document.body.classList.remove('overflow-hidden');
    }, [mobileOpen]);

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col lg:flex" style={{ background: theme.sidebar }}>
                <BrandBlock />
                <nav className="flex-1 space-y-4 overflow-y-auto p-3">
                    <NavGroup items={visiblePrimary} />
                    {signedIn && visibleAdmin.length > 0 && <NavGroup items={visibleAdmin} />}
                </nav>
                <AccountPanel signedIn={signedIn} user={user} logout={signOut} />
            </aside>
            <header className="sticky top-0 z-30 border-b text-white shadow-lg backdrop-blur lg:hidden" style={{ borderColor: 'color-mix(in srgb, var(--role-accent) 32%, transparent)', background: 'var(--role-sidebar)' }}>
                <div className="relative flex items-center justify-between gap-3 px-4 py-3 pr-24">
                    <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                        <BrandBlock compact />
                    </div>
                    {!signedIn && <Link className="btn-primary" to="/login">Log in</Link>}
                </div>
            </header>
            {mobileOpen && (
                <div className="fixed inset-0 z-[2200] lg:hidden">
                    <button className="absolute inset-0 bg-slate-950/45" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
                    <aside className="relative flex h-full w-[min(86vw,22rem)] flex-col shadow-2xl" style={{ background: theme.sidebar }}>
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <BrandBlock compact />
                            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <nav className="flex-1 space-y-4 overflow-y-auto p-3" onClick={() => setMobileOpen(false)}>
                            <NavGroup items={visiblePrimary} />
                            {signedIn && visibleAdmin.length > 0 && <NavGroup items={visibleAdmin} />}
                        </nav>
                        <AccountPanel signedIn={signedIn} user={user} logout={signOut} />
                    </aside>
                </div>
            )}
            <LogoutConfirmModal
                open={logoutPromptOpen}
                user={user}
                onCancel={() => setLogoutPromptOpen(false)}
                onConfirm={confirmSignOut}
            />
        </>
    );
}

function LogoutConfirmModal({ open, user, onCancel, onConfirm }) {
    return (
        <Modal open={open} title="Sign Out" onClose={onCancel}>
            <div className="space-y-4">
                <p className="text-sm leading-6 text-gray-600">
                    Are you sure you want to sign out?
                </p>
                <div className="flex justify-end gap-2">
                    <button className="btn-secondary" type="button" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" type="button" onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </Modal>
    );
}

function TopRightActions({ user, darkMode, onToggleDarkMode }) {
    return (
        <div className="fixed right-3 top-3 z-[2100] flex items-center gap-1.5 lg:right-4 lg:top-4 lg:gap-2">
            {user && <NotificationButton user={user} />}
            <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
        </div>
    );
}

function NotificationButton({ user }) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [readIds, setReadIds] = useState(() => readStoredNotificationIds(user));
    const panelRef = useRef(null);
    const target = '/notifications';
    const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;
    const visibleItems = useMemo(
        () => filter === 'unread' ? items.filter((item) => !readIds.includes(item.id)) : items,
        [filter, items, readIds]
    );
    const pageSize = 5;
    const pageCount = Math.max(1, Math.ceil(visibleItems.length / pageSize));
    const currentPage = Math.min(page, pageCount - 1);
    const displayedItems = expanded
        ? visibleItems.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
        : visibleItems;

    useEffect(() => {
        setReadIds(readStoredNotificationIds(user));
    }, [user?.id]);

    useEffect(() => {
        if (!open) {
            setExpanded(false);
            setPage(0);
        }
    }, [open]);

    useEffect(() => {
        setPage(0);
    }, [filter, items.length]);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!panelRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);

        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);

    const markRead = (id) => {
        const next = [...new Set([...readIds, id])];
        setReadIds(next);
        storeNotificationIds(user, next);
    };

    const markAllRead = () => {
        const next = items.map((item) => item.id);
        setReadIds(next);
        storeNotificationIds(user, next);
    };

    const loadNotifications = useCallback(() => {
        setLoading(true);
        setItems(staticNotificationItems());
        setLoading(false);
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (open && items.length) {
            const next = items.map((item) => item.id);
            setReadIds(next);
            storeNotificationIds(user, next);
        }
    }, [items, open, user]);

    return (
        <div ref={panelRef} className="relative">
            <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 lg:h-11 lg:w-11"
                style={{
                    background: 'var(--role-surface)',
                    borderColor: 'var(--role-border)',
                    color: 'var(--role-text)',
                    boxShadow: 'var(--role-shadow)',
                    '--tw-ring-color': 'var(--role-ring)',
                }}
                aria-label="Open notifications"
                aria-expanded={open}
                title="Notifications"
                onClick={() => setOpen((value) => !value)}
            >
                <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#c8952a] px-1 text-[10px] font-black text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className={cx('absolute -right-12 mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 lg:right-0', expanded ? 'w-[min(560px,calc(100vw-1rem))]' : 'w-[min(360px,calc(100vw-1rem))]')}>
                    <div className="border-b border-slate-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-black">Notifications</h2>
                            <button type="button" className="text-xs font-bold text-[#1a4731] hover:opacity-75" onClick={markAllRead}>Mark all read</button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                            {['all', 'unread'].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={cx('rounded-md px-3 py-1.5 text-xs font-bold capitalize transition', filter === option ? 'bg-white text-[#1a4731] shadow-sm' : 'text-slate-500 hover:text-slate-900')}
                                    onClick={() => setFilter(option)}
                                >
                                    {option}{option === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={cx('overflow-y-auto', expanded ? 'max-h-[28rem]' : 'max-h-96')}>
                        {loading && <p className="p-4 text-sm font-semibold text-slate-500">Loading notifications...</p>}
                        {!loading && displayedItems.map((item) => {
                            const unread = !readIds.includes(item.id);
                            const content = (
                                <div className="flex items-start gap-3">
                                    <span className={cx('mt-1 h-2.5 w-2.5 rounded-full', unread ? 'bg-[#c8952a]' : 'bg-slate-200')} />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-bold text-slate-950">{item.title}</span>
                                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{item.body}</span>
                                        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.meta}</span>
                                    </span>
                                </div>
                            );

                            if (!item.href) {
                                return (
                                    <div
                                        key={item.id}
                                        className="block border-b border-slate-100 px-4 py-3"
                                        onClick={() => markRead(item.id)}
                                    >
                                        {content}
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.id}
                                    to={item.href || target}
                                    className="block border-b border-slate-100 px-4 py-3 transition hover:bg-emerald-50"
                                    onClick={() => {
                                        markRead(item.id);
                                        setOpen(false);
                                    }}
                                >{content}</Link>
                            );
                        })}
                        {!loading && !visibleItems.length && (
                            <p className="p-4 text-center text-sm font-semibold text-slate-500">
                                {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
                            </p>
                        )}
                    </div>
                    {expanded ? (
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1a4731] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Previous notifications"
                                disabled={currentPage === 0}
                                onClick={() => setPage((value) => Math.max(0, value - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-500">
                                {visibleItems.length ? `${currentPage * pageSize + 1}-${Math.min((currentPage + 1) * pageSize, visibleItems.length)} of ${visibleItems.length}` : '0 notifications'}
                            </span>
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1a4731] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Next notifications"
                                disabled={currentPage >= pageCount - 1}
                                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button className="block w-full bg-slate-50 px-4 py-3 text-center text-sm font-bold text-[#1a4731] transition hover:bg-slate-100" type="button" onClick={() => setExpanded(true)}>
                            View all
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function staticNotificationItems() {
    return [
        {
            id: 'static-livestock-feeds',
            title: 'Livestock Feeds',
            body: 'Claim free livestock feeds! Bring your MAO ID for verification.',
            meta: '8/20/2026, 4:35:08 PM',
            href: null,
        },
        {
            id: 'static-fishing-gear-assistance',
            title: 'Fishing Gear Assistance',
            body: 'Applications for fishing net and fishing gear assistance are now open. Submit your application through the Assistance Module before August 30, 2026.',
            meta: '8/6/2026, 11:43:13 AM',
            href: null,
        },
    ];
}

function notificationStorageKey(user) {
    return `tarsis_read_notifications_${user?.id || user?.email || 'user'}`;
}

function readStoredNotificationIds(user) {
    try {
        const value = localStorage.getItem(notificationStorageKey(user));
        return value ? JSON.parse(value) : [];
    } catch {
        return [];
    }
}

function storeNotificationIds(user, ids) {
    localStorage.setItem(notificationStorageKey(user), JSON.stringify(ids));
}

function ThemeToggle({ darkMode, onToggle }) {
    const Icon = darkMode ? Sun : Moon;

    return (
        <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 lg:h-11 lg:w-11"
            style={{
                background: 'var(--role-surface)',
                borderColor: 'var(--role-border)',
                color: 'var(--role-text)',
                boxShadow: 'var(--role-shadow)',
                '--tw-ring-color': 'var(--role-ring)',
            }}
            onClick={onToggle}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
        >
            <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>
    );
}

function BrandBlock({ compact = false }) {
    return (
        <Link to="/" className={cx('flex min-w-0 items-center gap-3', compact ? '' : 'border-b border-white/10 p-4')}>
            <img
                src="/images/tarsis-official-logo.jpg"
                width={compact ? 44 : 52}
                height={compact ? 44 : 52}
                className="shrink-0 rounded-full border border-white/20 bg-white object-cover shadow-sm"
                alt="Office of the Municipal Agriculture Tubigon, Bohol official logo"
            />
            <span className="min-w-0">
                <span className={cx('block font-bold leading-tight', compact ? 'text-xl text-white' : 'text-sm text-white')}>TARSIS</span>
                <span className="block text-xs text-white/75">Tubigon MAO</span>
            </span>
        </Link>
    );
}

function NavGroup({ items }) {
    const grouped = items.reduce((carry, item) => {
        if (item.group) carry.grouped.push(item);
        else carry.plain.push(item);
        return carry;
    }, { plain: [], grouped: [] });

    return (
        <div>
            <div className="space-y-0.5">
                {grouped.plain.map(({ to, label, icon }) => <NavPill key={to} to={to} icon={icon}>{label}</NavPill>)}
                {grouped.grouped.length > 0 && (
                    <details className="group" open>
                        <summary className="nav-tab cursor-pointer list-none">
                            <Archive className="mr-3 h-4 w-4 flex-shrink-0" />
                            Archived
                            <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" />
                        </summary>
                        <div className="mt-1 space-y-0.5 pl-3">
                            {grouped.grouped.map(({ to, label, icon }) => <NavPill key={to} to={to} icon={icon}>{label}</NavPill>)}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}

function NavPill({ to, icon: Icon, children }) {
    return (
        <NavLink
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => cx('nav-tab', isActive && 'nav-tab-active')}
        >
            {Icon && <Icon className="mr-3 h-4 w-4 flex-shrink-0" />}
            {children}
        </NavLink>
    );
}

function AccountPanel({ signedIn, user, logout }) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const profileTarget = '/account/profile';

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!panelRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);

        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);

    return (
        <div ref={panelRef} className="relative border-t border-white/10 p-3">
            {signedIn && user ? (
                <div className="space-y-3">
                    {open && (
                        <div className="absolute bottom-[4.75rem] left-3 right-3 overflow-hidden rounded-xl border border-white/10 bg-[#123c2d] py-1 shadow-2xl shadow-black/25">
                            <Link className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white" to={profileTarget} onClick={() => setOpen(false)}>
                                <UserRound className="h-4 w-4" /> Profile
                            </Link>
                            <Link className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white" to="/settings" onClick={() => setOpen(false)}>
                                <Settings className="h-4 w-4" /> Settings
                            </Link>
                            <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white" onClick={logout}>
                                <LogOut className="h-4 w-4" /> Sign out
                            </button>
                        </div>
                    )}
                    <button className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/10 p-2.5 text-left transition hover:bg-white/15" onClick={() => setOpen((value) => !value)}>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">{user.name}</span>
                            <span className="block truncate text-xs text-white/55">{String(user.role || '').replaceAll('_', ' ')}</span>
                        </span>
                        <ChevronDown className={cx('h-4 w-4 flex-shrink-0 text-white/60 transition', open && 'rotate-180')} />
                    </button>
                </div>
            ) : (
                <div className="grid gap-2">
                    <Link className="rounded-xl bg-white/20 px-3 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-white/25" to="/login">Log in</Link>
                    <Link className="rounded-xl px-3 py-2 text-center text-sm text-white/60 transition-all hover:bg-white/10 hover:text-white" to="/signup">Sign up</Link>
                </div>
            )}
        </div>
    );
}
