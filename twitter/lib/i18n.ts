import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import hi from '@/locales/hi.json';
import pt from '@/locales/pt.json';
import zh from '@/locales/zh.json';
import fr from '@/locales/fr.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  hi: { translation: hi },
  pt: { translation: pt },
  zh: { translation: zh },
  fr: { translation: fr },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
  });

export default i18n;
