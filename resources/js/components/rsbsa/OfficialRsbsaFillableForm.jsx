import React from 'react';
import { DEFAULT_RSBSA_CALIBRATION, RSBSA_TEMPLATE, normalizeRsbsaCalibration } from './officialRsbsaTemplate';

const educationMarks = RSBSA_TEMPLATE.marks.education;
const civilStatusMarks = RSBSA_TEMPLATE.marks.civilStatus;
const livelihoodMarks = RSBSA_TEMPLATE.marks.livelihood;
const activityMarks = RSBSA_TEMPLATE.marks.activities;
const parcelTops = RSBSA_TEMPLATE.parcels.tops;
const commodityRowHeight = RSBSA_TEMPLATE.parcels.commodityRowHeight;

export default function OfficialRsbsaFillableForm({ registrant, calibration = DEFAULT_RSBSA_CALIBRATION, showGrid = false }) {
    const payload = registrant.rsbsa_payload || {};
    const parcels = Array.isArray(payload.parcels) ? payload.parcels.slice(0, 3) : [];
    const normalizedCalibration = normalizeRsbsaCalibration(calibration);

    return (
        <article className="rsbsa-exact-form rsbsa-fillable-form">
            <TemplatePage page={RSBSA_TEMPLATE.pages[0]} calibration={normalizedCalibration.pages[1]} showGrid={showGrid}>
                <PageOne registrant={registrant} payload={payload} />
            </TemplatePage>
            <TemplatePage page={RSBSA_TEMPLATE.pages[1]} calibration={normalizedCalibration.pages[2]} showGrid={showGrid}>
                <PageTwo registrant={registrant} payload={payload} parcels={parcels} />
            </TemplatePage>
        </article>
    );
}

function TemplatePage({ page, calibration, showGrid, children }) {
    const overlayStyle = {
        '--rsbsa-offset-x': `${calibration.x}%`,
        '--rsbsa-offset-y': `${calibration.y}%`,
        '--rsbsa-text-scale': calibration.textScale,
    };

    return (
        <section className="rsbsa-exact-sheet" data-rsbsa-page={page.id}>
            <div className="rsbsa-page-wrapper">
                <img className="rsbsa-exact-page" src={page.image} alt={`Official RSBSA enrollment form: ${page.label}`} />
                {showGrid && <div className="rsbsa-calibration-grid" data-html2canvas-ignore="true" />}
                <div className="rsbsa-overlay" style={overlayStyle} aria-hidden="true">{children}</div>
            </div>
        </section>
    );
}

