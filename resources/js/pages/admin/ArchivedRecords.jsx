import React, { useEffect, useState } from 'react';
import { ArchiveRestore, Eye, Trash2 } from 'lucide-react';
import { ActionGroup, Card, DataTable, Field, InfoRow, Modal, PageHeader, PageLoader, Pagination, SearchBar, Select, StatusBadge } from '../../components/common';
import { insuranceApprovalStatuses, sectors } from '../../constants/options';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { roleSector } from '../../utils/rbac';
import Profile from '../registration/Profile';

const archiveTitles = {
    registrants: 'Archived Registrants',
    assistance: 'Archived Assistance Applications',
    insurance: 'Archived Insurance Applications',
};

export default function ArchivedRecords({ type }) {
    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState(null);
    const [barangays, setBarangays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [filters, setFilters] = useState({ search: '', sector: '', barangay_id: '', archived_date: '', archived_by: '', assistance_type: '', claim_type: '', claim_status: '' });
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);

    async function load(nextPage = page) {
        setLoading(true);
        const params = new URLSearchParams({ page: nextPage, per_page: 15 });
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        const endpoint = {
            registrants: '/archived/registrants',
            assistance: '/archived/assistance-applications',
            insurance: '/archived/insurance-claims',
        }[type];
        const [records, barangayResult] = await Promise.all([
            api.get(`${endpoint}?${params.toString()}`),
            api.get('/barangays?all=1'),
        ]);
        setRows(records.data.data || []);
        setMeta(records.data);
        setBarangays(Array.isArray(barangayResult.data) ? barangayResult.data : barangayResult.data.data || []);
        setLoading(false);
    }

    useEffect(() => {
        setPage(1);
        setModal(null);
        setMessage('');
    }, [type]);

    useEffect(() => {
        load(page);
    }, [type, page]);

    function update(name, value) {
        setFilters((current) => ({ ...current, [name]: value }));
    }

    async function confirmAction() {
        if (!modal?.row) return;
        const endpoints = archiveEndpoints(type, modal.row.id);
        if (modal.action === 'restore') {
            await api.post(endpoints.restore, {});
            setMessage('Record restored successfully.');
        }
        if (modal.action === 'delete') {
            await api.delete(endpoints.delete);
            setMessage('Record permanently deleted.');
        }
        setModal(null);
        load(page);
    }

    const columns = archiveColumns(type);
    const tableRows = rows.map((row) => archiveCells(type, row, setModal));
    const scopedSector = roleSector(user);

    return (
        <section className="space-y-4">
            <PageHeader title={archiveTitles[type]} description="Review archived records, restore valid records, or permanently delete records after confirmation." />
            {message && <Card><p className="text-sm font-semibold text-emerald-700">{message}</p></Card>}
            <Card>
                <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Search"><SearchBar value={filters.search} onChange={(value) => update('search', value)} placeholder={searchPlaceholder(type)} /></Field>
                    {type === 'registrants' && !scopedSector && <Field label="Sector"><Select value={filters.sector} options={['', ...sectors]} labels={{ '': 'All sectors' }} onChange={(value) => update('sector', value)} /></Field>}
                    {type === 'assistance' && <Field label="Assistance Type"><input className="field" value={filters.assistance_type} onChange={(event) => update('assistance_type', event.target.value)} /></Field>}
                    {type === 'insurance' && <Field label="Insurance Type"><input className="field" value={filters.claim_type} onChange={(event) => update('claim_type', event.target.value)} /></Field>}
                    {type === 'insurance' && <Field label="Claim Status"><Select value={filters.claim_status} options={['', ...insuranceApprovalStatuses, 'released']} labels={{ '': 'All statuses' }} onChange={(value) => update('claim_status', value)} /></Field>}
                    <Field label="Barangay">
                        <select className="field" value={filters.barangay_id} onChange={(event) => update('barangay_id', event.target.value)}>
                            <option value="">All barangays</option>
                            {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Archive Date"><input type="date" className="field" value={filters.archived_date} onChange={(event) => update('archived_date', event.target.value)} /></Field>
                    {type === 'registrants' && <Field label="Archived By"><input className="field" value={filters.archived_by} onChange={(event) => update('archived_by', event.target.value)} placeholder="User ID" /></Field>}
                    <div className="flex items-end gap-2">
                        <button className="btn-primary" type="button" onClick={() => { setPage(1); load(1); }}>Search</button>
                        <button className="btn-secondary" type="button" onClick={() => setFilters({ search: '', sector: '', barangay_id: '', archived_date: '', archived_by: '', assistance_type: '', claim_type: '', claim_status: '' })}>Clear</button>
                    </div>
                </div>
            </Card>
            <Card title={archiveTitles[type]}>
                {loading ? <PageLoader compact /> : (
                    <>
                        <DataTable columns={columns} rows={tableRows} />
                        <Pagination meta={meta} onPage={setPage} />
                    </>
                )}
            </Card>
            <ArchiveModal modal={modal} type={type} onClose={() => setModal(null)} onConfirm={confirmAction} />
        </section>
    );
}

function archiveColumns(type) {
    if (type === 'registrants') return ['Registry Number', 'Name', 'Sector', 'Barangay', 'Status Before Archive', 'Archived On', 'Archived By', 'Archive Reason', 'Actions'];
    if (type === 'assistance') return ['Application Number', 'Registry Number', 'Applicant', 'Assistance Type', 'Previous Status', 'Archived On', 'Archived By', 'Archive Reason', 'Actions'];
    return ['Claim Number', 'Registry Number', 'Applicant', 'Insurance Type', 'Previous Status', 'Archived On', 'Archived By', 'Archive Reason', 'Actions'];
}

function archiveCells(type, row, setModal) {
    const actions = <ArchiveActions row={row} type={type} setModal={setModal} />;
    if (type === 'registrants') {
        return [row.registry_number, row.full_name, row.sector, row.barangay?.name, <StatusBadge status={row.previous_status || row.status} />, formatDate(row.archived_at), row.archived_by?.name, row.archive_reason, actions];
    }
    const registrant = row.registrant || {};
    if (type === 'assistance') {
        return [`APP-${row.id}`, registrant.registry_number, registrant.full_name, row.assistance_type, <StatusBadge status={row.previous_status || row.status} />, formatDate(row.archived_at), row.archived_by?.name, row.archive_reason, actions];
    }
    return [`CLM-${row.id}`, registrant.registry_number, registrant.full_name, row.claim_type, <StatusBadge status={row.previous_status || row.approval_status} />, formatDate(row.archived_at), row.archived_by?.name, row.archive_reason, actions];
}

function ArchiveActions({ row, type, setModal }) {
    return (
        <ActionGroup>
            <button className="mini-btn" type="button" onClick={() => setModal({ action: 'view', row })}><Eye className="mr-1 inline h-3.5 w-3.5" />View</button>
            <button className="mini-btn" type="button" onClick={() => setModal({ action: 'restore', row })}><ArchiveRestore className="mr-1 inline h-3.5 w-3.5" />Restore</button>
            <button className="mini-btn border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800" type="button" onClick={() => setModal({ action: 'delete', row })}><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete Permanently</button>
        </ActionGroup>
    );
}

function ArchiveModal({ modal, type, onClose, onConfirm }) {
    if (!modal) return null;
    if (modal.action === 'view') {
        return (
            <Modal open title={type === 'registrants' ? 'Registrant Profile' : 'Archived Record'} onClose={onClose} size="xl">
                {type === 'registrants' ? <Profile profile={modal.row} /> : <ArchivedDetail row={modal.row} type={type} />}
            </Modal>
        );
    }
    const deleting = modal.action === 'delete';
    return (
        <Modal open title={deleting ? deleteTitle(type) : 'Restore Archived Record'} onClose={onClose}>
            <p className="text-sm text-slate-600">{deleting ? 'This action cannot be undone.' : 'This record will move back to its active module.'}</p>
            <div className="mt-4 flex justify-end gap-2">
                <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                <button className="btn-primary" type="button" onClick={onConfirm}>{deleting ? 'Delete Permanently' : 'Restore'}</button>
            </div>
        </Modal>
    );
}

function ArchivedDetail({ row, type }) {
    const registrant = row.registrant || {};
    return (
        <div className="grid gap-2 text-sm md:grid-cols-2">
            <InfoRow label={type === 'assistance' ? 'Application Number' : 'Claim Number'} value={`${type === 'assistance' ? 'APP' : 'CLM'}-${row.id}`} />
            <InfoRow label="Registrant" value={`${registrant.registry_number || ''} ${registrant.full_name || ''}`} />
            <InfoRow label="Barangay" value={registrant.barangay?.name} />
            <InfoRow label="Type" value={type === 'assistance' ? row.assistance_type : row.claim_type} />
            <InfoRow label="Previous Status" value={<StatusBadge status={row.previous_status || row.status || row.approval_status} />} />
            <InfoRow label="Archived On" value={formatDate(row.archived_at)} />
            <InfoRow label="Archived By" value={row.archived_by?.name} />
            <InfoRow label="Archive Reason" value={row.archive_reason} />
            <InfoRow label="Remarks" value={row.remarks} />
        </div>
    );
}

function archiveEndpoints(type, id) {
    if (type === 'registrants') return { restore: `/archived/registrants/${id}/restore`, delete: `/archived/registrants/${id}/force` };
    if (type === 'assistance') return { restore: `/archived/assistance-applications/${id}/restore`, delete: `/archived/assistance-applications/${id}/force` };
    return { restore: `/archived/insurance-claims/${id}/restore`, delete: `/archived/insurance-claims/${id}/force` };
}

function searchPlaceholder(type) {
    if (type === 'registrants') return 'Search registry, name, or phone';
    if (type === 'assistance') return 'Search application, applicant, or registry';
    return 'Search claim, applicant, or registry';
}

function deleteTitle(type) {
    if (type === 'registrants') return 'Delete Registrant Permanently';
    if (type === 'assistance') return 'Delete Assistance Application Permanently';
    return 'Delete Insurance Application Permanently';
}
