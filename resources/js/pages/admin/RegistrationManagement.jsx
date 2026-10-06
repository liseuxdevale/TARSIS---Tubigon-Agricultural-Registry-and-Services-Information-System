import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, MoreVertical } from 'lucide-react';
import { Card, DataTable, Field, Modal, PageHeader, SearchBar, Select, StatusBadge } from '../../components/common';
import RsbsaTemplateFirstRenderer from '../../components/rsbsa/RsbsaTemplateFirstRenderer';
import {
    DEFAULT_RSBSA_CALIBRATION,
    RSBSA_CALIBRATION_STORAGE_KEY,
    normalizeRsbsaCalibration,
} from '../../components/rsbsa/officialRsbsaTemplate';
import { fishingGearTypes, registrantStatuses, sectors, ownershipTypes } from '../../constants/options';
import { api } from '../../services/api';
import { formatDate, formatJson, parseKeyValue } from '../../utils/format';
import { assignedBarangayIds, can, isBarangayScoped } from '../../utils/rbac';
import { useAuth } from '../../contexts/AuthContext';
import Profile from '../registration/Profile';
import { ownershipFieldLabel, registrantSectorLabel } from '../../utils/registrantLabels';

export default function RegistrationManagement() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [barangays, setBarangays] = useState([]);
    const [query, setQuery] = useState('');
    const [sector, setSector] = useState('');
    const [status, setStatus] = useState('');
    const [barangayId, setBarangayId] = useState('');
    const [bulkDateFrom, setBulkDateFrom] = useState('');
    const [bulkDateTo, setBulkDateTo] = useState('');
    const [bulkRows, setBulkRows] = useState([]);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkError, setBulkError] = useState('');
    const [duplicates, setDuplicates] = useState([]);
    const [modal, setModal] = useState(null);
    const [profile, setProfile] = useState(null);
    const [digitalId, setDigitalId] = useState(null);
    const [openActionMenu, setOpenActionMenu] = useState(null);

    async function load() {
        const [registrants, barangayResult] = await Promise.all([
            api.get(`/registrants?search=${encodeURIComponent(query)}&sector=${sector}&status=${status}&barangay_id=${barangayId}&per_page=50`),
            api.get('/barangays?all=1'),
        ]);
        setRows(registrants.data.data || []);
        const allBarangays = Array.isArray(barangayResult.data) ? barangayResult.data : barangayResult.data.data || [];
        const scopedIds = assignedBarangayIds(user);
        setBarangays(isBarangayScoped(user) ? allBarangays.filter((barangay) => scopedIds.includes(Number(barangay.id))) : allBarangays);
    }

    useEffect(() => {
        load();
    }, [sector, status, barangayId]);

    useEffect(() => {
        if (!openActionMenu) return undefined;

        function closeMenu() {
            setOpenActionMenu(null);
        }

        window.addEventListener('click', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [openActionMenu]);

    async function approve(row) {
        await api.post(`/registrants/${row.id}/approve`, {});
        setModal(null);
        load();
    }

    async function deactivate(row) {
        await api.post(`/registrants/${row.id}/deactivate`, {});
        setModal(null);
        load();
    }

    async function archive(row, archiveReason) {
        await api.delete(`/registrants/${row.id}`, { data: { archive_reason: archiveReason } });
        setModal(null);
        navigate('/admin/archived/registrants');
    }

    async function openProfile(row) {
        const [full, id] = await Promise.all([
            api.get(`/registrants/${row.id}`),
            api.get(`/registrants/${row.id}/digital-id`),
        ]);
        setProfile(full.data);
        setDigitalId(id.data);
    }

    async function detectDuplicates() {
        const response = await api.get('/registrants/duplicates');
        setDuplicates(response.data);
    }

    async function bulkDownloadRsbsa() {
        if (!bulkDateFrom || !bulkDateTo) {
            setBulkError('Select a date range first.');
            return;
        }

        setBulkBusy(true);
        setBulkError('');
        setBulkRows([]);
        try {
            const params = new URLSearchParams({
                date_from: bulkDateFrom,
                date_to: bulkDateTo,
                search: query,
                sector,
                status,
                barangay_id: barangayId,
            });
            const response = await api.get(`/registrants/rsbsa-bulk-download?${params.toString()}`);
            const rows = response.data.data || [];
            if (!rows.length) {
                setBulkError('No RSBSA forms found for that date range.');
                setBulkBusy(false);
                return;
            }
            setBulkRows(rows);
        } catch (error) {
            setBulkError(error.message || 'Unable to load RSBSA forms for bulk download.');
            setBulkBusy(false);
        }
    }

    useEffect(() => {
        if (!bulkRows.length) return undefined;

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                await downloadBulkRsbsaPdf(bulkDateFrom, bulkDateTo);
            } catch (error) {
                setBulkError(error.message || 'Unable to generate bulk RSBSA PDF.');
            } finally {
                setBulkRows([]);
                setBulkBusy(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [bulkRows, bulkDateFrom, bulkDateTo]);

    const canApprove = can(user, 'approveRegistrations');
    const canDetectDuplicates = canApprove;
    const scoped = isBarangayScoped(user);

    return (
        <section className="space-y-4">
            <PageHeader
                title={scoped ? 'My Assigned Barangay Registrants' : 'Registration Management'}
                description={scoped ? 'Registrants from every barangay assigned to your account.' : 'Approve, search, edit, archive, deactivate, and detect duplicate registrants.'}
            />
            <Card>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[260px_260px_220px] lg:items-end">
                    <Field label="RSBSA Date From"><input className="field" type="date" value={bulkDateFrom} onChange={(event) => setBulkDateFrom(event.target.value)} /></Field>
                    <Field label="RSBSA Date To"><input className="field" type="date" value={bulkDateTo} onChange={(event) => setBulkDateTo(event.target.value)} /></Field>
                    <button className="btn-primary gap-2 sm:col-span-2 lg:col-span-1" type="button" disabled={bulkBusy} onClick={bulkDownloadRsbsa}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {bulkBusy ? 'Generating...' : 'Download RSBSA Form'}
                    </button>
                </div>
                {bulkError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{bulkError}</p>}
                <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_180px_200px_auto_auto]">
                    <SearchBar value={query} onChange={setQuery} placeholder="Search registry, name, or phone" />
                    <Select value={sector} options={['', ...sectors]} labels={{ '': 'All sectors' }} onChange={setSector} />
                    <Select value={status} options={['', ...registrantStatuses]} labels={{ '': 'All statuses' }} onChange={setStatus} />
                    <Select
                        value={barangayId}
                        options={['', ...barangays.map((barangay) => String(barangay.id))]}
                        labels={{
                            '': 'All barangays',
                            ...Object.fromEntries(barangays.map((barangay) => [String(barangay.id), barangay.name])),
                        }}
                        onChange={setBarangayId}
                    />
                    <button className="btn-secondary" type="button" onClick={load}>Search</button>
                    {canDetectDuplicates && <button className="btn-secondary" type="button" onClick={detectDuplicates}>Duplicates</button>}
                </div>
            </Card>
            {duplicates.length > 0 && (
                <Card
                    title="Duplicate Detection"
                    actions={<button className="mini-btn" type="button" onClick={() => setDuplicates([])}>Close</button>}
                >
                    <div className="space-y-3">
                        {duplicates.map((group) => (
                            <div key={group.match} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                                <p className="font-semibold text-amber-950">{group.match} - {group.total} records</p>
                                <div className="mt-3 space-y-2">
                                    {group.records.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-2 rounded-md border border-amber-200/80 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-950">{item.registry_number} - {item.full_name}</p>
                                                <p className="text-xs text-slate-600">
                                                    {[registrantSectorLabel(item.sector), item.barangay?.name, item.status].filter(Boolean).join(' / ')}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button className="mini-btn" type="button" onClick={() => openProfile(item)}>Profile</button>
                                                <button className="mini-btn" type="button" onClick={() => setModal({ type: 'edit', row: item })}>Edit</button>
                                                {canApprove && <button className="mini-btn border-red-200 text-red-700 hover:bg-red-50" type="button" onClick={() => setModal({ type: 'archive', row: item })}>Archive</button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
            <Card title="Registrant Data Table">
                <DataTable
                    columns={['Registry', 'Name', 'Sector', 'Barangay', 'Status', 'Actions']}
                    rows={rows.map((row) => [
                        row.registry_number,
                        row.full_name,
                        registrantSectorLabel(row.sector),
                        row.barangay?.name,
                        <span className="-ml-3 inline-block"><StatusBadge status={row.status} /></span>,
                        <RegistrantActionsMenu
                            row={row}
                            canApprove={canApprove}
                            openActionMenu={openActionMenu}
                            setOpenActionMenu={setOpenActionMenu}
                            openProfile={openProfile}
                            setModal={setModal}
                        />,
                    ])}
                />
            </Card>
            <RegistrantActionModal modal={modal} barangays={barangays} user={user} onClose={() => setModal(null)} onSaved={load} onApprove={approve} onDeactivate={deactivate} onArchive={archive} />
            <Modal open={Boolean(profile)} title="Registrant Profile" onClose={() => setProfile(null)} size="xl">
                {profile && <Profile profile={profile} digitalId={digitalId} />}
            </Modal>
            <BulkRsbsaRenderHost rows={bulkRows} />
        </section>
    );
}

function BulkRsbsaRenderHost({ rows }) {
    const [calibration] = useState(loadRsbsaCalibration);

    if (!rows.length) return null;

    return (
        <div className="bulk-rsbsa-render-host pointer-events-none fixed left-0 top-0 z-[-1] w-[1240px] max-w-none bg-white opacity-0" aria-hidden="true">
            {rows.map((row) => (
                <RsbsaTemplateFirstRenderer key={row.id} registrant={row} calibration={calibration} showGrid={false} />
            ))}
        </div>
    );
}

function RegistrantActionsMenu({ row, canApprove, openActionMenu, setOpenActionMenu, openProfile, setModal }) {
    const open = openActionMenu?.id === row.id;
    const actions = [
        ['profile', 'Profile', () => openProfile(row)],
        ['edit', 'Edit', () => setModal({ type: 'edit', row })],
        ...(canApprove && row.status === 'pending' ? [['approve', 'Approve', () => setModal({ type: 'approve', row })]] : []),
        ...(canApprove && row.status !== 'deactivated' ? [['deactivate', 'Deactivate', () => setModal({ type: 'deactivate', row })]] : []),
        ...(canApprove ? [['archive', 'Archive', () => setModal({ type: 'archive', row }), true]] : []),
    ];

    function toggleMenu(event) {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        setOpenActionMenu(open ? null : {
            id: row.id,
            top: rect.bottom + 6,
            left: Math.max(8, rect.right - 176),
        });
    }

    function runAction(action) {
        action();
        setOpenActionMenu(null);
    }

    return (
        <div className="relative">
            <button
                className="mini-btn h-9 w-9 px-0 text-lg leading-none"
                type="button"
                onClick={toggleMenu}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Actions for ${row.full_name || row.registry_number}`}
            >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
            {open && (
                <div
                    className="fixed z-[2100] w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
                    style={{ top: openActionMenu.top, left: openActionMenu.left }}
                    role="menu"
                    onClick={(event) => event.stopPropagation()}
                >
                    {actions.map(([type, label, action, danger]) => (
                        <button
                            key={type}
                            type="button"
                            role="menuitem"
                            className={`block w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition ${danger ? 'text-red-700 hover:bg-red-50 hover:text-red-800' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'}`}
                            onClick={() => runAction(action)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function RegistrantActionModal({ modal, barangays, user, onClose, onSaved, onApprove, onDeactivate, onArchive }) {
    const row = modal?.row;
    const [form, setForm] = useState(null);
    const [archiveReason, setArchiveReason] = useState('Inactive');
    const [otherReason, setOtherReason] = useState('');
    const [archiveError, setArchiveError] = useState('');
    const [archiveBusy, setArchiveBusy] = useState(false);
    const scoped = isBarangayScoped(user);

    useEffect(() => {
        if (row) setForm({ ...row, barangay_id: row.barangay_id || row.barangay?.id || '', expected_text: formatJson(row.expected_production) === 'Not set' ? '' : formatJson(row.expected_production) });
    }, [row]);

    if (!modal || !row) return null;

    if (modal.type !== 'edit') {
        if (modal.type === 'archive') {
            const finalReason = archiveReason === 'Other' ? otherReason.trim() : archiveReason;
            async function confirmArchive() {
                setArchiveError('');
                setArchiveBusy(true);
                try {
                    await onArchive(row, finalReason);
                } catch (error) {
                    setArchiveError(error.message || 'Unable to archive registrant.');
                    setArchiveBusy(false);
                }
            }

            return (
                <Modal open title="Archive Registrant" onClose={onClose}>
                    <p className="text-sm text-slate-600">Select the reason for archiving this registrant record.</p>
                    <p className="mt-2 font-semibold">{row.registry_number} - {row.full_name}</p>
                    <div className="mt-4 space-y-3">
                        <Field label="Archive Reason">
                            <Select value={archiveReason} options={archiveReasons} onChange={setArchiveReason} />
                        </Field>
                        {archiveReason === 'Other' && (
                            <Field label="Other Reason">
                                <input required className="field" value={otherReason} onChange={(event) => setOtherReason(event.target.value)} />
                            </Field>
                        )}
                        {archiveError && <p className="text-sm font-semibold text-red-600">{archiveError}</p>}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" type="button" disabled={!finalReason || archiveBusy} onClick={confirmArchive}>{archiveBusy ? 'Archiving' : 'Confirm'}</button>
                    </div>
                </Modal>
            );
        }
        const copy = {
            approve: ['Approve Registration', 'Approve this registration and mark it as ready for services?', () => onApprove(row)],
            deactivate: ['Deactivate Registrant', 'Deactivate this registrant account?', () => onDeactivate(row)],
        }[modal.type];
        return (
            <Modal open title={copy[0]} onClose={onClose}>
                <p className="text-sm text-slate-600">{copy[1]}</p>
                <p className="mt-2 font-semibold">{row.registry_number} - {row.full_name}</p>
                <div className="mt-4 flex justify-end gap-2">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={copy[2]}>Confirm</button>
                </div>
            </Modal>
        );
    }

    if (!form) return null;

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function submit(event) {
        event.preventDefault();
        const payload = {
            ...form,
            barangay_id: Number(form.barangay_id),
            farm_area: form.farm_area || null,
            expected_production: parseKeyValue(form.expected_text),
        };
        if (scoped) delete payload.status;
        await api.put(`/registrants/${row.id}`, payload);
        onClose();
        onSaved();
    }

    return (
        <Modal open title="Edit Registrant" onClose={onClose} size="xl">
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
                <Field label="Sector"><Select value={form.sector} options={sectors} onChange={(value) => update('sector', value)} /></Field>
                {!scoped && <Field label="Status"><Select value={form.status} options={registrantStatuses} onChange={(value) => update('status', value)} /></Field>}
                <Field label="First Name"><input required className="field" value={form.first_name || ''} onChange={(event) => update('first_name', event.target.value)} /></Field>
                <Field label="Middle Name"><input className="field" value={form.middle_name || ''} onChange={(event) => update('middle_name', event.target.value)} /></Field>
                <Field label="Last Name"><input required className="field" value={form.last_name || ''} onChange={(event) => update('last_name', event.target.value)} /></Field>
                <Field label="Birthday"><input required type="date" className="field" value={formatDate(form.birthday) === 'Not set' ? '' : formatDate(form.birthday)} onChange={(event) => update('birthday', event.target.value)} /></Field>
                <Field label="Barangay">
                    <select required disabled={scoped && barangays.length <= 1} className="field" value={form.barangay_id} onChange={(event) => update('barangay_id', event.target.value)}>
                        {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
                    </select>
                </Field>
                <Field label={ownershipFieldLabel(form.sector)}><Select value={form.ownership_type} options={ownershipOptionsFor(form)} onChange={(value) => update('ownership_type', value)} /></Field>
                <Field label="Phone"><input className="field" value={form.phone || ''} onChange={(event) => update('phone', event.target.value)} /></Field>
                <Field label="Email"><input type="email" className="field" value={form.email || ''} onChange={(event) => update('email', event.target.value)} /></Field>
                <Field label="Farm Area"><input type="number" step="0.01" className="field" value={form.farm_area || ''} onChange={(event) => update('farm_area', event.target.value)} /></Field>
                <Field label="Farm Location"><input className="field" value={form.farm_location || ''} onChange={(event) => update('farm_location', event.target.value)} /></Field>
                <Field label="Boat Name"><input className="field" value={form.boat_name || ''} onChange={(event) => update('boat_name', event.target.value)} /></Field>
                <Field label="Livestock Type"><input className="field" value={form.livestock_type || ''} onChange={(event) => update('livestock_type', event.target.value)} /></Field>
                <Field label="Poultry Type"><input className="field" value={form.poultry_type || ''} onChange={(event) => update('poultry_type', event.target.value)} /></Field>
                <Field label="Expected Produce/Catch" wide><input className="field" value={form.expected_text || ''} onChange={(event) => update('expected_text', event.target.value)} /></Field>
                <Field label="Address" wide><textarea required className="field min-h-20" value={form.address || ''} onChange={(event) => update('address', event.target.value)} /></Field>
                <div className="flex justify-end gap-2 md:col-span-2">
                    <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
                    <button className="btn-primary">Save changes</button>
                </div>
            </form>
        </Modal>
    );
}

const archiveReasons = ['Duplicate Record', 'Requested by Registrant', 'Inactive', 'Transferred', 'Deceased', 'Incorrect Registration', 'Other'];

function ownershipOptionsFor(form) {
    const options = form.sector === 'fisherfolk' ? fishingGearTypes : ownershipTypes;
    return form.ownership_type && !options.includes(form.ownership_type) ? [form.ownership_type, ...options] : options;
}

async function downloadBulkRsbsaPdf(dateFrom, dateTo) {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ]);

    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    const sheets = [...document.querySelectorAll('.bulk-rsbsa-render-host .rsbsa-page-wrapper')];
    if (!sheets.length) throw new Error('No rendered RSBSA forms found.');

    await waitForImages(document.querySelector('.bulk-rsbsa-render-host'));

    const printPage = { width: 215.9, height: 330.2 };
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [printPage.width, printPage.height], compress: true });

    for (let index = 0; index < sheets.length; index += 1) {
        const sheet = sheets[index];
        const canvas = await withTimeout(captureRsbsaSheet(sheet, html2canvas), 30000, 'The RSBSA form capture took too long. Try a smaller date range.');
        if (index > 0) pdf.addPage([printPage.width, printPage.height], 'portrait');
        const image = canvas.toDataURL('image/jpeg', 0.92);
        const placement = fitImageToPage(canvas.width, canvas.height, printPage.width, printPage.height);
        pdf.addImage(image, 'JPEG', placement.x, placement.y, placement.width, placement.height, undefined, 'FAST');
    }

    pdf.save(`RSBSA_Bulk_${dateFrom}_to_${dateTo}.pdf`);
}

async function captureRsbsaSheet(sheet, html2canvas) {
    const restorers = freezeRsbsaComputedStyles(sheet);

    try {
        return await html2canvas(sheet, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            width: sheet.offsetWidth,
            height: sheet.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        });
    } finally {
        restorers.reverse().forEach((restore) => restore());
    }
}

function freezeRsbsaComputedStyles(sheet) {
    const elements = [
        sheet,
        ...sheet.querySelectorAll('.rsbsa-exact-page, .rsbsa-overlay, .rsbsa-cover, .rsbsa-filled-photo, .rsbsa-filled-value, .rsbsa-segmented-value, .rsbsa-filled-mark'),
    ];

    return elements.map((element) => {
        const previousStyle = element.getAttribute('style');
        const styles = window.getComputedStyle(element);

        element.style.width = styles.width;
        element.style.height = styles.height;

        if (element.classList.contains('rsbsa-filled-value') || element.classList.contains('rsbsa-segmented-value')) {
            element.style.fontSize = styles.fontSize;
            element.style.lineHeight = styles.lineHeight;
            element.style.fontWeight = styles.fontWeight;
            element.style.paddingLeft = styles.paddingLeft;
            element.style.paddingRight = styles.paddingRight;
            element.style.overflow = 'visible';

            const currentTop = parseFloat(element.style.top);
            if (!Number.isNaN(currentTop)) {
                element.style.top = `${currentTop - 0.35}%`;
            }
        }

        if (element.classList.contains('rsbsa-filled-mark')) {
            element.style.borderRightWidth = styles.borderRightWidth;
            element.style.borderBottomWidth = styles.borderBottomWidth;
        }

        return () => {
            if (previousStyle === null) {
                element.removeAttribute('style');
            } else {
                element.setAttribute('style', previousStyle);
            }
        };
    });
}

function waitForImages(root) {
    if (!root) return Promise.resolve();

    return Promise.all([...root.querySelectorAll('img')].map((img) => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return withTimeout(new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        }), 5000, 'Image loading timed out.');
    }));
}

function withTimeout(promise, milliseconds, message) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
    });

    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function fitImageToPage(imageWidth, imageHeight, pageWidth, pageHeight) {
    const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;

    return {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
    };
}

function loadRsbsaCalibration() {
    try {
        const saved = localStorage.getItem(RSBSA_CALIBRATION_STORAGE_KEY);
        return normalizeRsbsaCalibration(saved ? JSON.parse(saved) : DEFAULT_RSBSA_CALIBRATION);
    } catch {
        return normalizeRsbsaCalibration(DEFAULT_RSBSA_CALIBRATION);
    }
}
