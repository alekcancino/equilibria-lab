import { useState, type ReactNode } from 'react';

export interface DiagramTab {
  id: string;
  label: string;
  node: ReactNode;
}

/**
 * Conmutador de diagramas con layout idéntico en todos los módulos de equilibrio
 * (DUZP / Distribución α / log C). La consistencia visual es lo que hace la app
 * intuitiva: se aprende una vez y aplica a ácido-base, complejos y redox.
 */
export default function DiagramTabs({ tabs, initialId }: { tabs: DiagramTab[]; initialId?: string }) {
  const [active, setActive] = useState(initialId ?? tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="diagram-tabs">
      <div className="diagram-tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={t.id === active ? 'diagram-tab active' : 'diagram-tab'}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="diagram-tab-body">{current.node}</div>
    </div>
  );
}
