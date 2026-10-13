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
    const [barangayId, setBarangayId] = useState('');
    const [monthFrom, setMonthFrom] = useState('');
    const [monthTo, setMonthTo] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({ sector: '', barangayId: '' });
    const { data: barangayData } = useResource(() => api.get('/barangays/scoped?all=1').then((response) => response.data), []);
    const barangays = Array.isArray(barangayData) ? barangayData : barangayData?.data || [];
    const [assistanceType, setAssistanceType] = useState('');
    const [insuranceType, setInsuranceType] = useState('');
    const [trackerDates, setTrackerDates] = useState({ assistance: { from: '', to: '' }, insurance: { from: '', to: '' } });
    const [appliedDates, setAppliedDates] = useState(trackerDates);
    const [exportBusy, setExportBusy] = useState({});
    const [trackerError, setTrackerError] = useState('');
    async function exportTracker(dataset) {
        setExportBusy((current) => ({ ...current, [dataset]: true }));
        setTrackerError('');
        const query = new URLSearchParams(params);
        query.set('dataset', dataset);
        if (appliedDates[dataset].from) query.set('date_from', appliedDates[dataset].from);
        if (appliedDates[dataset].to) query.set('date_to', appliedDates[dataset].to);
        if (dataset === 'assistance' && assistanceType) query.set('assistance_type', assistanceType);
        if (dataset === 'insurance' && insuranceType) query.set('insurance_type', insuranceType);
        try { await downloadCsv(`/reports/export?${query}`, `tarsis-${dataset}-tracker.csv`); }
        catch (error) { setTrackerError(error.message || 'Unable to export tracker.'); }
        finally { setExportBusy((current) => ({ ...current, [dataset]: false })); }
    }
    function dateControls(dataset) {
        return <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(event) => {
            event.preventDefault();
            const dates = trackerDates[dataset];
            if (dates.from && dates.to && dates.to < dates.from) { setTrackerError('Date To must be on or after Date From.'); return; }
            setTrackerError('');
            setAppliedDates((current) => ({ ...current, [dataset]: { ...dates } }));
        }}>
            {['from', 'to'].map((field) => <Field key={field} label={field === 'from' ? 'Date From' : 'Date To'}><input className="field" type="date" value={trackerDates[dataset][field]} onChange={(event) => setTrackerDates((current) => ({ ...current, [dataset]: { ...current[dataset], [field]: event.target.value } }))} /></Field>)}
            <button className="btn-primary" type="submit">Search</button>
            <button className="btn-secondary" type="button" disabled={exportBusy[dataset]} onClick={() => exportTracker(dataset)}>{exportBusy[dataset] ? 'Exporting…' : 'Export CSV'}</button>
        </form>;
    }
    const scopedSector = roleSector(user);
    const reportSector = scopedSector || appliedFilters.sector;
    const params = new URLSearchParams();
    if (reportSector) params.set('sector', reportSector);
    if (appliedFilters.barangayId) params.set('barangay_id', appliedFilters.barangayId);
    if (appliedFilters.monthFrom) params.set('month_from', appliedFilters.monthFrom);
    if (appliedFilters.monthTo) params.set('month_to', appliedFilters.monthTo);
    Object.entries(appliedDates).forEach(([dataset, dates]) => {
        if (dates.from) params.set(`${dataset}_from`, dates.from);
        if (dates.to) params.set(`${dataset}_to`, dates.to);
    });
    const reportQuery = params.size ? `?${params.toString()}` : '';
    const { data, loading } = useResource(() => api.get(`/reports/dashboard${reportQuery}`).then((response) => response.data), [reportQuery]);

    if (loading || !data) return <PageLoader />;

    const activeSector = scopedSector || data.scope_sector || appliedFilters.sector;
    const sectorLabel = sectorLabels[activeSector];
    const monthlyRows = data.monthly_registrants || [];
    const assistanceRows = data.assistance_report || [];
    const assistanceTypeOptions = Array.from(new Set(assistanceRows.map((row) => normalizeAssistanceType(row.assistance_type)).filter(Boolean)));
    const filteredAssistanceRows = assistanceRows.filter((row) => !assistanceType || normalizeAssistanceType(row.assistance_type) === assistanceType);

    return (
        <section className="space-y-4">
            {trackerError && <p role="alert" className="text-sm text-red-700">{trackerError}</p>}
            <PageHeader
                title={sectorLabel ? `${sectorLabel} Reports and Analytics` : 'Reports and Analytics'}
                description={sectorLabel ? `Dashboard totals, barangay distribution, and program reports limited to the ${sectorLabel.toLowerCase()} sector.` : 'Dashboard totals, seasonal/program reports, filters, charts, and exports.'}
                actions={<ActionGroup><button className="btn-secondary" onClick={() => downloadCsv(`/reports/export${reportQuery}`, 'tarsis-masterlist.csv')}>Export CSV/Excel</button></ActionGroup>}
            />
            {(
                <Card>
                    <form onSubmit={(event) => {
                        event.preventDefault();
                        if (monthFrom && monthTo && monthTo < monthFrom) { setTrackerError('Month To must be on or after Month From.'); return; }
                        setTrackerError('');
                        setAppliedFilters({ sector, barangayId, monthFrom, monthTo });
                    }} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        {!scopedSector && <Field label="Seasonal/Sector Filter"><Select value={sector} options={['', ...sectors]} labels={{ '': 'All sectors', ...sectorLabels }} onChange={setSector} /></Field>}
                        <Field label="Barangay"><Select value={barangayId} options={['', ...barangays.map((barangay) => String(barangay.id))]} labels={{ '': 'All barangays', ...Object.fromEntries(barangays.map((barangay) => [String(barangay.id), barangay.name])) }} onChange={setBarangayId} /></Field>
                        <Field label="Month From"><input className="field" type="month" value={monthFrom} onChange={(event) => setMonthFrom(event.target.value)} /></Field>
                        <Field label="Month To"><input className="field" type="month" value={monthTo} min={monthFrom || undefined} onChange={(event) => setMonthTo(event.target.value)} /></Field>
                        <div className="flex flex-wrap gap-2 self-end">
                            <button type="submit" className="btn-primary">Search</button>
                            <button type="button" className="btn-secondary" onClick={() => {
                                setSector('');
                                setBarangayId('');
                                setMonthFrom('');
                                setMonthTo('');
                                setAppliedFilters({ sector: '', barangayId: '', monthFrom: '', monthTo: '' });
                                setTrackerError('');
                            }}>Clear Filters</button>
                        </div>
                    </form>
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
            {[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF].includes(user?.role) && (
                <Card title="Assistance Tracker">
                    {dateControls('assistance')}
                    <div className="mb-4 grid gap-3 md:grid-cols-[240px_1fr]">
                        <Field label="Assistance Type">
                            <Select value={assistanceType} options={['', ...assistanceTypeOptions]} labels={{ '': 'All assistance types' }} onChange={setAssistanceType} />
                        </Field>
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
            {[ROLES.SUPER_ADMIN, ROLES.MAO_STAFF].includes(user?.role) && (
                <Card title="Insurance Tracker">
                    {dateControls('insurance')}
                    <div className="mb-4 max-w-xs">
                        <Field label="Insurance Claim Type">
                            <Select value={insuranceType} options={['', ...new Set([...(data.insurance_report || []).map((row) => row.insurance_type).filter(Boolean), ...(insuranceType ? [insuranceType] : [])])]} labels={Object.fromEntries([['', 'All insurance claim types'], ...(data.insurance_report || []).map((row) => [row.insurance_type, String(row.insurance_type || '').replaceAll('_', ' ')])])} onChange={setInsuranceType} />
                        </Field>
                    </div>
                    <DataTable
                        columns={['Insurance Type', 'Sector', 'Applicant/Registrant', 'Application Date', 'Approval Status', 'Release Status']}
                        rows={(data.insurance_report || []).filter((row) => !insuranceType || row.insurance_type === insuranceType).map((row) => [
                            String(row.insurance_type || 'Not set').replaceAll('_', ' '),
                            sectorLabels[row.sector] || row.sector || 'Not set',
                            [row.applicant, row.registry_number].filter(Boolean).join(' - '),
                            formatDate(row.application_date),
                            <StatusBadge status={row.approval_status} />,
                            <StatusBadge status={row.release_status} />,
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
