import React from 'react';

export default function PersonalInformation({ registrant }) {
    return (
        <section className="rsbsa-section">
            <h3>PART I: PERSONAL INFORMATION</h3>
            <div className="rsbsa-grid rsbsa-grid-4">
                <Cell label="Surname" value={registrant.last_name} />
                <Cell label="First Name" value={registrant.first_name} />
                <Cell label="Middle Name" value={registrant.middle_name} />
                <Cell label="Extension Name" value={registrant.suffix} />
                <Cell label="Sex" value={registrant.sex} />
                <Cell label="Date of Birth" value={registrant.birthday} />
                <Cell label="Civil Status" value={registrant.civil_status} />
                <Cell label="Mobile No." value={registrant.phone} />
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