function PageOne({ registrant, payload }) {
    const barangay = registrant.barangay?.name || payload.barangay_name || '';
    const addressTopNudge = 0.35;
    const placeOfBirth = [payload.birth_municipality, payload.birth_province, payload.birth_country];
    const emergencyContact = digits(payload.emergency_contact);
    const farmingIncome = peso(payload.gross_farming_income);
    const nonFarmingIncome = peso(payload.gross_non_farming_income);
    const selectedLivelihoods = selectedValues(payload.main_livelihood);
    const hasFarmer = selectedLivelihoods.includes('Farmer');
    const hasFarmworker = selectedLivelihoods.includes('Farmworker/Laborer');
    const hasFisherfolk = selectedLivelihoods.includes('Fisherfolk');
    const hasAgriYouth = selectedLivelihoods.includes('Agri Youth');

    return (
        <>
            <Cover left={74.58} top={2.85} width={21.25} height={13.85} className="rsbsa-photo-cover" />
            {registrant.photo_url && <img className="rsbsa-filled-photo" src={registrant.photo_url} alt="" />}

            <Mark left={19.1} top={12.95} checked={payload.enrollment_type === 'New'} />
            <Mark left={26.25} top={12.95} checked={payload.enrollment_type === 'Updating'} />
            <Segmented value={dateDigits(payload.date_administered)} count={8} left={35.45} top={12.45} width={16.0} height={1.35} />
            <ReferenceNumber value={registrant.registry_number} left={18.25} top={14.62} width={33.2} height={1.35} />

            <Fill value={registrant.last_name} left={4.55} top={19.0} width={43.45} height={1.25} center prominent />
            <Fill value={registrant.first_name} left={50.15} top={19.0} width={45.55} height={1.25} center prominent />
            <Fill value={registrant.middle_name} left={4.55} top={22.05} width={43.45} height={1.2} center prominent />
            <Fill value={registrant.suffix} left={50.15} top={22.05} width={11.8} height={1.2} center prominent />
            <Mark left={77.25} top={23.61} checked={registrant.sex === 'Male'} />
            <Mark left={85.40} top={23.61} checked={registrant.sex === 'Female'} />

            <Fill value={payload.address_line} left={11.75} top={25.65 + addressTopNudge} width={26.65} height={1.18} center fit scale={1.0}  />
            <Fill value={payload.street} left={40.1} top={25.55 + addressTopNudge} width={26.6} height={1.18} center fit scale={1.0} />
            <Fill value={barangay} left={68.3} top={25.55 + addressTopNudge} width={26.7} height={1.18} center fit scale={1.0} />
            <Fill value={payload.municipality} left={11.75} top={28.75 + addressTopNudge} width={26.65} height={1.18} center fit scale={1.0}  />
            <Fill value={payload.province} left={40.1} top={28.75 + addressTopNudge} width={26.6} height={1.18} center fit scale={1.0}  />
            <Fill value={payload.region} left={68.3} top={28.75 + addressTopNudge} width={26.7} height={1.18} center fit scale={1.0}  />

            <Segmented value={digits(registrant.phone)} count={11} left={5.35} top={32.85} width={20.0} height={1.05} />
            <Segmented value={digits(payload.landline)} count={10} left={29.5} top={32.85} width={18.35} height={1.05} />
            <Segmented value={dateDigits(registrant.birthday)} count={8} left={5.35} top={36.45} width={17.8} height={1.05} />
            <Fill value={placeOfBirth[0]} left={25.35} top={35.75} width={23.4} height={1.05} center fit scale={1.0} />
            <Fill value={placeOfBirth[1]} left={25.35} top={37.0} width={11.25} height={1.05} center fit scale={1.0} />
            <Fill value={placeOfBirth[2]} left={37.3} top={37.0} width={11.45} height={1.05} center fit scale={1.0} />

            <Mark left={13.7} top={40.55} checked={payload.religion === 'Christianity'} />
            <Mark left={23.55} top={40.55} checked={payload.religion === 'Islam'} />
            <Mark left={29.60} top={40.55} checked={payload.religion === 'Others'} />
            {payload.religion === 'Others' && <Fill value={payload.religion_other} left={39.9} top={40.2} width={8.9} height={1.0} scale={1.0} />}
            <MappedMark value={registrant.civil_status} positions={civilStatusMarks} />
            {registrant.civil_status === 'Married' && <Fill value={payload.spouse_name} left={24.0} top={44.75} width={24.6} height={1.25} fit scale={1.1} />}
            <Fill value={payload.mother_maiden_name} left={23.5} top={48.1} width={25.05} height={1.25} fit scale={1.1} />

            <Mark left={23.25} top={50.65} checked={payload.household_head === 'Yes'} />
            <Mark left={30.35} top={50.70} checked={payload.household_head === 'No'} />
            {payload.household_head === 'No' && (
                <>
                    <Fill value={payload.household_head_name} left={24.95} top={52.15} width={24.65} height={1.0} fit scale={1.0} />
                    <Fill value={payload.household_relationship} left={24.95} top={54.10} width={24.6} height={1.0} fit scale={1.0} />
                </>
            )}
            <Fill value={payload.household_members} left={35.0} top={55.95} width={20.45} height={1.0} fit scale={1.0} />
            <Fill value={payload.household_male} left={17.2} top={57.95} width={10.4} height={1.0} fit scale={1.0}/>
            <Fill value={payload.household_female} left={42.0} top={57.95} width={13.5} height={1.0} fit scale={1.0} />

            <MappedMark value={payload.education} positions={educationMarks} />
            <YesNoMarks value={payload.pwd} yes={[76.60, 38.70]} no={[83.80, 38.65]} />
            <YesNoMarks value={payload.four_ps} yes={[76.3, 40.4]} no={[83.35, 41.30]} />
            <YesNoMarks value={payload.indigenous_group} yes={[76.3, 42.95]} no={[83.35, 43.05]} />
            {payload.indigenous_group === 'Yes' && <Fill value={payload.indigenous_specify} left={54.0} top={44.45} width={18.0} height={1.1} center fit scale={1.1} />}
            <YesNoMarks value={payload.government_id} yes={[67.35, 46.85]} no={[74.50, 46.85]} />
            {payload.government_id === 'Yes' && (
                <>
                    <Fill value={payload.government_id_type} left={67.2} top={47.55} width={27.45} height={1.0} fit scale={0.95} />
                    <Fill value={payload.government_id_number} left={67.2} top={48.95} width={27.45} height={1.0} fit scale={0.95} />
                </>
            )}
            <YesNoMarks value={payload.association_member} yes={[85.1, 51.28]} no={[90.90, 51.35]} />
            {payload.association_member === 'Yes' && <Fill value={payload.association_name} left={64.9} top={52.85} width={29.75} height={1.1} fit scale={1.1} />}
            <Fill value={payload.emergency_name} left={70.2} top={55.65} width={24.5} height={1.1} fit scale={1.1} />
            <Segmented value={emergencyContact.slice(0, 3)} count={3} left={65.95} top={57.95} width={6.99} height={1.35} className="rsbsa-segmented-value--contact" scale={1.3} />
            <Segmented value={emergencyContact.slice(3, 9)} count={6} left={72.94} top={57.95} width={16.3} height={1.35} className="rsbsa-segmented-value--contact" scale={1.3} />
            <Segmented value={emergencyContact.slice(9)} count={2} left={89.24} top={57.95} width={4.66} height={1.35} className="rsbsa-segmented-value--contact" scale={1.3} />

            <LivelihoodMarks value={payload.main_livelihood} />
            <ActivityMarks payload={payload} selectedLivelihoods={selectedLivelihoods} />
            {hasFarmer && selectedValues(payload.farmer_activities).includes('Other crops') && <Fill value={payload.farmer_other} left={20.5} top={71.9} width={21.0} height={1.0} fit scale = {1.0} />}
            {hasFarmer && selectedValues(payload.farmer_activities).includes('Livestock') && <Fill value={payload.farmer_livestock} left={20.5} top={74.8} width={21.0} height={1.0} fit scale = {1.0} />}
            {hasFarmer && selectedValues(payload.farmer_activities).includes('Poultry') && <Fill value={payload.farmer_poultry} left={20.5} top={77.45} width={21.0} height={1.0} fit scale = {1.0}/>}
            {hasFarmworker && selectedValues(payload.farmworker_activities).includes('Others') && <Fill value={payload.farmworker_other} left={41.75} top={77.3} width={7.8} height={1.0}fit scale = {1.0} />}
            {hasFisherfolk && selectedValues(payload.fishing_activities).includes('Others') && <Fill value={payload.fishing_other} left={59.95} top={77.25} width={13} height={1.0} fit scale = {1.0} />}
            {hasAgriYouth && selectedValues(payload.youth_activities).includes('Others') && <Fill value={payload.youth_other} left={89.15} top={77.45} width={8.2} height={1.0} fit scale = {0.90} />}
            <Fill value={farmingIncome} left={35.1} top={79.75} width={22.8} height={1.0} center fit scale={1.0} />
            <Fill value={nonFarmingIncome} left={73.0} top={79.75} width={21.6} height={1.0} center fit scale={1.0} />

        </>
    );
}

