import React from 'react';
import { useTranslation } from 'react-i18next';

export default function TopBar() {
    const { t } = useTranslation();

    return (
        <div className="bg-[#1a4731] text-white">
            <div className="mx-auto flex h-8 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-3 w-5 shrink-0 overflow-hidden rounded-[1px]" aria-hidden="true">
                        <span className="w-1/3 bg-blue-700" />
                        <span className="w-1/3 bg-white" />
                        <span className="w-1/3 bg-red-700" />
                    </span>
                    <span className="truncate text-xs font-medium text-white/85">{t('topBar.republic')}</span>
                </div>
                <a className="shrink-0 rounded text-xs text-white/70 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white/70" href="#main-content">
                    {t('topBar.skip')}
                </a>
            </div>
        </div>
    );
}
