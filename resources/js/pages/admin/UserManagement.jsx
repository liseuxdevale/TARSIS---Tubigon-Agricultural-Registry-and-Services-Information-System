import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Download, Edit3, Eye, KeyRound, MoreVertical, Search, ShieldCheck, Trash2, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import { Card, Field, InfoRow, Modal, PageHeader, PageLoader, StatusBadge } from '../../components/common';
import { roles } from '../../constants/options';
import { api } from '../../services/api';
import { formatDate } from '../../utils/format';

const roleLabels = {
    super_admin: 'Super Administrator',
    mao_staff: 'MAO Administrator',
    barangay_technical_staff: 'Barangay Technical Personnel',
    crop_head: 'Crop Head',
    fish_head: 'Fisheries Head',
    livestock_head: 'Livestock Head',
    poultry_head: 'Poultry Head',
    pending_staff: 'User Account',
};

const staffRoles = roles.filter((role) => ['super_admin', 'barangay_technical_staff', 'crop_head', 'fish_head', 'livestock_head', 'poultry_head'].includes(role));
const userFilterRoles = [
    ...staffRoles,
    'sector:farmer',
    'sector:fisherfolk',
    'sector:livestock',
    'sector:poultry',
];
const filterRoleLabels = {
    ...roleLabels,
    'sector:farmer': 'Crop Users',
    'sector:fisherfolk': 'Fisheries Users',
    'sector:livestock': 'Livestock Users',
    'sector:poultry': 'Poultry Users',
};
const emptyFilters = { search: '', role: '', barangay: '', status: '' };
const archiveReasons = ['Inactive Employee', 'Transferred', 'Duplicate Account', 'Resigned', 'Other'];

export default function UserManagement({ archived = false }) {
    const [users, setUsers] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, archived: 0 });
    const [meta, setMeta] = useState(null);
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');
    const [modal, setModal] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);

    async function load(nextPage = page) {
        setLoading(true);
        const params = new URLSearchParams({ page: nextPage, per_page: perPage, archived: archived ? '1' : '0' });
        Object.entries(appliedFilters).forEach(([key, value]) => value && params.set(key, value));
        const [userResult, barangayResult, statResult] = await Promise.all([
            api.get(`/users?${params.toString()}`),
            api.get('/barangays?all=1'),
            api.get('/users/stats'),
        ]);
        setUsers(userResult.data.data || []);
        setMeta(userResult.data);
        setBarangays(Array.isArray(barangayResult.data) ? barangayResult.data : barangayResult.data.data || []);
        setStats(statResult.data || {});
        setLoading(false);
    }

    useEffect(() => { load(page); }, [page, perPage, appliedFilters, archived]);

    function applyFilters(event) {
        event?.preventDefault();
        setPage(1);
        setAppliedFilters(filters);
    }

    function clearFilters() {
        setFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setPage(1);
    }

    async function runAction(action, payload = {}) {
        const user = modal?.user;
        if (!user) return;
        if (action === 'reset') await api.post(`/users/${user.id}/reset-password`, payload);
        if (action === 'activate') await api.post(`/users/${user.id}/activate`, {});
        if (action === 'deactivate') await api.post(`/users/${user.id}/deactivate`, {});
        if (action === 'archive') await api.post(`/users/${user.id}/archive`, payload);
        if (action === 'restore') await api.post(`/users/${user.id}/restore`, {});
        if (action === 'delete') await api.delete(`/users/${user.id}`);
        setToast(actionToast(action));
        setModal(null);
        load(page);
    }

    const title = archived ? 'Archived Users' : 'User Management';
    const description = archived
        ? 'Review archived administrator accounts, restore valid accounts, or permanently delete records.'
        : 'Manage administrator accounts, assign roles, control access, and monitor user activity.';

    return (
        <section className="space-y-4">
            <PageHeader
                title={title}
                description={description}
                actions={!archived && (
                    <>
                        <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => exportCsv(users)}><Download className="h-4 w-4" />Export CSV</button>
                        <button className="btn-primary inline-flex items-center gap-2" type="button" onClick={() => setModal({ type: 'create' })}><UserPlus className="h-4 w-4" />Create User</button>
                    </>
                )}
            />
            {toast && <Card><p className="text-sm font-semibold text-emerald-700">{toast}</p></Card>}
            {!archived && <StatsCards stats={stats} />}
            <Card>
                <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" onSubmit={applyFilters}>
                    <Field label="Search"><input className="field" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Name, email, or phone number" /></Field>
                    <Field label="Role"><RoleSelect value={filters.role} onChange={(role) => setFilters({ ...filters, role })} allLabel="All Roles" options={userFilterRoles} labels={filterRoleLabels} /></Field>
                    <Field label="Barangay"><BarangaySelect barangays={barangays} value={filters.barangay} onChange={(barangay) => setFilters({ ...filters, barangay })} /></Field>
                    <Field label="Status"><StatusSelect archived={archived} value={filters.status} onChange={(status) => setFilters({ ...filters, status })} /></Field>
                    <div className="flex items-end gap-2">
                        <button className="btn-primary inline-flex items-center gap-2" type="submit"><Search className="h-4 w-4" />Search</button>
                        <button className="btn-secondary" type="button" onClick={clearFilters}>Clear Filters</button>
                    </div>
                </form>
            </Card>
            <Card title={title} actions={<PageSize value={perPage} onChange={setPerPage} />}>
                {loading ? <PageLoader compact /> : (
                    <>
                        <UserTable users={users} archived={archived} openMenu={openMenu} setOpenMenu={setOpenMenu} setModal={setModal} />
                        <PaginationBar meta={meta} perPage={perPage} setPage={setPage} />
                    </>
                )}
            </Card>
            <UserModals modal={modal} setModal={setModal} barangays={barangays} onSaved={() => { setToast('User saved successfully.'); load(page); }} runAction={runAction} archived={archived} />
        </section>
    );
}

