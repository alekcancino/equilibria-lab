import { useEffect, useState, type ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import ShareButton from './ShareButton';

interface PanelShellProps {
  title: ReactNode;
  onReset?: () => void;
  children: ReactNode;
}

const STORAGE_KEY = 'equilibria-panel-open';

/** Sidebar (desktop) / bottom sheet (mobile) for module variables and controls. */
export default function PanelShell({ title, onReset, children }: PanelShellProps) {
  const mobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
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

  const header = (
    <div className="panel-header">
      <h2>{title}</h2>
      <div className="panel-header-actions">
        <ShareButton />
        {onReset && (
          <button type="button" className="reset-btn" onClick={onReset}>
            ↺ Restablecer
          </button>
        )}
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        <button
          type="button"
          className="panel-fab"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-controls="variables-panel"
        >
          Variables
        </button>
        <div
          className={`panel-overlay ${sheetOpen ? 'visible' : ''}`}
          onClick={() => setSheetOpen(false)}
          aria-hidden={!sheetOpen}
        />
        <aside
          id="variables-panel"
          className={`panel panel-sheet ${sheetOpen ? 'open' : ''}`}
          role="dialog"
          aria-modal={sheetOpen}
          aria-label={typeof title === 'string' ? title : 'Panel de variables'}
          aria-hidden={!sheetOpen}
        >
          <div className="panel-sheet-grab" aria-hidden />
          <button
            type="button"
            className="panel-sheet-close"
            onClick={() => setSheetOpen(false)}
            aria-label="Cerrar variables"
          >
            ×
          </button>
          {header}
          <div className="panel-body">{children}</div>
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
        aria-label={collapsed ? 'Mostrar panel de variables' : 'Ocultar panel de variables'}
      >
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <>
          {header}
          <div className="panel-body">{children}</div>
        </>
      )}
    </aside>
  );
}
