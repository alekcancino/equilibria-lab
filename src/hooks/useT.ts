import { useCallback } from 'react';
import { useLanguage } from './useLanguage';
import { translations, type TKey } from '../i18n/translations';

/**
 * Translation hook. `t('key')` returns the string in the current language;
 * `t('key', { token: value })` replaces `{token}` placeholders (used for the
 * handful of strings that interpolate a already-translated word, e.g.
 * "{role} débil" / "weak {role}").
 */
export function useT() {
  const lang = useLanguage();
  return useCallback(
    (key: TKey, vars?: Record<string, string | number>): string => {
      const template = translations[key][lang];
      if (!vars) return template;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        template,
      );
    },
    [lang],
  );
}
