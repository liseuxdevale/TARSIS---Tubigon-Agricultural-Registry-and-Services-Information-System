import React from 'react';
import { formatJson } from '../../utils/format';
import { ownershipFieldLabel, registrantSectorLabel } from '../../utils/registrantLabels';

export default function AgriculturalActivities({ registrant }) {
    return (
        <section className="rsbsa-section">
            <h3>PART II: FARM PROFILE / AGRICULTURAL ACTIVITIES</h3>
            <div className="rsbsa-grid rsbsa-grid-4">
                <Cell label="Sector" value={registrantSectorLabel(registrant.sector)} />
                <Cell label={ownershipFieldLabel(registrant.sector)} value={registrant.ownership_type} />
                <Cell label="Farm Area" value={registrant.farm_area} />
                <Cell label="Farm Location" value={registrant.farm_location} />
                <Cell label="Boat Name" value={registrant.boat_name} />
                <Cell label="Livestock Type" value={registrant.livestock_type} />
                <Cell label="Poultry Type" value={registrant.poultry_type} />
                <Cell label="Expected Produce/Catch" value={formatJson(registrant.expected_production)} />
            </div>
        </section>
    );
}

function Cell({ label, value }) {
    return (
        <div className="rsbsa-cell">
            <span>{label}</span>
            <strong>{value && value !== 'Not set' ? value : ''}</strong>
        </div>
    );
}
