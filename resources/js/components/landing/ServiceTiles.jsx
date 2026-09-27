import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ClipboardCheck, FileText, MapPinned, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
    {
        icon: FileText,
        titleKey: 'services.registration.title',
        copyKey: 'services.registration.copy',
        to: '/signup',
        state: { from: { pathname: '/registration' } },
    },
    {
        icon: MapPinned,
        titleKey: 'services.map.title',
        copyKey: 'services.map.copy',
        to: '/map',
    },
    {
        icon: ClipboardCheck,
        titleKey: 'services.assistance.title',
        copyKey: 'services.assistance.copy',
        to: '/instructions/assistance-tracker',
    },
    {
        icon: Bell,
        titleKey: 'services.advisories.title',
        copyKey: 'services.advisories.copy',
        to: '/announcements',
    },
    {
        icon: ShieldCheck,
        titleKey: 'services.insurance.title',
        copyKey: 'services.insurance.copy',
        to: '/instructions/insurance-calamity-tracker',
    },
];

export default function ServiceTiles() {
    const { t } = useTranslation();

    return (
        <section id="services" className="bg-white py-16 sm:py-20">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10 max-w-3xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">{t('services.eyebrow')}</p>
                    <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">{t('services.title')}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                        {t('services.copy')}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {services.map((service) => {
                        const Icon = service.icon;

                        return (
                            <Link
                                key={service.titleKey}
                                to={service.to}
                                state={service.state}
                                className="group flex min-h-56 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-[#c8952a]/60 hover:shadow-md hover:shadow-slate-950/10 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/25"
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f0f6f2] text-[#1a4731] transition group-hover:bg-[#1a4731] group-hover:text-white">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <h3 className="mt-5 text-sm font-bold leading-snug text-slate-950">{t(service.titleKey)}</h3>
                                <p className="mt-3 text-xs leading-5 text-slate-500">{t(service.copyKey)}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