function StatsCards({ stats }) {
    const cards = [
        ['Total Users', stats.total, 'Registered administrator accounts', Users],
        ['Active Users', stats.active, 'Accounts with current access', UserCheck],
        ['Inactive Users', stats.inactive, 'Accounts without active access', UserX],
        ['Archived Users', stats.archived, 'Accounts moved to archive', Archive],
    ];
    return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, Icon]) => (
        <div key={label} className="surface flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
            <span><span className="block text-xs font-bold uppercase text-gray-500">{label}</span><span className="block text-2xl font-bold text-gray-900">{value || 0}</span><span className="text-xs text-gray-500">{detail}</span></span>
        </div>
    ))}</div>;
}

function UserTable({ users, archived, openMenu, setOpenMenu, setModal }) {
    if (!users.length) return <EmptyUsers archived={archived} />;
    return (
        <>
            <div className="hidden overflow-x-auto rounded-lg border border-gray-100 lg:block">
                <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead className="bg-emerald-50/70 text-xs uppercase text-gray-500">
                        <tr>{['Profile', 'Name', 'Email', 'Phone', 'Role', 'Assigned Barangay', 'Status', 'Last Login', 'Actions'].map((column) => <th key={column} className="px-4 py-3 font-bold">{column}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => <UserRow key={user.id} user={user} archived={archived} openMenu={openMenu} setOpenMenu={setOpenMenu} setModal={setModal} />)}
                    </tbody>
                </table>
            </div>
            <div className="grid gap-3 lg:hidden">{users.map((user) => <MobileUserCard key={user.id} user={user} archived={archived} setModal={setModal} />)}</div>
        </>
    );
}