function PageTwo({ registrant, payload, parcels }) {
    const rotations = Array.isArray(payload.rotation_farmers) ? payload.rotation_farmers : [];

    return (
        <>
            <Fill value={parcels.length || ''} left={18.7} top={2.7} width={5.0} height={1.4} center fit scale={1.0} />
            <Fill value={rotations[0]} left={46.0} top={2.55} width={14.0} height={1.35} fit scale={1.0} />
            <Fill value={rotations[1]} left={63.3} top={2.55} width={14.3} height={1.35} fit scale={1.0} />
            <Fill value={rotations[2]} left={80.8} top={2.55} width={13.7} height={1.35} fit scale={1.0} />

            {parcels.map((parcel, index) => (
                <ParcelOverlay key={index} parcel={parcel} index={index} />
            ))}

            <Fill value={dateOnly(payload.date_administered)} left={5.0} top={62.55} width={17.9} height={2.0} center fit scale = {1.2} />
            <Fill value={registrant.full_name || fullName(registrant)} left={23.2} top={62.55} width={28.4} height={2.0} center fit scale = {1.2}  />

        </>
    );
}

function ParcelOverlay({ parcel, index }) {
    const top = parcelTops[index];
    const locationTopAdjustment = [0, -2.8, -5.1][index] || 0;
    const commodities = Array.isArray(parcel.commodities) ? parcel.commodities.slice(0, 5) : [];

    // Per-parcel Ancestral Domain Yes/No positions — fully independent per parcel.
    const ancestralDomainMarksByParcel = [
        // Parcel 1 (index 0)
        { yes: [30.5, top + 3.30], no: [37.5, top + 3.25] },
        // Parcel 2 (index 1)
        { yes: [30.5, top + 0.50], no: [37.5, top + 0.45] },
        // Parcel 3 (index 2)
        { yes: [31, top + -1.75], no: [38.05, top + -1.95] },
    ];
    const ancestralDomainMarks = ancestralDomainMarksByParcel[index] || ancestralDomainMarksByParcel[0];

    // Per-parcel Agrarian Reform Beneficiary Yes/No positions — fully independent per parcel.
    const agrarianReformMarksByParcel = [
        // Parcel 1 (index 0)
        { yes: [30.5, top + 5.30], no: [37.5, top + 5.35] },
        // Parcel 2 (index 1)
        { yes: [30.5, top + 2.60], no: [37.5, top + 2.55] },
        // Parcel 3 (index 2)
        { yes: [30.95, top + 0.30], no: [38.05, top + 0.25] },
    ];
    const agrarianReformMarks = agrarianReformMarksByParcel[index] || agrarianReformMarksByParcel[0];

    // Per-parcel ownership type checkbox positions — fully independent per parcel.
    // Edit only the block for the parcel you're adjusting; the others are untouched.
    const ownershipTypeMarksByParcel = [
        // Parcel 1 (index 0)
        {
            'Registered Owner': [10.75, top + 7.20],
            'Others': [24.8, top + 7.15],
            'Tenant': [10.75, top + 8.35],
            'Lessee': [10.8, top + 9.55],
        },
        // Parcel 2 (index 1)
        {
            'Registered Owner': [10.75, top + 4.45],
            'Others': [24.8, top + 4.45],
            'Tenant': [10.75, top + 5.55],
            'Lessee': [10.8, top + 6.75],
        },
        // Parcel 3 (index 2)
        {
            'Registered Owner': [11.20 , top + 2.15],
            'Others': [25.20, top + 2.15],
            'Tenant': [11.3, top + 3.25],
            'Lessee': [11.3, top + 4.45],
        },
    ];
    const ownershipTypeMarks = ownershipTypeMarksByParcel[index] || ownershipTypeMarksByParcel[0];

    // Per-parcel Total Farm Area position — fully independent per parcel.
    const totalAreaByParcel = [
        { left: 23.25, top: top + 1.75 }, // Parcel 1 (index 0)
        { left: 23.25, top: top + -1.00 }, // Parcel 2 (index 1)
        { left: 23.65, top: top + -3.35 }, // Parcel 3 (index 2)
    ];
    const totalAreaPos = totalAreaByParcel[index] || totalAreaByParcel[0];

    // Per-parcel Ownership Document No. position — fully independent per parcel.
    const ownershipDocNoByParcel = [
        { left: 22.95, top: top + 3.95 },  // Parcel 1 (index 0)
        { left: 22.95, top: top + 1.10 }, // Parcel 2 (index 1)
        { left: 23.30, top: top + -1.15 }, // Parcel 3 (index 2)
    ];
    const ownershipDocNoPos = ownershipDocNoByParcel[index] || ownershipDocNoByParcel[0];

    // Per-parcel commodity row vertical adjustments — fully independent per parcel.
    // Edit only the block for the parcel you're adjusting; the others are untouched.
    const commodityGridByParcel = [
        { top: top - 2.25, rowHeight: 2.78 }, // Parcel 1
        { top: top - 3.95, rowHeight: 2.25 }, // Parcel 2
        { top: top - 5.95, rowHeight: 2.25 }, // Parcel 3
    ];
    const commodityGrid = commodityGridByParcel[index] || commodityGridByParcel[0];
    const commodityRowNudgesByParcel = [
        [0.55, 0.45, 0, 0, -0.15], // Parcel 1
        [-0.15, -0.15, -0.15, -0.15, 0.1], // Parcel 2
        [-0.15, -0.15, -0.15, -0.15, -0.15], // Parcel 3
    ];
    const commodityRowNudges = commodityRowNudgesByParcel[index] || commodityRowNudgesByParcel[0];
    const commodityValueTopNudge = 0.85;

    // Per-parcel Ownership "Others" specify text  position — fully independent per parcel.
    // Each parcel has its own dedicated position object below — edit only the one for the
    // parcel you're adjusting; the others remain untouched.
    const ownershipOtherParcel1 = { left: 31.2, top: top + 6.5 }; // beside Parcel 1's "Others" checkbox
    const ownershipOtherParcel2 = { left: 31.2, top: top + 3.75 }; // beside Parcel 2's "Others" checkbox
    const ownershipOtherParcel3 = { left: 31.6, top: top + 1.25 }; // beside Parcel 3's "Others" checkbox

    const ownershipOtherPos =
        index === 0 ? ownershipOtherParcel1 :
        index === 1 ? ownershipOtherParcel2 :
        index === 2 ? ownershipOtherParcel3 :
        ownershipOtherParcel1;

    // Per-parcel Tenant/Lessee land owner name positions.
    const ownerNameByParcel = [
        {
            Tenant: { left: 26.7, top: top + 7.85 },
            Lessee: { left: 26.7, top: top + 8.90 },
        },
        {
            Tenant: { left: 26.7, top: top + 4.95 },
            Lessee: { left: 26.7, top: top + 6.25 },
        },
        {
            Tenant: { left: 26.9, top: top + 2.75 },
            Lessee: { left: 26.7, top: top + 3.85 },
        },
    ];
    const ownerNamePos = ownerNameByParcel[index]?.[parcel.ownership_type];

    // TEMPORARY DEBUG — remove after confirming actual row index/order of commodities
    return (
        <>
            <Fill value={parcel.location_barangay} left={14.8} top={top + locationTopAdjustment - 1.2} width={29.5} height={1.05} center />
            <Fill value={parcel.location_municipality} left={14.8} top={top + locationTopAdjustment + .10} width={29.5} height={1.05} center />
            <Fill value={formatArea(parcel.total_area)} left={totalAreaPos.left} top={totalAreaPos.top} width={3.4} height={1.0} center fit scale = {0.88}/>
            <YesNoMarks value={parcel.ancestral_domain} yes={ancestralDomainMarks.yes} no={ancestralDomainMarks.no} />
            <Fill value={parcel.ownership_document_number} left={ownershipDocNoPos.left} top={ownershipDocNoPos.top} width={3.9} height={1.0} center fit scale = {0.88} />
            <YesNoMarks value={parcel.agrarian_reform_beneficiary} yes={agrarianReformMarks.yes} no={agrarianReformMarks.no} />
            <MappedMark value={parcel.ownership_type} positions={ownershipTypeMarks} />
            {parcel.ownership_type === 'Others' && <Fill value={parcel.ownership_other} left={ownershipOtherPos.left} top={ownershipOtherPos.top} width={15.0} height={1.05} fit scale={0.88} />}
            {ownerNamePos && <Fill value={parcel.owner_name} left={ownerNamePos.left} top={ownerNamePos.top} width={21.5} height={1.05} fit scale={0.88} />}
            {commodities.map((commodity, row) => {
                const rowTop = commodityGrid.top + row * commodityGrid.rowHeight + (commodityRowNudges[row] || 0);
                return (
                    <React.Fragment key={row}>
                        <Fill value={commodity.commodity} left={46.25} top={rowTop + commodityValueTopNudge} width={12.0} height={1.65} center fit scale={0.88} />
                        <Fill value={formatArea(commodity.size)} left={58.7} top={rowTop + commodityValueTopNudge} width={6.0} height={1.65} center fit scale={1.0} />
                        <Fill value={commodity.heads} left={65.2} top={rowTop + commodityValueTopNudge} width={6.0} height={1.65} center fit scale={1.0} />
                        <Fill value={commodity.farm_type} left={72.0} top={rowTop + commodityValueTopNudge} width={6.9} height={1.65} center fit scale={1.0} />
                        <Fill value={organicValue(commodity.organic_practitioner)} left={79.3} top={rowTop + commodityValueTopNudge} width={6.6} height={1.65} center fit scale={1.0} />
                        <Fill value={commodity.remarks} left={86.25} top={rowTop + commodityValueTopNudge} width={9.0} height={1.65} center fit scale={1.0} />
                    </React.Fragment>
                );
            })}
        </>
    );
}

