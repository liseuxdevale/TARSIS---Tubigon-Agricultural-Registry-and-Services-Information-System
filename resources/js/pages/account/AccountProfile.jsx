import React, { useEffect, useState } from 'react';
import { Camera, Edit3, History, IdCard, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, Field, InfoRow, Modal, PageHeader, PageLoader, StatusBadge } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { ROLES, roleName } from '../../utils/rbac';
import DigitalID from '../registration/DigitalID';

export default function AccountProfile() {
    const { user } = useAuth();
    const isFarmer = user?.role === ROLES.FARMER;
    const [profile, setProfile] = useState(null);
    const [digitalId, setDigitalId] = useState(null);
    const [account, setAccount] = useState(user);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(isFarmer);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [editingAccount, setEditingAccount] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setAccount(user);
    }, [user]);

    useEffect(() => {
        let active = true;
        api.get('/auth/activity?limit=5')
            .then((response) => {
                if (active) setActivity(response.data || []);
            })
            .catch(() => {
                if (active) setActivity([]);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!isFarmer) return undefined;
        let active = true;

        async function loadProfile() {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/tracking/me');
                const registrant = response.data.registrant || null;
                if (!active) return;
                setProfile(registrant);

                if (registrant) {
                    const idResponse = await api.get(`/registrants/${registrant.id}/digital-id`);
                    if (active) setDigitalId(idResponse.data);
                }
            } catch (exception) {
                if (active) setError(exception.message || 'Unable to load your registry profile.');
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, [isFarmer]);

    async function uploadAvatar(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        setError('');
        try {
            const payload = new FormData();
            payload.append('avatar', file);
            const response = await api.post('/auth/avatar', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            setAccount(response.data);
        } catch (exception) {
            setError(exception.message || 'Unable to upload profile photo.');
        } finally {
            setUploadingAvatar(false);
        }
    }

    return (
        <section className="space-y-4">
            <PageHeader title="Profile" description="View your TARSIS account details and linked registry profile." />
            <Card
                title="Account Profile"
                actions={(
                    <button className="mini-btn inline-flex items-center gap-1.5" type="button" onClick={() => setEditingAccount(true)}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                    </button>
                )}
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <label className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-emerald-100 text-[#1a4731]">
                            {account?.avatar_url ? (
                                <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserRound className="h-7 w-7" aria-hidden="true" />
                            )}
                            <span className="absolute inset-0 hidden items-center justify-center bg-slate-950/45 text-white group-hover:flex">
                                <Camera className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={uploadAvatar} />
                        </label>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-950">{account?.name || 'TARSIS user'}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{account?.email || 'Signed-in account'}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{uploadingAvatar ? 'Uploading photo...' : 'Click photo to upload JPG, PNG, or WEBP up to 2 MB.'}</p>
                        </div>
                    </div>
                    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
                    <div className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
                        <AccountInfoRow label="Full Name" value={account?.name} />
                        <AccountInfoRow label="Email Address" value={account?.email} />
                        <AccountInfoRow label="Mobile Number" value={account?.phone} />
                        <AccountInfoRow label="Account Role" value={roleName(account)} />
                        <AccountInfoRow label="Office/Department" value={account?.office_department} />
                        <AccountInfoRow label="Date Account Created" value={formatDateTime(account?.created_at)} />
                        <AccountInfoRow label="Last Login" value={formatDateTime(account?.last_login_at)} />
                    </div>
                </div>
            </Card>
            <EditAccountModal
                open={editingAccount}
                account={account}
                onClose={() => setEditingAccount(false)}
                onSaved={setAccount}
                setError={setError}
            />
            <Card title="Recent Activity">
                <div className="space-y-3">
                    {activity.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            <History className="mt-0.5 h-4 w-4 text-[#1a4731]" aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-950">{String(item.action || '').replaceAll('_', ' ')}</p>
                                <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                            </div>
                        </div>
                    ))}
                    {!activity.length && <p className="text-sm text-slate-500">No recent activity found.</p>}
                    {account?.role === ROLES.SUPER_ADMIN && <Link className="btn-secondary inline-flex" to="/admin/audit-logs">View all activity</Link>}
                </div>
            </Card>

            {isFarmer && (
                loading ? (
                    <PageLoader />
                ) : error ? (
                    <EmptyState title="Registry profile unavailable" detail={error} />
                ) : profile ? (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
                        <Card title="Linked Registry Profile">
                            <div className="space-y-2 text-sm">
                                <InfoRow label="Registry Number" value={<span className="font-bold text-slate-950">{profile.registry_number}</span>} />
                                <InfoRow label="Name" value={profile.full_name} />
                                <InfoRow label="Status" value={<StatusBadge status={profile.status} />} />
                                <InfoRow label="Barangay" value={profile.barangay?.name} />
                                <InfoRow label="Sector" value={profile.sector} />
                                <InfoRow label="Farm Location" value={profile.farm_location} />
                            </div>
                        </Card>
                        <Card title="Digital ID / QR Code">
                            <DigitalID registrant={profile} digitalId={digitalId} />
                        </Card>
                    </div>
                ) : (
                    <Card title="Linked Registry Profile">
                        <div className="flex items-start gap-3">
                            <IdCard className="mt-1 h-5 w-5 text-[#1a4731]" />
                            <div>
                                <p className="font-semibold text-slate-950">No linked registry profile</p>
                                <p className="mt-1 text-sm text-slate-600">Use the same email address on your RSBSA registration so TARSIS can show your registry profile and digital ID here.</p>
                                <Link className="btn-primary mt-4 inline-flex" to="/registration">Open Registration</Link>
                            </div>
                        </div>
                    </Card>
                )
            )}
        </section>
    );
}

function AccountInfoRow({ label, value }) {
    return (
        <p className="grid gap-2 break-words text-sm sm:grid-cols-[170px_minmax(0,1fr)]">
            <span className="font-medium leading-6 text-slate-500">{label}</span>
            <span className="min-w-0 leading-6 text-slate-950">{value || 'Not set'}</span>
        </p>
    );
}

function EditAccountModal({ open, account, onClose, onSaved, setError }) {
    const [form, setForm] = useState({ name: '', phone: '', office_department: '' });
    const [saving, setSaving] = useState(false);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!open) return;
        setForm({
            name: account?.name || '',
            phone: account?.phone || '',
            office_department: account?.office_department || '',
        });
        setLocalError('');
    }, [account, open]);

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setLocalError('');
        setError('');
        try {
            const response = await api.put('/auth/profile', form);
            onSaved(response.data);
            onClose();
        } catch (exception) {
            setLocalError(exception.message || 'Unable to update profile.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal open={open} title="Edit Account Profile" onClose={onClose}>
            <form className="space-y-3" onSubmit={submit}>
                <Field label="Full Name">
                    <input required className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </Field>
                <Field label="Mobile Number">
                    <input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09170000001" />
                </Field>
                <Field label="Office/Department">
                    <input className="field" value={form.office_department} onChange={(event) => setForm({ ...form, office_department: event.target.value })} />
                </Field>
                {localError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{localError}</p>}
                <div className="flex justify-end gap-2">
                    <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
                </div>
            </form>
        </Modal>
    );
}

function formatDateTime(value) {
    if (!value) return 'Not set';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}
