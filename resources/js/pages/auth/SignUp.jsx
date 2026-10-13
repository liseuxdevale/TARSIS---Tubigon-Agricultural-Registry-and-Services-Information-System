import React, { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MaoSeal from '../../components/landing/MaoSeal';
import { isStrongPassword, passwordHelp } from '../../utils/passwordPolicy';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, AuthShell, FieldError, Spinner, authButtonClass, fieldClass } from './SignIn';

export default function SignUp() {
    const { signedIn, loading, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const intended = location.state?.from?.pathname || '/registration';
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [busy, setBusy] = useState(false);

    const canSubmit = useMemo(
        () => form.name.trim()
            && form.email.trim()
            && form.phone.trim()
            && form.password
            && form.password_confirmation,
        [form]
    );

    if (!loading && signedIn) return <Navigate to={intended} replace />;

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
        setServerError('');
    }

    function validate() {
        const next = {};
        if (!form.name.trim()) next.name = 'Full name is required.';
        if (!form.email.trim()) next.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
        if (!form.phone.trim()) next.phone = 'Mobile number is required.';
        else if (!/^09\d{9}$/.test(normalizePhone(form.phone))) next.phone = 'Enter an 11-digit mobile number starting with 09.';
        if (!form.password) next.password = 'Password is required.';
        else if (!isStrongPassword(form.password)) next.password = passwordHelp;
        if (form.password_confirmation !== form.password) next.password_confirmation = 'Passwords must match.';
        setErrors(next);
        return !Object.keys(next).length;
    }

    async function submit(event) {
        event.preventDefault();
        if (!validate()) return;

        setBusy(true);
        setServerError('');
        try {
            await register({
                name: form.name.trim(),
                email: form.email.trim(),
                phone: normalizePhone(form.phone),
                password: form.password,
                password_confirmation: form.password_confirmation,
            });
            navigate(intended, { replace: true });
        } catch (err) {
            setServerError(err.message || 'Unable to sign up.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell>
            <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-5 flex h-32 w-32 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-xl backdrop-blur-sm">
                        <MaoSeal size={106} />
                    </div>
                    <h1 className="text-center text-4xl font-black leading-tight text-white">TARSIS</h1>
                    <p className="mt-2 text-center text-xl font-bold text-green-300">Sign up</p>
                </div>

                <div className="w-full max-w-2xl rounded-2xl border-2 border-green-400 bg-white p-5 shadow-2xl">
                    <div className="mb-5">
                        <p className="text-sm font-black text-gray-900">Create account</p>
                    </div>
                    <form onSubmit={submit} className="space-y-4" noValidate>
                        {serverError && <Alert tone="error">{serverError}</Alert>}
                        <div className="grid gap-4 md:grid-cols-2">
                            <AuthField label="Full name" error={errors.name}>
                                <input className={fieldClass(errors.name)} value={form.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" placeholder="Juan Dela Cruz" />
                            </AuthField>
                            <AuthField label="Email address" error={errors.email}>
                                <input className={fieldClass(errors.email)} value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" inputMode="email" placeholder="name@example.com" />
                            </AuthField>
                            <AuthField label="Mobile number" error={errors.phone}>
                                <input className={fieldClass(errors.phone)} value={form.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" inputMode="tel" maxLength={16} placeholder="09XXXXXXXXX" />
                            </AuthField>
                            <AuthField label="Password" error={errors.password}>
                                <input className={fieldClass(errors.password)} type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
                                <p className="mt-1 text-xs text-gray-500">{passwordHelp}</p>
                            </AuthField>
                            <AuthField label="Confirm password" error={errors.password_confirmation}>
                                <input className={fieldClass(errors.password_confirmation)} type="password" value={form.password_confirmation} onChange={(event) => update('password_confirmation', event.target.value)} autoComplete="new-password" placeholder="Repeat password" />
                            </AuthField>
                        </div>
                        <button className={authButtonClass} disabled={busy || !canSubmit}>
                            {busy && <Spinner />}
                            {busy ? 'Signing up' : 'Sign up'}
                        </button>
                        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>Already have an account?</span>
                            <Link className="font-bold text-green-700 hover:text-green-800" to="/login" state={{ from: { pathname: intended } }}>Log in</Link>
                        </div>
                    </form>
                </div>
            </div>
        </AuthShell>
    );
}

function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('639') && digits.length === 12
        ? `0${digits.slice(2)}`
        : digits;
}

function AuthField({ label, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-600">{label}</label>
            {children}
            <FieldError>{error}</FieldError>
        </div>
    );
}
