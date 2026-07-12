// Mirrors useTheme.ts's pattern exactly: localStorage persistence, a custom
// event so every consumer re-renders in sync, system-preference fallback
// (navigator.language) only when the user never chose explicitly.

import { useEffect, useState } from 'react';

export type Lang = 'es' | 'en';

const STORAGE_KEY = 'equilibria-lang';
const EVENT = 'equilibria-langchange';

export function resolveInitialLanguage(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch { /* storage unavailable (private mode) — fall through to browser */ }
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function applyLanguage(lang: Lang) {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }));
}

/** Current UI language, reactive to the toggle. */
export function useLanguage(): Lang {
  const [lang, setLang] = useState<Lang>(() =>
    (document.documentElement.lang as Lang) || resolveInitialLanguage());

  useEffect(() => {
    const onChange = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return lang;
}
