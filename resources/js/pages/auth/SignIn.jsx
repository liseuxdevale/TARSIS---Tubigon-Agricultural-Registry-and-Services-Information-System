import React, { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import MaoSeal from '../../components/landing/MaoSeal';
import { useAuth } from '../../contexts/AuthContext';
import { sectorAdminRoles } from '../../utils/rbac';

export default function SignIn() {
    const { signedIn, loading, login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const intended = location.state?.from?.pathname;
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [busy, setBusy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const canSubmit = useMemo(() => form.email.trim() && form.password, [form]);

    if (!loading && signedIn) return <Navigate to={homePath(user, intended)} replace />;

    function update(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
        setServerError('');
    }

    function validate() {
        const next = {};
        if (!form.email.trim()) next.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
        if (!form.password) next.password = 'Password is required.';
        setErrors(next);
        return !Object.keys(next).length;
    }

    async function submit(event) {
        event.preventDefault();
        if (!validate()) return;

        setBusy(true);
        setServerError('');
        try {
            const signedInUser = await login(form.email.trim(), form.password);
            navigate(homePath(signedInUser, intended), { replace: true });
        } catch (err) {
            setServerError(err.message || 'Unable to log in. Please check your credentials.');
        } finally {
            setBusy(false);
        }
    }

    const title = 'Log in';

    return (
        <AuthShell>
            <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-5 flex h-32 w-32 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-xl backdrop-blur-sm">
                        <MaoSeal size={106} />
                    </div>
                    <h1 className="text-center text-4xl font-black leading-tight text-white">TARSIS</h1>
                    <p className="mt-2 text-center text-xl font-bold text-green-300">{title}</p>
                </div>

                <div className="w-full max-w-md rounded-2xl border-2 border-green-400 bg-white p-5 text-left shadow-2xl">
                    <div className="mb-5 text-center">
                        <p className="text-sm font-black text-gray-900">Welcome back</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">
                            Enter your email and password to continue.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-3" noValidate>
                        {serverError && <Alert tone="error">{serverError}</Alert>}
                        {location.state?.notice && <Alert>{location.state.notice}</Alert>}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-600">Email address</label>
                            <input
                                className={fieldClass(errors.email)}
                                value={form.email}
                                onChange={(event) => update('email', event.target.value)}
                                autoComplete="email"
                                inputMode="email"
                                placeholder="name@example.com"
                            />
                            <FieldError>{errors.email}</FieldError>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-600">Password</label>
                            <div className="relative w-full">
                                <input
                                    className={`${fieldClass(errors.password)} block w-full pr-12`}
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(event) => update('password', event.target.value)}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                    onClick={() => setShowPassword((current) => !current)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                                </button>
                            </div>
                            <div className="mt-2 flex justify-end">
                                <a
                                    className="text-xs font-bold text-green-700 transition hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                    href="mailto:mao@tarsis.local?subject=TARSIS%20Password%20Reset%20Request"
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <FieldError>{errors.password}</FieldError>
                        </div>
                        <button className={authButtonClass} disabled={busy || !canSubmit}>
                            {busy && <Spinner />}
                            {busy ? 'Logging in' : 'Log in'}
                        </button>
                    </form>

                    <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500">
                        <div className="flex items-center justify-between gap-3">
                            <span>Don't have an account?</span>
                            <Link className="font-bold text-green-700 hover:text-green-800" to="/signup" state={location.state}>Sign up</Link>
                        </div>
                    </div>
                </div>
            </div>
        </AuthShell>
    );
}

export function AuthShell({ children, staff = false }) {
    const overlay = staff ? 'bg-slate-950/75' : 'bg-[#092f20]/72';

    return (
        <section className="relative min-h-screen overflow-hidden bg-[#123b29]">
            <img
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&h=1280&fit=crop&auto=format"
                alt="Agricultural field in cultivation"
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className={`pointer-events-none absolute inset-0 ${overlay}`} />
            {children}
        </section>
    );
}

export function Alert({ tone = 'success', children }) {
    const styles = tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-green-200 bg-green-50 text-green-800';

    return <p className={`rounded-xl border px-3 py-2 text-xs font-semibold ${styles}`}>{children}</p>;
}

export function FieldError({ children }) {
    if (!children) return null;
    return <span className="mt-1.5 block text-xs font-semibold text-red-700">{children}</span>;
}

export function Spinner() {
    return <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

export function fieldClass(error) {
    return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:ring-2 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-green-500 focus:ring-green-500/20'}`;
}

export const authButtonClass = 'flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700/30 disabled:cursor-not-allowed disabled:opacity-60';

function homePath(user, intended) {
    if (user?.must_change_password) {
        return '/change-password';
    }

    if (sectorAdminRoles.includes(user?.role)) {
        return '/dashboard';
    }

    return intended || '/dashboard';
}
