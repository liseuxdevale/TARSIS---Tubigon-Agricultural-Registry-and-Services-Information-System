import React, { useEffect, useState } from 'react';
import { Card, DataTable, Field, Modal, PageHeader, SearchBar, Select, StatCard, StatusBadge } from '../../components/common';
import { announcementTypes } from '../../constants/options';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { formatDateTime, formatRegistryNumber } from '../../utils/format';
import { roleSector } from '../../utils/rbac';

const notificationTypeLabels = {
    bulletin: 'Bulletin',
    advisory: 'Advisory',
    distribution_schedule: 'Distribution schedule',
    assistance_update: 'Assistance update',
    insurance_update: 'Insurance update',
    pest: 'Pest advisory',
    disease: 'Disease advisory',
    calamity: 'Calamity advisory',
    compliance_requirements: 'Compliance with requirements',
    other_purpose: 'Other relevant purpose',
};
export default function Notifications() {
    const { user } = useAuth();
    const sector = roleSector(user);
    const [rows, setRows] = useState([]);
    const [registrants, setRegistrants] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [rowMessages, setRowMessages] = useState({});
    const [sendOpen, setSendOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [clearOpen, setClearOpen] = useState(false);
    const [clearBusy, setClearBusy] = useState(false);
    const [clearError, setClearError] = useState('');
    const [clearMessage, setClearMessage] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteSelected, setDeleteSelected] = useState(false);

    useEffect(() => { setSelectedIds([]); }, [search, status, fromDate, toDate]);

    async function clearHistory() {
        if (clearBusy) return;
        setClearBusy(true);
        setClearError('');
        try {
            const response = await api.delete('/notification-deliveries/clear-history', { data: { confirm: true, ...(deleteSelected ? { ids: selectedIds } : {}) } });
            setClearOpen(false);
            setRows((current) => deleteSelected ? current.filter((row) => !selectedIds.includes(row.id)) : []);
            setSelectedIds([]);
            setRowMessages({});
            setClearMessage(response.data.message);
            try { await load(); } catch { setClearMessage(`${response.data.message} Refresh the page to reload the list.`); }
        } catch (error) { setClearError(error.message || 'Unable to clear history.'); }
        finally { setClearBusy(false); }
    }

    async function load() {
        const [deliveries, people] = await Promise.all([
            api.get('/notification-deliveries?per_page=50'),
            api.get('/registrants?status=approved&per_page=100'),
        ]);
        setRows(deliveries.data.data || []);
        setSelectedIds((current) => current.filter((id) => (deliveries.data.data || []).some((row) => row.id === id)));
        const approvedRegistrants = [...(people.data.data || [])];
        for (let page = 2; page <= (people.data.last_page || 1); page += 1) {
            const response = await api.get(`/registrants?status=approved&per_page=100&page=${page}`);
            approvedRegistrants.push(...(response.data.data || []));
        }
        setRegistrants(sector ? approvedRegistrants.filter((registrant) => registrant.sector === sector) : approvedRegistrants);
    }

    useEffect(() => {
        load();
    }, [sector]);

    async function deleteNotification(row) {
        if (!window.confirm('are you sure you want to delete this')) return;
        await api.delete(`/notification-deliveries/${row.id}`);
        await load();
    }

    async function resendNotification(row) {
        setRowMessages((current) => ({ ...current, [row.id]: 'Resending...' }));
        try {
            const response = await api.post(`/notifications/${row.id}/resend`);
            setRows((current) => current.map((item) => item.id === row.id ? response.data.delivery : item));
            setRowMessages((current) => ({ ...current, [row.id]: 'Resent successfully.' }));
        } catch (error) {
            setRowMessages((current) => ({ ...current, [row.id]: error.response?.data?.message || 'Resend failed.' }));
        }
    }

    const filteredRows = rows.filter((row) => {
        const searchable = `${recipientName(row)} ${row.registrant?.registry_number || ''} ${row.recipient || ''} ${row.message || ''} ${row.announcement?.title || ''}`.toLowerCase();
        const rowDate = row.sent_at || row.created_at;
        const rowDay = rowDate ? new Date(rowDate) : null;
        const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
        const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

        return searchable.includes(search.trim().toLowerCase())
            && (!status || row.status === status)
            && (!from || (rowDay && rowDay >= from))
            && (!to || (rowDay && rowDay <= to));
    });
    const push = filteredRows.filter((row) => row.channel === 'push');

    return (
        <section className="space-y-4">
            <PageHeader title="Notifications Dashboard" description="Push notification, deadline reminder, and outbreak alert delivery records." />
            <div className="grid gap-3 md:grid-cols-2">
                <StatCard label="All Deliveries" value={filteredRows.length} />
                <StatCard label="Push" value={push.length} tone="blue" />
            </div>
            <Card title="Delivery History">
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
                    <Field label="Search"><SearchBar value={search} onChange={setSearch} placeholder="Search name, reg number or message" /></Field>
                    <Field label="Status"><Select value={status} options={['', 'sent', 'failed']} labels={{ '': 'All statuses', sent: 'Sent', failed: 'Failed to send' }} onChange={setStatus} /></Field>
                    <Field label="From"><input className="field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
                    <Field label="To"><input className="field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
                    <button className="btn-primary h-[46px] whitespace-nowrap" type="button" onClick={() => setSendOpen(true)}>Send notification</button>
                </div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 p-3">
                    <span className="text-sm">Clear all delivery history you are authorized to manage, including records outside the current filters.</span>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm">{selectedIds.length} selected</span>
                        <button className="btn-secondary text-red-700" type="button" disabled={!selectedIds.length || clearBusy} onClick={() => { setDeleteSelected(true); setClearError(''); setClearOpen(true); }}>Delete Selected</button>
                        <button className="btn-secondary text-red-700" type="button" disabled={clearBusy} onClick={() => { setDeleteSelected(false); setClearError(''); setClearOpen(true); }}>Clear All</button>
                    </div>
                </div>
                {clearMessage && <p role="status" className="mb-3 text-sm text-emerald-800">{clearMessage}</p>}
                <DataTable columns={[<input type="checkbox" className="h-5 w-5 cursor-pointer accent-green-700" aria-label="Select all visible notifications" disabled={!filteredRows.length || clearBusy} checked={filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.id))} onChange={(event) => setSelectedIds(event.target.checked ? filteredRows.map((row) => row.id) : [])} />, 'Recipient', 'Status', 'Message', 'Sent', 'Actions']} rows={filteredRows.map((row) => [
                    <input type="checkbox" className="h-5 w-5 cursor-pointer accent-green-700" aria-label={`Select notification for ${recipientName(row)}: ${row.message || ''}`} disabled={clearBusy} checked={selectedIds.includes(row.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} />,
                    recipientName(row),
                    <StatusCell row={row} />,
                    row.announcement?.title || row.message,
                    row.sent_at ? formatDateTime(row.sent_at) : 'Not sent',
                    <div className="flex min-w-[210px] flex-wrap gap-2">
                        {canResend(row) && <button className="mini-btn" type="button" onClick={() => resendNotification(row)}>Resend</button>}
                        <button className="mini-btn" type="button" onClick={() => setEditing(row)}>Edit</button>
                        <button className="mini-btn" type="button" onClick={() => deleteNotification(row)}>Delete</button>
                        {rowMessages[row.id] && <span className="w-full text-xs font-semibold text-slate-500">{rowMessages[row.id]}</span>}
                    </div>,
                ])} />
            </Card>
            <Card title="Push Notification History">
                <DataTable columns={['Recipient', 'Status', 'Sent']} rows={push.map((row) => [recipientName(row), <StatusBadge status={row.status} />, row.sent_at ? formatDateTime(row.sent_at) : 'Not sent'])} />
            </Card>
            <SendNotificationModal open={sendOpen} onClose={() => setSendOpen(false)} onSaved={load} registrants={registrants} />
            <Modal open={clearOpen} title={deleteSelected ? 'Delete Selected Notifications' : 'Clear All Delivery History'} onClose={() => { if (!clearBusy) setClearOpen(false); }}>
                <p className="text-lg font-semibold">{deleteSelected ? `Are you sure you want to delete these ${selectedIds.length} selected notifications?` : 'Are you sure you want to clear all?'}</p>
                <p className="mt-3 text-sm text-slate-500">{deleteSelected ? 'Only the checked delivery records will be permanently deleted.' : 'This permanently deletes all delivery records you are authorized to manage, including records outside the current filters.'} Announcements and registrant accounts will not be deleted. Sent notifications cannot be recalled.</p>
                {clearError && <p role="alert" className="mt-3 text-sm text-red-700">{clearError}</p>}
                <div className="mt-4 flex justify-end gap-3">
                    <button className="btn-secondary" type="button" disabled={clearBusy} onClick={() => setClearOpen(false)}>Cancel</button>
                    <button className="btn-primary bg-red-700" type="button" disabled={clearBusy} onClick={clearHistory}>{clearBusy ? 'Deleting…' : 'Delete'}</button>
                </div>
            </Modal>
            <SendNotificationModal open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={load} registrants={registrants} row={editing} />
        </section>
    );
}

