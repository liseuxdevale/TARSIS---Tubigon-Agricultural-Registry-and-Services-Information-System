import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { isStrongPassword, passwordHelp } from '../../utils/passwordPolicy';
import { useAuth } from '../../contexts/AuthContext';
import { Alert, AuthShell, FieldError, Spinner, authButtonClass, fieldClass } from './SignIn';

export default function ForcePasswordChange() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [busy, setBusy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const canSubmit = useMemo(
        () => form.current_password && form.password && form.password_confirmation,
        [form],
    );

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
        setServerError('');
    }

    function validate() {
        const next = {};
        if (!form.current_password) next.current_password = 'Current password is required.';
        if (!form.password) next.password = 'New password is required.';
        else if (!isStrongPassword(form.password)) next.password = passwordHelp;
        if (form.password !== form.password_confirmation) next.password_confirmation = 'Passwords do not match.';
        setErrors(next);
        return !Object.keys(next).length;
    }

    async function submit(event) {
        event.preventDefault();
        if (!validate()) return;

        setBusy(true);
        setServerError('');
        try {
            await api.put('/auth/password', form);
            updateUser({ ...user, must_change_password: false });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setServerError(err.message || 'Unable to update password.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell>
            <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-md rounded-2xl border-2 border-green-400 bg-white p-5 text-left shadow-2xl">
                    <div className="mb-5">
                        <p className="text-sm font-black text-gray-900">Change your password</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">
                            Your password was reset by an administrator. Create a new password to continue.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-3" noValidate>
                        <p className="text-xs text-gray-500">{passwordHelp}</p>
                        {serverError && <Alert tone="error">{serverError}</Alert>}
                        <PasswordField
                            label="Current password"
                            value={form.current_password}
                            error={errors.current_password}
                            show={showPassword}
                            onToggle={() => setShowPassword((current) => !current)}
                            onChange={(value) => update('current_password', value)}
                        />
                        <PasswordField
                            label="New password"
                            value={form.password}
                            error={errors.password}
                            show={showPassword}
                            onToggle={() => setShowPassword((current) => !current)}
                            onChange={(value) => update('password', value)}
                        />
                        <PasswordField
                            label="Confirm new password"
                            value={form.password_confirmation}
                            error={errors.password_confirmation}
                            show={showPassword}
                            onToggle={() => setShowPassword((current) => !current)}
                            onChange={(value) => update('password_confirmation', value)}
                        />
                        <button className={authButtonClass} disabled={busy || !canSubmit}>
                            {busy && <Spinner />}
                            {busy ? 'Updating password' : 'Update password'}
                        </button>
                    </form>
                </div>
            </div>
        </AuthShell>
    );
}

function PasswordField({ label, value, error, show, onToggle, onChange }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-600">{label}</label>
            <div className="relative w-full">
                <input
                    className={`${fieldClass(error)} block w-full pr-12`}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete="new-password"
                />
                <button
                    type="button"
                    className="absolute right-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    onClick={onToggle}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    title={show ? 'Hide password' : 'Show password'}
                >
                    {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
            </div>
            <FieldError>{error}</FieldError>
        </div>
    );
}
