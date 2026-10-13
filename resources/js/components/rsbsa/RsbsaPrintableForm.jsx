import React from 'react';

const educationOptions = ['Pre-school', 'Elementary', 'High School (non K-12)', 'Junior High School (K-12)', 'Senior High School (K-12)', 'College', 'Vocational', 'Post-graduate', 'None'];
const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated'];
const farmerActivities = ['Rice', 'Corn', 'Other crops', 'Livestock', 'Poultry'];
const farmworkerActivities = ['Land Preparation', 'Planting/Transplanting', 'Cultivation', 'Harvesting', 'Others'];
const fishingActivities = ['Fish Capture', 'Aquaculture', 'Gleaning', 'Fish Processing', 'Fish Vending', 'FishR', 'BoatR', 'Others'];
const youthActivities = ['Part of a farming household', 'Attending/attended formal agri-fishery related course', 'Attending/attended non-formal agri-fishery related course', 'Participated in any agricultural activity/program', 'Others'];

export default function RsbsaPrintableForm({ registrant }) {
    const p = registrant.rsbsa_payload || {};
    const parcels = p.parcels?.length ? p.parcels : [];

    return (
        <article className="rsbsa-native-form">
            <section className="rsbsa-exact-sheet rsbsa-native-sheet">
                <Header registrant={registrant} payload={p} />
                <Band>Part I: Personal Information</Band>
                <NameGrid registrant={registrant} />
                <AddressGrid registrant={registrant} payload={p} />
                <PersonalGrid registrant={registrant} payload={p} />
                <HouseholdGrid payload={p} />
                <Band>Part II: Farm Profile</Band>
                <LivelihoodGrid payload={p} />
            </section>

            <section className="rsbsa-exact-sheet rsbsa-native-sheet">
                <ContinuationHeader registrant={registrant} />
                <Band>Part III: Farm Parcel Information</Band>
                <ParcelHeader payload={p} parcels={parcels} />
                <ParcelTable parcels={parcels} />
                <Declaration registrant={registrant} payload={p} />
                <Verification />
                <Privacy />
            </section>
        </article>
    );
}

function Header({ registrant, payload }) {
    return (
        <header className="rsbsa-native-header">
            <div className="rsbsa-revision">RSBSA Enrollment Form</div>
            <div className="rsbsa-native-brand">
                <div className="rsbsa-seal" aria-hidden="true">
                    <span>DEPARTMENT OF</span>
                    <strong>DA</strong>
                    <span>AGRICULTURE</span>
                </div>
                <div className="rsbsa-brand-copy">
                    <p className="rsbsa-agency">Republic of the Philippines<br />Department of Agriculture</p>
                    <h1>RSBSA Enrollment Form</h1>
                    <p className="rsbsa-program">Registry System for Basic Sectors in Agriculture</p>
                </div>
            </div>
            <div className="rsbsa-native-reference">
                <div className="rsbsa-row">
                    <strong>Enrollment Type &amp; Date Administered:</strong>
                    <Check label="New" checked={payload.enrollment_type === 'New'} />
                    <Check label="Updating" checked={payload.enrollment_type === 'Updating'} />
                    <Boxes value={dateDigits(payload.date_administered)} count={8} />
                </div>
                <div className="rsbsa-row">
                    <strong>Reference Number:</strong>
                    <Boxes value={digits(registrant.registry_number)} count={15} />
                </div>
            </div>
            <div className="rsbsa-photo-box">
                {registrant.photo_url ? <img src={registrant.photo_url} alt="Applicant" /> : null}
                {! registrant.photo_url && <span>Photo</span>}
            </div>
        </header>
    );
}

function ContinuationHeader({ registrant }) {
    return (
        <header className="rsbsa-continuation-header">
            <div>
                <span>Registry System for Basic Sectors in Agriculture</span>
                <strong>RSBSA Enrollment Form</strong>
            </div>
            <div className="rsbsa-continuation-reference">
                <span>Reference Number</span>
                <Boxes value={digits(registrant.registry_number)} count={15} />
            </div>
        </header>
    );
}

function NameGrid({ registrant }) {
    return (
        <div className="rsbsa-native-grid rsbsa-name-grid">
            <Field label="Surname" value={registrant.last_name} />
            <Field label="First Name" value={registrant.first_name} />
            <Field label="Middle Name" value={registrant.middle_name} />
            <Field label="Extension Name" value={registrant.suffix} />
            <div className="rsbsa-field rsbsa-sex-field">
                <span>Sex:</span>
                <Check label="Male" checked={registrant.sex === 'Male'} />
                <Check label="Female" checked={registrant.sex === 'Female'} />
            </div>
        </div>
    );
}

