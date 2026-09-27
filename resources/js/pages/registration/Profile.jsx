import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, DataTable, EmptyState, InfoRow, PageHeader, PageLoader, StatusBadge } from '../../components/common';
import { api } from '../../services/api';
import { useResource } from '../../hooks/useResource';
import { formatDate, formatJson } from '../../utils/format';
import { ownershipFieldLabel } from '../../utils/registrantLabels';
import DigitalID from './DigitalID';

export default function Profile({ profile, digitalId, publicView = false }) {
    if (profile) return <RegistrantProfile profile={profile} digitalId={digitalId} publicView={publicView} />;
    return <PublicProfilePage />;
}

function PublicProfilePage() {
    const { registryNumber } = useParams();
    const { data, loading, error } = useResource(
        () => api.get(`/public/registrants/${encodeURIComponent(registryNumber)}`).then((response) => response.data),
        [registryNumber]
    );

    if (loading) return <PageLoader />;
    if (error) return <EmptyState title="Profile not found" detail={error} />;

    return <RegistrantProfile profile={data} publicView />;
}

function RegistrantProfile({ profile, digitalId, publicView }) {
    const status = publicView ? storedValue(profile.status) : <StatusBadge status={profile.status} />;

    return (
        <section className="space-y-4">
            <PageHeader title={profile.full_name} description={profile.registry_number} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_500px]">
                <Card title="Registrant Profile">
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                        <InfoRow label="Status" value={status} />
                        <InfoRow label="Barangay" value={storedValue(profile.barangay?.name)} />
                        <InfoRow label="Address" value={storedValue(profile.address)} />
                        <InfoRow label="Birthday" value={publicView ? storedValue(profile.birthday) : formatDate(profile.birthday)} />
                        <InfoRow label="Sex" value={storedValue(profile.sex)} />
                        <InfoRow label="Civil Status" value={storedValue(profile.civil_status)} />
                        <InfoRow label={ownershipFieldLabel(profile.sector)} value={storedValue(profile.ownership_type)} />
                        <InfoRow label="Expected produce/catch" value={publicView ? storedValue(profile.expected_production) : formatJson(profile.expected_production)} />
                        <InfoRow label="Farm Area" value={storedValue(profile.farm_area)} />
                        <InfoRow label="Farm Location" value={storedValue(profile.farm_location)} />
                        {profile.sector === 'fisherfolk' && storedValue(profile.boat_name) && <InfoRow label="Boat" value={storedValue(profile.boat_name)} />}
                        {profile.sector === 'livestock' && storedValue(profile.livestock_type) && <InfoRow label="Livestock" value={storedValue(profile.livestock_type)} />}
                        {profile.sector === 'poultry' && storedValue(profile.poultry_type) && <InfoRow label="Poultry" value={storedValue(profile.poultry_type)} />}
                    </div>
                </Card>
                <DigitalID registrant={profile} digitalId={digitalId} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Assistance History">
                    <DataTable columns={['Program', 'Type', 'Status', 'Released']} rows={(profile.assistance_applications || []).map((row) => [
                        storedValue(row.program_name),
                        storedValue(row.assistance_type),
                        publicView ? storedValue(row.status) : <StatusBadge status={row.status} />,
                        publicView ? storedValue(row.released_at) : formatDate(row.released_at),
                    ])} />
                </Card>
                <Card title="Insurance Records">
                    <DataTable columns={['Type', 'Policy', 'Endorsement', 'Approval', 'Release']} rows={(profile.insurance_claims || []).map((row) => [
                        storedValue(row.claim_type),
                        storedValue(row.policy_number),
                        publicView ? storedValue(row.endorsement_status) : <StatusBadge status={row.endorsement_status} />,
                        publicView ? storedValue(row.approval_status) : <StatusBadge status={row.approval_status} />,
                        publicView ? storedValue(row.release_status) : <StatusBadge status={row.release_status} />,
                    ])} />
                </Card>
            </div>
            {publicView && <p className="text-center text-xs text-slate-500">This profile is shown from the QR code and reflects records encoded by the MAO.</p>}
        </section>
    );
}

function storedValue(value) {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'object') return <span className="break-all">{JSON.stringify(value)}</span>;
    return value;
}
