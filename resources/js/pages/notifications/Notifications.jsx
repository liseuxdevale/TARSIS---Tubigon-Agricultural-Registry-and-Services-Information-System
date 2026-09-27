import React, { useEffect, useState } from 'react';
import { Card, DataTable, Field, Modal, PageHeader, SearchBar, Select, StatCard, StatusBadge } from '../../components/common';
import { announcementTypes } from '../../constants/options';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
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

    async function load() {
        const [deliveries, people] = await Promise.all([
            api.get('/notification-deliveries?per_page=50'),
            api.get('/registrants?status=approved&per_page=100'),
        ]);
        setRows(deliveries.data.data || []);
        const approvedRegistrants = people.data.data || [];
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
        const searchable = `${row.recipient || ''} ${row.message || ''} ${row.announcement?.title || ''}`.toLowerCase();
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
                    <Field label="Search"><SearchBar value={search} onChange={setSearch} placeholder="Search recipient or message" /></Field>
                    <Field label="Status"><Select value={status} options={['', 'sent', 'failed']} labels={{ '': 'All statuses', sent: 'Sent', failed: 'Failed to send' }} onChange={setStatus} /></Field>
                    <Field label="From"><input className="field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
                    <Field label="To"><input className="field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
                    <button className="btn-primary h-[46px] whitespace-nowrap" type="button" onClick={() => setSendOpen(true)}>Send notification</button>
                </div>
                <DataTable columns={['Channel', 'Recipient', 'Status', 'Message', 'Sent', 'Actions']} rows={filteredRows.map((row) => [
                    row.channel,
                    row.recipient,
                    <StatusCell row={row} />,
                    row.announcement?.title || row.message,
                    row.sent_at ? new Date(row.sent_at).toLocaleString() : 'Not sent',
                    <div className="flex min-w-[210px] flex-wrap gap-2">
                        {canResend(row) && <button className="mini-btn" type="button" onClick={() => resendNotification(row)}>Resend</button>}
                        <button className="mini-btn" type="button" onClick={() => setEditing(row)} disabled={!row.announcement}>Edit</button>
                        <button className="mini-btn" type="button" onClick={() => deleteNotification(row)}>Delete</button>
                        {rowMessages[row.id] && <span className="w-full text-xs font-semibold text-slate-500">{rowMessages[row.id]}</span>}
                    </div>,
                ])} />
            </Card>
            <Card title="Push Notification History">
                <DataTable columns={['Topic/Recipient', 'Status', 'Sent']} rows={push.map((row) => [row.recipient, <StatusBadge status={row.status} />, row.sent_at ? new Date(row.sent_at).toLocaleString() : 'Not sent'])} />
            </Card>
            <SendNotificationModal open={sendOpen} onClose={() => setSendOpen(false)} onSaved={load} registrants={registrants} />
            <SendNotificationModal open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={load} registrants={registrants} row={editing} />
        </section>
    );
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
    const editing = Boolean(row);
    const registrantQuery = registrantNumber.trim().toLowerCase();
    const registrantMatches = registrantQuery
        ? registrants
            .filter((registrant) => `${registrant.registry_number || ''} ${registrant.full_name || ''}`.toLowerCase().includes(registrantQuery))
            .slice(0, 8)
        : [];
    const showNoRegistrantMatch = registrantQuery.length >= 3 && !form.target_registrant_id && registrantMatches.length === 0;

    useEffect(() => {
        if (!open) return;
        setForm(row ? {
            type: row.announcement?.type || 'distribution_schedule',
            target_registrant_id: row.announcement?.target_registrant_id || row.registrant_id || '',
            title: row.announcement?.title || '',
            body: row.announcement?.body || '',
            send_push: true,
            publish_to_facebook: false,
        } : { type: 'distribution_schedule', target_registrant_id: '', title: '', body: '', send_push: true, publish_to_facebook: false });
        const selectedRegistrant = registrants.find((registrant) => registrant.id === (row?.announcement?.target_registrant_id || row?.registrant_id));
        setRegistrantNumber(selectedRegistrant ? registrantLabel(selectedRegistrant) : '');
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
        setRegistrantNumber(registrantLabel(registrant));
        setForm((current) => ({ ...current, target_registrant_id: registrant.id }));
        setRegistrantError('');
    }

    async function submit(event) {
        event.preventDefault();
        if (!form.target_registrant_id) {
            setRegistrantError('Enter a valid approved registrant number before sending.');
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
                    target_registrant_id: Number(form.target_registrant_id),
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
                <Field label="Recipient">
                    <div className="space-y-2">
                        <input
                            required
                            disabled={editing}
                            className="field"
                            placeholder="Search registrant no. or name"
                            value={registrantNumber}
                            onChange={(event) => updateRegistrantNumber(event.target.value)}
                        />
                        {registrantQuery && registrantMatches.length > 0 && (
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
                <Field label="Title"><input required className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
                <Field label="Message"><textarea required className="field min-h-28" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
                {submitError && <p className="text-sm font-semibold text-red-600">{submitError}</p>}
                <button className="btn-primary w-full" disabled={busy}>{busy ? (editing ? 'Saving' : 'Sending') : (editing ? 'Save changes' : 'Send')}</button>
            </form>
        </Modal>
    );
}

function registrantLabel(registrant) {
    return [registrant?.registry_number, registrant?.full_name].filter(Boolean).join(' - ');
}