function AddressGrid({ registrant, payload }) {
    return (
        <section className="rsbsa-native-box">
            <h3>Address</h3>
            <div className="rsbsa-native-grid rsbsa-address-grid">
                <Field label="House/Lot/Bldg. No./Purok" value={payload.address_line} />
                <Field label="Street/Sitio/Subdv." value={payload.street} />
                <Field label="Barangay" value={registrant.barangay?.name || payload.barangay_name} />
                <Field label="Municipality/City" value={payload.municipality} />
                <Field label="Province" value={payload.province} />
                <Field label="Region" value={payload.region} />
            </div>
        </section>
    );
}

function PersonalGrid({ registrant, payload }) {
    return (
        <div className="rsbsa-two-column">
            <section className="rsbsa-native-box">
                <div className="rsbsa-native-grid rsbsa-contact-grid">
                    <Field label="Mobile Number" value={<Boxes value={digits(registrant.phone)} count={11} />} />
                    <Field label="Landline Number" value={<Boxes value={digits(payload.landline)} count={10} />} />
                    <Field label="Date of Birth" value={<Boxes value={dateDigits(registrant.birthday)} count={8} />} />
                    <Field label="Place of Birth" value={[payload.birth_municipality, payload.birth_province, payload.birth_country].filter(Boolean).join(', ')} />
                    <ChoiceRow label="Religion" value={payload.religion} options={['Christianity', 'Islam', 'Others']} extra={payload.religion_other} />
                    <ChoiceRow label="Civil Status" value={registrant.civil_status} options={civilStatusOptions} />
                    <Field label="Name of Spouse if Married" value={payload.spouse_name} />
                </div>
            </section>
            <section className="rsbsa-native-box">
                <ChoiceGrid label="Highest Formal Education" value={payload.education} options={educationOptions} />
                <YesNo label="4Ps Beneficiary?" value={payload.four_ps} />
                <YesNo label="With Government ID?" value={payload.government_id} />
                <Field label="If yes, specify ID Type" value={payload.government_id_type} />
                <Field label="ID Number" value={payload.government_id_number} />
                <YesNo label="Member of any Farmers Association/Cooperative?" value={payload.association_member} />
                <Field label="If yes, specify" value={payload.association_name} />
                <Field label="Person to Notify in Case of Emergency" value={payload.emergency_name} />
                <Field label="Contact Number" value={<Boxes value={digits(payload.emergency_contact)} count={12} />} />
            </section>
        </div>
    );
}

function HouseholdGrid({ payload }) {
    return (
        <section className="rsbsa-native-box">
            <h3>Household Head?</h3>
            <div className="rsbsa-native-grid rsbsa-household-grid">
                <YesNo label="" value={payload.household_head} />
                <Field label="If no, name of household head" value={payload.household_head_name} />
                <Field label="Relationship" value={payload.household_relationship} />
                <Field label="No. of living household members" value={payload.household_members} />
                <Field label="No. of male" value={payload.household_male} />
                <Field label="No. of female" value={payload.household_female} />
            </div>
        </section>
    );
}

function LivelihoodGrid({ payload }) {
    return (
        <section>
            <div className="rsbsa-main-livelihood">
                <strong>Main Livelihood</strong>
                {['Farmer', 'Farmworker/Laborer', 'Fisherfolk', 'Agri Youth'].map((item) => <Check key={item} label={item} checked={payload.main_livelihood === item} />)}
            </div>
            <div className="rsbsa-livelihood-columns">
                <ActivityColumn title="For farmers" label="Type of Farming Activity" values={payload.farmer_activities} options={farmerActivities} other={payload.farmer_other} />
                <ActivityColumn title="For farmworkers" label="Kind of Work" values={payload.farmworker_activities} options={farmworkerActivities} other={payload.farmworker_other} />
                <ActivityColumn title="For fisherfolk" label="Type of Fishing Activity" values={payload.fishing_activities} options={fishingActivities} other={payload.fishing_other} />
                <ActivityColumn title="For agri youth" label="Type of Involvement" values={payload.youth_activities} options={youthActivities} other={payload.youth_other} />
            </div>
        </section>
    );
}

function ParcelHeader({ payload, parcels }) {
    return (
        <div className="rsbsa-parcel-header">
            <strong>No. of Farm Parcels:</strong>
            <span>{parcels.length || ''}</span>
            <strong>Name of Farmer/s in Rotation:</strong>
            {(payload.rotation_farmers || ['', '', '']).slice(0, 3).map((value, index) => <span key={index}>(P{index + 1}) {value}</span>)}
        </div>
    );
}

function ParcelTable({ parcels }) {
    const rows = [0, 1, 2].map((index) => parcels[index] || {});

    return (
        <table className="rsbsa-parcel-table">
            <thead>
                <tr>
                    <th>Farm Parcel No.</th>
                    <th>Farm Land Description</th>
                    <th>Crop/Commodity<br /><em>(Rice/Corn/HVC/Livestock/Poultry/Agri-fishery)</em></th>
                    <th>Size (ha)</th>
                    <th>No. of Head<br /><em>(For Livestock and Poultry)</em></th>
                    <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((parcel, index) => <ParcelRows key={index} parcel={parcel} index={index} />)}
            </tbody>
        </table>
    );
}

