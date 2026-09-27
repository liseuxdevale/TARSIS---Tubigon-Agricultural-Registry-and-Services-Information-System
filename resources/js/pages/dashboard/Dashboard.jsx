import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Card, PageLoader, SearchBar, StatCard } from '../../components/common';
import AnnouncementCard from '../../components/dashboard/AnnouncementCard';
import BarangayRankingList from '../../components/dashboard/BarangayRankingList';
import DashboardStatCard from '../../components/dashboard/DashboardStatCard';
import UpcomingEventsCard from '../../components/dashboard/UpcomingEventsCard';
import ChartBox from '../../components/common/ChartBox';
import { useAuth } from '../../contexts/AuthContext';
import { useResource } from '../../hooks/useResource';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';
import { can, roleName, roleSector, ROLES } from '../../utils/rbac';

const sectorLabels = {
    farmer: 'Crop',
    fisherfolk: 'Fishery',
    livestock: 'Livestock',
    poultry: 'Poultry',
};

export default function Dashboard() {
    const { signedIn, user } = useAuth();
    const { data, loading } = useResource(
        () => signedIn ? api.get('/reports/dashboard').then((response) => response.data) : Promise.resolve(null),
        [signedIn]
    );
    const [search, setSearch] = useState('');

    if (!signedIn) {
        return (
            <section className="space-y-4">
                <HeroPanel />
                <QuickPublicActions />
            </section>
        );
    }

    if (loading || !data) return <PageLoader />;

    if (user?.role === ROLES.FARMER) {
        return <BeneficiaryDashboard data={data} user={user} />;
    }

    if (user?.role === ROLES.BARANGAY_STAFF) {
        return <BarangayStaffDashboard data={data} user={user} />;
    }

    const rankedBarangays = data.by_barangay.map((barangay, index) => ({ ...barangay, ranking_number: index + 1 }));
    const visibleBarangays = rankedBarangays.filter((barangay) => barangay.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <section className="space-y-6">
            <DashboardHero user={user} asOf={data.as_of} totals={data.totals} />
            <ModuleOverview totals={data.totals} asOf={data.as_of} sector={roleSector(user) || data.scope_sector} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
                <MonthlyRegistrantChart rows={data.monthly_registrants || []} sector={roleSector(user) || data.scope_sector} />
                <UpcomingEventsCard announcements={data.upcoming_announcements || []} barangays={data.by_barangay || []} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-3">
                    <Card>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                            <label className="block text-sm font-semibold text-gray-700">
                                <span className="mb-1.5 block">Search barangay ranking</span>
                                <SearchBar value={search} onChange={setSearch} placeholder="Search barangay name" />
                            </label>
                            <button className="btn-primary text-center" type="button">Search</button>
                        </div>
                    </Card>
                    <BarangayRankingList barangays={visibleBarangays} />
                    {can(user, 'viewAuditLogs') && <RecentActivityCard activity={data.recent_activity || []} />}
                </div>
                <div className="space-y-4">
                    <AnnouncementCard announcements={data.recent_announcements || []} />
                    <AnnouncementFeedbackCard feedback={data.announcement_feedback || []} />
                </div>
            </div>
        </section>
    );
}

function MonthlyRegistrantChart({ rows, sector }) {
    const sectorLabel = sectorLabels[sector];

    return (
        <Card title={sectorLabel ? `${sectorLabel} Registrants by Month` : 'Registrants by Month'}>
            <ChartBox type="bar" labels={rows.map((item) => item.month)} values={rows.map((item) => item.total)} />
        </Card>
    );
}

function DashboardHero({ user }) {
    return (
        <section className="overflow-hidden rounded-3xl border border-white/70 p-5 text-white shadow-xl md:p-6" style={{ background: 'var(--role-gradient)', boxShadow: 'var(--role-shadow)' }}>
            <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: 'color-mix(in srgb, var(--role-accent) 72%, white)' }}>{greeting()}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Maayong pagbalik, {user?.name || 'TARSIS user'}</h1>
        </section>
    );
}

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Maayong buntag';
    if (hour < 18) return 'Maayong hapon';
    return 'Maayong gabii';
}

function ModuleOverview({ totals, asOf, sector }) {
    const sectorLabel = sectorLabels[sector];

    return (
        <Card title={`Module Overview as of ${asOf || new Date().toISOString().slice(0, 10)}`}>
            <div className="grid gap-3 md:grid-cols-3">
                <DashboardStatCard label={sectorLabel ? `${sectorLabel} Registrants` : 'Registrants'} value={totals.registrants} />
                <DashboardStatCard label={sectorLabel ? `${sectorLabel} Assistance Applications` : 'Assistance Applications'} value={totals.assistance_applications} tone="blue" />
                <DashboardStatCard label={sectorLabel ? `${sectorLabel} Insurance Applications` : 'Insurance Applications'} value={totals.calamity_applications} tone="amber" />
            </div>
        </Card>
    );
}

function RecentActivityCard({ activity }) {
    return (
        <Card title="Recent System Activity">
            <div className="space-y-3">
                {activity.map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
                        <p className="font-semibold text-slate-950">{String(item.action).replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.user?.name || 'System'} • {formatDate(item.created_at)}</p>
                    </div>
                ))}
                {!activity.length && <p className="text-sm text-slate-500">No recent activity yet.</p>}
            </div>
        </Card>
    );
}

