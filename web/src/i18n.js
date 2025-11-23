import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            de: { translation: de },
            en: { translation: en }
        },
        lng: 'en', // Default language, will be overridden by user's company locale
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already escapes values
        }
    });

document.documentElement.lang = i18n.language;
export default i18n;
