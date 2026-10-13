import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { digitalIdLivelihoodDetails } from '../../utils/registrantLabels';

const sectorBadges = {
    farmer: 'CROP',
    fisherfolk: 'FISHERIES',
    livestock: 'LIVESTOCK',
    poultry: 'POULTRY',
};

export default function DigitalID({ registrant, digitalId, printable = false, actionsContainer = null }) {
    const data = { ...(registrant || {}), ...(digitalId || {}) };
    const registryNumber = data.registry_number || '';
    const name = (data.name || data.full_name || [data.first_name, data.middle_name, data.last_name, data.suffix].filter(Boolean).join(' ')).trim();
    const validity = validityRange(data.created_at);
    const sectorBadge = sectorBadgeLabel(data);
    const ownershipDetails = digitalIdLivelihoodDetails(data);
    const barangay = digitalId?.barangay?.name
        || (typeof digitalId?.barangay === 'string' ? digitalId.barangay : '')
        || registrant?.barangay?.name
        || (typeof registrant?.barangay === 'string' ? registrant.barangay : '')
        || data.rsbsa_payload?.barangay_name
        || data.rsbsa_payload?.barangay
        || 'Not set';
    const contactNumber = data.phone || data.rsbsa_payload?.phone || 'Not set';
    const emergencyContact = data.rsbsa_payload?.emergency_contact || 'Not set';
    const address = data.address || data.rsbsa_payload?.address_line || 'Not set';
    const parcels = data.rsbsa_payload?.parcels;
    const commodityValues = (Array.isArray(parcels) ? parcels : []).flatMap((parcel) =>
        Array.isArray(parcel.commodities) ? parcel.commodities.map((item) => item.commodity) : []);
    const commodities = [...new Map([...commodityValues, data.livestock_type, data.poultry_type]
        .map((value) => String(value || '').trim())
        .filter((value) => value && !['n/a', 'not set'].includes(value.toLowerCase()))
        .map((value) => [value.toLowerCase(), value])).values()].join(', ') || 'Not recorded';
    const landbankAccount = data.landbank_account_number || data.land_bank_account_number || data.landbank_account || data.bank_account_number || '';
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

    const actions = (
        <div className="tarsis-id-actions mt-4 flex flex-wrap gap-3">
            <button className="btn-primary min-h-12 cursor-pointer px-6 py-3 text-base" type="button" onClick={() => window.print()}>Print</button>
            {registryNumber && <Link className="btn-secondary min-h-12 cursor-pointer px-6 py-3 text-base" to={`/rsbsa-preview/${encodeURIComponent(registryNumber)}`}>View RSBSA Form</Link>}
            <button className="btn-secondary min-h-12 cursor-pointer px-6 py-3 text-base" type="button" onClick={downloadQr}>Download QR</button>
        </div>
    );

    return (
        <div className={printable ? 'tarsis-id-print-wrap' : 'tarsis-id-host'}>
            <article className="tarsis-id-card" aria-label="TARSIS registry identification card">
                <svg className="id-background" viewBox="0 0 790 440" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <path className="id-bg-top-dark" d="M0 0H790V56C681 44 575 34 456 30C314 25 176 28 0 60Z" />
                    <path className="id-bg-top-light" d="M0 39C112 26 208 17 327 18C449 19 557 34 671 41C719 44 759 42 790 38V68C684 58 578 49 456 44C313 39 176 41 0 72Z" />
                    <path className="id-bg-bottom-light" d="M0 353C132 377 270 399 404 405C536 411 666 376 790 319V440H0Z" />
                    <path className="id-bg-bottom-dark" d="M0 373C132 393 268 415 398 418C532 421 664 389 790 335V440H0Z" />
                </svg>
                <div className="id-wave id-wave-top" />
                <div className="id-wave id-wave-bottom" />
                <div className="id-seal id-seal-left">
                    <img src="/images/tubigon-official-seal.png" alt="Municipality of Tubigon official seal" />
                </div>
                <div className="id-seal id-seal-right">
                    <img src="/images/tarsis-official-logo.jpg" alt="Office of the Municipal Agriculturist Tubigon, Bohol official logo" />
                </div>
                <header className="id-header">
                    <p>REPUBLIC OF THE PHILIPPINES</p>
                    <h2>OFFICE OF THE MUNICIPAL AGRICULTURIST</h2>
                    <h3>TUBIGON, BOHOL</h3>
                </header>
                <section className="id-body">
                    <div className="id-photo-block">
                        <div className="id-photo-frame">
                            {photoUrl ? (
                                <img src={photoUrl} alt={`${name || 'Registrant'} photo`} />
                            ) : (
                                <div className="id-photo-placeholder">2x2 PHOTO</div>
                            )}
                        </div>
                    </div>
                    <div className="id-details">
                        <h4>{name || 'REGISTRANT NAME'}</h4>
                        <p>Registration No. {numberFont(registryNumber || 'Pending')}</p>
                        <p className="id-sector-badge">
                            <span>Sector Badge:</span>
                            <span className="id-sector-badge-values">
                                {sectorBadge.split(' | ').filter((badge) => badge !== 'POULTRY').join(' | ')}
                                {sectorBadge.split(' | ').includes('POULTRY') && (
                                    <span className="id-sector-badge-poultry">POULTRY</span>
                                )}
                            </span>
                        </p>
                        <p className="id-commodities">Commodity: {commodities}</p>
                        <p>Barangay: {barangay}</p>
                        <p>Validity: {numberFont(validity)}</p>
                        {landbankAccount && <p className="id-bank-account">LandBank Account No. {numberFont(landbankAccount)}</p>}
                    </div>
                    <div className="id-qr-frame">
                        {data.qr_image_url ? (
                            <img src={data.qr_image_url} alt="TARSIS QR code" />
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                        )}
                    </div>
                </section>
                <footer className="id-signature">
                    <strong>Signature</strong>
                </footer>
            </article>
            <article className="tarsis-id-card tarsis-id-card-blank-back" aria-label="TARSIS registry identification card blank back">
                <svg className="id-background" viewBox="0 0 790 440" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <path className="id-bg-top-dark" d="M0 0H790V56C681 44 575 34 456 30C314 25 176 28 0 60Z" />
                    <path className="id-bg-top-light" d="M0 39C112 26 208 17 327 18C449 19 557 34 671 41C719 44 759 42 790 38V68C684 58 578 49 456 44C313 39 176 41 0 72Z" />
                    <path className="id-bg-bottom-light" d="M0 353C132 377 270 399 404 405C536 411 666 376 790 319V440H0Z" />
                    <path className="id-bg-bottom-dark" d="M0 373C132 393 268 415 398 418C532 421 664 389 790 335V440H0Z" />
                </svg>
                <img className="id-back-watermark" src="/images/tarsis-official-logo.jpg" alt="" aria-hidden="true" />
                <section className="id-back-middle">
                    <div className="id-back-primary">
                        <span>{ownershipDetails.label}</span>
                        <strong>{ownershipDetails.value}</strong>
                    </div>
                    <div className="id-back-grid">
                        <p><span>Contact No.</span>{numberFont(contactNumber)}</p>
                        <p><span>Emergency Contact</span>{numberFont(emergencyContact)}</p>
                        <p><span>Address</span>{address}</p>
                    </div>
                </section>
                <div className="id-admin-signature" aria-label="Municipal Head Agriculturist signature space">
                    <span>Municipal Head Agriculturist</span>
                </div>
                <footer className="id-back-note">
                    <p>This ID is valid only with an active TARSIS registry record. Verify by scanning the QR code on the front.</p>
                    <p>If found, please return to the Office of the Municipal Agriculturist, Tubigon, Bohol.</p>
                </footer>
            </article>
            {!printable && (actionsContainer ? createPortal(actions, actionsContainer) : actions)}
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

function numberFont(value) {
    return String(value || '').split(/(\d+)/).map((part, index) => (
        /\d/.test(part) ? <span className="id-number-text" key={`${part}-${index}`}>{part}</span> : part
    ));
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
