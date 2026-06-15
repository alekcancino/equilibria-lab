import { lazy, Suspense, useState, type ComponentType } from 'react';
import './App.css';

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

export default function App() {
  const [sectionId, setSectionId] = useState('simples');
  const [tabBySection, setTabBySection] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, s.tabs[0].id])),
  );

  const section = SECTIONS.find((s) => s.id === sectionId)!;
  const tabId = tabBySection[sectionId];
  const tab = section.tabs.find((t) => t.id === tabId) ?? section.tabs[0];
  const ActiveModule = tab.component;
  const showSubTabs = section.tabs.length > 1;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">⚖</span>
          <h1>QuimEq</h1>
          <span className="brand-sub">Laboratorio de Equilibrio Químico</span>
        </div>
        <nav className="sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={sectionId === s.id ? 'section-btn active' : 'section-btn'}
              onClick={() => setSectionId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {showSubTabs && (
        <div className="subnav">
          <div className="subnav-tabs">
            {section.tabs.map((t) => (
              <button
                key={t.id}
                className={tabId === t.id ? 'subnav-tab active' : 'subnav-tab'}
                onClick={() => setTabBySection({ ...tabBySection, [sectionId]: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="content">
        <Suspense fallback={<div className="module-loading">Cargando…</div>}>
          <ActiveModule />
        </Suspense>
      </main>

      <footer className="assumptions">
        Supuestos: T = 25 °C · actividades ≈ concentraciones · Kw = 10⁻¹⁴ ·
        constantes de Harris, Skoog, Bard 1985 y Stumm &amp; Morgan 1996 ·
        exporta cualquier gráfica a PNG con el botón 📷 del menú de la gráfica
      </footer>
    </div>
  );
}
