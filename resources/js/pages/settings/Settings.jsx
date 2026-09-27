import React, { useMemo, useState } from 'react';
import { Bell, BookOpen, CircleHelp, Eye, EyeOff, KeyRound, LockKeyhole, Mail, MessageSquareWarning, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Field, InfoRow, PageHeader } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { ROLES } from '../../utils/rbac';

const initialPasswordForm = {
    current_password: '',
    password: '',
    password_confirmation: '',
};

const notificationOptions = [
    ['application_updates', 'Application updates', 'Assistance, insurance, and registration progress.'],
    ['announcements', 'Announcements', 'Public MAO advisories and program notices.'],
    ['schedules', 'Schedules and reminders', 'Barangay schedules, releases, and deadlines.'],
    ['system', 'System notifications', 'Account and security notices.'],
];

export default function Settings() {
    const { user } = useAuth();

    return (
        <section className="space-y-4">
            <PageHeader title="Settings" description="Manage password, notifications, privacy, and support options." />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <PasswordSection user={user} />
                <NotificationsSection user={user} />
            </div>
            <PrivacySection user={user} />

            <HelpSection />
        </section>
    );
}

function PasswordSection({ user }) {
    const [form, setForm] = useState(initialPasswordForm);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState({});

    const update = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setMessage('');
        setError('');
    };

    const togglePassword = (key) => {
        setVisiblePasswords((current) => ({ ...current, [key]: !current[key] }));
    };

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        try {
            await api.put('/auth/password', form);
            setForm(initialPasswordForm);
            setMessage('Password updated successfully.');
        } catch (exception) {
            setError(exception.message || 'Password could not be updated.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card title="Change Password">
            <form className="space-y-3" onSubmit={submit}>
                <SectionIntro icon={KeyRound} title="Password Security" copy="Enter your current password before choosing a new one." />
                <InfoRow label="Password Last Changed" value={formatDateTime(user?.password_changed_at)} />
                <Field label="Current Password">
                    <PasswordInput value={form.current_password} visible={Boolean(visiblePasswords.current_password)} onToggle={() => togglePassword('current_password')} onChange={(value) => update('current_password', value)} autoComplete="current-password" />
                </Field>
                <Field label="New Password">
                    <PasswordInput value={form.password} visible={Boolean(visiblePasswords.password)} onToggle={() => togglePassword('password')} onChange={(value) => update('password', value)} autoComplete="new-password" />
                </Field>
                <Field label="Confirm New Password">
                    <PasswordInput value={form.password_confirmation} visible={Boolean(visiblePasswords.password_confirmation)} onToggle={() => togglePassword('password_confirmation')} onChange={(value) => update('password_confirmation', value)} autoComplete="new-password" />
                </Field>
                {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>}
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
                <div className="flex justify-end">
                    <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Password'}</button>
                </div>
            </form>
        </Card>
    );
}


function NotificationsSection({ user }) {
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

    return (
        <Card title="Notifications">
            <div className="space-y-3">
                <SectionIntro icon={Bell} title="Notification Preferences" copy="Current TARSIS delivery settings are managed by the system." />
                {notificationOptions.map(([key, title, copy]) => (
                    <ToggleRow key={key} title={title} copy={copy} checked disabled />
                ))}
                {!isSuperAdmin && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                        Preference saving is not supported by the current backend. Important account and registry notices remain enabled.
                    </p>
                )}
            </div>
        </Card>
    );
}

function TwoFactorSection({ user }) {
    return (
        <Card title="Two-Factor Authentication">
            <div className="space-y-3">
                <SectionIntro icon={Smartphone} title={user?.two_factor_enabled ? '2FA Enabled' : '2FA Disabled'} copy="Two-factor authentication setup is not fully enabled yet." />
                <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-950">Require verification code</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">Placeholder control for the planned 2FA workflow.</span>
                    </span>
                    <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#1a4731]" checked={Boolean(user?.two_factor_enabled)} disabled readOnly />
                </label>
            </div>
        </Card>
    );
}

function PrivacySection({ user }) {
    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
    const sessionDetails = useMemo(() => [
        ['Signed in as', user?.email || 'Current account'],
        ['Device information', navigator.userAgent || 'Current browser'],
        ...isSuperAdmin ? [] : [['Session management', 'Detailed active sessions are not currently supported.']],
    ], [isSuperAdmin, user?.email]);

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <TwoFactorSection user={user} />
            <Card title="Privacy & Security">
                <div className="space-y-4">
                    <SectionIntro icon={ShieldCheck} title="Security Options" copy="Protect your account and registry record." />
                    <div className="grid gap-2 text-sm">
                        <InfoRow label="Password" value="Use Change Password above to update your password." />
                        {sessionDetails.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
                    </div>
                    {!isSuperAdmin && (
                        <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                            <div className="flex items-start gap-3">
                                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
                                <div>
                                    <p className="text-sm font-bold text-red-900">Account deactivation</p>
                                    <p className="mt-1 text-xs leading-5 text-red-700">
                                        Self-service deactivation is not available. Contact the MAO to deactivate your account or registry profile.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function HelpSection() {
    return (
        <Card title="Help & Support">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SupportItem icon={CircleHelp} title="FAQs" copy="Find answers to common registration, tracker, and digital ID questions." to="/about-tarsis" />
                <SupportItem icon={BookOpen} title="User Guide" copy="Read step-by-step guides for assistance and insurance tracking." to="/instructions/assistance-tracker" />
                <SupportItem icon={Mail} title="Contact MAO" copy="Visit or contact the Municipal Agriculture Office for account and registry concerns." href="mailto:mao@tarsis.local" />
                <SupportItem icon={MessageSquareWarning} title="Report a Problem" copy="Report login, profile, or record issues to MAO support." href="mailto:mao@tarsis.local?subject=TARSIS%20Support%20Request" />
            </div>
        </Card>
    );
}

function SectionIntro({ icon: Icon, title, copy }) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#1a4731]">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
            </div>
        </div>
    );
}

function ToggleRow({ title, copy, checked, disabled }) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
            <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-950">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{copy}</span>
            </span>
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#1a4731]" checked={checked} disabled={disabled} readOnly />
        </label>
    );
}

function SupportItem({ icon: Icon, title, copy, to, href }) {
    const className = 'block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40';
    const content = (
        <>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-[#1a4731]">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="mt-4 block text-sm font-bold text-slate-950">{title}</span>
            <span className="mt-2 block text-xs leading-5 text-slate-500">{copy}</span>
        </>
    );

    if (to) return <Link className={className} to={to}>{content}</Link>;
    return <a className={className} href={href}>{content}</a>;
}

function PasswordInput({ value, visible, onToggle, onChange, autoComplete }) {
    const Icon = visible ? EyeOff : Eye;

    return (
        <div className="relative w-full">
            <input
                required
                minLength={8}
                type={visible ? 'text' : 'password'}
                className="field block w-full pr-12"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                autoComplete={autoComplete}
            />
            <button
                type="button"
                className="absolute right-1.5 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                onClick={onToggle}
                aria-label={visible ? 'Hide password' : 'Show password'}
                title={visible ? 'Hide password' : 'Show password'}
            >
                <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
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
