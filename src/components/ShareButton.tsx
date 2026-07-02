import { useState } from 'react';

/** Copies the current URL to clipboard and shows a brief confirmation. */
export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const el = document.createElement('textarea');
      el.value = window.location.href;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className={`share-btn${copied ? ' share-btn--copied' : ''}`}
      onClick={handleClick}
      aria-label="Compartir enlace de este escenario"
      title="Compartir"
    >
      {copied ? '¡Enlace copiado!' : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2" />
          </svg>
          Compartir
        </>
      )}
    </button>
  );
}
