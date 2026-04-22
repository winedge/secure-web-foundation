/**
 * i18n setup using i18next + react-i18next.
 * - Browser language is auto-detected (with localStorage persistence).
 * - English is the source/fallback language.
 * - Add new locales by dropping a resource bundle into the `resources` map.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';

export const resources = {
  en: { translation: en },
  es: { translation: es },
} as const;

export type AppLocale = keyof typeof resources;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app_locale',
    },
    returnNull: false,
  });

export default i18n;
