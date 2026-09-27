import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, DataTable, Field, Modal, PageHeader, PageLoader, Select, SearchBar, StatusBadge, StatusTimeline } from '../../components/common';
import { assistanceStatuses, insuranceApprovalStatuses, insuranceEndorsementStatuses, sectors } from '../../constants/options';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { formatDate, today } from '../../utils/format';
import { roleSector } from '../../utils/rbac';

const assistanceStatusLabels = {
    application_submitted: 'Application Submitted',
    received_by_mao: 'Received by MAO',
    forwarded_to_mswdo: 'Forwarded to MSWDO',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    released: 'Released',
};

const insuranceStatusLabels = {
    claim_submitted: 'Claim Submitted',
    documents_verified: 'Documents Verified',
    forwarded_to_pcic: 'Forwarded to PCIC',
    under_processing: 'Under Processing',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending Release',
    released: 'Released',
};

const insuranceClaimTypes = ['farmer', 'fisherfolk', 'poultry', 'livestock', 'personal'];
const insuranceFormStatuses = [...insuranceApprovalStatuses, 'released'];
const assistanceTypes = ['farm', 'fisheries', 'livestock', 'poultry', 'crop_damage', 'livestock_loss', 'other'];

const sectorLabels = {
    farmer: 'Farmer',
    fisherfolk: 'Fisherfolk',
    livestock: 'Livestock',
    poultry: 'Poultry',
};

