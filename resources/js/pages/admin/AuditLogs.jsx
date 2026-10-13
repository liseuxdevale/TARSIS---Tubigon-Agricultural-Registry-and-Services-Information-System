import React, { useEffect, useState } from 'react';
import { Card, DataTable, Field, PageHeader, SearchBar } from '../../components/common';
import { api, downloadCsv } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AuditLogs() {
    const [rows, setRows] = useState([]);
    const [filters, setFilters] = useState({ action: '', date_from: '', date_to: '' });
    const [draftFilters, setDraftFilters] = useState({ action: '', date_from: '', date_to: '' });

    function queryParams(source = filters, extra = {}) {
        const params = new URLSearchParams({ per_page: '50' });
        if (source.action) params.set('action', source.action);
        if (source.date_from) params.set('date_from', source.date_from);
        if (source.date_to) params.set('date_to', source.date_to);
        Object.entries(extra).forEach(([key, value]) => params.set(key, value));

        return params;
    }

    useEffect(() => {
        api.get(`/audit-logs?${queryParams().toString()}`).then((response) => setRows(response.data.data || []));
    }, [filters]);

    function updateDraft(name, value) {
        setDraftFilters((current) => ({ ...current, [name]: value }));
    }

    function applyFilters() {
        setFilters(draftFilters);
    }

    function clearFilters() {
        const empty = { action: '', date_from: '', date_to: '' };
        setDraftFilters(empty);
        setFilters(empty);
    }

    return (
        <section className="space-y-4">
            <PageHeader
                title="Audit Logs"
                description="Actions, record changes, timestamps, and login activity."
                actions={<button className="btn-secondary" onClick={() => downloadCsv(`/audit-logs/export?${queryParams(filters).toString()}`, 'tarsis-audit-logs.csv')}>Export CSV</button>}
            />
            <Card>
                <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto_auto] md:items-end">
                    <Field label="Action">
                        <SearchBar value={draftFilters.action} onChange={(value) => updateDraft('action', value)} placeholder="Filter by action, e.g. login or registrant.updated" />
                    </Field>
                    <Field label="From">
                        <input className="field" type="date" value={draftFilters.date_from} onChange={(event) => updateDraft('date_from', event.target.value)} />
                    </Field>
                    <Field label="To">
                        <input className="field" type="date" value={draftFilters.date_to} onChange={(event) => updateDraft('date_to', event.target.value)} />
                    </Field>
                    <button className="btn-primary" type="button" onClick={applyFilters}>Filter</button>
                    <button className="btn-secondary" type="button" onClick={clearFilters}>Clear</button>
                </div>
            </Card>
            <Card title="Activity Table">
                <DataTable columns={['Action', 'User', 'Record', 'Timestamp']} rows={rows.map((row) => [row.action, row.user?.name || 'system', row.auditable_type ? `${row.auditable_type.split('\\').pop()} #${row.auditable_id}` : 'system', formatDateTime(row.created_at)])} />
            </Card>
            <Card title="Login History">
                <DataTable
                    compact
                    columns={['User', 'When', 'IP Address', 'Browser / Device']}
                    rows={rows
                        .filter((row) => row.action === 'login')
                        .map((row) => [
                            row.user?.name || 'system',
                            formatDateTime(row.created_at),
                            row.ip_address || 'Not set',
                            summarizeUserAgent(row.user_agent),
                        ])}
                />
            </Card>
        </section>
    );
}

function summarizeUserAgent(userAgent) {
    if (!userAgent) return 'Not set';

    const browser = [
        ['Edg/', 'Microsoft Edge'],
        ['Chrome/', 'Chrome'],
        ['Firefox/', 'Firefox'],
        ['Safari/', 'Safari'],
    ].find(([token]) => userAgent.includes(token))?.[1] || 'Browser';

    const device = [
        ['Windows', 'Windows'],
        ['Macintosh', 'macOS'],
        ['Android', 'Android'],
        ['iPhone', 'iPhone'],
        ['iPad', 'iPad'],
        ['Linux', 'Linux'],
    ].find(([token]) => userAgent.includes(token))?.[1] || 'Device';

    return `${browser} on ${device}`;
}
