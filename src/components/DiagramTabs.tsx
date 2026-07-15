import { useId, useState, type ReactNode } from 'react';

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
  const baseId = useId();
  const [active, setActive] = useState(initialId ?? tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="diagram-tabs">
      <div className="diagram-tab-bar" role="tablist" aria-label="Diagramas">
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
