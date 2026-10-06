import React, { useState } from 'react';
import { ActionGroup, Card, DataTable, Field, PageHeader, PageLoader, Select, StatCard, StatusBadge } from '../../components/common';
import ChartBox from '../../components/common/ChartBox';
import { sectors } from '../../constants/options';
import { useAuth } from '../../contexts/AuthContext';
import { useResource } from '../../hooks/useResource';
import { api, downloadCsv } from '../../services/api';
import { ROLES, roleSector } from '../../utils/rbac';
import { formatDate } from '../../utils/format';

const sectorLabels = {
    farmer: 'Crop',
    fisherfolk: 'Fishery',
    livestock: 'Livestock',
    poultry: 'Poultry',
};

export default function Reports() {
    const { user } = useAuth();
    const [sector, setSector] = useState('');
    const [assistanceType, setAssistanceType] = useState('');
    const scopedSector = roleSector(user);
    const reportSector = scopedSector || sector;
    const reportQuery = reportSector ? `?sector=${encodeURIComponent(reportSector)}` : '';
    const { data, loading } = useResource(() => api.get(`/reports/dashboard${reportQuery}`).then((response) => response.data), [reportQuery]);

    if (loading || !data) return <PageLoader />;

    const activeSector = scopedSector || data.scope_sector || sector;
    const sectorLabel = sectorLabels[activeSector];
    const monthlyRows = data.monthly_registrants || [];
    const assistanceRows = data.assistance_report || [];
    const assistanceTypeOptions = Array.from(new Set(assistanceRows.map((row) => normalizeAssistanceType(row.assistance_type)).filter(Boolean)));
    const filteredAssistanceRows = assistanceRows.filter((row) => !assistanceType || normalizeAssistanceType(row.assistance_type) === assistanceType);
    const assistanceGroups = assistanceTypeOptions.map((type) => ({
        type,
        total: assistanceRows.filter((row) => normalizeAssistanceType(row.assistance_type) === type).length,
    }));

    return (
        <section className="space-y-4">
            <PageHeader
                title={sectorLabel ? `${sectorLabel} Reports and Analytics` : 'Reports and Analytics'}
                description={sectorLabel ? `Dashboard totals, barangay distribution, and program reports limited to the ${sectorLabel.toLowerCase()} sector.` : 'Dashboard totals, seasonal/program reports, filters, charts, and exports.'}
                actions={<ActionGroup><button className="btn-secondary" onClick={() => downloadCsv(`/reports/export${reportQuery}`, 'tarsis-masterlist.csv')}>Export CSV/Excel</button></ActionGroup>}
            />
            {!roleSector(user) && (
                <Card>
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                        <Field label="Seasonal/Sector Filter"><Select value={sector} options={['', ...sectors]} labels={{ '': 'All sectors', ...sectorLabels }} onChange={setSector} /></Field>
                        <p className="self-end text-sm text-slate-600">Filter changes the report totals, charts, tables, and exported masterlist.</p>
                    </div>
                </Card>
            )}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label={sectorLabel ? `${sectorLabel} Registrants` : 'Registrants'} value={data.totals.registrants} />
                <StatCard label="Approved" value={data.totals.approved_registrants} tone="green" />
                <StatCard label="Assistance Released" value={data.totals.assistance_released} tone="blue" />
                <StatCard label="Insurance Released" value={data.totals.insurance_released} tone="blue" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title={sectorLabel ? `${sectorLabel} Registrants by Month` : 'Registrants by Month'}>
                    <ChartBox type="bar" labels={monthlyRows.map((item) => item.month)} values={monthlyRows.map((item) => item.total)} colors="#2563eb" />
                </Card>
                <Card title="Barangay Registrants">
                    <ChartBox
                        type="bar"
                        labels={data.by_barangay.map((item) => item.name)}
                        values={data.by_barangay.map((item) => item.registrants_count)}
                        minWidth={`${Math.max(720, data.by_barangay.length * 76)}px`}
                    />
                </Card>
            </div>
            {user?.role === ROLES.SUPER_ADMIN && (
                <Card title="Super Admin Assistance Report">
                    <div className="mb-4 grid gap-3 md:grid-cols-[240px_1fr]">
                        <Field label="Assistance Type">
                            <Select value={assistanceType} options={['', ...assistanceTypeOptions]} labels={{ '': 'All assistance types' }} onChange={setAssistanceType} />
                        </Field>
                        <div className="flex flex-wrap items-end gap-2">
                            {assistanceGroups.map((group) => (
                                <span key={group.type} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
                                    {assistanceTypeLabel(group.type)}: {group.total}
                                </span>
                            ))}
                        </div>
                    </div>
                    <DataTable
                        columns={['Assistance Type', 'Sector', 'Applicant/Registrant', 'Application Date', 'Status']}
                        rows={filteredAssistanceRows.map((row) => [
                            <span className="capitalize">{assistanceTypeLabel(row.assistance_type)}</span>,
                            <span className="capitalize">{sectorLabels[row.sector] || row.sector || 'Not set'}</span>,
                            [row.applicant, row.registry_number].filter(Boolean).join(' - '),
                            formatDate(row.application_date),
                            <StatusBadge status={row.status} />,
                        ])}
                    />
                </Card>
            )}
        </section>
    );
}

function normalizeAssistanceType(type) {
    const normalized = String(type || '').toLowerCase();
    if (['farm', 'farm input', 'rice seeds', 'rice_seeds'].includes(normalized)) return 'fisheries';
    if (normalized === 'crop_damage') return 'crop';
    return type;
}

function assistanceTypeLabel(type) {
    return String(normalizeAssistanceType(type) || '').replaceAll('_', ' ');
}
