import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const newLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded-full border border-border text-xs font-bold hover:bg-primary/10 transition-colors"
    >
      {i18n.language === 'he' ? 'EN' : 'עב'}
    </button>
  );
}