function ActivityMarks({ payload, selectedLivelihoods }) {
    const activityLivelihoods = {
        farmer_activities: 'Farmer',
        farmworker_activities: 'Farmworker/Laborer',
        fishing_activities: 'Fisherfolk',
        youth_activities: 'Agri Youth',
    };

    return Object.entries(activityMarks).flatMap(([field, positions]) => {
        if (! selectedLivelihoods.includes(activityLivelihoods[field])) return [];
        const selected = selectedValues(payload[field]);
        return Object.entries(positions).map(([value, [left, top]]) => (
            <Mark key={`${field}-${value}`} left={left} top={top} checked={selected.includes(value)} />
        ));
    });
}

function LivelihoodMarks({ value }) {
    const selected = selectedValues(value);
    return Object.entries(livelihoodMarks).map(([livelihood, [left, top]]) => (
        <Mark key={livelihood} left={left} top={top} checked={selected.includes(livelihood)} />
    ));
}

function selectedValues(value) {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
}

function formatArea(value) {
    if (value === null || value === undefined || value === '') return '';
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : String(value);
}

function Fill({ value, left, top, width, height, center = false, right = false, prominent = false, fit = false, compact = false, multiline = false, scale }) {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value);
    const className = [
        'rsbsa-filled-value',
        center ? 'rsbsa-filled-value--center' : '',
        right ? 'rsbsa-filled-value--right' : '',
        prominent ? 'rsbsa-filled-value--prominent' : '',
        fit ? 'rsbsa-filled-value--fit' : '',
        compact ? 'rsbsa-filled-value--compact' : '',
        multiline ? 'rsbsa-filled-value--multiline' : '',
    ].filter(Boolean).join(' ');
    const style = { ...position(left, top, width, height), '--rsbsa-fit-scale': autoFitScale(text, width, prominent) };
    if (scale) style.fontSize = `${scale}em`;
    return <span className={className} style={style}>{text}</span>;
}

