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
    const { data, loading } = useResource(() => api.get('/reports/dashboard').then((response) => response.data), []);
    const [sector, setSector] = useState('');
    const [assistanceType, setAssistanceType] = useState('');

    if (loading || !data) return <PageLoader />;

    const scopedSector = roleSector(user) || data.scope_sector;
    const sectorLabel = sectorLabels[scopedSector];
    const monthlyRows = data.monthly_registrants || [];
    const assistanceRows = data.assistance_report || [];
    const assistanceTypeOptions = Array.from(new Set(assistanceRows.map((row) => row.assistance_type).filter(Boolean)));
    const filteredAssistanceRows = assistanceRows.filter((row) => !assistanceType || row.assistance_type === assistanceType);
    const assistanceGroups = assistanceTypeOptions.map((type) => ({
        type,
        total: assistanceRows.filter((row) => row.assistance_type === type).length,
    }));

    return (
        <section className="space-y-4">
            <PageHeader
                title={sectorLabel ? `${sectorLabel} Reports and Analytics` : 'Reports and Analytics'}
                description={sectorLabel ? `Dashboard totals, barangay distribution, and program reports limited to the ${sectorLabel.toLowerCase()} sector.` : 'Dashboard totals, seasonal/program reports, filters, charts, and exports.'}
                actions={<ActionGroup><button className="btn-secondary" onClick={() => downloadCsv('/reports/export', 'tarsis-masterlist.csv')}>Export CSV/Excel</button></ActionGroup>}
            />
            {!scopedSector && (
                <Card>
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                        <Field label="Seasonal/Sector Filter"><Select value={sector} options={['', ...sectors]} labels={{ '': 'All sectors', ...sectorLabels }} onChange={setSector} /></Field>
                        <p className="self-end text-sm text-slate-600">Filter is displayed for report preparation; exported masterlist includes all currently stored details.</p>
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
                    <ChartBox type="bar" labels={monthlyRows.map((item) => item.month)} values={monthlyRows.map((item) => item.total)} />
                </Card>
                <Card title="Barangay Registrants"><ChartBox type="bar" labels={data.by_barangay.slice(0, 12).map((item) => item.name)} values={data.by_barangay.slice(0, 12).map((item) => item.registrants_count)} /></Card>
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
                                    {String(group.type).replaceAll('_', ' ')}: {group.total}
                                </span>
                            ))}
                        </div>
                    </div>
                    <DataTable
                        columns={['Assistance Type', 'Sector', 'Applicant/Registrant', 'Application Date', 'Status']}
                        rows={filteredAssistanceRows.map((row) => [
                            <span className="capitalize">{String(row.assistance_type || '').replaceAll('_', ' ')}</span>,
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
