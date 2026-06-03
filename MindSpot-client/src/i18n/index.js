import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

// פונקציית עזר לעדכון כיוון האתר (body ו-html)
const updatePageDirection = (lng) => {
  const dir = lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.body.dir = dir;
};

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, he: { translation: he } },
  // שינוי ה-|| 'he' ל-|| 'en' כדי שהאתר יעלה קודם כל באנגלית
lng: localStorage.getItem('lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// 1. האזנה לשינויי שפה בזמן ריצה (כשהמשתמש מקליק על כפתור החלפת שפה)
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng); // שומר את הבחירה לפעם הבאה
  updatePageDirection(lng);
});

// 2. הפעלה ראשונית של הכיוון הנכון מיד כשהאתר עולה
updatePageDirection(i18n.language);

export default i18n;