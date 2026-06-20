interface SectionOption {
  id: string;
  label: string;
}

interface TabOption {
  id: string;
  label: string;
}

interface MobileNavProps {
  sections: SectionOption[];
  sectionId: string;
  onSectionChange: (id: string) => void;
  tabs: TabOption[];
  tabId: string;
  onTabChange: (id: string) => void;
  showTabs: boolean;
}

/** Compact section/module selectors for viewports ≤800px. */
export default function MobileNav({
  sections,
  sectionId,
  onSectionChange,
  tabs,
  tabId,
  onTabChange,
  showTabs,
}: MobileNavProps) {
  return (
    <div className="mobile-nav">
      <label className="mobile-nav-field">
        <span className="mobile-nav-label">Sección</span>
        <select
          className="mobile-nav-select"
          value={sectionId}
          onChange={(e) => onSectionChange(e.target.value)}
          aria-label="Sección del simulador"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      {showTabs && (
        <label className="mobile-nav-field">
          <span className="mobile-nav-label">Módulo</span>
          <select
            className="mobile-nav-select"
            value={tabId}
            onChange={(e) => onTabChange(e.target.value)}
            aria-label="Módulo activo"
          >
            {tabs.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
