import React from 'react';
import { Link } from 'react-router-dom';
import { ownershipIdLabel } from '../../utils/registrantLabels';

const sectorBadges = {
    farmer: 'CROP',
    fisherfolk: 'FISHERIES',
    livestock: 'LIVESTOCK',
    poultry: 'POULTRY',
};

export default function DigitalID({ registrant, digitalId, printable = false }) {
    const data = { ...(registrant || {}), ...(digitalId || {}) };
    const registryNumber = data.registry_number || '';
    const name = (data.name || data.full_name || [data.first_name, data.middle_name, data.last_name, data.suffix].filter(Boolean).join(' ')).trim();
    const validity = validityRange(data.created_at);
    const sectorBadge = sectorBadgeLabel(data);
    const ownerType = data.ownership_type || data.rsbsa_payload?.parcels?.[0]?.ownership_type || 'Not set';
    const photoUrl = digitalId?.photo_url || registrant?.photo_url || '';
    const qrPayload = data.qr_payload || `${window.location.origin}/profile/${registryNumber}`;
    const qrSvg = data.qr_svg || fallbackQrSvg(qrPayload);

    function downloadQr() {
        const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${registryNumber || 'tarsis'}-qr.svg`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className={printable ? 'tarsis-id-print-wrap' : 'tarsis-id-host'}>
            <article className="tarsis-id-card" aria-label="TARSIS registry identification card">
                <div className="id-wave id-wave-top" />
                <div className="id-wave id-wave-bottom" />
                <div className="id-seal id-seal-left">
                    <img src="/images/tubigon-official-seal.png" alt="Municipality of Tubigon official seal" />
                </div>
                <div className="id-seal id-seal-right">
                    <img src="/images/department-agriculture-logo.png" alt="Department of Agriculture logo" />
                </div>
                <header className="id-header">
                    <p>REPUBLIC OF THE PHILIPPINES</p>
                    <h2>MUNICIPALITY OF TUBIGON</h2>
                    <h1>OFFICE OF THE MUNICIPAL AGRICULTURE</h1>
                </header>
                <section className="id-body">
                    <div className="id-photo-frame">
                        {photoUrl ? (
                            <img src={photoUrl} alt={`${name || 'Registrant'} photo`} />
                        ) : (
                            <div className="id-photo-placeholder">2x2 PHOTO</div>
                        )}
                    </div>
                    <div className="id-details">
                        <h4>{name || 'REGISTRANT NAME'}</h4>
                        <p>Registration No. {registryNumber || 'Pending'}</p>
                        <p>Sector Badge: {sectorBadge}</p>
                        <p>Validity: {validity}</p>
                        <p className="id-owner">{ownershipIdLabel(data.sector)}: {ownerType}</p>
                    </div>
                    <div className="id-qr-frame">
                        {data.qr_image_url ? (
                            <img src={data.qr_image_url} alt="TARSIS QR code" crossOrigin="anonymous" />
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                        )}
                    </div>
                </section>
                <footer className="id-signature">
                    <span>Signature</span>
                </footer>
            </article>
            {!printable && (
                <div className="tarsis-id-actions mt-3 flex flex-wrap gap-2">
                    <button className="mini-btn" type="button" onClick={() => window.print()}>Print</button>
                    {registryNumber && (
                        <Link className="mini-btn" to={`/rsbsa-preview/${encodeURIComponent(registryNumber)}`}>
                            View RSBSA Form
                        </Link>
                    )}
                    <button className="mini-btn" type="button" onClick={downloadQr}>Download QR</button>
                </div>
            )}
        </div>
    );
}

function sectorBadgeLabel(data) {
    const payload = data.rsbsa_payload || {};
    const badges = new Set();
    const addBadge = (badge) => {
        if (badge) badges.add(badge);
    };

    addBadge(sectorBadges[data.sector]);

    asArray(payload.main_livelihood).forEach((livelihood) => {
        if (livelihood === 'Fisherfolk') addBadge('FISHERIES');
        if (['Farmer', 'Farmworker/Laborer', 'Agri Youth'].includes(livelihood)) addBadge('CROP');
    });

    [
        ...asArray(payload.farmer_activities),
        ...asArray(payload.farmworker_activities),
        ...asArray(payload.youth_activities),
    ].forEach((activity) => {
        if (activity === 'Livestock') addBadge('LIVESTOCK');
        else if (activity === 'Poultry') addBadge('POULTRY');
        else if (activity) addBadge('CROP');
    });

    asArray(payload.fishing_activities).forEach(() => addBadge('FISHERIES'));

    asArray(payload.parcels).forEach((parcel) => {
        asArray(parcel?.commodities).forEach((row) => {
            const commodity = String(row?.commodity || '').toLowerCase();
            if (! commodity) return;
            if (commodity.includes('livestock')) addBadge('LIVESTOCK');
            else if (commodity.includes('poultry')) addBadge('POULTRY');
            else addBadge('CROP');
        });
    });

    return [...badges].join(' | ') || 'CROP';
}

function asArray(value) {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
}

function validityRange(createdAt) {
    const start = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
    const safeStart = Number.isFinite(start) ? start : new Date().getFullYear();
    return `${safeStart}-${safeStart + 3}`;
}

function fallbackQrSvg(payload) {
    const text = String(payload || 'TARSIS');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" role="img" aria-label="TARSIS QR code"><rect width="220" height="220" fill="#fff"/><text x="14" y="114" font-size="14" fill="#111827">${escapeSvg(text.slice(0, 22))}</text></svg>`;
}

function escapeSvg(value) {
    return value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
    }[char]));
}
