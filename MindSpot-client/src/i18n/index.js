import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

const updatePageDirection = (lng) => {
  const dir = lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.body.dir = dir;
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, he: { translation: he } },
lng: localStorage.getItem('lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng);
  updatePageDirection(lng);
});

updatePageDirection(i18n.language);

export default i18n;