function LeftText(props) {
    return <Fill {...props} />;
}

function CenterText(props) {
    return <Fill {...props} center />;
}

function MultilineText(props) {
    return <Fill {...props} multiline fit />;
}

function Segmented({ value, count, left, top, width, height, className = '', scale }) {
    const characters = String(value || '').replace(/[^A-Za-z0-9]/g, '').slice(0, count).split('');
    if (! characters.length) return null;
    const outerStyle = { ...position(left, top, width, height), '--rsbsa-cells': count };
    const cellStyle = scale ? { fontSize: `${scale}em` } : undefined;
    return (
        <span className={['rsbsa-segmented-value', className].filter(Boolean).join(' ')} style={outerStyle}>
            {Array.from({ length: count }, (_, index) => (
                <span key={index} style={cellStyle}>{characters[index] || ''}</span>
            ))}
        </span>
    );
}

function ReferenceNumber({ value, left, top, width, height }) {
    const characters = digits(value).slice(0, 15).split('');
    if (! characters.length) return null;

    const groups = [2, 2, 2, 3, 6];
    const gap = 0.42;
    const cellWidth = (width - gap * (groups.length - 1)) / groups.reduce((sum, count) => sum + count, 0);
    let cursor = 0;
    let offset = left;

    return groups.map((count, groupIndex) => {
        const groupValue = characters.slice(cursor, cursor + count).join('');
        const groupWidth = cellWidth * count;
        cursor += count;

        const element = (
            <Segmented
                key={groupIndex}
                value={groupValue}
                count={count}
                left={offset}
                top={top}
                width={groupWidth}
                height={height}
            />
        );
        offset += groupWidth + gap;

        return element;
    });
}