function UserRow({ user, archived, openMenu, setOpenMenu, setModal }) {
    return (
        <tr className="hover:bg-emerald-50/30">
            <td className="px-4 py-3"><Avatar user={user} /></td>
            <td className="px-4 py-3 font-semibold text-gray-900">{user.name}<p className="text-xs font-medium text-gray-400">@{user.username || emailUsername(user.email)}</p></td>
            <td className="px-4 py-3 text-gray-600">{user.email}</td>
            <td className="px-4 py-3 text-gray-600">{user.phone || 'Not set'}</td>
            <td className="px-4 py-3 text-gray-700">{roleLabel(user.role)}</td>
            <td className="px-4 py-3 text-gray-600">{barangayNames(user)}</td>
            <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
            <td className="px-4 py-3 text-gray-600">{lastLogin(user.last_login_at)}</td>
            <td className="relative px-4 py-3">
                <button className="mini-btn" type="button" onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)} aria-label={`Actions for ${user.name}`}><MoreVertical className="h-4 w-4" /></button>
                {openMenu === user.id && <ActionMenu user={user} archived={archived} setModal={setModal} onClose={() => setOpenMenu(null)} />}
            </td>
        </tr>
    );
}

function MobileUserCard({ user, archived, setModal }) {
    return (
        <details className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3"><Avatar user={user} /><span><span className="block font-bold text-gray-900">{user.name}</span><span className="text-xs text-gray-500">{roleLabel(user.role)}</span></span></span>
                <StatusBadge status={user.status} />
            </summary>
            <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3 text-sm">
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label="Barangay" value={barangayNames(user)} />
                <InfoRow label="Last Login" value={lastLogin(user.last_login_at)} />
                <div className="flex flex-wrap gap-2 pt-2"><InlineActions user={user} archived={archived} setModal={setModal} /></div>
            </div>
        </details>
    );
}

