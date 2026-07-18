import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useT } from '../hooks/useT';
import ModuleGuide, { type ModuleGuideId } from './ModuleGuide';
import ShareButton from './ShareButton';
import SavedSystemsButton from './SavedSystemsButton';

interface PanelShellProps {
  title: ReactNode;
  onReset?: () => void;
  /** Same id passed to this module's useShareEffect/useShareableState —
   * enables the "Mis sistemas" save/load button. Omit for modules without
   * share-link support (their state wouldn't be captured by a save). */
  moduleId?: string;
  guideId?: ModuleGuideId;
  children: ReactNode;
}

const STORAGE_KEY = 'equilibria-panel-open';

/** Sidebar (desktop) / bottom sheet (mobile) for module variables and controls. */
export default function PanelShell({ title, onReset, moduleId, guideId, children }: PanelShellProps) {
  const t = useT();
  const mobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [sheetOpen, setSheetOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(`(max-width: 800px)`).matches
      ? sessionStorage.getItem(STORAGE_KEY) === '1'
      : false,
  );

  useEffect(() => {
    if (!mobile) return;
    sessionStorage.setItem(STORAGE_KEY, sheetOpen ? '1' : '0');
    document.body.classList.toggle('panel-sheet-open', sheetOpen);
    return () => document.body.classList.remove('panel-sheet-open');
  }, [mobile, sheetOpen]);

  useEffect(() => {
    if (!mobile) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.inert = !sheetOpen;
    if (!sheetOpen) return;

    const inertTargets = [
      ...Array.from(sheet.parentElement?.children ?? []).filter((node) => node !== sheet && !(node as HTMLElement).classList?.contains('panel-overlay')),
      ...Array.from(document.querySelectorAll('.topbar, .assumptions')),
    ] as HTMLElement[];
    inertTargets.forEach((element) => { element.inert = true; });

    const previousFocus = document.activeElement as HTMLElement | null;
    const restoreTarget = triggerRef.current ?? previousFocus;
    window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSheetOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      inertTargets.forEach((element) => { element.inert = false; });
      window.requestAnimationFrame(() => restoreTarget?.focus());
    };
  }, [mobile, sheetOpen]);

  const header = (
    <div className="panel-header">
      <h2>{title}</h2>
      <div className="panel-header-actions">
        {moduleId && <SavedSystemsButton moduleId={moduleId} />}
        <ShareButton />
        {onReset && (
          <button type="button" className="reset-btn" onClick={onReset}>
            {t('panel.reset')}
          </button>
        )}
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          className="panel-fab"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-controls="variables-panel"
        >
          {t('panel.variables')}
        </button>
        <div
          className={`panel-overlay ${sheetOpen ? 'visible' : ''}`}
          onClick={() => setSheetOpen(false)}
          aria-hidden={!sheetOpen}
        />
        <aside
          ref={sheetRef}
          id="variables-panel"
          className={`panel panel-sheet ${sheetOpen ? 'open' : ''}`}
          role="dialog"
          aria-modal={sheetOpen}
          aria-label={typeof title === 'string' ? title : t('panel.ariaVariables')}
          aria-hidden={!sheetOpen}
        >
          <div className="panel-sheet-grab" aria-hidden />
          <button
            ref={closeRef}
            type="button"
            className="panel-sheet-close"
            onClick={() => setSheetOpen(false)}
            aria-label={t('panel.closeVariables')}
          >
            ×
          </button>
          {header}
          <div className="panel-body">
            {guideId && <ModuleGuide id={guideId} />}
            {children}
          </div>
        </aside>
      </>
    );
  }

  return (
    <aside className={`panel panel-shell ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="panel-collapse-btn"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('panel.showVariables') : t('panel.hideVariables')}
      >
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <>
          {header}
          <div className="panel-body">
            {guideId && <ModuleGuide id={guideId} />}
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
