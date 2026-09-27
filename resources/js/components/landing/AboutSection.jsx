import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ClipboardList, MapPinned, UsersRound } from 'lucide-react';

const stats = [
    { value: '34', labelKey: 'about.stats.barangays' },
    { value: 'RSBSA', labelKey: 'about.stats.records' },
];

const commitments = [
    {
        icon: ClipboardList,
        titleKey: 'about.commitments.registry.title',
        copyKey: 'about.commitments.registry.copy',
    },
    {
        icon: BadgeCheck,
        titleKey: 'about.commitments.verified.title',
        copyKey: 'about.commitments.verified.copy',
    },
    {
        icon: MapPinned,
        titleKey: 'about.commitments.visibility.title',
        copyKey: 'about.commitments.visibility.copy',
    },
];

export default function AboutSection() {
    const { t } = useTranslation();

    return (
        <section id="about" className="bg-white py-16 sm:py-20">
            <div className="mx-auto grid max-w-screen-xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-8">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8952a]">{t('about.eyebrow')}</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                        {t('about.title')}
                    </h2>
                    <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                        {t('about.copy')}
                    </p>

                    <Link
                        to="/about-tarsis"
                        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1a4731] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143826] focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
                    >
                        more about tarsis
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {stats.map((item) => (
                            <div key={item.labelKey} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-2xl font-extrabold text-[#1a4731]">{item.value}</p>
                                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{t(item.labelKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-lg border border-[#d8eadf] bg-[#f0f6f2] p-5">
                    <div className="mb-4 flex items-center gap-3 border-b border-[#d8eadf] pb-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1a4731] text-white">
                            <UsersRound className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-950">{t('about.panelTitle')}</h3>
                            <p className="text-xs text-slate-500">{t('about.panelCopy')}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {commitments.map((item) => {
                            const Icon = item.icon;

                            return (
                                <div key={item.titleKey} className="flex gap-3">
                                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#1a4731] shadow-sm shadow-slate-950/5">
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-950">{t(item.titleKey)}</h4>
                                        <p className="mt-1 text-xs leading-5 text-slate-600">{t(item.copyKey)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
