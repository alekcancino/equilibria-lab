import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'equilibria-theme';
const EVENT = 'equilibria-themechange';

export function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage unavailable (private mode) — fall through to system */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

/** Current theme, reactive to the toggle and to system changes when unset. */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() =>
    (document.documentElement.dataset.theme as Theme) || resolveInitialTheme());

  useEffect(() => {
    const onChange = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, onChange);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (e: MediaQueryListEvent) => {
      // Only follow the system when the user never chose a theme explicitly.
      let stored: string | null = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* private mode */ }
      if (stored === 'light' || stored === 'dark') return;
      applyTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onSystemChange);

    return () => {
      window.removeEventListener(EVENT, onChange);
      media.removeEventListener('change', onSystemChange);
    };
  }, []);

  return theme;
}
