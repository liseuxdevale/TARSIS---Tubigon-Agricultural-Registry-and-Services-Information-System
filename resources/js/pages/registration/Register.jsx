import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, PageHeader, PageLoader, StatusBadge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { assignedBarangayIds, isBarangayScoped, sectorAdminRoles } from '../../utils/rbac';
import { registrantSectorLabel } from '../../utils/registrantLabels';
import { formatRegistryNumber } from '../../utils/format';
import DigitalID from './DigitalID';
import RsbsaTemplateFirstRenderer from '../../components/rsbsa/RsbsaTemplateFirstRenderer';
import DuplicateRegistrationWarning from '../../components/rsbsa/DuplicateRegistrationWarning';

const educationOptions = ['Pre-school', 'Elementary', 'High School (non K-12)', 'Junior High School (K-12)', 'Senior High School (K-12)', 'College', 'Vocational', 'Post-graduate', 'None'];
const livelihoodOptions = ['Farmer', 'Farmworker/Laborer', 'Fisherfolk', 'Agri Youth'];
const farmingActivities = ['Rice', 'Corn', 'Other crops', 'Livestock', 'Poultry'];
const farmworkerActivities = ['Land Preparation', 'Planting/Transplanting', 'Cultivation', 'Harvesting', 'Others'];
const fishingActivities = ['Fish Capture', 'Aquaculture', 'Gleaning', 'Fish Processing', 'Fish Vending', 'FishR', 'BoatR', 'Others'];
const youthActivities = ['Part of a farming household', 'Attending/attended formal agri-fishery related course', 'Attending/attended non-formal agri-fishery related course', 'Participated in any agricultural activity/program', 'Others'];
const municipalityOptions = ['Tubigon'];
const provinceOptions = ['Bohol'];
const parcelOwnershipTypes = ['Registered Owner', 'Tenant', 'Lessee', 'Others'];
const MAX_COMMODITIES_PER_PARCEL = 5;

const emptyCommodity = () => ({ commodity: '', size: '', heads: '', farm_type: '', organic_practitioner: '', remarks: '' });
const emptyParcel = () => ({
    location_barangay: '',
    location_municipality: '',
    total_area: '',
    ownership_document_number: '',
    ancestral_domain: '',
    agrarian_reform_beneficiary: '',
    ownership_type: '',
    owner_name: '',
    ownership_other: '',
    commodities: [emptyCommodity()],
});

const initialForm = {
    enrollment_type: 'New',
    reference_id: '',
    date_administered: localDate(),
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    sex: '',
    birthday: '',
    civil_status: '',
    address_line: '',
    street: '',
    barangay_id: '',
    municipality: '',
    province: '',
    region: '',
    phone: '',
    landline: '',
    email: '',
    birth_municipality: '',
    birth_province: '',
    birth_country: '',
    mother_maiden_name: '',
    religion: '',
    religion_other: '',
    education: '',
    pwd: '',
    spouse_name: '',
    household_head: '',
    household_head_name: '',
    household_relationship: '',
    household_members: '',
    household_male: '',
    household_female: '',
    four_ps: '',
    indigenous_group: '',
    indigenous_specify: '',
    government_id: '',
    government_id_type: '',
    government_id_number: '',
    association_member: '',
    association_name: '',
    emergency_name: '',
    emergency_contact: '',
    main_livelihood: [],
    farmer_activities: [],
    farmer_other: '',
    farmer_livestock: '',
    farmer_poultry: '',
    farmworker_activities: [],
    farmworker_other: '',
    fishing_activities: [],
    fishing_other: '',
    youth_activities: [],
    youth_other: '',
    rotation_farmers: ['', '', ''],
    gross_farming_income: '',
    gross_non_farming_income: '',
    parcels: [emptyParcel()],
};

