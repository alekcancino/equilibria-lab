import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useT } from '../hooks/useT';
import { handleTabKeyDown } from '../lib/tabKeyboard';

export interface DiagramTab {
  id: string;
  label: string;
  node: ReactNode;
}

/**
 * Diagram switcher with identical layout across all equilibrium modules
 * (predominance diagram / α distribution / log C). Visual consistency makes the app
 * intuitive: learn once, apply to acid-base, complexes, and redox.
 */
export default function DiagramTabs({ tabs, initialId }: { tabs: DiagramTab[]; initialId?: string }) {
  const t = useT();
  const baseId = useId();
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initialId ?? tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  useEffect(() => {
    tabBarRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <div className="diagram-tabs">
      <div ref={tabBarRef} className="diagram-tab-bar" role="tablist" aria-label={t('controls.diagrams')}>
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              id={`${baseId}-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'diagram-tab active' : 'diagram-tab'}
              onClick={() => setActive(t.id)}
              onKeyDown={handleTabKeyDown}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-panel-${current.id}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="diagram-tab-body"
      >
        {current.node}
      </div>
    </div>
  );
}