function ActionMenu({ user, archived, setModal, onClose }) {
    return <div className="absolute right-4 z-20 mt-2 w-48 rounded-lg border border-gray-100 bg-white p-1 shadow-xl">{menuActions(user, archived).map(([type, label, Icon, danger]) => (
        <button key={type} type="button" className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-gray-50 ${danger ? 'text-red-700' : 'text-gray-700'}`} onClick={() => { setModal({ type, user }); onClose(); }}>
            <Icon className="h-4 w-4" />{label}
        </button>
    ))}</div>;
}

function InlineActions({ user, archived, setModal }) {
    return menuActions(user, archived).slice(0, 4).map(([type, label, Icon]) => <button key={type} className="mini-btn inline-flex items-center gap-1.5" type="button" onClick={() => setModal({ type, user })}><Icon className="h-3.5 w-3.5" />{label}</button>);
}

function menuActions(user, archived) {
    if (archived) return [['view', 'View Profile', Eye], ['restore', 'Restore', ArchiveRestore], ['delete', 'Delete Permanently', Trash2, true]];
    return [['view', 'View Profile', Eye], ['edit', 'Edit User', Edit3], ['reset', 'Reset Password', KeyRound], [user.status === 'active' ? 'deactivate' : 'activate', user.status === 'active' ? 'Deactivate' : 'Activate', user.status === 'active' ? UserX : UserCheck], ['archive', 'Archive', Archive, true], ['delete', 'Delete Permanently', Trash2, true]];
}

function UserModals({ modal, setModal, barangays, onSaved, runAction, archived }) {
    if (!modal) return null;
    if (modal.type === 'create' || modal.type === 'edit') return <UserFormModal modal={modal} barangays={barangays} onClose={() => setModal(null)} onSaved={onSaved} />;
    if (modal.type === 'view') return <ProfileModal user={modal.user} archived={archived} setModal={setModal} />;
    if (modal.type === 'reset') return <ResetModal user={modal.user} onClose={() => setModal(null)} onConfirm={(password) => runAction('reset', { password })} />;
    if (modal.type === 'archive') return <ArchiveModal user={modal.user} onClose={() => setModal(null)} onConfirm={(payload) => runAction('archive', payload)} />;
    return <ConfirmModal type={modal.type} user={modal.user} onClose={() => setModal(null)} onConfirm={() => runAction(modal.type)} />;
}

function UserFormModal({ modal, barangays, onClose, onSaved }) {
    const editing = modal.type === 'edit';
    const user = modal.user || {};
    const parts = splitName(user.name);
    const [form, setForm] = useState({ first_name: parts.first, middle_name: user.middle_name || parts.middle, last_name: parts.last, email: user.email || '', phone: user.phone || '', office_department: user.office_department || '', username: user.username || '', password: '', password_confirmation: '', role: user.role || 'barangay_technical_staff', barangay_scope: userBarangays(user).length ? 'selected' : 'municipal', barangay_ids: userBarangays(user).map((barangay) => String(barangay.id)), status: user.status || 'active' });
    const [error, setError] = useState('');

    async function submit(event) {
        event.preventDefault();
        setError('');
        if (!editing && form.password !== form.password_confirmation) return setError('Password confirmation does not match.');
        const payload = {
            name: [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' '),
            middle_name: form.middle_name || null,
            email: form.email,
            phone: form.phone,
            office_department: form.office_department,
            role: form.role,
            status: form.status,
            barangay_ids: form.barangay_scope === 'selected' ? form.barangay_ids.map(Number) : [],
        };
        if (!editing) {
            payload.username = form.username;
            payload.password = form.password;
        }
        await api[editing ? 'put' : 'post'](editing ? `/users/${user.id}` : '/users', payload);
        onClose();
        onSaved();
    }

    return (
        <Modal open title={editing ? 'Edit User' : 'Create User'} onClose={onClose} size="lg">
            <form className="space-y-5" onSubmit={submit}>
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
                <FormSection title="Personal Information"><Field label="First Name"><input required className="field" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></Field><Field label="Middle Name"><input className="field" value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} /></Field><Field label="Last Name"><input required className="field" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></Field><Field label="Email"><input required type="email" className="field" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Phone Number"><input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field><Field label="Office/Department"><input className="field" value={form.office_department} onChange={(event) => setForm({ ...form, office_department: event.target.value })} /></Field></FormSection>
                {!editing && <FormSection title="Account"><Field label="Username"><input required className="field" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field><Field label="Password"><input required type="password" minLength={8} className="field" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field><Field label="Confirm Password"><input required type="password" minLength={8} className="field" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /></Field></FormSection>}
            <FormSection title="Role"><Field label="Role"><RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} options={staffRoles} labels={roleLabels} /></Field><Field label="Assigned Barangays"><select className="field" value={form.barangay_scope} onChange={(event) => setForm({ ...form, barangay_scope: event.target.value })}><option value="municipal">Municipal-wide</option><option value="selected">One or multiple barangays</option></select></Field>{form.barangay_scope === 'selected' && <Field label="Barangays" wide><BarangayChecklist barangays={barangays} selected={form.barangay_ids} onChange={(barangay_ids) => setForm({ ...form, barangay_ids })} /></Field>}<Field label="Status"><select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field></FormSection>
                <div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit">{editing ? 'Save Changes' : 'Create User'}</button></div>
            </form>
        </Modal>
    );
}

function ProfileModal({ user, archived, setModal }) {
    return (
        <Modal open title="User Profile" onClose={() => setModal(null)} size="lg">
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Avatar user={user} large />
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{roleLabel(user.role)}</p>
                    </div>
                </div>
                <div className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
                    <UserProfileInfoRow label="Email Address" value={user.email} />
                    <UserProfileInfoRow label="Phone" value={user.phone} />
                    <UserProfileInfoRow label="Office/Department" value={user.office_department} />
                    <UserProfileInfoRow label="Role" value={roleLabel(user.role)} />
                    <UserProfileInfoRow label="Assigned Barangays" value={barangayNames(user)} />
                    <UserProfileInfoRow label="Account Status" value={<StatusBadge status={user.status} />} />
                    <UserProfileInfoRow label="Created Date" value={formatDate(user.created_at)} />
                    <UserProfileInfoRow label="Last Login" value={lastLogin(user.last_login_at)} />
                    <UserProfileInfoRow label="Created By" value={user.created_by?.name} />
                    {archived && <UserProfileInfoRow label="Archived Date" value={formatDate(user.archived_at)} />}
                    {archived && <UserProfileInfoRow label="Archived By" value={user.archived_by?.name} />}
                    {archived && <UserProfileInfoRow label="Reason" value={[user.archive_reason, user.archive_reason_details].filter(Boolean).join(': ')} />}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {!archived && (
                        <button className="btn-secondary inline-flex items-center gap-1.5" type="button" onClick={() => setModal({ type: 'edit', user })}>
                            <Edit3 className="h-4 w-4" />
                            Edit User
                        </button>
                    )}
                    <ProfileModalActions user={user} archived={archived} setModal={setModal} />
                    <button className="btn-secondary" type="button" onClick={() => setModal(null)}>Close</button>
                </div>
            </div>
        </Modal>
    );
}

function ProfileModalActions({ user, archived, setModal }) {
    const hidden = archived ? ['view'] : ['view', 'edit'];
    return menuActions(user, archived)
        .filter(([type]) => !hidden.includes(type))
        .slice(0, 3)
        .map(([type, label, Icon]) => (
            <button key={type} className="mini-btn inline-flex items-center gap-1.5" type="button" onClick={() => setModal({ type, user })}>
                <Icon className="h-3.5 w-3.5" />
                {label}
            </button>
        ));
}

function UserProfileInfoRow({ label, value }) {
    return (
        <p className="grid gap-2 break-words sm:grid-cols-[160px_minmax(0,1fr)]">
            <span className="font-medium leading-6 text-slate-500">{label}</span>
            <span className="min-w-0 leading-6 text-slate-950">{value || 'Not set'}</span>
        </p>
    );
}

function ResetModal({ user, onClose, onConfirm }) {
    const [password, setPassword] = useState('');
    return <Modal open title="Reset Password" onClose={onClose}><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onConfirm(password); }}><p className="text-sm text-gray-600">Reset password for <strong>{user.name}</strong>.</p><Field label="New Password"><input required minLength={8} type="password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} /></Field><div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit">Reset Password</button></div></form></Modal>;
}

function ArchiveModal({ user, onClose, onConfirm }) {
    const [reason, setReason] = useState('Inactive Employee');
    const [reasonDetails, setReasonDetails] = useState('');
    return <Modal open title="Archive User" onClose={onClose}><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onConfirm({ reason, reason_details: reasonDetails }); }}><p className="text-sm text-gray-600"><strong>{user.name}</strong> will be removed from User Management and moved to Archived Users.</p><Field label="Reason"><select className="field" value={reason} onChange={(event) => setReason(event.target.value)}>{archiveReasons.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>{reason === 'Other' && <Field label="Details"><textarea required className="field min-h-24" value={reasonDetails} onChange={(event) => setReasonDetails(event.target.value)} /></Field>}<div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="submit">Archive</button></div></form></Modal>;
}

function ConfirmModal({ type, user, onClose, onConfirm }) {
    const deleting = type === 'delete';
    return <Modal open title={deleting ? 'Delete User Permanently' : `${labelForAction(type)} User`} onClose={onClose}><div className="space-y-4"><p className="text-sm text-gray-600">{deleting ? 'This action cannot be undone.' : `Confirm ${labelForAction(type).toLowerCase()} for ${user.name}.`}</p><div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" type="button" onClick={onConfirm}>{deleting ? 'Delete Permanently' : labelForAction(type)}</button></div></div></Modal>;
}

function FormSection({ title, children }) {
    return <section><h4 className="mb-3 text-sm font-bold text-gray-900">{title}</h4><div className="grid gap-3 md:grid-cols-2">{children}</div></section>;
}

function RoleSelect({ value, onChange, allLabel, options = staffRoles, labels = roleLabels }) {
    return <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>{allLabel && <option value="">{allLabel}</option>}{options.map((role) => <option key={role} value={role}>{labels[role] || roleLabel(role)}</option>)}</select>;
}

function BarangaySelect({ barangays, value, onChange }) {
    return <select className="field" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All Barangays</option><option value="municipal">Municipal-wide</option>{barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}</select>;
}

function StatusSelect({ archived, value, onChange }) {
    const options = archived ? ['archived'] : ['active', 'inactive'];
    return <select className="field" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>;
}

function PageSize({ value, onChange }) {
    return <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">Show<select className="field w-24" value={value} onChange={(event) => onChange(Number(event.target.value))}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>;
}

function PaginationBar({ meta, setPage }) {
    if (!meta) return null;
    const from = meta.from || 0;
    const to = meta.to || 0;
    return <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between"><p>Showing {from}-{to} of {meta.total || 0} users</p><div className="flex gap-2"><button className="mini-btn" disabled={meta.current_page <= 1} onClick={() => setPage(meta.current_page - 1)}>Previous</button><span className="px-2 py-1 font-semibold">Page {meta.current_page || 1} of {meta.last_page || 1}</span><button className="mini-btn" disabled={meta.current_page >= meta.last_page} onClick={() => setPage(meta.current_page + 1)}>Next</button></div></div>;
}

function BarangayChecklist({ barangays, selected, onChange }) {
    const ids = selected.map(String);
    return <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2"><div className="mb-2 flex justify-between text-xs font-semibold text-gray-500"><span>{ids.length} selected</span><button className="mini-btn" type="button" onClick={() => onChange([])}>Clear</button></div><div className="grid gap-1 sm:grid-cols-2">{barangays.map((barangay) => <label key={barangay.id} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={ids.includes(String(barangay.id))} onChange={() => onChange(ids.includes(String(barangay.id)) ? ids.filter((id) => id !== String(barangay.id)) : [...ids, String(barangay.id)])} />{barangay.name}</label>)}</div></div>;
}

function Avatar({ user, large = false }) {
    return <span className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800 ${large ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-xs'}`}>{initials(user.name)}</span>;
}

function EmptyUsers({ archived }) {
    return <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-10 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Users className="h-7 w-7" /></div><h3 className="text-lg font-bold text-gray-900">No users found.</h3><p className="mt-1 text-sm text-gray-500">{archived ? 'Archived administrator accounts will appear here.' : 'Create a new administrator account to get started.'}</p></div>;
}

function userBarangays(user) {
    if (Array.isArray(user?.barangays) && user.barangays.length) return user.barangays;
    return user?.barangay ? [user.barangay] : [];
}
function barangayNames(user) { return userBarangays(user).map((barangay) => barangay.name).join(', ') || 'Municipal-wide'; }
function roleLabel(role) { return roleLabels[role] || String(role || 'Not set').replaceAll('_', ' '); }
function initials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'; }
function emailUsername(email = '') { return email.split('@')[0] || 'user'; }
function splitName(name = '') { const parts = name.split(' ').filter(Boolean); return { first: parts[0] || '', middle: parts.length > 2 ? parts.slice(1, -1).join(' ') : '', last: parts.length > 1 ? parts[parts.length - 1] : '' }; }
function lastLogin(value) {
    if (!value) return 'Never Logged In';
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(value).setHours(0, 0, 0, 0)) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}
function labelForAction(type) { return ({ activate: 'Activate', deactivate: 'Deactivate', restore: 'Restore' })[type] || type; }
function actionToast(action) { return ({ reset: 'Password reset successfully.', activate: 'User activated successfully.', deactivate: 'User deactivated successfully.', archive: 'User archived successfully.', restore: 'User restored successfully.', delete: 'User permanently deleted.' })[action] || 'Action completed.'; }
function exportCsv(users) {
    const rows = [['Name', 'Email', 'Phone', 'Role', 'Assigned Barangay', 'Status', 'Last Login'], ...users.map((user) => [user.name, user.email, user.phone || '', roleLabel(user.role), barangayNames(user), user.status, lastLogin(user.last_login_at)])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tarsis-users.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}