export default function Register() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [barangays, setBarangays] = useState([]);
    const [barangaysLoading, setBarangaysLoading] = useState(true);
    const [barangaysError, setBarangaysError] = useState('');
    const [barangayConfirmed, setBarangayConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [registeredUsers, setRegisteredUsers] = useState([]);
    const [registeredUsersLoading, setRegisteredUsersLoading] = useState(false);
    const [registeredUsersError, setRegisteredUsersError] = useState('');
    const [referenceRegistrant, setReferenceRegistrant] = useState(null);
    const [referenceLookupLoading, setReferenceLookupLoading] = useState(false);
    const [referenceLookupError, setReferenceLookupError] = useState('');
    const [linkedRegistrant, setLinkedRegistrant] = useState(null);
    const [linkedRegistrantLoading, setLinkedRegistrantLoading] = useState(false);
    const [showRegistrationForm, setShowRegistrationForm] = useState(false);
    const staffRoles = ['super_admin', 'mao_staff', 'barangay_technical_staff', ...sectorAdminRoles];
    const isStaff = staffRoles.includes(user?.role);
    const isBeneficiaryUser = Boolean(user) && !isStaff;
    const barangayScoped = isBarangayScoped(user);
    const scopedBarangayIds = useMemo(() => assignedBarangayIds(user), [user]);
    const scopedBarangayKey = scopedBarangayIds.join(',');
    const draftKey = user?.id ? `rsbsa-registration-draft:${user.id}` : null;
    const [loadedDraftKey, setLoadedDraftKey] = useState(null);

    useEffect(() => {
        if (!draftKey) return;
        const names = !isStaff ? user.name?.trim().split(/\s+/) || [] : [];
        let next = normalizeForm({
            ...initialForm,
            first_name: !isStaff ? user.first_name ?? names[0] ?? '' : '',
            middle_name: !isStaff ? user.middle_name || '' : '',
            last_name: !isStaff ? user.last_name ?? names.slice(1).join(' ') : '',
            phone: !isStaff ? user.phone || '' : '',
            email: !isStaff ? user.email || '' : '',
        });
        const draft = localStorage.getItem(draftKey);
        try {
            if (draft) next = normalizeForm({ ...next, ...JSON.parse(draft) });
        } catch {
            localStorage.removeItem(draftKey);
        }
        setForm(next);
        setLoadedDraftKey(draftKey);
    }, [draftKey, isStaff]);

    useEffect(() => {
        setBarangaysLoading(true);
        setBarangaysError('');
        api.get('/barangays?all=1')
            .then((response) => {
                const rows = Array.isArray(response.data) ? response.data : response.data.data || [];
                const scoped = barangayScoped ? rows.filter((row) => scopedBarangayIds.includes(Number(row.id))) : rows;
                setBarangays(scoped);
                if (barangayScoped) {
                    setBarangayConfirmed(false);
                    setForm((current) => ({
                        ...current,
                        barangay_id: scoped.length === 1 ? String(scoped[0].id) : '',
                    }));
                }
            })
            .catch(() => {
                setBarangays([]);
                setBarangaysError('Assigned barangays could not be loaded.');
            })
            .finally(() => setBarangaysLoading(false));
    }, [barangayScoped, scopedBarangayKey]);

    useEffect(() => {
        if (!isBeneficiaryUser) return undefined;

        let active = true;
        setLinkedRegistrantLoading(true);

        api.get('/tracking/me')
            .then((response) => {
                if (!active) return;
                const registrant = response.data.registrant || null;
                setLinkedRegistrant(registrant);
                if (registrant) {
                    setReferenceRegistrant(registrant);
                    populateFormFromReference(registrant);
                    setShowRegistrationForm(false);
                } else {
                    setShowRegistrationForm(true);
                }
            })
            .catch(() => {
                if (!active) return;
                setLinkedRegistrant(null);
                setShowRegistrationForm(true);
            })
            .finally(() => {
                if (active) setLinkedRegistrantLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isBeneficiaryUser, draftKey]);

    useEffect(() => {
        if (draftKey && loadedDraftKey === draftKey) {
            localStorage.setItem(draftKey, JSON.stringify(form));
        }
    }, [form, draftKey, loadedDraftKey]);

    useEffect(() => {
        if (form.enrollment_type !== 'Updating' || isBeneficiaryUser || (barangayScoped && !barangayConfirmed)) {
            setRegisteredUsers([]);
            setRegisteredUsersError('');
            setRegisteredUsersLoading(false);
            setReferenceRegistrant(null);
            setReferenceLookupError('');
            return;
        }

        let active = true;
        setRegisteredUsersLoading(true);
        setRegisteredUsersError('');
        const referenceSearch = form.reference_id.trim();
        const barangayFilter = barangayScoped && form.barangay_id ? `&barangay_id=${encodeURIComponent(form.barangay_id)}` : '';
        api.get(`/registrants?search=${encodeURIComponent(referenceSearch)}&per_page=8&sort=recently_edited${barangayFilter}`)
            .then((response) => {
                if (active) setRegisteredUsers(response.data.data || []);
            })
            .catch(() => {
                if (! active) return;
                setRegisteredUsers([]);
                setRegisteredUsersError('Registered users are unavailable for this account.');
            })
            .finally(() => {
                if (active) setRegisteredUsersLoading(false);
            });

        return () => {
            active = false;
        };
    }, [barangayConfirmed, barangayScoped, form.barangay_id, form.enrollment_type, form.reference_id, isBeneficiaryUser]);

    useEffect(() => {
        if (! isBeneficiaryUser || form.enrollment_type !== 'Updating') return;

        let active = true;
        setReferenceLookupLoading(true);
        setReferenceLookupError('');
        setRegisteredUsers([]);
        setRegisteredUsersError('');
        setRegisteredUsersLoading(false);

        api.get('/tracking/me')
            .then((response) => {
                if (! active) return;
                const registrant = response.data.registrant || null;
                setReferenceRegistrant(registrant);
                if (registrant) {
                    populateFormFromReference(registrant);
                    setReferenceLookupError('');
                } else {
                    setReferenceLookupError('No registration record is linked to your account yet.');
                }
            })
            .catch(() => {
                if (! active) return;
                setReferenceRegistrant(null);
                setReferenceLookupError('Unable to load the registration linked to your account.');
            })
            .finally(() => {
                if (active) setReferenceLookupLoading(false);
            });

        return () => {
            active = false;
        };
    }, [form.enrollment_type, isBeneficiaryUser]);

    useEffect(() => {
        const referenceId = form.reference_id.trim();
        if (form.enrollment_type !== 'Updating' || isBeneficiaryUser || ! referenceId || (barangayScoped && !barangayConfirmed)) {
            setReferenceRegistrant(null);
            setReferenceLookupError('');
            setReferenceLookupLoading(false);
            return;
        }

        let active = true;
        setReferenceLookupLoading(true);
        setReferenceLookupError('');
        const timer = window.setTimeout(() => {
            const barangayFilter = barangayScoped && form.barangay_id ? `&barangay_id=${encodeURIComponent(form.barangay_id)}` : '';
            api.get(`/registrants?search=${encodeURIComponent(referenceId)}&per_page=8&sort=recently_edited${barangayFilter}`)
                .then((response) => {
                    if (! active) return;
                    const rows = response.data.data || [];
                    const exact = findMatchingRegistrant(rows, referenceId);
                    setReferenceRegistrant(exact || null);
                    if (exact) populateFormFromReference(exact);
                    setReferenceLookupError(exact ? '' : 'No registered user matches this reference ID or name.');
                })
                .catch(() => {
                    if (! active) return;
                    setReferenceRegistrant(null);
                    setReferenceLookupError('Unable to load reference details for this account.');
                })
                .finally(() => {
                    if (active) setReferenceLookupLoading(false);
                });
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [barangayConfirmed, barangayScoped, form.barangay_id, form.enrollment_type, form.reference_id, isBeneficiaryUser]);

    const activityMap = {
        Farmer: ['farmer_activities', farmingActivities, 'farmer_other', 'Farmer Activities'],
        'Farmworker/Laborer': ['farmworker_activities', farmworkerActivities, 'farmworker_other', 'Farmworker Activities'],
        Fisherfolk: ['fishing_activities', fishingActivities, 'fishing_other', 'Fishing Activities'],
        'Agri Youth': ['youth_activities', youthActivities, 'youth_other', 'Youth Activities'],
    };
    const selectedLivelihoods = selectedMainLivelihoods(form.main_livelihood);
    const selectedActivityGroups = selectedLivelihoods.map((livelihood) => activityMap[livelihood] || activityMap.Farmer);

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    function populateFormFromReference(registrant) {
        const payload = registrant.rsbsa_payload || {};
        setForm((current) => normalizeForm({
            ...current,
            ...payload,
            enrollment_type: 'Updating',
            reference_id: registrant.registry_number || current.reference_id,
            date_administered: current.date_administered,
            first_name: registrant.first_name || payload.first_name || current.first_name,
            middle_name: registrant.middle_name || payload.middle_name || '',
            last_name: registrant.last_name || payload.last_name || current.last_name,
            suffix: registrant.suffix || payload.suffix || '',
            sex: registrant.sex || payload.sex || '',
            birthday: dateOnly(registrant.birthday) || dateOnly(payload.birthday) || current.birthday,
            civil_status: registrant.civil_status || payload.civil_status || '',
            phone: registrant.phone || payload.phone || '',
            email: registrant.email || payload.email || '',
            barangay_id: registrant.barangay_id ? String(registrant.barangay_id) : String(payload.barangay_id || current.barangay_id || ''),
            address_line: payload.address_line || registrant.address || current.address_line,
            municipality: payload.municipality || current.municipality,
            province: payload.province || current.province,
            region: payload.region || current.region,
            main_livelihood: selectedMainLivelihoods(payload.main_livelihood || livelihoodForSector(registrant.sector)),
            parcels: payload.parcels?.length ? payload.parcels : [parcelFromRegistrant(registrant)],
            rotation_farmers: payload.rotation_farmers?.length ? payload.rotation_farmers : current.rotation_farmers,
        }));
        if (registrant.photo_url) setPhotoPreview(registrant.photo_url);
    }

    function changeEnrollmentType(value) {
        if (isBeneficiaryUser && linkedRegistrant && value === 'New') return;

        if (value === 'Updating') {
            update('enrollment_type', value);
            return;
        }

        const accountNames = !isStaff ? user?.name?.trim().split(/\s+/) || [] : [];
        setForm((current) => normalizeForm({
            ...initialForm,
            enrollment_type: 'New',
            date_administered: current.date_administered || initialForm.date_administered,
            barangay_id: barangayScoped ? current.barangay_id : '',
            first_name: !isStaff ? user?.first_name ?? accountNames[0] ?? '' : '',
            middle_name: !isStaff ? user?.middle_name || '' : '',
            last_name: !isStaff ? user?.last_name ?? accountNames.slice(1).join(' ') : '',
            phone: !isStaff ? user?.phone || '' : '',
            email: !isStaff ? user?.email || '' : '',
        }));
        setPhoto(null);
        setPhotoPreview('');
        setReferenceRegistrant(null);
        setReferenceLookupError('');
        setReferenceLookupLoading(false);
        setRegisteredUsers([]);
        setRegisteredUsersError('');
        setRegisteredUsersLoading(false);
    }

    function searchReferenceRegistrant() {
        const referenceId = form.reference_id.trim();
        if (! referenceId) {
            setReferenceRegistrant(null);
            setReferenceLookupError('Enter a registry number or name to search.');
            return;
        }

        const match = findMatchingRegistrant(registeredUsers, referenceId) || (registeredUsers.length === 1 ? registeredUsers[0] : null);
        if (! match) {
            setReferenceRegistrant(null);
            setReferenceLookupError('No registered user matches this reference ID or name.');
            return;
        }

        setReferenceRegistrant(match);
        setReferenceLookupError('');
        populateFormFromReference(match);
    }

    function toggle(name, value) {
        update(name, form[name].includes(value) ? form[name].filter((item) => item !== value) : [...form[name], value]);
    }

    function updateParcel(index, name, value) {
        setForm((current) => normalizeForm({
            ...current,
            parcels: current.parcels.map((parcel, row) => row === index ? { ...parcel, [name]: value } : parcel),
        }));
    }

    function updateCommodity(parcelIndex, commodityIndex, name, value) {
        setForm((current) => normalizeForm({
            ...current,
            parcels: current.parcels.map((parcel, row) => row !== parcelIndex ? parcel : {
                ...parcel,
                commodities: parcel.commodities.map((commodity, item) => item === commodityIndex ? { ...commodity, [name]: value } : commodity),
            }),
        }));
    }

    function addParcel() {
        if (form.parcels.length < 3) update('parcels', [...form.parcels, emptyParcel()]);
    }

    function removeParcel(index) {
        update('parcels', form.parcels.filter((_, row) => row !== index));
    }

    function addCommodity(index) {
        if (form.parcels[index].commodities.length >= MAX_COMMODITIES_PER_PARCEL) return;
        updateParcel(index, 'commodities', [...form.parcels[index].commodities, emptyCommodity()]);
    }

    function removeCommodity(parcelIndex, commodityIndex) {
        updateParcel(parcelIndex, 'commodities', form.parcels[parcelIndex].commodities.filter((_, row) => row !== commodityIndex));
    }

    async function submit(event, reviewToken = null) {
        event?.preventDefault();
        if (busy) return;
        setSubmitError('');
        if (!selectedLivelihoods.length) {
            setSubmitError('Select at least one main livelihood.');
            document.getElementById('livelihood')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            return;
        }
        const missingActivities = selectedActivityGroups.find(([field]) => !form[field]?.length);
        if (missingActivities) {
            setSubmitError(`Select at least one activity for ${missingActivities[3]}.`);
            document.getElementById('activities')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            return;
        }
        setBusy(true);

        const firstParcel = form.parcels[0] || emptyParcel();
        const barangayId = barangayScoped ? form.barangay_id || scopedBarangayIds[0] : form.barangay_id;
        const selectedBarangay = barangays.find((row) => String(row.id) === String(barangayId));
        const rsbsaPayload = cleanRsbsaPayload({
            ...form,
            date_administered: localDate(),
            barangay_name: selectedBarangay?.name || '',
            channel: isStaff ? 'staff_encoded' : 'online_registration',
            form_revision: '03-2021',
        });
        const sectorMap = { Farmer: 'farmer', 'Farmworker/Laborer': 'farmer', Fisherfolk: 'fisherfolk', 'Agri Youth': 'farmer' };
        const primaryLivelihood = selectedLivelihoods[0] || 'Farmer';
        const payload = {
            sector: sectorMap[primaryLivelihood],
            first_name: form.first_name,
            middle_name: form.middle_name,
            last_name: form.last_name,
            suffix: form.suffix,
            birthday: form.birthday,
            sex: form.sex,
            civil_status: form.civil_status,
            phone: form.phone,
            email: form.email || user?.email || null,
            address: [form.address_line, form.street, form.municipality, form.province, form.region].filter(Boolean).join(', '),
            barangay_id: Number(barangayId),
            ownership_type: ownershipForDatabase(firstParcel.ownership_type),
            farm_area: firstParcel.total_area || null,
            farm_location: [firstParcel.location_barangay, firstParcel.location_municipality].filter(Boolean).join(', '),
            boat_name: null,
            livestock_type: null,
            poultry_type: null,
            expected_production: {},
            rsbsa_payload: rsbsaPayload,
        };

        try {
            const body = new FormData();
            Object.entries(payload).forEach(([key, value]) => {
                if (value !== null && value !== undefined) body.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
            });
            if (photo) body.append('photo', photo);
            if (reviewToken) body.append('duplicate_review_token', reviewToken);
            const updatesExistingRegistrant = form.enrollment_type === 'Updating' && referenceRegistrant?.id;
            if (updatesExistingRegistrant) body.append('_method', 'PUT');
            const response = updatesExistingRegistrant
                ? await api.post(`/registrants/${referenceRegistrant.id}`, body, { headers: { 'Content-Type': undefined } })
                : await api.post('/registrants', body, { headers: { 'Content-Type': undefined } });
            if (draftKey) localStorage.removeItem(draftKey);
            setSaved(response.data);
            navigate(`/rsbsa-preview/${response.data.registry_number}`);
        } catch (error) {
            if (['possible_duplicate', 'duplicate_registry_number'].includes(error.response?.data?.code)) {
                setDuplicateWarning(error.response.data);
                return;
            }
            setSubmitError(error.message || 'The registration could not be submitted. Please review the required fields.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setBusy(false);
        }
    }

    if (barangayScoped && !barangayConfirmed) {
        return (
            <BarangaySelectionGate
                barangays={barangays}
                loading={barangaysLoading}
                error={barangaysError}
                value={form.barangay_id}
                onChange={(barangayId) => update('barangay_id', barangayId)}
                onContinue={() => setBarangayConfirmed(true)}
            />
        );
    }

    const selectedBarangay = barangays.find((barangay) => String(barangay.id) === String(form.barangay_id));
    const linkedRegistryNumber = linkedRegistrant?.registry_number;

    if (isBeneficiaryUser && linkedRegistrantLoading) return <PageLoader />;

    if (isBeneficiaryUser && linkedRegistrant) {
        return (
            <section className="space-y-5 pb-8">
                <PageHeader
                    title="RSBSA Registration"
                    description="Review your submitted RSBSA form. Contact MAO staff if your registration details need updating."
                    actions={(
                        <>
                            {linkedRegistryNumber && (
                                <Link className="btn-primary" to={`/rsbsa-preview/${encodeURIComponent(linkedRegistryNumber)}/mao-id`}>
                                    View MAO ID
                                </Link>
                            )}
                        </>
                    )}
                />
                <Card title="Filled RSBSA Form">
                    <ResponsiveLinkedRsbsaPreview registrant={linkedRegistrant} />
                </Card>
            </section>
        );
    }

    return (
        <section className="space-y-5 pb-8">
            <DuplicateRegistrationWarning warning={duplicateWarning} busy={busy} onClose={() => setDuplicateWarning(null)} onContinue={(token) => submit(null, token)} />
            <PageHeader
                title="RSBSA Registration"
                description="Modern government portal registration form for agriculture sector enrollment."
                actions={(
                    <>
                        {isBeneficiaryUser && linkedRegistrant && (
                            <button type="button" className="btn-secondary" onClick={() => setShowRegistrationForm(false)}>Back to RSBSA Form</button>
                        )}
                        {saved && <Link className="btn-secondary" to={`/rsbsa-preview/${saved.registry_number}`}>Open Print Preview</Link>}
                    </>
                )}
            />
            {submitError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">Submission failed: {submitError}</div>}
            {barangayScoped && (
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div>
                        <p className="text-xs font-bold uppercase text-emerald-700">Registration barangay</p>
                        <p className="mt-1 text-sm font-bold text-emerald-950">{selectedBarangay?.name || 'Not selected'}</p>
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => {
                        setBarangayConfirmed(false);
                        update('barangay_id', barangays.length === 1 ? String(barangays[0].id) : '');
                    }}>Change barangay</button>
                </section>
            )}

            <form className="space-y-5" onSubmit={submit}>
                <PortalHeader form={form} />
                <ModernSection id="reference" title="Reference Information">
                    <Field label="Registry Number"><input className="field" disabled value="Generated after submission" /></Field>
                    <Field label="Date Administered" required><input required readOnly type="date" className="field" value={form.date_administered} /></Field>
                    <RadioGroup
                        label="Enrollment Type"
                        name="enrollment_type"
                        value={form.enrollment_type}
                        options={['New', 'Updating']}
                        disabledOptions={isBeneficiaryUser && linkedRegistrant ? ['New'] : []}
                        onChange={changeEnrollmentType}
                        required
                    />
                    {form.enrollment_type === 'Updating' && (
                        <>
                            {isStaff && (
                                <>
                                    <div className="max-w-sm">
                                        <Field label="Reference ID" required>
                                            <div className="flex gap-2">
                                                <input required className="field" value={form.reference_id} onChange={(event) => update('reference_id', event.target.value)} placeholder="Search name or registry number" />
                                                <button type="button" className="btn-primary px-5" disabled={referenceLookupLoading || registeredUsersLoading} onClick={searchReferenceRegistrant}>Search</button>
                                            </div>
                                        </Field>
                                    </div>
                                    <div className="md:col-span-2 xl:col-span-3">
                                        <RegisteredUsersList
                                            rows={registeredUsers}
                                            loading={registeredUsersLoading}
                                            error={registeredUsersError}
                                            onSelect={(row) => {
                                                setReferenceRegistrant(row);
                                                populateFormFromReference(row);
                                                update('reference_id', row.registry_number || '');
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                            <ReferenceRegistrantDetails
                                registrant={referenceRegistrant}
                                loading={referenceLookupLoading}
                                error={referenceLookupError}
                            />
                        </>
                    )}
                </ModernSection>

                <ModernSection id="personal" title="Personal Information">
                    <Field label="Last Name" required><input required className="field" value={form.last_name} onChange={(event) => update('last_name', event.target.value)} /></Field>
                    <Field label="First Name" required><input required className="field" value={form.first_name} onChange={(event) => update('first_name', event.target.value)} /></Field>
                    <Field label="Middle Name"><input className="field" value={form.middle_name} onChange={(event) => update('middle_name', event.target.value)} /></Field>
                    <Field label="Suffix"><input className="field" value={form.suffix} onChange={(event) => update('suffix', event.target.value)} /></Field>
                    <RadioGroup label="Sex" name="sex" value={form.sex} options={['Male', 'Female']} onChange={(value) => update('sex', value)} required />
                    <Field label="Date of Birth" required><input required type="date" className="field" value={form.birthday} onChange={(event) => update('birthday', event.target.value)} /></Field>
                    <Field label="Birth Municipality"><input className="field" value={form.birth_municipality} onChange={(event) => update('birth_municipality', event.target.value)} /></Field>
                    <Field label="Birth Province"><input className="field" value={form.birth_province} onChange={(event) => update('birth_province', event.target.value)} /></Field>
                    <Field label="Birth Country"><input className="field" value={form.birth_country} onChange={(event) => update('birth_country', event.target.value)} /></Field>
                    <Field label="Mother's Maiden Name"><input className="field" value={form.mother_maiden_name} onChange={(event) => update('mother_maiden_name', event.target.value)} /></Field>
                    <Field label="Civil Status"><select className="field" value={form.civil_status} onChange={(event) => update('civil_status', event.target.value)}><option value="">Select</option>{['Single', 'Married', 'Widowed', 'Separated'].map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <Field label="Religion" required><select required className="field" value={form.religion} onChange={(event) => update('religion', event.target.value)}><option value="">Select religion</option><option>Christianity</option><option>Islam</option><option>Others</option></select></Field>
                    {form.religion === 'Others' && <Field label="Other Religion" required><input required className="field" value={form.religion_other} onChange={(event) => update('religion_other', event.target.value)} /></Field>}
                    <Field label="Education" required><select required className="field" value={form.education} onChange={(event) => update('education', event.target.value)}><option value="">Select</option>{educationOptions.map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <YesNoField label="Person with Disability (PWD)" name="pwd" form={form} update={update} />
                    <YesNoField label="4Ps" name="four_ps" form={form} update={update} />
                </ModernSection>

                <ModernSection id="address" title="Address Information">
                    <Field label="House/Lot Number" required><input required className="field" value={form.address_line} onChange={(event) => update('address_line', event.target.value)} /></Field>
                    <Field label="Street"><input className="field" value={form.street} onChange={(event) => update('street', event.target.value)} /></Field>
                    <Field label="Barangay" required>
                        <select required disabled={barangayScoped} className="field" value={form.barangay_id} onChange={(event) => update('barangay_id', event.target.value)}>
                            <option value="">Select barangay</option>
                            {barangays.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Municipality" required>
                        <select required className="field" value={form.municipality} onChange={(event) => update('municipality', event.target.value)}>
                            <option value="">Select municipality</option>
                            {municipalityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </Field>
                    <Field label="Province" required>
                        <select required className="field" value={form.province} onChange={(event) => update('province', event.target.value)}>
                            <option value="">Select province</option>
                            {provinceOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </Field>
                    <Field label="Region" required><select required className="field" value={form.region} onChange={(event) => update('region', event.target.value)}><option value="">Select region</option><option>Region VII</option></select></Field>
                </ModernSection>

                <ModernSection id="contact" title="Contact Information">
                    <Field label="Mobile Number" required><input required className="field" inputMode="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></Field>
                    <Field label="Landline" required><input required className="field" inputMode="tel" value={form.landline} onChange={(event) => update('landline', event.target.value)} /></Field>
                    <Field label="Email" required><input required type="email" className="field" value={form.email} onChange={(event) => update('email', event.target.value)} /></Field>
                    <div className="md:col-span-2 xl:col-span-3 grid gap-4 md:grid-cols-2">
                        <Field label="Emergency Contact Person" required><input required className="field" value={form.emergency_name} onChange={(event) => update('emergency_name', event.target.value)} /></Field>
                        <Field label="Emergency Contact Number" required><input required className="field" inputMode="tel" value={form.emergency_contact} onChange={(event) => update('emergency_contact', event.target.value)} /></Field>
                    </div>
                </ModernSection>

                <ModernSection id="household" title="Household Information">
                    {form.civil_status === 'Married' && <Field label="Spouse Name" required><input required className="field" value={form.spouse_name} onChange={(event) => update('spouse_name', event.target.value)} /></Field>}
                    <YesNoField label="Household Head" name="household_head" form={form} update={update} required />
                    {form.household_head === 'No' && <Field label="Household Head Name" required><input required className="field" value={form.household_head_name} onChange={(event) => update('household_head_name', event.target.value)} /></Field>}
                    {form.household_head === 'No' && <Field label="Relationship" required><input required className="field" value={form.household_relationship} onChange={(event) => update('household_relationship', event.target.value)} /></Field>}
                    <Field label="Household Members" required><input required min="1" type="number" className="field" value={form.household_members} onChange={(event) => update('household_members', event.target.value)} /></Field>
                    <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                        <Field label="Male" required><input required min="0" type="number" className="field" value={form.household_male} onChange={(event) => update('household_male', event.target.value)} /></Field>
                        <Field label="Female" required><input required min="0" type="number" className="field" value={form.household_female} onChange={(event) => update('household_female', event.target.value)} /></Field>
                    </div>
                </ModernSection>

                <ModernSection id="government" title="Government Information">
                    <YesNoField label="Government ID" name="government_id" form={form} update={update} required />
                    {form.government_id === 'Yes' && <Field label="Government ID Type" required><input required className="field" value={form.government_id_type} onChange={(event) => update('government_id_type', event.target.value)} /></Field>}
                    {form.government_id === 'Yes' && <Field label="Government ID Number" required><input required className="field" value={form.government_id_number} onChange={(event) => update('government_id_number', event.target.value)} /></Field>}
                    <YesNoField label="Indigenous Group" name="indigenous_group" form={form} update={update} />
                    {form.indigenous_group === 'Yes' && <Field label="Specify Indigenous Group" required><input required className="field" value={form.indigenous_specify} onChange={(event) => update('indigenous_specify', event.target.value)} /></Field>}
                    <YesNoField label="Association Member" name="association_member" form={form} update={update} required />
                    {form.association_member === 'Yes' && <Field label="Association Name" required><input required className="field" value={form.association_name} onChange={(event) => update('association_name', event.target.value)} /></Field>}
                </ModernSection>

                <ModernSection id="livelihood" title={<>Main Livelihood <span className="text-red-600">*</span></>}>
                    <LivelihoodCards value={selectedLivelihoods} onChange={(value) => update('main_livelihood', value)} />
                </ModernSection>

                <ModernSection id="activities" title={<>Activities <span className="text-red-600">*</span></>} description="Select one or more activities for each selected livelihood.">
                    {selectedActivityGroups.map(([activityField, activityOptions, activityOtherField, activityTitle]) => (
                        <React.Fragment key={activityField}>
                            <ActivityCard title={activityTitle} options={activityOptions} values={form[activityField]} toggle={(value) => toggle(activityField, value)} />
                            {activityField === 'farmer_activities' ? (
                                <>
                                    {form.farmer_activities.includes('Other crops') && <Field label="Please Specify - Other Crops" required><input required className="field" value={form.farmer_other} onChange={(event) => update('farmer_other', event.target.value)} /></Field>}
                                    {form.farmer_activities.includes('Livestock') && <Field label="Please Specify - Livestock" required><input required className="field" value={form.farmer_livestock} onChange={(event) => update('farmer_livestock', event.target.value)} /></Field>}
                                    {form.farmer_activities.includes('Poultry') && <Field label="Please Specify - Poultry" required><input required className="field" value={form.farmer_poultry} onChange={(event) => update('farmer_poultry', event.target.value)} /></Field>}
                                </>
                            ) : (
                                needsActivitySpecify(activityField, form[activityField]) && <Field label={`Please Specify - ${activityTitle}`} required><input required className="field" value={form[activityOtherField]} onChange={(event) => update(activityOtherField, event.target.value)} /></Field>
                            )}
                        </React.Fragment>
                    ))}
                    <div className="md:col-span-2 xl:col-span-3 grid gap-4 md:grid-cols-2">
                        <Field label="Gross Annual Farming Income"><input className="field" inputMode="decimal" value={form.gross_farming_income} onChange={(event) => update('gross_farming_income', event.target.value)} /></Field>
                        <Field label="Gross Annual Non-farming Income"><input className="field" inputMode="decimal" value={form.gross_non_farming_income} onChange={(event) => update('gross_non_farming_income', event.target.value)} /></Field>
                    </div>
                </ModernSection>

                <ModernSection id="parcels" title="Parcel Information and Commodities">
                    <div className="md:col-span-2 xl:col-span-3">
                        <div className="mb-4 grid gap-4 md:grid-cols-3">
                            {form.rotation_farmers.map((value, index) => <Field key={index} label={`Farmer in Rotation P${index + 1}`} required><input required className="field" value={value} onChange={(event) => update('rotation_farmers', form.rotation_farmers.map((item, row) => row === index ? event.target.value : item))} /></Field>)}
                        </div>
                        <div className="space-y-5">
                            {form.parcels.map((parcel, parcelIndex) => (
                                <ParcelCard key={parcelIndex} parcel={parcel} parcelIndex={parcelIndex} barangays={barangays} canRemove={form.parcels.length > 1} updateParcel={updateParcel} updateCommodity={updateCommodity} addCommodity={addCommodity} removeCommodity={removeCommodity} removeParcel={removeParcel} />
                            ))}
                        </div>
                        {form.parcels.length < 3 && <button type="button" className="btn-secondary mt-5" onClick={addParcel}>Add Parcel</button>}
                    </div>
                </ModernSection>

                <FinalSection photoPreview={photoPreview} setPhoto={setPhoto} setPhotoPreview={setPhotoPreview} busy={busy} />

            </form>

            {saved && (
                <Card title="Registration Submitted">
                    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">Registry number</p>
                            <p className="text-3xl font-semibold text-emerald-800">{formatRegistryNumber(saved.registry_number)}</p>
                            <StatusBadge status={saved.status} />
                            <div><Link className="btn-primary" to={`/rsbsa-preview/${saved.registry_number}`}>Open Print Preview</Link></div>
                        </div>
                        <DigitalID registrant={saved} />
                    </div>
                </Card>
            )}
        </section>
    );
}

function ResponsiveLinkedRsbsaPreview({ registrant }) {
    const frameRef = React.useRef(null);
    const formRef = React.useRef(null);
    const [fit, setFit] = useState({ scale: 1, height: 0 });

    useEffect(() => {
        const frame = frameRef.current;
        const form = formRef.current;
        if (!frame || !form) return undefined;

        const updateFit = () => {
            const naturalWidth = form.scrollWidth || 1240;
            const naturalHeight = form.scrollHeight || 0;
            const availableWidth = frame.clientWidth || naturalWidth;
            const scale = Math.min(1, availableWidth / naturalWidth);
            setFit({ scale, height: naturalHeight * scale });
        };

        updateFit();
        const observer = new ResizeObserver(updateFit);
        observer.observe(frame);
        observer.observe(form);
        window.addEventListener('orientationchange', updateFit);

        return () => {
            observer.disconnect();
            window.removeEventListener('orientationchange', updateFit);
        };
    }, [registrant?.id]);

    return (
        <div ref={frameRef} className="rsbsa-preview-fit" style={{ height: fit.height || undefined }}>
            <div ref={formRef} className="rsbsa-preview-fit-inner" style={{ transform: `scale(${fit.scale})` }}>
                <RsbsaTemplateFirstRenderer registrant={registrant} showGrid={false} />
            </div>
        </div>
    );
}

function BarangaySelectionGate({ barangays, loading, error, value, onChange, onContinue }) {
    return (
        <section className="space-y-5 pb-8">
            <PageHeader
                title="Choose Registration Barangay"
                description="Select the assigned barangay where this RSBSA enrollment will be recorded."
            />
            <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5">
                {loading && <p className="text-sm font-semibold text-slate-500">Loading assigned barangays...</p>}
                {!loading && error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
                {!loading && !error && !barangays.length && (
                    <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                        No barangay is assigned to this account. Ask the administrator to update Manage access.
                    </p>
                )}
                {!loading && !error && barangays.length > 0 && (
                    <form className="space-y-4" onSubmit={(event) => {
                        event.preventDefault();
                        if (value) onContinue();
                    }}>
                        <Field label="Assigned barangay" required>
                            <select required className="field" value={value} onChange={(event) => onChange(event.target.value)}>
                                <option value="">Select barangay</option>
                                {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
                            </select>
                        </Field>
                        <div className="flex justify-end">
                            <button className="btn-primary" disabled={!value}>Continue to enrollment</button>
                        </div>
                    </form>
                )}
            </section>
        </section>
    );
}

function PortalHeader({ form }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div>
                <h2 className="text-xl font-bold text-slate-950">RSBSA Enrollment</h2>
                <p className="mt-1 text-sm text-slate-500">Draft auto-saves while you complete the form.</p>
            </div>
        </section>
    );
}

function StepProgress({ steps, currentStep, setCurrentStep }) {
    return (
        <nav className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Registration progress">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {steps.map((step, index) => (
                    <button key={step} type="button" onClick={() => setCurrentStep(index)} className={`rounded-xl border px-3 py-2 text-left text-xs font-black uppercase tracking-wide transition ${index === currentStep ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : index < currentStep ? 'border-emerald-200 bg-white text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        {step}
                    </button>
                ))}
            </div>
        </nav>
    );
}

function ModernSection({ id, title, description, children }) {
    return (
        <section id={id} className="scroll-mt-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-bold text-slate-950">{title}</h3>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </header>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>
        </section>
    );
}

function Field({ label, required = false, children }) {
    return (
        <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-1.5 block">{label}{required && <span className="text-red-600"> *</span>}</span>
            {children}
        </label>
    );
}

function RadioGroup({ label, name, value, options, onChange, required = false, disabledOptions = [] }) {
    return (
        <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-600"> *</span>}</legend>
            <div className="flex min-h-11 flex-wrap gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                {options.map((option) => {
                    const disabled = disabledOptions.includes(option);
                    return (
                        <label key={option} className={`flex items-center gap-2 text-sm font-medium ${disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-700'}`}>
                            <input required={required} disabled={disabled} type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
                            {option}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}

function YesNoField({ label, name, form, update, value, onChange, required = false }) {
    const currentValue = form ? form[name] : value;
    const setValue = form ? (next) => update(name, next) : onChange;
    return <RadioGroup label={label} name={name} value={currentValue} options={['Yes', 'No']} onChange={setValue} required={required} />;
}

function needsActivitySpecify(activityField, values = []) {
    if (activityField === 'farmer_activities') return values.some((value) => ['Other crops', 'Livestock', 'Poultry'].includes(value));
    return values.includes('Others');
}

function dateOnly(value) {
    return value ? String(value).slice(0, 10) : '';
}

function livelihoodForSector(sector) {
    if (sector === 'fisherfolk') return 'Fisherfolk';
    if (sector === 'livestock' || sector === 'poultry') return 'Farmer';
    return 'Farmer';
}

function selectedMainLivelihoods(value) {
    const values = Array.isArray(value) ? value : [value];
    const selected = values.filter((item) => livelihoodOptions.includes(item));
    return selected;
}

function parcelFromRegistrant(registrant) {
    const ownershipType = ownershipForForm(registrant.ownership_type);

    return {
        ...emptyParcel(),
        total_area: registrant.farm_area || '',
        location_barangay: registrant.barangay?.name || '',
        location_municipality: 'Tubigon',
        ownership_type: ownershipType,
        ownership_other: ownershipType === 'Others' ? stringValue(registrant.ownership_type) : '',
    };
}

function ownershipForForm(value) {
    return parcelOwnershipTypes.includes(value) ? value : value ? parcelOwnershipTypes[0] : '';
}

function findMatchingRegistrant(rows, search) {
    const normalizedSearch = search.trim().toLowerCase();
    if (! normalizedSearch) return null;

    return rows.find((row) => {
        const fullName = row.full_name || [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ');

        return row.registry_number?.toLowerCase() === normalizedSearch
            || fullName.toLowerCase() === normalizedSearch;
    }) || null;
}

function RegisteredUsersList({ rows, loading, error, onSelect }) {
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-bold text-slate-900">Registered Users</h4>
            </div>
            <div className="mt-3 space-y-2">
                {loading && <p className="text-sm text-slate-500">Loading registered users...</p>}
                {! loading && error && <p className="text-sm text-slate-500">{error}</p>}
                {! loading && ! error && rows.length === 0 && <p className="text-sm text-slate-500">No registered users found.</p>}
                {! loading && ! error && rows.map((row) => (
                    <button key={row.id} type="button" onClick={() => onSelect(row)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50">
                        <span className="block text-sm font-semibold text-slate-900">{row.full_name || [row.first_name, row.last_name].filter(Boolean).join(' ')}</span>
                        <span className="mt-1 block text-xs text-slate-500">{formatRegistryNumber(row.registry_number) || 'No registry number'}{row.barangay?.name ? ` - ${row.barangay.name}` : ''}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function ReferenceRegistrantDetails({ registrant, loading, error }) {
    return (
        <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Reference Details</h4>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{registrant?.registry_number || 'Enter a reference ID'}</p>
                </div>
                {registrant?.status && <StatusBadge status={registrant.status} />}
            </div>
            <div className="mt-3">
                {loading && <p className="text-sm text-slate-500">Loading reference details...</p>}
                {! loading && error && <p className="text-sm text-slate-500">{error}</p>}
                {! loading && ! error && ! registrant && <p className="text-sm text-slate-500">Details will appear when the reference ID matches a registered user.</p>}
                {! loading && registrant && (
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <ReferenceDetail label="Name" value={registrant.full_name || [registrant.first_name, registrant.middle_name, registrant.last_name, registrant.suffix].filter(Boolean).join(' ')} />
                        <ReferenceDetail label="Sector" value={registrantSectorLabel(registrant.sector)} />
                        <ReferenceDetail label="Barangay" value={registrant.barangay?.name} />
                        <ReferenceDetail label="Birthday" value={dateOnly(registrant.birthday)} />
                        <ReferenceDetail label="Sex" value={registrant.sex} />
                        <ReferenceDetail label="Civil Status" value={registrant.civil_status} />
                        <ReferenceDetail label="Phone" value={registrant.phone} />
                        <ReferenceDetail label="Email" value={registrant.email} />
                        <ReferenceDetail label="Address" value={registrant.address} />
                    </dl>
                )}
            </div>
        </div>
    );
}

function ReferenceDetail({ label, value }) {
    return (
        <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-900">{value || 'Not provided'}</dd>
        </div>
    );
}

function LivelihoodCards({ value, onChange }) {
    const selected = selectedMainLivelihoods(value);
    function toggleLivelihood(option) {
        const next = selected.includes(option)
            ? selected.filter((item) => item !== option)
            : [...selected, option];
        onChange(next);
    }

    return (
        <fieldset className="grid gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-3 xl:grid-cols-4">
            <legend className="sr-only">Select one or more main livelihoods</legend>
            {livelihoodOptions.map((option) => (
                <label key={option} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition ${selected.includes(option) ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300'}`}>
                    <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleLivelihood(option)} />
                    <span className="block text-sm font-bold">{option}</span>
                </label>
            ))}
        </fieldset>
    );
}

function ActivityCard({ title, options, values, toggle }) {
    return (
        <fieldset className="rounded-xl border border-slate-200 p-4 md:col-span-2 xl:col-span-3">
            <legend className="px-1 text-sm font-bold text-slate-900">{title}</legend>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
                {options.map((option) => (
                    <label key={option} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input className="mt-1" type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)} />
                        {option}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

function ParcelCard({ parcel, parcelIndex, barangays, canRemove, updateParcel, updateCommodity, addCommodity, removeCommodity, removeParcel }) {
    const canAddCommodity = parcel.commodities.length < MAX_COMMODITIES_PER_PARCEL;

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h4 className="text-base font-black text-slate-950">Parcel {parcelIndex + 1}</h4>
                {canRemove && <button type="button" className="mini-btn" onClick={() => removeParcel(parcelIndex)}>Remove Parcel</button>}
            </header>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Barangay" required>
                    <select required className="field" value={parcel.location_barangay} onChange={(event) => updateParcel(parcelIndex, 'location_barangay', event.target.value)}>
                        <option value="">Select barangay</option>
                        {barangays.map((barangay) => <option key={barangay.id} value={barangay.name}>{barangay.name}</option>)}
                    </select>
                </Field>
                <Field label="Municipality" required><input required className="field" value={parcel.location_municipality} onChange={(event) => updateParcel(parcelIndex, 'location_municipality', event.target.value)} /></Field>
                <Field label="Total Area" required><input required min="0.01" step="0.01" type="number" className="field" value={parcel.total_area} onChange={(event) => updateParcel(parcelIndex, 'total_area', decimalValue(event.target.value))} /></Field>
                <Field label="Ownership Document No."><input className="field" value={parcel.ownership_document_number} onChange={(event) => updateParcel(parcelIndex, 'ownership_document_number', event.target.value)} /></Field>
                <Field label="Ownership Type" required><select required className="field" value={parcel.ownership_type} onChange={(event) => updateParcel(parcelIndex, 'ownership_type', event.target.value)}><option value="">Select ownership type</option>{parcelOwnershipTypes.map((option) => <option key={option}>{option}</option>)}</select></Field>
                {['Tenant', 'Lessee'].includes(parcel.ownership_type) && <Field label="Land Owner Name" required><input required className="field" value={parcel.owner_name} onChange={(event) => updateParcel(parcelIndex, 'owner_name', event.target.value)} /></Field>}
                {parcel.ownership_type === 'Others' && <Field label="Specify Ownership" required><input required className="field" value={parcel.ownership_other} onChange={(event) => updateParcel(parcelIndex, 'ownership_other', event.target.value)} /></Field>}
                <YesNoField label="Agrarian Reform" name={`arb-${parcelIndex}`} value={parcel.agrarian_reform_beneficiary} onChange={(next) => updateParcel(parcelIndex, 'agrarian_reform_beneficiary', next)} required />
                <YesNoField label="Ancestral Domain" name={`ancestral-${parcelIndex}`} value={parcel.ancestral_domain} onChange={(next) => updateParcel(parcelIndex, 'ancestral_domain', next)} required />
            </div>
            <div className="mt-5 overflow-x-auto">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h5 className="text-sm font-black uppercase tracking-wide text-slate-700">Commodities</h5>
                    <button type="button" className="mini-btn" disabled={! canAddCommodity} onClick={() => addCommodity(parcelIndex)}>Add Commodity</button>
                </div>
                <table className="min-w-[720px] w-full overflow-hidden rounded-xl border border-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                        <tr>{['Commodity', 'Area', 'Heads', 'Farm Type', 'Organic', 'Remarks', ''].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {parcel.commodities.map((commodity, commodityIndex) => (
                            <tr key={commodityIndex}>
                                <td className="p-2"><input required className="field" value={commodity.commodity} onChange={(event) => updateCommodity(parcelIndex, commodityIndex, 'commodity', event.target.value)} /></td>
                                <td className="p-2"><input required min="0.01" step="0.01" type="number" className="field" value={commodity.size} onChange={(event) => updateCommodity(parcelIndex, commodityIndex, 'size', decimalValue(event.target.value))} /></td>
                                <td className="p-2"><input required min="0" type="number" className="field" value={commodity.heads} onChange={(event) => updateCommodity(parcelIndex, commodityIndex, 'heads', event.target.value)} /></td>
                                <td className="p-2"><select required className="field" value={commodity.farm_type} onChange={(event) => updateCommodity(parcelIndex, commodityIndex, 'farm_type', event.target.value)}><option value="">Select</option><option value="1">1 - Irrigated</option><option value="2">2 - Rainfed Upland</option><option value="3">3 - Rainfed Lowland</option></select></td>
                                <td className="p-2"><select className="field" value={commodity.organic_practitioner} onChange={(event) => updateCommodity(parcelIndex, commodityIndex, 'organic_practitioner', event.target.value)}><option value="">Select</option><option>No</option><option>Yes</option></select></td>
                                <td className="p-2"><input required className="field" value={commodity.remarks} onChange={(event) => updateCommodity(parcelIndex, commodityIndex, 'remarks', event.target.value)} /></td>
                                <td className="p-2">{parcel.commodities.length > 1 && <button type="button" className="mini-btn" onClick={() => removeCommodity(parcelIndex, commodityIndex)}>Remove</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

function FinalSection({ photoPreview, setPhoto, setPhotoPreview, busy }) {
    return (
        <ModernSection id="final" title="Review Information" description="Upload applicant photo and confirm the declaration before submitting.">
            <div className="grid gap-5 md:col-span-2 md:grid-cols-[180px_1fr] xl:col-span-3">
                <Field label="Applicant Photo Upload" required>
                    <label className="flex aspect-[3/4] w-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs font-semibold text-slate-700 transition hover:border-emerald-300">
                        {photoPreview ? <img src={photoPreview} alt="Applicant preview" className="h-full w-full object-cover" /> : <span className="px-3">Upload portrait JPG or PNG<br /><small className="font-semibold text-slate-500">Photo taken within 6 months</small></span>}
                        <input required={! photoPreview} type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setPhoto(file);
                            setPhotoPreview(file ? URL.createObjectURL(file) : '');
                        }} />
                    </label>
                </Field>
                <div className="flex flex-col rounded-xl border border-slate-200 p-5">
                    <h4 className="text-sm font-bold text-slate-900">Declaration</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">I hereby declare that all information indicated above are true and correct and may be used for RSBSA registration and other legitimate Department of Agriculture purposes.</p>
                    <div className="mt-5 flex justify-end">
                        <button className="btn-primary w-full sm:w-auto" disabled={busy}>{busy ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Submitting...</span> : 'Submit Registration'}</button>
                    </div>
                </div>
            </div>
        </ModernSection>
    );
}

function ownershipForDatabase(value) {
    return 'Farm Worker';
}

function cleanRsbsaPayload(payload) {
    const { ...clean } = payload;

    clean.parcels = (clean.parcels || []).map((parcel) => {
        const { ...cleanParcel } = parcel;
        cleanParcel.commodities = cleanParcel.commodities || [];

        return cleanParcel;
    });

    return clean;
}

function normalizeForm(next) {
    const normalized = {
        ...initialForm,
        ...next,
        farmer_activities: Array.isArray(next.farmer_activities) ? next.farmer_activities : [],
        farmworker_activities: Array.isArray(next.farmworker_activities) ? next.farmworker_activities : [],
        fishing_activities: Array.isArray(next.fishing_activities) ? next.fishing_activities : [],
        youth_activities: Array.isArray(next.youth_activities) ? next.youth_activities : [],
        rotation_farmers: normalizeRotation(next.rotation_farmers),
        parcels: normalizeParcels(next.parcels),
    };

    [
        'enrollment_type', 'reference_id', 'date_administered', 'first_name', 'middle_name', 'last_name',
        'suffix', 'sex', 'birthday', 'civil_status', 'address_line', 'street', 'barangay_id',
        'municipality', 'province', 'region', 'phone', 'landline', 'email', 'birth_municipality',
        'birth_province', 'birth_country', 'mother_maiden_name', 'religion', 'religion_other', 'education', 'spouse_name',
        'household_head', 'household_head_name', 'household_relationship', 'household_members',
        'household_male', 'household_female', 'four_ps', 'government_id', 'government_id_type',
        'government_id_number', 'association_member', 'association_name', 'emergency_name',
        'emergency_contact', 'farmer_other', 'farmer_livestock', 'farmer_poultry', 'farmworker_other', 'fishing_other',
        'youth_other', 'indigenous_specify', 'gross_farming_income', 'gross_non_farming_income',
    ].forEach((key) => {
        normalized[key] = stringValue(normalized[key]);
    });

    normalized.enrollment_type = normalized.enrollment_type || 'New';
    normalized.date_administered = localDate();
    normalized.household_head = yesNoValue(normalized.household_head, '');
    normalized.pwd = yesNoValue(normalized.pwd, '');
    normalized.four_ps = yesNoValue(normalized.four_ps, '');
    normalized.indigenous_group = yesNoValue(normalized.indigenous_group, '');
    normalized.government_id = yesNoValue(normalized.government_id, '');
    normalized.association_member = yesNoValue(normalized.association_member, '');
    normalized.main_livelihood = selectedMainLivelihoods(normalized.main_livelihood);

    return normalized;
}

function normalizeRotation(values) {
    const rotation = Array.isArray(values) ? values : [];
    return [0, 1, 2].map((index) => stringValue(rotation[index]));
}

function normalizeParcels(parcels) {
    const rows = Array.isArray(parcels) && parcels.length ? parcels : [emptyParcel()];
    return rows.slice(0, 3).map((parcel) => ({
        ...emptyParcel(),
        ...parcel,
        location_barangay: stringValue(parcel.location_barangay),
        location_municipality: stringValue(parcel.location_municipality),
        total_area: decimalValue(parcel.total_area),
        ownership_document_number: stringValue(parcel.ownership_document_number),
        ancestral_domain: yesNoValue(parcel.ancestral_domain, ''),
        agrarian_reform_beneficiary: yesNoValue(parcel.agrarian_reform_beneficiary, ''),
        ownership_type: ownershipForForm(parcel.ownership_type),
        owner_name: stringValue(parcel.owner_name),
        ownership_other: stringValue(parcel.ownership_other),
        commodities: normalizeCommodities(parcel.commodities),
    }));
}

function normalizeCommodities(commodities) {
    const rows = Array.isArray(commodities) && commodities.length ? commodities : [emptyCommodity()];
    return rows.slice(0, MAX_COMMODITIES_PER_PARCEL).map((commodity) => ({
        commodity: stringValue(commodity.commodity),
        size: decimalValue(commodity.size),
        heads: stringValue(commodity.heads),
        farm_type: stringValue(commodity.farm_type),
        organic_practitioner: yesNoValue(commodity.organic_practitioner, ''),
        remarks: stringValue(commodity.remarks),
    }));
}

function stringValue(value) {
    return value === null || value === undefined ? '' : String(value);
}

function localDate() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function decimalValue(value) {
    const [whole = '', decimal = ''] = stringValue(value)
        .replace(/[^\d.]/g, '')
        .split('.');
    const normalizedWhole = whole || (decimal ? '0' : '');
    const normalizedDecimal = decimal.slice(0, 2);

    return stringValue(value).includes('.') ? `${normalizedWhole}.${normalizedDecimal}` : normalizedWhole;
}

function yesNoValue(value, fallback = 'No') {
    if (value === 'Yes') return 'Yes';
    if (value === 'No') return 'No';
    return fallback;
}
