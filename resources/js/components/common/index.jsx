import React, { useEffect, useState } from 'react';
import { cx } from '../../utils/format';

export function PageHeader({ title, description, actions }) {
    return (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:pr-28">
            <div className="min-w-0">
                <h2 className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
                {description && <p className="mt-0.5 max-w-3xl text-sm text-gray-500">{description}</p>}
            </div>
            {actions && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0">{actions}</div>}
        </div>
    );
}

export function Card({ title, actions, children }) {
    return (
        <section className="surface min-w-0 p-4 md:p-5">
            {(title || actions) && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    {title ? <h3 className="text-sm font-bold" style={{ color: 'var(--role-text)' }}>{title}</h3> : <span />}
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

export function StatCard({ label, value, tone = 'slate' }) {
    const tones = {
        slate: 'text-gray-900',
        green: 'text-gray-900',
        blue: 'text-gray-900',
        amber: 'text-gray-900',
    };

    return (
        <div className={cx('border p-4', tones[tone])} style={{ background: 'var(--role-surface)', borderColor: 'var(--role-border)', borderRadius: 'calc(var(--role-radius) * 1.2)', boxShadow: 'var(--role-shadow)' }}>
            <p className="text-2xl font-bold leading-none" style={{ color: 'var(--role-text)' }}>{value}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--role-muted)' }}>{label}</p>
        </div>
    );
}

export function Field({ label, children, wide }) {
    return (
        <label className={cx('block text-sm font-semibold text-gray-700', wide && 'md:col-span-2')}>
            <span className="mb-1.5 block">{label}</span>
            {children}
        </label>
    );
}

export function Select({ value, options, labels = {}, onChange }) {
    return (
        <select className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
            {options.map((option) => <option key={option} value={option}>{labels[option] || option || 'All'}</option>)}
        </select>
    );
}

export function SearchBar({ value, onChange, placeholder = 'Search' }) {
    return <input className="field" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

export function DataTable({ columns, rows, compact = false, pageSize = 10 }) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setPage((value) => Math.min(value, totalPages));
    }, [totalPages]);

    return (
        <div className="min-w-0 overflow-hidden border bg-white" style={{ borderColor: 'var(--role-border)', borderRadius: 'calc(var(--role-radius) * 1.2)', boxShadow: 'var(--role-shadow)' }}>
            <div className="overflow-x-auto">
            <table className={`w-full text-left text-sm ${compact ? 'min-w-full' : 'min-w-[720px]'}`}>
                <thead className="sticky top-0 z-10">
                    <tr className="text-xs uppercase tracking-wider" style={{ background: 'var(--role-surface-soft)', color: 'var(--role-muted)' }}>
                        {columns.map((column) => <th key={column} className="px-4 py-3 font-bold">{column}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {paginatedRows.map((row, index) => (
                        <tr key={index} className="transition hover:bg-green-50/30">
                            {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top text-gray-600">{cell || <span className="text-gray-400">Not set</span>}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
            {!rows.length && <p className="p-6 text-center text-sm text-gray-500">No records found.</p>}
            {rows.length > pageSize && (
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                    <span>Page {currentPage} of {totalPages}</span>
                    <button className="inline-flex items-center gap-2 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-base leading-none">&lt;</span>
                        <span>Previous</span>
                    </button>
                    <button className="inline-flex items-center gap-2 font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                        <span>Next</span>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-base leading-none">&gt;</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export function Pagination({ meta, onPage }) {
    if (!meta || !meta.last_page || meta.last_page <= 1) return null;
    return (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm">
            <button className="mini-btn" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>Previous</button>
            <span className="text-slate-600">Page {meta.current_page} of {meta.last_page}</span>
            <button className="mini-btn" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>Next</button>
        </div>
    );
}

export function Modal({ open, title, onClose, children, size = 'md' }) {
    useEffect(() => {
        if (!open) return undefined;

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;
    const sizes = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-6xl' };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className={cx('max-h-[90vh] w-full overflow-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-gray-900/10', sizes[size])}>
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <button className="mini-btn" onClick={onClose} aria-label="Close">X</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function StatusBadge({ status }) {
    const labels = {
        failed: 'Failed to send',
    };
    const tone = {
        active: 'bg-emerald-100 text-emerald-800',
        approved: 'bg-emerald-100 text-emerald-800',
        endorsed: 'bg-emerald-100 text-emerald-800',
        open: 'bg-emerald-100 text-emerald-800',
        released: 'bg-blue-100 text-blue-800',
        application_submitted: 'bg-slate-100 text-slate-700',
        claim_submitted: 'bg-slate-100 text-slate-700',
        received_by_mao: 'bg-sky-100 text-sky-800',
        documents_verified: 'bg-sky-100 text-sky-800',
        forwarded_to_mswdo: 'bg-blue-100 text-blue-800',
        forwarded_to_pcic: 'bg-blue-100 text-blue-800',
        under_review: 'bg-amber-100 text-amber-900',
        under_processing: 'bg-amber-100 text-amber-900',
        sent: 'bg-blue-100 text-blue-800',
        pending: 'bg-amber-100 text-amber-900',
        returned: 'bg-amber-100 text-amber-900',
        skipped: 'bg-slate-200 text-slate-700',
        closed: 'bg-slate-200 text-slate-700',
        inactive: 'bg-slate-200 text-slate-700',
        archived: 'bg-slate-200 text-slate-700',
        failed: 'bg-red-100 text-red-800',
        rejected: 'bg-red-100 text-red-800',
        denied: 'bg-red-100 text-red-800',
        deactivated: 'bg-red-100 text-red-800',
        advisory: 'bg-sky-100 text-sky-800',
        bulletin: 'bg-emerald-100 text-emerald-800',
        distribution_schedule: 'bg-blue-100 text-blue-800',
        insurance_update: 'bg-violet-100 text-violet-800',
        assistance_update: 'bg-teal-100 text-teal-800',
        pest: 'bg-red-100 text-red-800',
        disease: 'bg-orange-100 text-orange-800',
        calamity: 'bg-amber-100 text-amber-900',
        compliance_requirements: 'bg-indigo-100 text-indigo-800',
        other_purpose: 'bg-slate-100 text-slate-700',
    }[status] || 'bg-slate-100 text-slate-700';

    return <span className={cx('inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold', !labels[status] && 'capitalize', tone)}>{labels[status] || String(status || 'unknown').replaceAll('_', ' ')}</span>;
}

export function InfoRow({ label, value }) {
    return (
        <p className="grid gap-1 break-words py-1 sm:grid-cols-[140px_1fr]">
            <span className="font-medium text-slate-500">{label}</span>
            <span>{value || 'Not set'}</span>
        </p>
    );
}

export function ActionGroup({ children }) {
    return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function PageLoader({ compact = false }) {
    return <div className={cx('animate-pulse rounded-lg border border-slate-200 bg-white/70 shadow-sm', compact ? 'h-24' : 'h-48')} />;
}

export function EmptyState({ title, detail }) {
    return (
        <div className="rounded-lg border border-dashed border-emerald-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            {detail && <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">{detail}</p>}
        </div>
    );
}

export function LoginRequired() {
    return <EmptyState title="Log in required" detail="Log in with an authorized TARSIS account to open this module." />;
}

export function StatusTimeline({ statuses, active }) {
    const activeIndex = Math.max(0, statuses.indexOf(active));
    return (
        <div className="flex min-w-[420px] items-start">
            {statuses.map((status, index) => (
                <div key={status} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                    {index < statuses.length - 1 && <span className={cx('absolute left-1/2 top-2 h-0.5 w-full', index < activeIndex ? 'bg-emerald-600' : 'bg-slate-200')} />}
                    <span className={cx('relative z-10 h-4 w-4 rounded-full border-2 border-white shadow-sm', index < activeIndex ? 'bg-emerald-600' : index === activeIndex ? 'bg-amber-500 ring-2 ring-amber-100' : 'bg-slate-300')} />
                    <span className={cx('mt-2 max-w-20 text-[10px] font-semibold leading-3', index <= activeIndex ? 'text-slate-700' : 'text-slate-400')}>
                        {String(status).replaceAll('_', ' ')}
                    </span>
                </div>
            ))}
        </div>
    );
}
