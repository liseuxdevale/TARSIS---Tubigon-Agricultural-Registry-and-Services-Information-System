import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { ActionGroup, Card, DataTable, Field, Modal, PageHeader, Select, StatCard, StatusBadge } from '../../components/common';
import LeafletMap from '../../components/maps/LeafletMap';
import { useAuth } from '../../contexts/AuthContext';
import { api, downloadCsv } from '../../services/api';
import { dateInputValue } from '../../utils/format';
import { assignedBarangayIds, can, isBarangayScoped, roleSector, ROLES } from '../../utils/rbac';

const sectorLabels = {
    farmer: 'Crop',
    fisherfolk: 'Fishery',
    livestock: 'Livestock',
    poultry: 'Poultry',
};

export default function BarangayCoverage() {
    const { user } = useAuth();
    const [barangays, setBarangays] = useState([]);
    const [selected, setSelected] = useState(null);
    const [assignment, setAssignment] = useState(null);

    async function load() {
        const response = await api.get('/barangays/scoped?all=1');
        const allRows = Array.isArray(response.data) ? response.data : response.data.data || [];
        const scopedIds = assignedBarangayIds(user);
        const rows = isBarangayScoped(user) ? allRows.filter((row) => scopedIds.includes(Number(row.id))) : allRows;
        setBarangays(rows);
        setSelected((current) => current || rows[0]);
    }

    useEffect(() => {
        load();
    }, []);

    const total = barangays.reduce((sum, row) => sum + Number(row.registrants_count || 0), 0);
    const underserved = barangays.filter((row) => row.is_underserved).length;

    const canManage = can(user, 'manageBarangays');
    const canEditSchedule = user?.role === ROLES.SUPER_ADMIN;
    const scoped = isBarangayScoped(user);
    const sectorLabel = sectorLabels[roleSector(user)];

    return (
        <section className="space-y-5">
            <PageHeader
                title={scoped ? 'Assigned Barangay Schedules' : 'Barangay Coverage and Mapping'}
                description={scoped ? 'Schedules, staff assignments, registration targets, and MAO details for your assigned barangays.' : sectorLabel ? `Barangay ranking and counts for ${sectorLabel.toLowerCase()} registrants only.` : 'Coverage map, registration counts, barangay assistant/staff assignment, operating hours, and barangay-level export.'}
                actions={canManage && <ActionGroup><button className="btn-secondary" onClick={() => downloadCsv('/barangays/export', 'tarsis-barangays.csv')}>Export CSV</button></ActionGroup>}
            />
            <div className="grid gap-3 md:grid-cols-3">
                <StatCard label="Barangays" value={barangays.length} />
                <StatCard label={sectorLabel ? `${sectorLabel} Registrants` : 'Registrants'} value={total} tone="green" />
                <StatCard label="Underserved" value={underserved} tone="amber" />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_460px]">
                <Card title="Coverage Map"><LeafletMap barangays={barangays} selected={selected} onSelect={setSelected} className="min-h-[720px]" /></Card>
                <Card title="Barangay Coverage">
                    <div className="max-h-[560px] overflow-y-auto overscroll-contain rounded-2xl lg:max-h-[720px]">
                        <DataTable
                            compact
                            columns={canEditSchedule ? ['Barangay', sectorLabel ? `${sectorLabel} Count` : 'Count', 'Status', 'Assistant/Staff', 'Actions'] : ['Barangay', sectorLabel ? `${sectorLabel} Count` : 'Count', 'Status', 'Assistant/Staff']}
                            rows={barangays.map((row) => {
                                const hours = row.open_time && row.close_time ? `${formatTime12(row.open_time)} - ${formatTime12(row.close_time)}` : 'Manual';
                                const cells = [row.name, row.registrants_count ?? 0, <StatusBadge status={row.enrollment_status} />, `${row.assigned_technical_personnel || 'Unassigned'} (${hours})`];
                                return canEditSchedule ? [...cells, <button className="mini-btn" onClick={() => setAssignment(row)}>Edit</button>] : cells;
                            })}
                        />
                    </div>
                </Card>
            </div>
            {canEditSchedule && <AssignmentModal row={assignment} onClose={() => setAssignment(null)} onSaved={load} />}
        </section>
    );
}

function AssignmentModal({ row, onClose, onSaved }) {
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const scheduleError = getScheduleError(form.open_time, form.close_time);

    useEffect(() => {
        if (row) {
            setError('');
            setForm({
                assigned_technical_personnel: row.assigned_technical_personnel || '',
                enrollment_schedule: dateInputValue(row.enrollment_schedule),
                enrollment_status: row.enrollment_status || 'open',
                open_time: normalizeTimeValue(row.open_time),
                close_time: normalizeTimeValue(row.close_time),
                mao_office_details: row.mao_office_details || '',
            });
        }
    }, [row]);

    async function submit(event) {
        event.preventDefault();
        if (scheduleError) {
            setError(scheduleError);
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.put(`/barangays/${row.id}`, form);
            onClose();
            await onSaved();
        } catch (err) {
            setError(err.message || 'Schedule could not be saved.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal open={Boolean(row)} title={`Edit Barangay Schedule${row ? ` - ${row.name}` : ''}`} onClose={onClose}>
            {row && (
                <form onSubmit={submit} className="space-y-3">
                    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p>}
                    <Field label="Assistant/Staff Name"><input className="field" value={form.assigned_technical_personnel || ''} onChange={(event) => setForm({ ...form, assigned_technical_personnel: event.target.value })} /></Field>
                    <Field label="Enrollment Schedule"><input type="date" className="field" value={form.enrollment_schedule || ''} onChange={(event) => setForm({ ...form, enrollment_schedule: event.target.value })} /></Field>
                    <Field label="Enrollment Status"><Select value={form.enrollment_status} options={['open', 'closed']} onChange={(value) => setForm({ ...form, enrollment_status: value })} /></Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Open Time"><TimePicker value={form.open_time || ''} onChange={(value) => setForm({ ...form, open_time: value })} /></Field>
                        <Field label="Close Time"><TimePicker value={form.close_time || ''} onChange={(value) => setForm({ ...form, close_time: value })} /></Field>
                    </div>
                    {scheduleError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{scheduleError}</p>}
                    <p className="text-xs text-slate-500">If open and close times are set, the barangay status automatically becomes open only within those hours.</p>
                    <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : 'Save schedule'}</button>
                </form>
            )}
        </Modal>
    );
}

function TimePicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState({});
    const [mode, setMode] = useState('hour');
    const rootRef = useRef(null);
    const popoverRef = useRef(null);
    const modeTimerRef = useRef(null);
    const { hour12, minute, period } = timeParts(value);
    const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
    const minutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
    const clockValues = mode === 'hour' ? hours : minutes;

    useEffect(() => {
        if (!open) return undefined;

        function updatePopoverPosition() {
            const rect = rootRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportWidth = window.visualViewport?.width || window.innerWidth;
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const width = Math.min(304, viewportWidth - 32);
            const estimatedHeight = 296;
            const gap = 8;
            const left = Math.min(Math.max(16, rect.left), viewportWidth - width - 16);
            const top = viewportHeight - rect.bottom < estimatedHeight + gap
                ? Math.max(16, rect.top - estimatedHeight - gap)
                : rect.bottom + gap;

            setPopoverStyle({ left, top, width });
        }

        updatePopoverPosition();

        function handlePointerDown(event) {
            if (!rootRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false);
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') setOpen(false);
        }

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', updatePopoverPosition);
        window.addEventListener('scroll', updatePopoverPosition, true);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', updatePopoverPosition);
            window.removeEventListener('scroll', updatePopoverPosition, true);
        };
    }, [open]);

    useEffect(() => () => {
        if (modeTimerRef.current) window.clearTimeout(modeTimerRef.current);
    }, []);

    function update(next) {
        const parts = { hour12, minute, period, ...next };
        onChange(toTime24(Number(parts.hour12), parts.minute, parts.period));
    }

    function selectClockValue(item) {
        if (mode === 'hour') {
            update({ hour12: item });
            if (modeTimerRef.current) window.clearTimeout(modeTimerRef.current);
            modeTimerRef.current = window.setTimeout(() => setMode('minute'), 250);
            return;
        }

        update({ minute: item });
    }

    return (
        <div className="relative" ref={rootRef}>
            <button type="button" className="field flex items-center justify-between gap-3 text-left" onClick={() => { setMode('hour'); setOpen((current) => !current); }}>
                <span>{formatTime12(value || toTime24(hour12, minute, period))}</span>
                <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </button>
            {open && createPortal((
                <div ref={popoverRef} className="fixed z-[2100] rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/15" style={popoverStyle}>
                    <div className="relative mx-auto h-40 w-40 rounded-full border-2 border-emerald-700 bg-emerald-50">
                        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-800" />
                        {clockValues.map((item, index) => {
                            const selected = mode === 'hour' ? hour12 === Number(item) : minute === item;
                            const angle = ((index + 1) / 12) * 360 - 90;
                            const radius = 62;
                            const x = 80 + radius * Math.cos(angle * Math.PI / 180);
                            const y = 80 + radius * Math.sin(angle * Math.PI / 180);
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold transition ${selected ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}
                                    style={{ left: x, top: y }}
                                    onClick={() => selectClockValue(item)}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-300 bg-white">
                        {['AM', 'PM'].map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={`min-h-10 px-3 text-sm font-bold transition ${period === item ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                onClick={() => update({ period: item })}
                                aria-pressed={period === item}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                    <button type="button" className="btn-primary mt-3 min-h-10 w-full" onClick={() => setOpen(false)}>Confirm Time</button>
                </div>
            ), document.body)}
        </div>
    );
}

function normalizeTimeValue(value) {
    if (!value) return '';
    const [hour = '00', minute = '00', second = '00'] = String(value).split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

function getScheduleError(openTime, closeTime) {
    if (!openTime || !closeTime) return '';
    return timeToMinutes(closeTime) > timeToMinutes(openTime)
        ? ''
        : 'Close time must be later than open time.';
}

function timeToMinutes(value) {
    const [hourValue = '0', minuteValue = '0'] = String(value).split(':');
    return Number(hourValue) * 60 + Number(minuteValue);
}

function formatTime12(value) {
    if (!value) return '';
    const [hourValue, minuteValue = '00'] = String(value).slice(0, 5).split(':');
    const hour = Number(hourValue);
    if (!Number.isFinite(hour)) return String(value);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minuteValue.padStart(2, '0')} ${period}`;
}

function timeParts(value) {
    const [hourValue, minuteValue = '00'] = String(value || '08:00').slice(0, 5).split(':');
    const hour = Number(hourValue);
    const safeHour = Number.isFinite(hour) ? hour : 8;
    const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
    return {
        hour12: safeHour % 12 || 12,
        minute: minuteOptions.includes(minuteValue) ? minuteValue : '00',
        period: safeHour >= 12 ? 'PM' : 'AM',
    };
}

function toTime24(hour12, minute, period) {
    const normalizedHour = period === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
    return `${String(normalizedHour).padStart(2, '0')}:${minute}:00`;
}
