import { applyLanguage, useLanguage } from '../hooks/useLanguage';
import { useT } from '../hooks/useT';
import type { KeyboardEvent } from 'react';

const CODES = ['es', 'en'] as const;

/** ES/EN segmented control in the top bar; persists to localStorage. */
export default function LanguageToggle() {
  const lang = useLanguage();
  const t = useT();

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const group = event.currentTarget.closest('[role="radiogroup"]');
    if (!group) return;
    const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = radios.indexOf(event.currentTarget);
    if (current < 0) return;
    event.preventDefault();
    let next = current;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = radios.length - 1;
    if (event.key === 'ArrowRight') next = (current + 1) % radios.length;
    if (event.key === 'ArrowLeft') next = (current - 1 + radios.length) % radios.length;
    applyLanguage(CODES[next]);
    radios[next]?.focus();
  };

  return (
    <div className="lang-toggle-group" role="radiogroup" aria-label={t('language.ariaLabel')}>
      {CODES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          tabIndex={lang === code ? 0 : -1}
          className={lang === code ? 'lang-toggle-btn active' : 'lang-toggle-btn'}
          onClick={() => applyLanguage(code)}
          onKeyDown={onKeyDown}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
