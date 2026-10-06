import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MaoSeal from './MaoSeal';

const navLinks = [
    { key: 'nav.home', href: '#home' },
    { key: 'nav.about', href: '#about' },
    { key: 'nav.services', dropdown: true },
    { key: 'nav.contact', href: '#contact' },
];

const serviceLinks = [
    { key: 'nav.assistanceTracker', to: '/instructions/assistance-tracker' },
    { key: 'nav.insuranceGuide', to: '/instructions/insurance-calamity-tracker' },
    { key: 'nav.announcements', to: '/announcements' },
];

export default function Header() {
    const { t } = useTranslation();
    const { signedIn } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const servicesRef = useRef(null);
    const triggerRef = useRef(null);
    const itemRefs = useRef([]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!servicesRef.current?.contains(event.target)) {
                setServicesOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setServicesOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const closeMenu = () => {
        setMenuOpen(false);
        setMobileServicesOpen(false);
    };

    const focusDropdownItem = (index) => {
        itemRefs.current[index]?.focus();
    };

    const openServicesAndFocus = (index) => {
        setServicesOpen(true);
        window.requestAnimationFrame(() => focusDropdownItem(index));
    };

    const handleServicesTriggerKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openServicesAndFocus(0);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            openServicesAndFocus(serviceLinks.length - 1);
        }
    };

    const handleServiceItemKeyDown = (event, index) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusDropdownItem((index + 1) % serviceLinks.length);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusDropdownItem((index - 1 + serviceLinks.length) % serviceLinks.length);
        }

        if (event.key === 'Home') {
            event.preventDefault();
            focusDropdownItem(0);
        }

        if (event.key === 'End') {
            event.preventDefault();
            focusDropdownItem(serviceLinks.length - 1);
        }
    };

    return (
        <>
            <header className={`fixed inset-x-0 top-0 z-[1000] border-b border-slate-200 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md shadow-slate-900/10' : ''}`}>
                <div className="mx-auto flex min-h-20 max-w-screen-xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <a href="/#home" className="flex min-w-0 flex-1 items-center gap-2 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 sm:gap-4 lg:flex-none" onClick={closeMenu}>
                    <MaoSeal size={52} className="shrink-0 max-sm:h-11 max-sm:w-11" />
                    <span className="min-w-0 leading-tight">
                        <span className="hidden truncate text-[11px] font-extrabold uppercase tracking-wide text-[#1a4731] sm:block sm:text-xs">{t('brand.office')}</span>
                        <span className="block truncate text-2xl font-extrabold leading-none text-[#1a4731] sm:text-3xl">{t('brand.name')}</span>
                        <span className="hidden truncate text-[11px] font-medium text-slate-500 sm:block sm:text-xs">{t('brand.fullName')}</span>
                    </span>
                </a>

                <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label={t('nav.primary')}>
                    {navLinks.map((item) => item.dropdown ? (
                        <div key={item.key} ref={servicesRef} className="relative">
                            <button
                                ref={triggerRef}
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#1a4731] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                                aria-haspopup="true"
                                aria-expanded={servicesOpen}
                                onClick={() => setServicesOpen((open) => !open)}
                                onKeyDown={handleServicesTriggerKeyDown}
                            >
                                {t(item.key)}
                                <ChevronDown className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {servicesOpen && (
                                <div className="absolute left-1/2 top-full mt-3 w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10">
                                    {serviceLinks.map((service, index) => (
                                        <Link
                                            key={service.to}
                                            ref={(node) => { itemRefs.current[index] = node; }}
                                            className="block rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-[#f0f6f2] hover:text-[#1a4731] focus:bg-[#f0f6f2] focus:text-[#1a4731] focus:outline-none"
                                            to={service.to}
                                            onClick={() => setServicesOpen(false)}
                                            onKeyDown={(event) => handleServiceItemKeyDown(event, index)}
                                        >
                                            {t(service.key)}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : <NavItem key={item.key} item={item} label={t(item.key)} />)}
                </nav>

                <div className="hidden shrink-0 items-center gap-2 lg:flex">
                    {signedIn ? (
                        <Link className="inline-flex min-h-10 items-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to="/dashboard">
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to="/login">
                                {t('nav.login')}
                            </Link>
                            <Link className="inline-flex min-h-10 items-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to="/signup" state={{ from: { pathname: '/registration' } }}>
                                {t('nav.signup')}
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25 lg:hidden"
                    aria-controls="landing-mobile-menu"
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </button>
            </div>

            {menuOpen && (
                <div id="landing-mobile-menu" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 shadow-lg shadow-slate-950/5 lg:hidden">
                    <nav className="mx-auto max-w-screen-xl" aria-label={t('nav.mobilePrimary')}>
                        {navLinks.map((item) => item.dropdown ? (
                            <div key={item.key} className="border-b border-slate-100">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-slate-700 transition hover:text-[#1a4731] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                                    aria-haspopup="true"
                                    aria-expanded={mobileServicesOpen}
                                    onClick={() => setMobileServicesOpen((open) => !open)}
                                >
                                    {t(item.key)}
                                    <ChevronDown className={`h-4 w-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                </button>
                                {mobileServicesOpen && (
                                    <div className="pb-2 pl-3">
                                        {serviceLinks.map((service) => (
                                            <Link
                                                key={service.to}
                                                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#f0f6f2] hover:text-[#1a4731] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                                                to={service.to}
                                                onClick={closeMenu}
                                            >
                                                {t(service.key)}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : <MobileNavItem key={item.key} item={item} label={t(item.key)} onClick={closeMenu} />)}
                        {signedIn ? (
                            <div className="mt-4">
                                <Link className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to="/dashboard" onClick={closeMenu}>
                                    Dashboard
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to="/login" onClick={closeMenu}>
                                    {t('nav.login')}
                                </Link>
                                <Link className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#1a4731] px-4 py-2 text-sm font-semibold text-[#1a4731] transition hover:bg-[#f0f6f2] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25" to="/signup" state={{ from: { pathname: '/registration' } }} onClick={closeMenu}>
                                    {t('nav.signup')}
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
            </header>
            <div className="min-h-20" aria-hidden="true" />
        </>
    );
}

function NavItem({ item, label }) {
    const className = 'rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-[#1a4731] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20';

    if (item.to) {
        return <Link className={className} to={item.to}>{label}</Link>;
    }

    return <a className={className} href={`/${item.href}`}>{label}</a>;
}

function MobileNavItem({ item, label, onClick }) {
    const className = 'block border-b border-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:text-[#1a4731] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20';

    if (item.to) {
        return <Link className={className} to={item.to} onClick={onClick}>{label}</Link>;
    }

    return <a className={className} href={`/${item.href}`} onClick={onClick}>{label}</a>;
}
