import { lazy, Suspense, useState, useEffect, type ComponentType } from 'react';
import { version } from '../package.json';
import BrandLogo from './components/BrandLogo';
import MobileNav from './components/MobileNav';
import { useActivityNote } from './context/ActivityContext';
import './App.css';

// Keep ?m=<tabId> in the URL whenever the active tab changes.
// Module hooks that implement state serialization will also add ?s=.
function syncModuleUrl(tabId: string) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('m') === tabId && !params.has('s')) return;
  const next = new URLSearchParams();
  next.set('m', tabId);
  window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
}

const AcidoBase              = lazy(() => import('./modules/AcidoBase'));
const Complejos              = lazy(() => import('./modules/Complejos'));
const Redox                  = lazy(() => import('./modules/Redox'));
const Solubilidad            = lazy(() => import('./modules/Solubilidad'));
const Pourbaix               = lazy(() => import('./modules/Pourbaix'));
const Mezclas                = lazy(() => import('./modules/Mezclas'));
const ConstantesCondicionales = lazy(() => import('./modules/ConstantesCondicionales'));
const SolubilidadCondicional = lazy(() => import('./modules/SolubilidadCondicional'));
const PotencialCondicional   = lazy(() => import('./modules/PotencialCondicional'));
const ExtraccionLiquido      = lazy(() => import('./modules/ExtraccionLiquido'));
const SolubilidadSal         = lazy(() => import('./modules/SolubilidadSal'));
const Titulacion             = lazy(() => import('./modules/Titulacion'));
const IntercambioIonico      = lazy(() => import('./modules/IntercambioIonico'));
const Actividad              = lazy(() => import('./modules/Actividad'));

interface Tab { id: string; label: string; component: ComponentType }
interface Section { id: string; label: string; tabs: Tab[] }

const SECTIONS: Section[] = [
  {
    id: 'simples', label: 'Equilibrios simples',
    tabs: [
      { id: 'acidobase', label: 'Ácido-base', component: AcidoBase },
      { id: 'complejos', label: 'Complejos', component: Complejos },
      { id: 'redox', label: 'Redox', component: Redox },
      { id: 'solubilidad', label: 'Solubilidad', component: Solubilidad },
    ],
  },
  {
    id: 'multiples', label: 'Equilibrios múltiples',
    tabs: [
      { id: 'pourbaix', label: 'Redox–pH (Pourbaix)', component: Pourbaix },
      { id: 'mezclas', label: 'Mezclas ácido-base', component: Mezclas },
      { id: 'condicionalesedta', label: 'Constantes condicionales', component: ConstantesCondicionales },
      { id: 'solcond', label: 'Precipitación selectiva', component: SolubilidadCondicional },
      { id: 'potencialcond', label: 'Potencial condicional', component: PotencialCondicional },
      { id: 'extraccion', label: 'Extracción líquido-líquido', component: ExtraccionLiquido },
      { id: 'ionexchange', label: 'Intercambio iónico', component: IntercambioIonico },
      { id: 'actividad', label: 'Actividad / Debye-Hückel', component: Actividad },
      { id: 'solsal', label: 'Solubilidad y pH', component: SolubilidadSal },
    ],
  },
  {
    id: 'titulaciones', label: 'Titulaciones',
    tabs: [
      { id: 'titulacion', label: 'Titulaciones', component: Titulacion },
    ],
  },
];

function initialTabState(): { sectionId: string; tabBySection: Record<string, string> } {
  const defaults = Object.fromEntries(SECTIONS.map((s) => [s.id, s.tabs[0].id]));
  const m = new URLSearchParams(window.location.search).get('m');
  if (m) {
    for (const section of SECTIONS) {
      const tab = section.tabs.find((t) => t.id === m);
      if (tab) return { sectionId: section.id, tabBySection: { ...defaults, [section.id]: tab.id } };
    }
  }
  return { sectionId: 'simples', tabBySection: defaults };
}

export default function App() {
  const { showActivityNote, setShowActivityNote } = useActivityNote();
  const [sectionId, setSectionId] = useState(() => initialTabState().sectionId);
  const [tabBySection, setTabBySection] = useState<Record<string, string>>(() => initialTabState().tabBySection);

  const section = SECTIONS.find((s) => s.id === sectionId)!;
  const tabId = tabBySection[sectionId];
  const tab = section.tabs.find((t) => t.id === tabId) ?? section.tabs[0];
  const ActiveModule = tab.component;
  const showSubTabs = section.tabs.length > 1;

  const setTabId = (id: string) => {
    setTabBySection({ ...tabBySection, [sectionId]: id });
  };

  // Sync ?m= whenever the active tab changes (modules override with ?s= via their own hook).
  useEffect(() => { syncModuleUrl(tabId); }, [tabId]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <BrandLogo size={32} className="brand-logo" />
          <div className="brand-text">
            <h1>Equilibria Lab</h1>
            <span className="brand-sub">Simulador de equilibrio químico</span>
          </div>
        </div>
        <MobileNav
          sections={SECTIONS.map(({ id, label }) => ({ id, label }))}
          sectionId={sectionId}
          onSectionChange={setSectionId}
          tabs={section.tabs.map(({ id, label }) => ({ id, label }))}
          tabId={tabId}
          onTabChange={setTabId}
          showTabs={showSubTabs}
        />
        <nav className="sections desktop-only" role="tablist" aria-label="Secciones">
          {SECTIONS.map((s) => {
            const selected = sectionId === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                type="button"
                aria-selected={selected}
                className={selected ? 'section-btn active' : 'section-btn'}
                onClick={() => setSectionId(s.id)}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
      </header>

      {showSubTabs && (
        <div className="subnav desktop-only">
          <div className="subnav-tabs" role="tablist" aria-label={`Módulos de ${section.label}`}>
            {section.tabs.map((t) => {
              const selected = tabId === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  className={selected ? 'subnav-tab active' : 'subnav-tab'}
                  onClick={() => setTabId(t.id)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="content">
        <Suspense fallback={<div className="module-loading">Cargando…</div>}>
          <ActiveModule />
        </Suspense>
      </main>

      <footer className="assumptions">
        <details className="assumptions-details">
          <summary>Supuestos y opciones</summary>
          <p className="assumptions-text">
            T = 25 °C · actividades ≈ concentraciones · K<sub>w</sub> = 10⁻¹⁴ ·
            constantes de Harris, Skoog, Bard 1985 y Stumm &amp; Morgan 1996 ·
            exporta gráficas con el botón flotante sobre la gráfica
          </p>
        </details>
        <span className="footer-meta">
          <label className="footer-toggle">
            <input
              type="checkbox"
              checked={showActivityNote}
              onChange={(e) => setShowActivityNote(e.target.checked)}
            />
            Mostrar corrección γ
          </label>
          <span className="footer-version">v{version}</span>
        </span>
      </footer>
    </div>
  );
}
