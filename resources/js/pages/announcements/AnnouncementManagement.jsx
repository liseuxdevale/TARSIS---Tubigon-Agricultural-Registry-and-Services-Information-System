import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Trash2 } from 'lucide-react';
import { Card, Field, Modal, PageHeader, SearchBar, Select, StatusBadge } from '../../components/common';
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
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        type: '',
        publication: '',
        push: '',
        facebook: '',
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
        load();
    }, []);

    async function remove(row) {
        if (!window.confirm('Are you sure you want to delete this?')) return;
        await api.delete(`/announcements/${row.id}`);
        load();
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
            && (!filters.publication || statuses.publication === filters.publication)
            && (!filters.push || statuses.push === filters.push)
            && (!filters.facebook || statuses.facebook === filters.facebook);
    }), [filters, rows, search]);

    return (
        <section className="space-y-4">
            <PageHeader title="Announcement Management" description="Create, edit, schedule, notify, and publish announcements to Facebook." actions={<button className="btn-primary" onClick={() => setFormOpen(true)}>Create announcement</button>} />
            <Card>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Field label="Search announcements">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search title, date, type, or status" />
                    </Field>
                    <AnnouncementFilter label="Type" value={filters.type} options={announcementTypes} labels={announcementTypeLabels} onChange={(type) => setFilters({ ...filters, type })} />
                    <AnnouncementFilter label="Publication" value={filters.publication} options={['Published', 'Scheduled', 'Unscheduled']} onChange={(publication) => setFilters({ ...filters, publication })} />
                    <AnnouncementFilter label="Push" value={filters.push} options={['Enabled', 'Off']} onChange={(push) => setFilters({ ...filters, push })} />
                    <AnnouncementFilter label="Facebook" value={filters.facebook} options={['Posted', 'Queued', 'Off']} onChange={(facebook) => setFilters({ ...filters, facebook })} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-500">{filteredRows.length} of {rows.length} announcements</p>
                    <button className="mini-btn" onClick={() => {
                        setSearch('');
                        setFilters({ type: '', publication: '', push: '', facebook: '' });
                    }}>Clear filters</button>
                </div>
            </Card>
            {filteredRows.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRows.map((row) => <AnnouncementCard key={row.id} row={row} onEdit={setEditing} onDelete={remove} />)}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-10 text-center text-sm font-medium text-gray-500 shadow-sm">
                    No announcements found.
                </div>
            )}
            <AnnouncementFormModal open={formOpen || Boolean(editing)} row={editing} barangays={barangays} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={load} />
        </section>
    );
}

function AnnouncementCard({ row, onEdit, onDelete }) {
    const statuses = announcementStatuses(row);

    return (
        <article className="flex min-h-64 flex-col rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-base font-bold leading-6 text-gray-900">{row.title}</h3>
                <StatusBadge status={row.type} />
            </div>
            <div className="mt-4 border-y border-gray-100 py-3">
                <p className="text-xs font-semibold uppercase text-gray-400">Publish date</p>
                <p className="mt-1 text-sm font-medium text-gray-700">{formatDate(row.publish_at)}</p>
                <p className="mt-1 text-xs text-gray-500">{statuses.publication}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <ChannelStatus label="Push" status={statuses.push} />
                <ChannelStatus label="Facebook" status={statuses.facebook} />
            </div>
            <div className="mt-auto flex justify-end gap-2 pt-5">
                <button className="mini-btn inline-flex items-center gap-1.5" onClick={() => onEdit(row)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button className="mini-btn inline-flex items-center gap-1.5 text-red-700 hover:border-red-200 hover:bg-red-50" onClick={() => onDelete(row)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
            </div>
        </article>
    );
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
        facebook: row.facebook_post_id ? 'Posted' : row.publish_to_facebook ? 'Queued' : 'Off',
    };
}

function AnnouncementFormModal({ open, row, barangays, onClose, onSaved }) {
    const [form, setForm] = useState(defaultAnnouncement());
    const [previewUrl, setPreviewUrl] = useState('');
    const editing = Boolean(row);

    useEffect(() => {
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
            publish_to_facebook: Boolean(row.publish_to_facebook),
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
        onClose();
        onSaved();
    }

    return (
        <Modal open={open} title={editing ? 'Edit Announcement' : 'Create Announcement'} onClose={onClose} size="lg">
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
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
                    <label className="check"><input type="checkbox" checked={form.publish_to_facebook} onChange={(event) => setForm({ ...form, publish_to_facebook: event.target.checked })} /> Publish to Facebook</label>
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
                    <button className="btn-primary">{editing ? 'Save changes' : 'Publish'}</button>
                </div>
            </form>
        </Modal>
    );
}

function defaultAnnouncement() {
    return { type: 'bulletin', title: '', body: '', publish_at: '', expires_at: '', send_push: true, publish_to_facebook: false, target_sectors: [], target_barangays: [], photo: null };
}

function toggleValue(values, value) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
