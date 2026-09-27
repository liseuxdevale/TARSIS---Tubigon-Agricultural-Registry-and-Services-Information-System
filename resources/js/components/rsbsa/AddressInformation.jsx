
export default function AddressInformation({ registrant }) {
    return (
        <section className="rsbsa-section">
            <h3>ADDRESS INFORMATION</h3>
            <div className="rsbsa-grid rsbsa-grid-2">
                <Cell label="Complete Address" value={registrant.address} />
                <Cell label="Barangay" value={registrant.barangay?.name} />
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
