import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './lang/en.json';
import tl from './lang/tl.json';
import ceb from './lang/ceb.json';

const savedLanguage = localStorage.getItem('tarsis_language') || 'en';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            tl: { translation: tl },
            ceb: { translation: ceb },
        },
        lng: ['en', 'tl', 'ceb'].includes(savedLanguage) ? savedLanguage : 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

i18n.on('languageChanged', (language) => {
    localStorage.setItem('tarsis_language', language);
});

export default i18n;
