import React, { useEffect, useState } from 'react';
import { Card, InfoRow, PageHeader, PageLoader, StatusBadge } from '../components/common';
import LeafletMap from '../components/maps/LeafletMap';
import { useResource } from '../hooks/useResource';
import { api } from '../services/api';
import { cx, formatDate } from '../utils/format';

export default function BarangayMap() {
    const { data, loading } = useResource(
        () => api.get('/barangays?all=1').then((response) => Array.isArray(response.data) ? response.data : response.data.data || []),
        []
    );
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        if (data?.length && !selected) setSelected(data[0]);
    }, [data, selected]);

    if (loading || !data) return <PageLoader />;

    return (
        <section className="space-y-5">
            <PageHeader title="Barangay Map Locator" description="Tubigon barangay halls, enrollment schedules, MAO office information, and assigned technical personnel." />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_360px]">
                <Card title="Interactive Map">
                    <LeafletMap barangays={data} onSelect={setSelected} selected={selected} />
                </Card>
                <div className="space-y-4">
                    <Card title="MAO Office">
                        <InfoRow label="Office" value="Municipal Agriculture Office, Tubigon Municipal Hall Annex" />
                        <InfoRow label="Contact" value="MAO front desk" />
                        <InfoRow label="Coverage" value={`${data.length} barangays`} />
                    </Card>
                    {selected && (
                        <Card title={`${selected.name} Barangay`}>
                            <p className="mb-3 text-sm leading-6 text-slate-600">
                                View the current enrollment schedule, assigned agriculture personnel, and registration coverage for {selected.name}.
                            </p>
                            <InfoRow label="Schedule" value={formatDate(selected.enrollment_schedule)} />
                            <InfoRow label="Personnel" value={selected.assigned_technical_personnel} />
                            <InfoRow label="Registrants" value={selected.registrants_count ?? 0} />
                            <InfoRow label="Status" value={selected.enrollment_status} />
                            <InfoRow label="Underserved" value={selected.is_underserved ? 'Yes' : 'No'} />
                        </Card>
                    )}
                    <Card title="Technical Personnel">
                        <div className="max-h-96 space-y-2 overflow-auto pr-2">
                            {data.map((barangay) => (
                                <button key={barangay.id} className={cx('w-full rounded-md border px-3 py-2 text-left text-sm shadow-sm transition', selected?.id === barangay.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50')} onClick={() => setSelected(barangay)}>
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="font-semibold">{barangay.name}</span>
                                        <StatusBadge status={barangay.enrollment_status} />
                                    </span>
                                    <span className="mt-1 block text-slate-600">{barangay.assigned_technical_personnel || 'Unassigned'}</span>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
