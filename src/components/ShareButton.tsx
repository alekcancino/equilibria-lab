import { useState } from 'react';
import { useT } from '../hooks/useT';

async function copyCurrentUrl(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = window.location.href;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(el);
      return copied;
    } catch {
      return false;
    }
  }
}

/** Copies the current URL to clipboard and shows a brief confirmation. */
export default function ShareButton() {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleClick = async () => {
    setFailed(false);
    if (await copyCurrentUrl()) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }
    setFailed(true);
    window.setTimeout(() => setFailed(false), 4000);
  };

  const label = copied ? t('share.copied') : failed ? t('share.failed') : t('share.label');

  return (
    <button
      type="button"
      className={`share-btn${copied ? ' share-btn--copied' : ''}${failed ? ' share-btn--failed' : ''}`}
      onClick={handleClick}
      aria-label={t('share.ariaLabel')}
      title={label}
    >
      {copied || failed ? label : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2" />
          </svg>
          {t('share.label')}
        </>
      )}
    </button>
  );
}