function recipientName(row) {
    const registrant = row.registrant;
    const name = registrant?.full_name || [registrant?.first_name, registrant?.middle_name, registrant?.last_name, registrant?.suffix].filter(Boolean).join(' ');
    return name || row.user?.name || row.recipient || 'Unknown recipient';
}

function canResend(row) {
    return row.status === 'failed';
}

function StatusCell({ row }) {
    return <StatusBadge status={row.status} />;
}

function SendNotificationModal({ open, onClose, onSaved, registrants = [], row = null }) {
    const [form, setForm] = useState({ type: 'distribution_schedule', target_registrant_id: '', title: '', body: '', send_push: true, publish_to_facebook: false });
    const [registrantNumber, setRegistrantNumber] = useState('');
    const [registrantError, setRegistrantError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [busy, setBusy] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const editing = Boolean(row);
    const registrantQuery = registrantNumber.trim().toLowerCase();
    const registrantMatches = registrants.filter((registrant) => {
        const commodities = registrantCommodities(registrant);
        const searchable = `${registrant.registry_number || ''} ${formatRegistryNumber(registrant.registry_number)} ${registrant.full_name || ''} ${commodities.join(' ')}`.toLowerCase();
        return searchable.includes(registrantQuery);
    });
    const showNoRegistrantMatch = registrantMatches.length === 0;

    useEffect(() => {
        if (!open) return;
        setForm(row ? {
            type: row.announcement?.type || row.provider_response?.type || 'distribution_schedule',
            target_registrant_id: row.announcement?.target_registrant_id || row.registrant_id || '',
            title: row.announcement?.title || row.message || '',
            body: row.announcement?.body || row.provider_response?.body || '',
            send_push: true,
            publish_to_facebook: false,
        } : { type: 'distribution_schedule', target_registrant_id: '', title: '', body: '', send_push: true, publish_to_facebook: false });
        const selectedRegistrant = registrants.find((registrant) => registrant.id === (row?.announcement?.target_registrant_id || row?.registrant_id));
        setSelectedIds([]);
        setRegistrantNumber(row ? (selectedRegistrant ? registrantLabel(selectedRegistrant) : recipientName(row)) : '');
        setRegistrantError('');
        setSubmitError('');
    }, [open, registrants, row]);

    function updateRegistrantNumber(value) {
        setRegistrantNumber(value);
        const normalized = value.trim().toLowerCase();
        const match = registrants.find((registrant) => registrantLabel(registrant).toLowerCase() === normalized || registrant.registry_number?.toLowerCase() === normalized);
        setForm((current) => ({ ...current, target_registrant_id: match?.id || '' }));
        setRegistrantError('');
    }

    function selectRegistrant(registrant) {
        setSelectedIds((current) => current.includes(registrant.id) ? current.filter((id) => id !== registrant.id) : [...current, registrant.id]);
        setRegistrantError('');
    }

    async function submit(event) {
        event.preventDefault();
        if (!editing && !selectedIds.length) {
            setRegistrantError('Select at least one approved registrant before sending.');
            return;
        }
        setSubmitError('');
        setBusy(true);
        try {
            if (editing) {
                await api.put(`/notification-deliveries/${row.id}`, {
                    type: form.type,
                    title: form.title,
                    body: form.body,
                });
            } else {
                await api.post('/notification-deliveries', {
                    type: form.type,
                    target_registrant_ids: selectedIds,
                    title: form.title,
                    body: form.body,
                });
            }
            onClose();
            onSaved();
        } catch (error) {
            setSubmitError(error.response?.data?.message || error.message || 'Notification could not be sent.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal open={open} title={editing ? 'Edit Notification' : 'Send Notification'} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                <Field label="Type"><Select value={form.type} options={announcementTypes} labels={notificationTypeLabels} onChange={(value) => setForm({ ...form, type: value })} /></Field>
                <Field label={editing ? 'Recipient' : `Recipients (${selectedIds.length} selected)`}>
                    <div className="space-y-2">
                        <input
                            disabled={editing}
                            className="field"
                            placeholder="Search registrant no. or name"
                            value={registrantNumber}
                            onChange={(event) => updateRegistrantNumber(event.target.value)}
                        />
                        {!editing && <div className="flex gap-3 text-xs">
                            <button type="button" className="mini-btn" onClick={() => { setSelectedIds((current) => [...new Set([...current, ...registrantMatches.map((person) => person.id)])]); setRegistrantError(''); }}>Select all results</button>
                            <button type="button" className="mini-btn" onClick={() => setSelectedIds([])}>Clear selection</button>
                        </div>}
                        {!editing && selectedIds.length > 0 && <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                            {registrants.filter((person) => selectedIds.includes(person.id)).map((person) => <button type="button" key={person.id} className="mini-btn" aria-label={`Remove ${person.full_name}`} onClick={() => selectRegistrant(person)}>{person.full_name} ×</button>)}
                        </div>}
                        {!editing && registrantMatches.length > 0 && (
                            <div className="max-h-56 overflow-y-auto rounded-xl border border-emerald-100 bg-white shadow-lg">
                                {registrantMatches.map((registrant) => (
                                    <label
                                        key={registrant.id}
                                        className="flex w-full cursor-pointer items-center gap-3 border-b border-emerald-50 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-emerald-50"
                                    >
                                        <input type="checkbox" checked={selectedIds.includes(registrant.id)} onChange={() => selectRegistrant(registrant)} />
                                        <span>
                                            <span className="block font-semibold text-slate-900">{registrantLabel(registrant)}</span>
                                            <span className="block text-xs text-slate-500">RSBSA commodities: {registrantCommodities(registrant).join(', ') || 'Not recorded'}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {!editing && showNoRegistrantMatch && (
                            <p className="text-xs font-semibold text-amber-700">No approved registrant found for that search.</p>
                        )}
                        {registrantError && <p className="text-xs font-semibold text-red-600">{registrantError}</p>}
                    </div>
                </Field>
                <Field label="Title"><input required className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
                <Field label="Message"><textarea required className="field min-h-28" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
                {submitError && <p className="text-sm font-semibold text-red-600">{submitError}</p>}
                <button className="btn-primary w-full" disabled={busy || (!editing && !selectedIds.length)}>{busy ? (editing ? 'Saving' : 'Sending') : (editing ? 'Save changes' : `Send to ${selectedIds.length} registrant${selectedIds.length === 1 ? '' : 's'}`)}</button>
            </form>
        </Modal>
    );
}

function registrantLabel(registrant) {
    return [formatRegistryNumber(registrant?.registry_number), registrant?.full_name].filter(Boolean).join(' - ');
}

function registrantCommodities(registrant) {
    const parcels = registrant.rsbsa_payload?.parcels;
    const registered = (Array.isArray(parcels) ? parcels : []).flatMap((parcel) => Array.isArray(parcel.commodities) ? parcel.commodities.map((item) => item.commodity) : []);
    return [...new Set([...registered, registrant.livestock_type, registrant.poultry_type]
        .map((value) => String(value || '').trim()).filter(Boolean))];
}