function ParcelRows({ parcel, index }) {
    const commodities = [...(parcel.commodities || [])].slice(0, 5);
    while (commodities.length < 5) commodities.push({});

    return commodities.map((commodity, rowIndex) => (
        <tr key={rowIndex}>
            {rowIndex === 0 && <td rowSpan="5" className="rsbsa-parcel-no">{index + 1}</td>}
            {rowIndex === 0 && (
                <td rowSpan="5" className="rsbsa-land-description">
                    <Field label="Farm Location" value={[parcel.location_barangay, parcel.location_municipality].filter(Boolean).join(', ')} />
                    <Field label="Total Farm Area (in hectares)" value={parcel.total_area} />
                    <YesNo label="Within Ancestral Domain" value={parcel.ancestral_domain} />
                    <YesNo label="Agrarian Reform Beneficiary" value={parcel.agrarian_reform_beneficiary} />
                    <ChoiceRow label="Ownership Type" value={parcel.ownership_type} options={['Registered Owner', 'Tenant', 'Lessee', 'Others']} extra={parcel.ownership_other} />
                </td>
            )}
            <td>{commodity.commodity || ''}</td>
            <td>{commodity.size || ''}</td>
            <td>{commodity.heads || ''}</td>
            <td>{commodity.remarks || ''}</td>
        </tr>
    ));
}

function Declaration({ registrant, payload }) {
    return (
        <section className="rsbsa-declaration-native">
            <p>I hereby declare that all information indicated above are true and correct, and that they may be used by Department of Agriculture for the purposes of registration to the Registry System for Basic Sectors in Agriculture (RSBSA) and other legitimate interests of the Department pursuant to its mandates.</p>
            <div className="rsbsa-signature-grid">
                <Signature label="Date" value={dateOnly(payload.date_administered)} />
                <Signature label="Printed Name of Applicant" value={registrant.full_name} />
                <Signature label="Signature of Applicant" />
                <Signature label="Thumbmark" />
            </div>
        </section>
    );
}

function Verification() {
    return (
        <section className="rsbsa-verification">
            <h3>Verified True and Correct By:</h3>
            <div className="rsbsa-signature-grid three">
                <Signature label="Barangay Chairman / City/Mun. Veterinarian (Livestock) / Mill District Officer / IP Leader" />
                <Signature label="City/Municipal Agriculture Office" />
                <Signature label="CAFC/MAFC Chairman" />
            </div>
        </section>
    );
}

function Privacy() {
    return (
        <section className="rsbsa-privacy">
            <h3>Data Privacy Policy</h3>
            <p>The collection of personal information is for documentation, planning, reporting and processing purposes in availing agricultural related interventions. Processed data shall only be shared to partner agencies for planning, reporting and other use in accordance to the mandate of the agency.</p>
            <strong>This form is not for sale</strong>
        </section>
    );
}

function Field({ label, value }) {
    return <div className="rsbsa-field"><span>{label}</span><strong>{value || ''}</strong></div>;
}

function Band({ children }) {
    return <div className="rsbsa-native-band">{children}</div>;
}

function Check({ label, checked }) {
    return <span className="rsbsa-check"><i>{checked ? '✓' : ''}</i>{label}</span>;
}

function YesNo({ label, value }) {
    return <div className="rsbsa-yes-no">{label && <span>{label}</span>}<Check label="Yes" checked={value === 'Yes'} /><Check label="No" checked={value === 'No'} /></div>;
}

function ChoiceRow({ label, value, options, extra }) {
    return <div className="rsbsa-choice-row"><span>{label}</span>{options.map((option) => <Check key={option} label={option} checked={value === option} />)}{extra && <strong>{extra}</strong>}</div>;
}

function ChoiceGrid({ label, value, options }) {
    return <div className="rsbsa-choice-grid"><span>{label}</span>{options.map((option) => <Check key={option} label={option} checked={value === option} />)}</div>;
}

function ActivityColumn({ title, label, values = [], options, other }) {
    return <section><h3>{title}</h3><p>{label}</p>{options.map((option) => <Check key={option} label={option} checked={values.includes(option)} />)}{other && <Field label="Please specify" value={other} />}</section>;
}

function Boxes({ value, count }) {
    const chars = String(value || '').replace(/[^A-Za-z0-9]/g, '').slice(0, count).split('');
    return <span className="rsbsa-boxes">{Array.from({ length: count }).map((_, index) => <i key={index}>{chars[index] || ''}</i>)}</span>;
}

function Signature({ label, value }) {
    return <div className="rsbsa-signature"><span>{value || ''}</span><strong>{label}</strong></div>;
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