function AnnouncementFeedbackCard({ feedback }) {
    return (
        <Card title="Announcement Feedback">
            <div className="space-y-3">
                {feedback.map((item) => (
                    <div key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
                        <div className="flex items-start gap-2">
                            <span className="mt-0.5 rounded-md bg-emerald-50 p-1.5 text-emerald-700">
                                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-950">{item.author_name || 'Anonymous'}</p>
                                <p className="mt-1 line-clamp-2 text-slate-600">{item.body}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                    {item.announcement?.title || 'Announcement'} • {formatDate(item.created_at)}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    {item.likes_count || 0} likes • {item.dislikes_count || 0} dislikes
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {!feedback.length && <p className="text-sm text-slate-500">No announcement comments yet.</p>}
            </div>
        </Card>
    );
}

function BarangayStaffDashboard({ data, user }) {
    const assignedBarangays = data.by_barangay || [];

    return (
        <section className="space-y-6">
            <section className="rounded-3xl border border-white/70 p-5 text-white shadow-xl md:p-6" style={{ background: 'var(--role-gradient)', boxShadow: 'var(--role-shadow)' }}>
                <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color: 'color-mix(in srgb, var(--role-accent) 72%, white)' }}>{greeting()}</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{roleName(user)}</h1>
            </section>
            <div className="grid gap-3 md:grid-cols-2">
                <StatCard label="Assigned Registrants" value={data.totals.registrants} />
                <StatCard label="Approved" value={data.totals.approved_registrants} tone="green" />
            </div>
            <div className="grid gap-4">
                <Card title="Assigned Barangays">
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
                        {assignedBarangays.map((barangay) => (
                            <div key={barangay.id} className="border-b border-slate-100 pb-2 last:border-0">
                                <p className="font-semibold text-slate-950">{barangay.name}</p>
                                <p className="text-slate-600">{barangay.enrollment_status || 'Not set'} - {barangay.registrants_count || 0} registrants</p>
                            </div>
                        ))}
                        {!assignedBarangays.length && <p className="text-slate-600">No barangays are assigned to this account.</p>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link className="btn-primary" to="/admin/registrations">View registrants</Link>
                        <Link className="btn-secondary" to="/admin/barangays">Set schedules</Link>
                    </div>
                </Card>
            </div>
        </section>
    );
}

function BeneficiaryDashboard({ data, user }) {
    return (
        <section className="space-y-6">
            <section className="rounded-3xl border border-white/70 p-5 text-white shadow-xl md:p-6" style={{ background: 'var(--role-gradient)', boxShadow: 'var(--role-shadow)' }}>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">{greeting()}, {user?.name || 'Beneficiary'}</h1>
            </section>
            <div className="grid gap-4 md:grid-cols-3">
                <Card title="My Registration">
                    <p className="text-sm leading-6 text-slate-600">Open your linked TARSIS registration profile and QR ID when available.</p>
                    <Link className="mt-4 inline-flex btn-primary" to="/track/assistance">Find my record</Link>
                </Card>
                <Card title="Application Status">
                    <p className="text-sm leading-6 text-slate-600">Check assistance and calamity/insurance progress linked to your account.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link className="btn-secondary" to="/track/assistance">Assistance</Link>
                        <Link className="btn-secondary" to="/track/insurance">Insurance</Link>
                    </div>
                </Card>
                <Card title="Barangay Schedules">
                    <p className="text-sm leading-6 text-slate-600">See current open/closed status and MAO service schedules by barangay.</p>
                    <Link className="mt-4 inline-flex btn-secondary" to="/map">Open map</Link>
                </Card>
            </div>
        </section>
    );
}

function HeroPanel() {
    return (
        <section className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
                <div className="p-6 md:p-8">
                    <p className="text-xs font-bold uppercase text-emerald-700">Government service portal</p>
                    <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-950">Tubigon agriculture registry and services</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                        Register farmers, fisherfolk, livestock raisers, and poultry raisers; track assistance, PCIC claims, barangay schedules, and MAO announcements.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Link className="btn-primary" to="/registration">Start registration</Link>
                        <Link className="btn-secondary" to="/map">View barangay locator</Link>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-emerald-100 bg-emerald-50 p-6 lg:border-l lg:border-t-0">
                    <StatCard label="Public service" value="RSBSA" />
                    <StatCard label="Digital ID" value="QR" tone="green" />
                    <StatCard label="Coverage" value="34" tone="blue" />
                    <StatCard label="Alerts" value="Push" tone="amber" />
                </div>
            </div>
        </section>
    );
}

function QuickPublicActions() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card title="Online Enrollment">
                <p className="text-sm text-slate-600">Submit an RSBSA-aligned registration for MAO review.</p>
                <Link className="mt-4 inline-flex btn-primary" to="/registration">Open form</Link>
            </Card>
            <Card title="Barangay Schedules">
                <p className="text-sm text-slate-600">Find barangay enrollment status, technical personnel, and MAO details.</p>
                <Link className="mt-4 inline-flex btn-secondary" to="/map">Open map</Link>
            </Card>
            <Card title="Announcements">
                <p className="text-sm text-slate-600">Read bulletins, distribution schedules, and outbreak alerts.</p>
                <Link className="mt-4 inline-flex btn-secondary" to="/announcements">Read updates</Link>
            </Card>
        </div>
    );
}