function Mark({ left, top, checked }) {
    if (! checked) return null;
    return <span className="rsbsa-filled-mark" style={{ left: `${left}%`, top: `${top}%` }} />;
}

function CheckMark(props) {
    return <Mark {...props} />;
}

function MappedMark({ value, positions }) {
    const point = positions[value];
    return point ? <Mark left={point[0]} top={point[1]} checked /> : null;
}

function YesNoMarks({ value, yes, no }) {
    return (
        <>
            <Mark left={yes[0]} top={yes[1]} checked={value === 'Yes'} />
            <Mark left={no[0]} top={no[1]} checked={value === 'No'} />
        </>
    );
}

function Cover({ left, top, width, height, className = '' }) {
    return <span className={`rsbsa-cover ${className}`} style={position(left, top, width, height)} />;
}

function position(left, top, width, height) {
    return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}

function digits(value) {
    return String(value || '').replace(/\D/g, '');
}

function dateDigits(value) {
    const date = dateOnly(value);
    if (! date) return '';
    const [year, month, day] = date.split('-');
    return `${month || ''}${day || ''}${year || ''}`;
}

function dateOnly(value) {
    return value ? String(value).slice(0, 10) : '';
}

function peso(value) {
    const amount = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    if (! Number.isFinite(amount)) return '';

    return `P${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function organicValue(value) {
    if (! value) return '';
    return value === 'Yes' ? 'Y' : 'N';
}

function fullName(registrant) {
    return [registrant.first_name, registrant.middle_name, registrant.last_name, registrant.suffix].filter(Boolean).join(' ');
}

function autoFitScale(value, width, prominent = false) {
    const textLength = String(value || '').length;
    if (! textLength || !width) return 1;

    const capacity = Math.max(4, width * (prominent ? 0.82 : 1.08));
    if (textLength <= capacity) return 1;

    return Math.max(0.66, Math.min(1, capacity / textLength));
}
