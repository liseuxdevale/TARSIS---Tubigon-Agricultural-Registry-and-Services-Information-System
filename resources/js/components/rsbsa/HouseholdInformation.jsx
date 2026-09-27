import React from 'react';

export default function HouseholdInformation({ registrant }) {
    return (
        <section className="rsbsa-section">
            <h3>HOUSEHOLD INFORMATION</h3>
            <div className="rsbsa-grid rsbsa-grid-3">
                <Cell label="Household Members" value={registrant.rsbsa_payload?.household_members} />
                <Cell label="Source" value={registrant.rsbsa_payload?.channel || registrant.rsbsa_payload?.source} />
                <Cell label="Registry No." value={registrant.registry_number} />
            </div>
        </section>
    );
}

function Cell({ label, value }) {
    return (
        <div className="rsbsa-cell">
            <span>{label}</span>
            <strong>{value || ''}</strong>
        </div>
    );
}
