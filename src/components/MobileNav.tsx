import { useT } from '../hooks/useT';

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
  const t = useT();
  return (
    <div className="mobile-nav">
      <label className="mobile-nav-field">
        <span className="mobile-nav-label">{t('mobilenav.topic')}</span>
        <select
          className="mobile-nav-select"
          value={sectionId}
          onChange={(e) => onSectionChange(e.target.value)}
          aria-label={t('mobilenav.topicAria')}
        >
          {sectionId === '' && <option value="" disabled>{t('mobilenav.home')}</option>}
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      {showTabs && (
        <label className="mobile-nav-field">
          <span className="mobile-nav-label">{t('mobilenav.view')}</span>
          <select
            className="mobile-nav-select"
            value={tabId}
            onChange={(e) => onTabChange(e.target.value)}
            aria-label={t('mobilenav.viewAria')}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