export default function ServicePage({ kind }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAssistance = kind === 'assistance';
    const hideType = Boolean(roleSector(user));
    const endpoint = isAssistance ? '/assistance-applications' : '/insurance-claims';
    const [rows, setRows] = useState([]);
    const [registrants, setRegistrants] = useState([]);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ type: '', status: '' });
    const [editing, setEditing] = useState(null);
    const [archiveTarget, setArchiveTarget] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        const [records, people] = await Promise.all([
            api.get(`${endpoint}?per_page=50`),
            api.get('/registrants?status=approved&per_page=100'),
        ]);
        setRows(records.data.data || []);
        setRegistrants(people.data.data || []);
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [kind]);

    const filtered = rows.filter((row) => {
        const matchesSearch = JSON.stringify(row).toLowerCase().includes(search.toLowerCase());
        return matchesSearch
            && (!filters.type || serviceTypeValue(row, kind) === filters.type)
            && (!filters.status || serviceStatusValue(row, kind) === filters.status);
    });

    return (
        <section className="space-y-5">
            <PageHeader
                title={isAssistance ? 'Assistance Application' : 'Insurance and Calamity'}
                description={isAssistance ? 'Manual encoding, status tracking, and application history.' : 'PCIC claims, endorsements, approval, and release monitoring.'}
                actions={<button className="btn-primary" onClick={() => setFormOpen(true)}>Encode record</button>}
            />
            <Card>
                <div className={`grid gap-3 ${hideType ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                    <Field label="Search Records">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search beneficiary, sector, claim, or status" />
                    </Field>
                    {!hideType && <FilterSelect label="Type" value={filters.type} options={serviceTypeOptions(rows, kind)} onChange={(type) => setFilters({ ...filters, type })} />}
                    <FilterSelect label="Status" value={filters.status} options={isAssistance ? assistanceStatuses : insuranceTimelineStatuses} labels={isAssistance ? assistanceStatusLabels : insuranceStatusLabels} onChange={(status) => setFilters({ ...filters, status })} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                    <span>{filtered.length} of {rows.length} records</span>
                    <button className="mini-btn" onClick={() => { setSearch(''); setFilters({ type: '', status: '' }); }}>Clear filters</button>
                </div>
            </Card>
            <Card title="Application History">
                {loading ? <PageLoader compact /> : (
                    <DataTable
                        columns={hideType ? ['Beneficiary', 'Sector', 'Status', 'Timeline'] : ['Beneficiary', 'Sector', 'Type', 'Status', 'Timeline']}
                        rows={filtered.map((row) => isAssistance
                            ? compactTypeCells([
                                row.registrant?.full_name,
                                row.program_name,
                                assistanceTypeLabel(row.assistance_type),
                                <StatusBadge status={row.status} />,
                                <div className="space-y-2">
                                    <StatusTimeline statuses={assistanceStatuses} active={row.status} />
                                    <div className="flex flex-wrap gap-2">
                                        <button className="mini-btn" onClick={() => setEditing(row)}>Update</button>
                                        <button className="mini-btn" onClick={() => setArchiveTarget(row)}>Archive</button>
                                    </div>
                                </div>,
                            ], hideType)
                            : compactTypeCells([
                                row.registrant?.full_name,
                                row.policy_number || row.calamity_event || 'Insurance claim',
                                normalizeInsuranceClaimType(row.claim_type),
                                <StatusBadge status={insuranceDisplayStatus(row)} />,
                                <div className="space-y-2">
                                    <StatusTimeline statuses={insuranceTimelineStatuses} active={insuranceTimelineActive(row)} />
                                    <div className="flex flex-wrap gap-2">
                                        <button className="mini-btn" onClick={() => setEditing(row)}>Update</button>
                                        <button className="mini-btn" onClick={() => setArchiveTarget(row)}>Archive</button>
                                    </div>
                                </div>,
                            ], hideType)
                        )}
                    />
                )}
            </Card>
            <ServiceFormModal open={formOpen || Boolean(editing)} row={editing} onClose={() => { setFormOpen(false); setEditing(null); }} kind={kind} registrants={registrants} onSaved={load} />
            <ArchiveServiceModal row={archiveTarget} kind={kind} endpoint={endpoint} onClose={() => setArchiveTarget(null)} onSaved={load} navigate={navigate} />
        </section>
    );
}

function ArchiveServiceModal({ row, kind, endpoint, onClose, onSaved, navigate }) {
    const [reason, setReason] = useState('Inactive');
    const [otherReason, setOtherReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (!row) return null;
    const finalReason = reason === 'Other' ? otherReason.trim() : reason;

    async function archive() {
        setError('');
        setBusy(true);
        try {
            await api.delete(`${endpoint}/${row.id}`, { data: { archive_reason: finalReason } });
            onClose();
            onSaved();
            navigate(kind === 'assistance' ? '/admin/archived/assistance' : '/admin/archived/insurance');
        } catch (archiveError) {
            setError(archiveError.message || 'Unable to archive record.');
            setBusy(false);
        }
    }

    return (
        <Modal open title={kind === 'assistance' ? 'Archive Assistance Application' : 'Archive Insurance Application'} onClose={onClose}>
            <p className="text-sm text-slate-600">Select the reason for moving this record to the archive.</p>
            <div className="mt-4 space-y-3">
                <Field label="Archive Reason"><Select value={reason} options={archiveReasons} onChange={setReason} /></Field>
                {reason === 'Other' && <Field label="Other Reason"><input required className="field" value={otherReason} onChange={(event) => setOtherReason(event.target.value)} /></Field>}
                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
                <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                <button className="btn-primary" type="button" disabled={!finalReason || busy} onClick={archive}>{busy ? 'Archiving' : 'Confirm'}</button>
            </div>
        </Modal>
    );
}

const archiveReasons = ['Duplicate Record', 'Requested by Registrant', 'Inactive', 'Transferred', 'Deceased', 'Incorrect Registration', 'Other'];

function compactTypeCells(cells, hideType) {
    return hideType ? [cells[0], cells[1], cells[3], cells[4]] : cells;
}

function FilterSelect({ label, value, options, labels = {}, onChange }) {
    return (
        <Field label={label}>
            <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">All</option>
                {options.map((option) => <option key={option} value={option}>{labels[option] || String(option).replaceAll('_', ' ')}</option>)}
            </select>
        </Field>
    );
}

function ServiceFormModal({ open, row, onClose, kind, registrants, onSaved }) {
    const isAssistance = kind === 'assistance';
    const [form, setForm] = useState(defaultServiceForm(kind));
    const [registrantNumber, setRegistrantNumber] = useState('');
    const [registrantError, setRegistrantError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [busy, setBusy] = useState(false);
    const editing = Boolean(row);
    const registrantQuery = registrantNumber.trim().toLowerCase();
    const registrantMatches = !editing && registrantQuery
        ? registrants
            .filter((registrant) => `${registrant.registry_number || ''} ${registrant.full_name || ''}`.toLowerCase().includes(registrantQuery))
            .slice(0, 8)
        : [];
    const showNoRegistrantMatch = !editing && registrantQuery.length >= 3 && !form.registrant_id && registrantMatches.length === 0;

    useEffect(() => {
        if (!open) return;
        const nextForm = row ? serviceFormFromRow(kind, row) : defaultServiceForm(kind);
        setForm(nextForm);
        setRegistrantNumber(row?.registrant ? registrantLabel(row.registrant) : '');
        setRegistrantError('');
        setSubmitError('');
    }, [open, kind, row]);

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
        setSubmitError('');
    }

    function updateRegistrantNumber(value) {
        setRegistrantNumber(value);
        const normalized = value.trim().toLowerCase();
        const match = registrants.find((registrant) => registrantLabel(registrant).toLowerCase() === normalized || registrant.registry_number?.toLowerCase() === normalized);
        update('registrant_id', match?.id || '');
        setRegistrantError('');
    }

    function selectRegistrant(registrant) {
        setRegistrantNumber(registrantLabel(registrant));
        update('registrant_id', registrant.id);
        setRegistrantError('');
    }

    async function submit(event) {
        event.preventDefault();
        if (!form.registrant_id) {
            setRegistrantError('Enter a valid approved registrant number before saving.');
            return;
        }
        setBusy(true);
        setSubmitError('');
        const endpoint = isAssistance ? '/assistance-applications' : '/insurance-claims';

        try {
            if (isAssistance) {
                const payload = assistanceFormData(form, editing);

                if (editing) {
                    await api.post(`${endpoint}/${row.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
                } else {
                    await api.post(endpoint, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
            } else {
                const payload = {
                    ...form,
                    registrant_id: Number(form.registrant_id),
                    ...insurancePayloadStatuses(form.approval_status),
                };
                if (editing) {
                    await api.put(`${endpoint}/${row.id}`, payload);
                } else {
                    await api.post(endpoint, payload);
                }
            }
            onClose();
            onSaved();
        } catch (error) {
            setSubmitError(error.message || 'Unable to save record.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal open={open} title={isAssistance ? 'Manual Assistance Tracking' : 'Manual PCIC Claim Tracking'} onClose={onClose} size="lg">
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                <Field label="Beneficiary" wide>
                    <div className="space-y-2">
                        <input
                            required
                            disabled={editing}
                            className="field"
                            placeholder="Search registrant no. or name"
                            value={registrantNumber}
                            onChange={(event) => updateRegistrantNumber(event.target.value)}
                        />
                        {!editing && registrantQuery && registrantMatches.length > 0 && (
                            <div className="max-h-56 overflow-y-auto rounded-xl border border-emerald-100 bg-white shadow-lg">
                                {registrantMatches.map((registrant) => (
                                    <button
                                        key={registrant.id}
                                        type="button"
                                        className="block w-full border-b border-emerald-50 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-emerald-50"
                                        onClick={() => selectRegistrant(registrant)}
                                    >
                                        <span className="font-semibold text-slate-900">{registrantLabel(registrant)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showNoRegistrantMatch && (
                            <p className="text-xs font-semibold text-amber-700">No approved registrant found for that search.</p>
                        )}
                        {registrantError && <p className="text-xs font-semibold text-red-600">{registrantError}</p>}
                    </div>
                </Field>
                {isAssistance ? <AssistanceFields form={form} update={update} /> : <InsuranceFields form={form} update={update} />}
                <Field label="Remarks" wide><textarea className="field min-h-20" value={form.remarks} onChange={(event) => update('remarks', event.target.value)} /></Field>
                {submitError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 md:col-span-2">{submitError}</p>}
                <div className="flex justify-end gap-2 md:col-span-2">
                    <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" disabled={busy}>{busy ? 'Saving' : editing ? 'Save status' : 'Save record'}</button>
                </div>
            </form>
        </Modal>
    );
}

function AssistanceFields({ form, update }) {
    const [previewUrl, setPreviewUrl] = useState(form.evidence_url || '');

    useEffect(() => {
        if (!form.photo) {
            setPreviewUrl(form.evidence_url || '');
            return undefined;
        }

        const url = URL.createObjectURL(form.photo);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [form.evidence_url, form.photo]);

    return (
        <>
            <Field label="Sector">
                <select required className="field" value={form.program_name} onChange={(event) => update('program_name', event.target.value)}>
                    <option value="">Select sector</option>
                    {sectors.map((sector) => <option key={sector} value={sector}>{sectorLabels[sector]}</option>)}
                </select>
            </Field>
            <Field label="Assistance Type">
                <select required className="field" value={form.assistance_type} onChange={(event) => update('assistance_type', event.target.value)}>
                    <option value="">Select assistance type</option>
                    {assistanceTypes.map((type) => <option key={type} value={type}>{String(type).replaceAll('_', ' ')}</option>)}
                </select>
            </Field>
            <Field label="Status"><Select value={form.status} options={assistanceStatuses} labels={assistanceStatusLabels} onChange={(value) => update('status', value)} /></Field>
            <Field label="Applied"><input required type="date" className="field" value={form.applied_at} onChange={(event) => update('applied_at', event.target.value)} /></Field>
            <Field label="Approved"><input type="date" className="field" value={form.approved_at} onChange={(event) => update('approved_at', event.target.value)} /></Field>
            <Field label="Released"><input type="date" className="field" value={form.released_at} onChange={(event) => update('released_at', event.target.value)} /></Field>
            <Field label="Reason / Details" wide><textarea className="field min-h-24" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the assistance request, damage, loss, or supporting details." /></Field>
            <Field label="Supporting Photo" wide>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                    <input required className="field" type="file" accept="image/*" onChange={(event) => update('photo', event.target.files?.[0] || null)} />
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        Required photo evidence for livestock loss, crop damage, or other assistance requests. JPG, PNG, or WebP images up to 5MB are accepted.
                    </p>
                    {previewUrl && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <img src={previewUrl} alt="Supporting evidence preview" className="max-h-72 w-full object-contain" />
                        </div>
                    )}
                </div>
            </Field>
        </>
    );
}

function InsuranceFields({ form, update }) {
    return (
        <>
            <Field label="Claim Type"><Select value={form.claim_type} options={insuranceClaimTypes} onChange={(value) => update('claim_type', value)} /></Field>
            <Field label="Calamity/Event"><input className="field" value={form.calamity_event} onChange={(event) => update('calamity_event', event.target.value)} /></Field>
            <Field label="Incident Date"><input type="date" className="field" value={form.incident_date} onChange={(event) => update('incident_date', event.target.value)} /></Field>
            <Field label="Estimated Loss"><input type="number" step="0.01" className="field" value={form.estimated_loss} onChange={(event) => update('estimated_loss', event.target.value)} /></Field>
            <Field label="Endorsement"><Select value={form.endorsement_status} options={insuranceEndorsementStatuses} labels={insuranceStatusLabels} onChange={(value) => update('endorsement_status', value)} /></Field>
            <Field label="Status"><Select value={form.approval_status} options={insuranceFormStatuses} labels={insuranceStatusLabels} onChange={(value) => update('approval_status', value)} /></Field>
        </>
    );
}

function defaultServiceForm(kind) {
    return kind === 'assistance'
        ? { registrant_id: '', assistance_type: '', program_name: '', description: '', photo: null, evidence_url: '', status: 'application_submitted', applied_at: today(), approved_at: '', released_at: '', remarks: '' }
        : { registrant_id: '', claim_type: insuranceClaimTypes[0], policy_number: '', calamity_event: '', incident_date: today(), estimated_loss: '', endorsement_status: 'claim_submitted', approval_status: 'under_processing', release_status: 'pending', remarks: '' };
}

function serviceFormFromRow(kind, row) {
    return kind === 'assistance'
        ? {
            registrant_id: row.registrant_id || '',
            assistance_type: normalizeAssistanceType(row.assistance_type || ''),
            program_name: row.program_name || '',
            description: row.description || '',
            photo: null,
            evidence_url: row.evidence_url || '',
            status: row.status || 'application_submitted',
            applied_at: dateInput(row.applied_at),
            approved_at: dateInput(row.approved_at),
            released_at: dateInput(row.released_at),
            remarks: row.remarks || '',
        }
        : {
            registrant_id: row.registrant_id || '',
            claim_type: normalizeInsuranceClaimType(row.claim_type || insuranceClaimTypes[0]),
            policy_number: row.policy_number || '',
            calamity_event: row.calamity_event || '',
            incident_date: dateInput(row.incident_date),
            estimated_loss: row.estimated_loss || '',
            endorsement_status: row.endorsement_status || 'claim_submitted',
            approval_status: insuranceFormStatus(row),
            release_status: row.release_status || 'pending',
            remarks: row.remarks || '',
        };
}

function assistanceFormData(form, editing) {
    const payload = new FormData();
    if (editing) payload.append('_method', 'PUT');
    payload.append('registrant_id', Number(form.registrant_id));
    payload.append('assistance_type', normalizeAssistanceType(form.assistance_type));
    payload.append('program_name', form.program_name);
    payload.append('description', form.description || '');
    payload.append('status', form.status);
    payload.append('applied_at', form.applied_at);
    payload.append('approved_at', form.approved_at || '');
    payload.append('released_at', form.released_at || '');
    payload.append('remarks', form.remarks || '');
    payload.append('photo', form.photo);

    return payload;
}

function insuranceFormStatus(row) {
    return row.release_status === 'released' ? 'released' : row.approval_status || 'under_processing';
}

function insurancePayloadStatuses(status) {
    if (status === 'released') {
        return { approval_status: 'approved', release_status: 'released' };
    }

    return { approval_status: status, release_status: 'pending' };
}

function dateInput(value) {
    return value ? String(value).slice(0, 10) : '';
}

function registrantLabel(registrant) {
    return [registrant?.registry_number, registrant?.full_name].filter(Boolean).join(' - ');
}

const insuranceTimelineStatuses = ['claim_submitted', 'documents_verified', 'forwarded_to_pcic', 'under_processing', 'approved', 'released'];

function serviceTypeOptions(rows, kind) {
    const field = kind === 'assistance' ? 'assistance_type' : 'claim_type';
    return Array.from(new Set(rows.map((row) => kind === 'assistance' ? normalizeAssistanceType(row[field]) : normalizeInsuranceClaimType(row[field])).filter(Boolean)));
}

function serviceTypeValue(row, kind) {
    return kind === 'assistance' ? normalizeAssistanceType(row.assistance_type) : normalizeInsuranceClaimType(row.claim_type);
}

function normalizeAssistanceType(type) {
    return type === 'farm input' ? 'farm' : type;
}

function assistanceTypeLabel(type) {
    return normalizeAssistanceType(type);
}

function normalizeInsuranceClaimType(type) {
    if (type === 'crop') return 'farmer';
    if (type === 'boat') return 'fisherfolk';
    return type;
}

function serviceStatusValue(row, kind) {
    return kind === 'assistance' ? row.status : insuranceTimelineActive(row);
}

function insuranceDisplayStatus(row) {
    if (row.release_status === 'released') return 'released';
    if (['approved', 'rejected', 'denied'].includes(row.approval_status)) return row.approval_status;
    if (row.approval_status === 'under_processing') return 'under_processing';
    return row.endorsement_status || 'claim_submitted';
}

function insuranceTimelineActive(row) {
    if (row.release_status === 'released') return 'released';
    if (row.approval_status === 'approved') return 'approved';
    if (['rejected', 'denied'].includes(row.approval_status)) return 'approved';
    if (row.approval_status === 'under_processing') return 'under_processing';
    return row.endorsement_status || 'claim_submitted';
}
