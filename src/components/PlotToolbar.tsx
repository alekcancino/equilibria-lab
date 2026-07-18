import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useT } from '../hooks/useT';

interface PlotToolbarProps {
  /** Omit for diagrams with no pan/zoom, such as 2D predominance maps. */
  onResetZoom?: () => void | Promise<void>;
  onExportPng: () => void | Promise<void>;
  onExportCsv?: () => void | Promise<void>;
}

/** Compact chart actions with one explicit export menu for every file format. */
export default function PlotToolbar({ onResetZoom, onExportPng, onExportCsv }: PlotToolbarProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'png' | 'csv' | null>(null);
  const [error, setError] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus());
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    if (items.length === 0) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  };

  const runExport = async (kind: 'png' | 'csv', action: () => void | Promise<void>) => {
    setBusy(kind);
    setError(false);
    try {
      await action();
      setOpen(false);
      triggerRef.current?.focus();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={rootRef} className="plot-toolbar" role="toolbar" aria-label={t('plotToolbar.controls')}>
      {onResetZoom && (
        <button
          type="button"
          className="plot-toolbar-btn plot-toolbar-btn-labeled"
          onClick={onResetZoom}
          title={t('plotToolbar.resetTitle')}
          aria-label={t('plotToolbar.reset')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 12a9 9 0 1 0 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 4v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t('plotToolbar.resetView')}</span>
        </button>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="plot-toolbar-btn plot-toolbar-btn-labeled plot-export-trigger"
        onClick={() => {
          setError(false);
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3v12M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 21h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>{t('plotToolbar.export')}</span>
        <span className="ui-chevron" aria-hidden />
      </button>
      {open && (
        <div ref={menuRef} id={menuId} className="plot-export-menu" role="menu" aria-label={t('plotToolbar.exportOptions')} onKeyDown={handleMenuKeyDown}>
          <button type="button" role="menuitem" disabled={busy !== null} onClick={() => runExport('png', onExportPng)}>
            <span className="plot-export-icon" aria-hidden>PNG</span>
            <span><strong>{t('plotToolbar.pngTitle')}</strong><small>{t('plotToolbar.pngDetail')}</small></span>
            {busy === 'png' && <span className="plot-export-busy" aria-hidden />}
          </button>
          {onExportCsv && (
            <button type="button" role="menuitem" disabled={busy !== null} onClick={() => runExport('csv', onExportCsv)}>
              <span className="plot-export-icon" aria-hidden>CSV</span>
              <span><strong>{t('plotToolbar.csvTitle')}</strong><small>{t('plotToolbar.csvDetail')}</small></span>
              {busy === 'csv' && <span className="plot-export-busy" aria-hidden />}
            </button>
          )}
          {error && <p className="plot-export-error" role="alert">{t('plotToolbar.exportError')}</p>}
        </div>
      )}
    </div>
  );
}
