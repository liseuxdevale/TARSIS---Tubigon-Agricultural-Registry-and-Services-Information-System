import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Pencil, Trash2, ImageOff } from 'lucide-react';
import { Card, Field, Modal, PageHeader, SearchBar, Select } from '../../components/common';
import { announcementTypes, sectors } from '../../constants/options';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';

const announcementTypeLabels = {
    bulletin: 'Bulletin',
    advisory: 'Advisory',
    distribution_schedule: 'Distribution schedule',
    assistance_update: 'Assistance application',
    insurance_update: 'Insurance application',
    pest: 'Pest advisory',
    disease: 'Disease advisory',
    calamity: 'Calamity advisory',
    compliance_requirements: 'Compliance requirements',
    other_purpose: 'Other purpose',
};

export default function AnnouncementManagement() {
    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [editing, setEditing] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [details, setDetails] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        type: '',
        publication: '',
    });

    async function load() {
        const [announcementResult, barangayResult] = await Promise.all([
            api.get('/announcements?per_page=50'),
            api.get('/barangays?all=1'),
        ]);
        setRows(announcementResult.data.data || []);
        setBarangays(Array.isArray(barangayResult.data) ? barangayResult.data : barangayResult.data.data || []);
    }

    useEffect(() => {
        load().catch((error) => setError(error.response?.data?.message || 'Unable to load announcements.')).finally(() => setLoading(false));
    }, []);

    async function remove(row) {
        if (!window.confirm('Are you sure you want to delete this?')) return;
        setDeleting(true);
        setError('');
        try {
            await api.delete(`/announcements/${row.id}`);
            setDetails(null);
            setNotice('Announcement deleted.');
            await load();
        } catch (error) {
            setError(error.response?.data?.message || 'Unable to delete the announcement.');
        } finally { setDeleting(false); }
    }

    function share(row) {
        setError('');
        setNotice('');
        if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname)) {
            setError('Facebook cannot access this local website. Deploy TARSIS to a public HTTPS address before sharing announcement links.');
            return;
        }
        const url = new URL(`/announcements/${row.id}`, window.location.origin).href;
        const popup = window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'popup,width=640,height=720');
        if (!popup) { setError('Your browser blocked Facebook. Allow pop-ups and try again.'); return; }
        popup.opener = null;
        setNotice('Facebook sharing opened. Choose an available destination and confirm on Facebook. TARSIS cannot verify whether you publish or cancel.');
    }

    const filteredRows = useMemo(() => rows.filter((row) => {
        const statuses = announcementStatuses(row);
        const searchable = [
            row.title,
            row.type,
            formatDate(row.publish_at),
            statuses.publication,
            statuses.push,
            statuses.facebook,
        ].join(' ').toLowerCase();

        return searchable.includes(search.trim().toLowerCase())
            && (!filters.type || row.type === filters.type)
            && (!filters.publication || statuses.publication === filters.publication);
    }), [filters, rows, search]);

    return (
        <section className="space-y-4">
            <PageHeader title="Announcement Management" description="Create, edit, schedule, notify, and share announcements." actions={<button className="btn-primary" onClick={() => setFormOpen(true)}>Create announcement</button>} />
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
            <Card>
                <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Search announcements">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search title, date, type, or status" />
                    </Field>
                    <AnnouncementFilter label="Type" value={filters.type} options={announcementTypes} labels={announcementTypeLabels} onChange={(type) => setFilters({ ...filters, type })} />
                    <AnnouncementFilter label="Publication" value={filters.publication} options={['Published', 'Scheduled', 'Unscheduled']} onChange={(publication) => setFilters({ ...filters, publication })} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-500">{filteredRows.length} of {rows.length} announcements</p>
                    <button className="mini-btn" onClick={() => {
                        setSearch('');
                        setFilters({ type: '', publication: '' });
                    }}>Clear filters</button>
                </div>
            </Card>
            {loading ? <p role="status">Loading announcements...</p> : filteredRows.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRows.map((row) => <AnnouncementCard key={row.id} row={row} onOpen={setDetails} onShare={share} />)}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-10 text-center text-sm font-medium text-gray-500 shadow-sm">
                    No announcements found.
                </div>
            )}
            <AnnouncementDialog open={Boolean(details)} title="Announcement details" onClose={() => setDetails(null)}>
                {details && <>
                    <div className="mb-4 flex justify-end gap-2">
                        <button className="btn-primary inline-flex items-center gap-2" disabled={deleting} onClick={() => { setEditing(details); setDetails(null); }}><Pencil className="h-4 w-4" />Edit</button>
                        <button className="btn-secondary inline-flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50" disabled={deleting} onClick={() => remove(details)}><Trash2 className="h-4 w-4" />{deleting ? 'Deleting...' : 'Delete'}</button>
                    </div>
                    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
                    {details.image_url && <img src={details.image_url} alt={details.title} className="max-h-[60vh] w-full rounded-lg object-contain" />}
                    <h2 className="mt-4 text-xl font-bold text-slate-950">{details.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{details.body}</p>
                    <dl className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
                        {Object.entries({ Type: announcementTypeLabels[details.type] || details.type, Publication: formatDate(details.publish_at), Expires: formatDate(details.expires_at), Status: announcementStatuses(details).publication, Created: formatDate(details.created_at), Updated: formatDate(details.updated_at), 'Target sectors': details.target_sectors?.join(', ') || 'All sectors', 'Target barangays': details.target_barangays?.map((id) => barangays.find((item) => Number(item.id) === Number(id))?.name || id).join(', ') || 'All barangays' }).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
                    </dl>
                    <div className="mt-4 flex gap-8"><ChannelStatus label="Push" status={announcementStatuses(details).push} /><ChannelStatus label="Facebook publishing" status={announcementStatuses(details).facebook} /></div>
                </>}
            </AnnouncementDialog>
            <AnnouncementFormModal open={formOpen || Boolean(editing)} row={editing} barangays={barangays} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={async () => { await load(); setNotice('Announcement saved.'); }} />
        </section>
    );
}

