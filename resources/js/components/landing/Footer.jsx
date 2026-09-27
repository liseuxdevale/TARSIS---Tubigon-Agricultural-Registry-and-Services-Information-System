import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MapPin, Phone, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const languages = [
    { code: 'en', labelKey: 'footer.languageEnglish' },
    { code: 'tl', labelKey: 'footer.languageTagalog' },
    { code: 'ceb', labelKey: 'footer.languageBisaya' },
];

export default function Footer() {
    const { i18n, t } = useTranslation();

    const changeLanguage = (language) => {
        i18n.changeLanguage(language);
    };

    return (
        <footer id="contact" className="bg-slate-950 text-white">
            <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
                <div>
                    <p className="text-lg font-bold">{t('footer.office')}</p>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                        {t('footer.copy')}
                    </p>
                    <div className="mt-5 space-y-3 text-sm text-slate-300">
                        <p className="flex gap-3">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#c8952a]" aria-hidden="true" />
                            {t('footer.address')}
                        </p>
                        <p className="flex gap-3">
                            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#c8952a]" aria-hidden="true" />
                            {t('footer.hotline')}
                        </p>
                        <p className="flex gap-3">
                            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#c8952a]" aria-hidden="true" />
                            {t('footer.email')}
                        </p>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-white">{t('footer.quickLinks')}</h2>
                    <div className="mt-4 grid gap-3 text-sm">
                        <a className="text-slate-300 transition hover:text-white" href="/#about">{t('footer.about')}</a>
                        <a className="text-slate-300 transition hover:text-white" href="/#services">{t('footer.services')}</a>
                        <a className="text-slate-300 transition hover:text-white" href="/#digital-id">{t('footer.digitalId')}</a>
                        <Link className="text-slate-300 transition hover:text-white" to="/announcements">{t('footer.advisories')}</Link>
                        <Link className="text-slate-300 transition hover:text-white" to="/map">{t('footer.map')}</Link>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-white">{t('footer.legal')}</h2>
                    <div className="mt-4 grid gap-3 text-sm">
                        <a className="text-slate-300 transition hover:text-white" href="#main-content">{t('footer.accessibility')}</a>
                        <a className="text-slate-300 transition hover:text-white" href="#contact">{t('footer.privacy')}</a>
                        <a className="text-slate-300 transition hover:text-white" href="#contact">{t('footer.terms')}</a>
                    </div>
                    <div className="mt-6">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-white">{t('footer.language')}</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {languages.map((language) => {
                                const active = i18n.resolvedLanguage === language.code || i18n.language === language.code;

                                return (
                                    <button
                                        key={language.code}
                                        type="button"
                                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#c8952a]/40 ${active ? 'border-[#c8952a] bg-[#c8952a] text-white' : 'border-white/15 text-slate-300 hover:border-[#c8952a] hover:text-white'}`}
                                        aria-pressed={active}
                                        onClick={() => changeLanguage(language.code)}
                                    >
                                        {t(language.labelKey)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                        <a
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:border-[#c8952a] hover:text-white"
                            href="https://web.facebook.com/profile.php?id=61573277068816"
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t('footer.facebook')}
                        >
                            <Share2 className="h-4 w-4" aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-screen-xl flex-col gap-2 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p>{t('footer.copyright')}</p>
                    <p>{t('footer.systemName')}</p>
                </div>
            </div>
        </footer>
    );
}
