import { applyLanguage, useLanguage } from '../hooks/useLanguage';

/** ES/EN pill in the top bar; persists to localStorage. Mirrors ThemeToggle. */
export default function LanguageToggle() {
  const lang = useLanguage();
  const next = lang === 'es' ? 'en' : 'es';
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => applyLanguage(next)}
      aria-label={next === 'en' ? 'Switch to English' : 'Cambiar a español'}
      title={next === 'en' ? 'English' : 'Español'}
    >
      {lang.toUpperCase()}
    </button>
  );
}