function AnnouncementCard({ row, onOpen, onShare }) {
    return (
        <article className="cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md" onClick={() => onOpen(row)}>
            <button type="button" className="block aspect-[4/3] w-full bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-500" aria-label={`View announcement: ${row.title}`} onClick={(event) => { event.stopPropagation(); onOpen(row); }}>
                {row.image_url ? <img src={row.image_url} alt={row.title} loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="mx-auto h-12 w-12 text-slate-400" aria-hidden="true" />}
            </button>
            <div className="flex items-center gap-3 p-3">
                <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-bold text-white hover:bg-[#166FE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label={`Share ${row.title} to Facebook`} onClick={(event) => { event.stopPropagation(); onShare(row); }}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.972h-1.513c-1.491 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></svg>
                    Share to Facebook
                </button>
                <h3 className="min-w-0 flex-1 break-words text-right text-sm font-bold leading-5 text-slate-900">{row.title}</h3>
            </div>
        </article>
    );
}

function AnnouncementDialog({ open, title, onClose, children }) {
    const content = useRef(null);
    useEffect(() => {
        if (!open || !content.current) return;
        const previous = document.activeElement;
        const dialog = content.current.parentElement;
        const controls = () => [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')].filter((element) => element.getClientRects().length);
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', title);
        controls()[0]?.focus();
        function trap(event) {
            if (event.key !== 'Tab') return;
            const items = controls();
            const target = event.shiftKey ? items[items.length - 1] : items[0];
            if ((event.shiftKey && document.activeElement === items[0]) || (!event.shiftKey && document.activeElement === items[items.length - 1])) {
                event.preventDefault(); target?.focus();
            }
        }
        dialog.addEventListener('keydown', trap);
        return () => { dialog.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus(); };
    }, [open, title]);
    return <Modal open={open} title={title} size="lg" onClose={onClose}><div ref={content}>{children}</div></Modal>;
}

function ChannelStatus({ label, status }) {
    const active = status === 'Enabled' || status === 'Posted';
    const queued = status === 'Queued';

    return (
        <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <span className={`mt-1 inline-flex max-w-full rounded-md px-2 py-1 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-800' : queued ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600'}`}>
                {status}
            </span>
        </div>
    );
}

function AnnouncementFilter({ label, value, options, labels = {}, onChange }) {
    return (
        <Field label={label}>
            <select className="field capitalize" value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">All</option>
                {options.map((option) => <option key={option} value={option}>{labels[option] || String(option).replaceAll('_', ' ')}</option>)}
            </select>
        </Field>
    );
}

function announcementStatuses(row) {
    const publishTime = row.publish_at ? new Date(row.publish_at).getTime() : null;

    return {
        publication: publishTime === null || Number.isNaN(publishTime) ? 'Unscheduled' : publishTime > Date.now() ? 'Scheduled' : 'Published',
        push: row.send_push ? 'Enabled' : 'Off',
        facebook: ['failed', 'not-configured', 'posted'].includes(row.facebook_post_id) ? 'Failed' : row.facebook_post_id ? 'Posted' : row.publish_to_facebook ? 'Queued' : 'Off',
    };
}

function AnnouncementFormModal({ open, row, barangays, onClose, onSaved }) {
    const [form, setForm] = useState(defaultAnnouncement());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const editing = Boolean(row);

    useEffect(() => {
        setError('');
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(row?.image_url || '');
        setForm(row ? {
            type: row.type || 'bulletin',
            title: row.title || '',
            body: row.body || '',
            publish_at: row.publish_at ? String(row.publish_at).slice(0, 16) : '',
            expires_at: row.expires_at ? String(row.expires_at).slice(0, 16) : '',
            send_push: Boolean(row.send_push),
            publish_to_facebook: false,
            target_sectors: row.target_sectors || [],
            target_barangays: row.target_barangays || [],
            photo: null,
        } : defaultAnnouncement());
    }, [row, open]);

    function setPhoto(file) {
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setForm({ ...form, photo: file });
        setPreviewUrl(file ? URL.createObjectURL(file) : row?.image_url || '');
    }

    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const payload = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key === 'photo') {
                    if (value) payload.append(key, value);
                } else if (Array.isArray(value)) {
                    value.forEach((item) => payload.append(`${key}[]`, item));
                } else if (typeof value === 'boolean') {
                    payload.append(key, value ? '1' : '0');
                } else if (value !== null && value !== undefined) {
                    payload.append(key, value);
                }
            });

            if (editing) {
                payload.append('_method', 'PUT');
                await api.post(`/announcements/${row.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/announcements', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            await onSaved();
            onClose();
        } catch (error) {
            setError(error.response?.data?.message || 'Unable to save the announcement. Please try again.');
        } finally { setBusy(false); }
    }

    return (
        <AnnouncementDialog open={open} title={editing ? 'Edit Announcement' : 'Create Announcement'} onClose={onClose}>
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                {error && <p role="alert" className="text-sm text-red-700 md:col-span-2">{error}</p>}
                <Field label="Type"><Select value={form.type} options={announcementTypes} labels={announcementTypeLabels} onChange={(value) => setForm({ ...form, type: value })} /></Field>
                <Field label="Publication Date"><input type="datetime-local" className="field" value={form.publish_at} onChange={(event) => setForm({ ...form, publish_at: event.target.value })} /></Field>
                <Field label="Title" wide><input required className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
                <div className="md:col-span-2">
                    <p className="mb-1.5 text-sm font-semibold text-gray-700">Announcement Photo</p>
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[180px_1fr]">
                        <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
                            {previewUrl ? (
                                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">No photo selected</div>
                            )}
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                            <label className="btn-secondary inline-flex w-fit cursor-pointer items-center gap-2">
                                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                                Upload Photo
                                <input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                            </label>
                            <p className="text-xs leading-5 text-slate-500">Upload a JPG, PNG, or WebP image. This photo will show on the landing page and public announcement page.</p>
                        </div>
                    </div>
                </div>
                <Field label="Body" wide><textarea required className="field min-h-32" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field>
                <Field label="Expires At"><input type="datetime-local" className="field" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} /></Field>
                <div className="space-y-2">
                    <label className="check"><input type="checkbox" checked={form.send_push} onChange={(event) => setForm({ ...form, send_push: event.target.checked })} /> Push notification</label>
                </div>
                <Field label="Target Sectors" wide>
                    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
                        <label className="check capitalize">
                            <input
                                type="checkbox"
                                checked={form.target_sectors.length === 0}
                                onChange={() => setForm({ ...form, target_sectors: [] })}
                            />
                            General
                        </label>
                        {sectors.map((sector) => (
                            <label key={sector} className="check capitalize">
                                <input
                                    type="checkbox"
                                    checked={form.target_sectors.includes(sector)}
                                    onChange={() => setForm({ ...form, target_sectors: toggleValue(form.target_sectors, sector) })}
                                />
                                {sector}
                            </label>
                        ))}
                        <p className="text-xs text-slate-500 sm:col-span-2">General targets all sectors.</p>
                    </div>
                </Field>
                <Field label="Target Barangays" wide>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
                        <label className="check mb-2">
                            <input
                                type="checkbox"
                                checked={form.target_barangays.length === 0}
                                onChange={() => setForm({ ...form, target_barangays: [] })}
                            />
                            General announcement / all barangays
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {barangays.map((barangay) => (
                                <label key={barangay.id} className="check">
                                    <input
                                        type="checkbox"
                                        checked={form.target_barangays.includes(barangay.id)}
                                        onChange={() => setForm({ ...form, target_barangays: toggleValue(form.target_barangays, barangay.id) })}
                                    />
                                    {barangay.name}
                                </label>
                            ))}
                        </div>
                    </div>
                </Field>
                <div className="flex justify-end gap-2 md:col-span-2">
                    <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Publish'}</button>
                </div>
            </form>
        </AnnouncementDialog>
    );
}

function defaultAnnouncement() {
    return { type: 'bulletin', title: '', body: '', publish_at: '', expires_at: '', send_push: true, publish_to_facebook: false, target_sectors: [], target_barangays: [], photo: null };
}

function toggleValue(values, value) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
