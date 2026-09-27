import React from 'react';
import { Card, DataTable, PageHeader, PageLoader, StatusBadge, StatusTimeline } from '../../components/common';
import { assistanceStatuses } from '../../constants/options';
import { useResource } from '../../hooks/useResource';
import { api } from '../../services/api';

export default function Tracking() {
    return (
        <section className="space-y-4">
            <PageHeader title="Insurance and Assistance Tracking" description="Combined operational tables for assistance requests and insurance records." />
            <div className="grid gap-4 lg:grid-cols-2">
                <EmbeddedRecords title="Assistance Requests" endpoint="/assistance-applications" columns={['Beneficiary', 'Program', 'Status', 'Flow']} map={(row) => [row.registrant?.full_name, row.program_name, <StatusBadge status={row.status} />, <StatusTimeline statuses={assistanceStatuses} active={row.status} />]} />
                <EmbeddedRecords title="Insurance Records" endpoint="/insurance-claims" columns={['Beneficiary', 'Type', 'Approval', 'Release']} map={(row) => [row.registrant?.full_name, row.claim_type, <StatusBadge status={row.approval_status} />, <StatusBadge status={row.release_status} />]} />
            </div>
        </section>
    );
}

function EmbeddedRecords({ title, endpoint, columns, map }) {
    const { data, loading } = useResource(() => api.get(`${endpoint}?per_page=20`).then((response) => response.data.data || []), [endpoint]);
    return (
        <Card title={title}>
            {loading ? <PageLoader compact /> : <DataTable columns={columns} rows={data.map(map)} />}
        </Card>
    );
}
