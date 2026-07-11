import { lazy, Suspense, useState, useEffect, type ComponentType } from 'react';
import { version } from '../package.json';
import BrandLogo from './components/BrandLogo';
import MobileNav from './components/MobileNav';
import Home from './components/Home';
import ThemeToggle from './components/ThemeToggle';
import { useActivityNote } from './context/ActivityContext';
import './App.css';

// Keep ?m=<viewId> in the URL whenever the active view changes.
// Module hooks that implement state serialization will also add ?s=.
function syncModuleUrl(viewId: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('m') === viewId) return;
  if (viewId === null) {
    window.history.replaceState(null, '', window.location.pathname);
    return;
  }
  const next = new URLSearchParams();
  next.set('m', viewId);
  window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
}

const AcidoBase              = lazy(() => import('./modules/AcidoBase'));
const Complejos              = lazy(() => import('./modules/Complejos'));
const EspeciacionMetal       = lazy(() => import('./modules/EspeciacionMetal'));
const Redox                  = lazy(() => import('./modules/Redox'));
const Solubilidad            = lazy(() => import('./modules/Solubilidad'));
const Pourbaix               = lazy(() => import('./modules/Pourbaix'));
const Mezclas                = lazy(() => import('./modules/Mezclas'));
const ConstantesCondicionales = lazy(() => import('./modules/ConstantesCondicionales'));
const SolubilidadCondicional = lazy(() => import('./modules/SolubilidadCondicional'));
const PotencialCondicional   = lazy(() => import('./modules/PotencialCondicional'));
const ExtraccionLiquido      = lazy(() => import('./modules/ExtraccionLiquido'));
const SolubilidadSal         = lazy(() => import('./modules/SolubilidadSal'));
const PrecipitacionCompetitiva = lazy(() => import('./modules/PrecipitacionCompetitiva'));
const Titulacion             = lazy(() => import('./modules/Titulacion'));
const IntercambioIonico      = lazy(() => import('./modules/IntercambioIonico'));
const Actividad              = lazy(() => import('./modules/Actividad'));

interface View { id: string; label: string; component: ComponentType }

export interface HubMeta {
  id: string;
  label: string;
  /** One-line description shown on the home card. */
  desc: string;
  /** Hub-specific model assumptions (methodology only; source citations live in docs). */
  assumptions: string;
}

interface Hub extends HubMeta { views: View[] }

// View ids are the historical ?m= module ids so every shared link keeps working.
const HUBS: Hub[] = [
  {
    id: 'acidobase', label: 'Ácido-base',
    desc: 'pH, distribución de especies y diagramas de un sistema o de mezclas.',
    assumptions: 'Balance de cargas exacto (bisección) · pKa por etapa.',
    views: [
      { id: 'acidobase', label: 'Sistema único', component: AcidoBase },
      { id: 'mezclas', label: 'Mezclas', component: Mezclas },
    ],
  },
  {
    id: 'complejos', label: 'Complejos',
    desc: 'Formación de complejos, número de Bjerrum, sistemas X–M–L acoplados y constantes condicionales.',
    assumptions: 'Complejos mononucleares MLₙ · α de Ringbom para reacciones parásitas.',
    views: [
      { id: 'complejos', label: 'Equilibrio (pL)', component: Complejos },
      { id: 'especiacion', label: 'Especiación vs pH', component: EspeciacionMetal },
      { id: 'condicionalesedta', label: 'K′ condicional', component: ConstantesCondicionales },
    ],
  },
  {
    id: 'redox', label: 'Redox',
    desc: 'Escala de predicción, potencial condicional E°′ y diagramas de Pourbaix.',
    assumptions: 'pe = E/0.05916 V (convención de Sillén) · E°′ = f(pH) por mH/n · Pourbaix data-driven vía ley de Hess.',
    views: [
      { id: 'redox', label: 'Escala y DUZP', component: Redox },
      { id: 'potencialcond', label: 'E°′ condicional', component: PotencialCondicional },
      { id: 'pourbaix', label: 'Pourbaix (E–pH)', component: Pourbaix },
    ],
  },
  {
    id: 'solubilidad', label: 'Solubilidad',
    desc: 'Kps, efecto del pH e ion común, hidróxidos anfóteros, precipitación selectiva y competitiva.',
    assumptions: 'Sólidos iónicos MmXx con Kps · anión básico y complejos hidroxo vía α · selección de fases por prueba de combinaciones (2 sales).',
    views: [
      { id: 'solubilidad', label: 'Kps e ion común', component: Solubilidad },
      { id: 'solsal', label: 'Solubilidad y pH', component: SolubilidadSal },
      { id: 'solcond', label: 'Precipitación selectiva', component: SolubilidadCondicional },
      { id: 'solcomp', label: 'Competitiva (2 sales)', component: PrecipitacionCompetitiva },
    ],
  },
  {
    id: 'separaciones', label: 'Separaciones',
    desc: 'Extracción líquido-líquido e intercambio iónico condicionados por el pH.',
    assumptions: 'Reparto de la especie neutra (D = Kd·α) · resina con balance en 3 compartimentos.',
    views: [
      { id: 'extraccion', label: 'Extracción L–L', component: ExtraccionLiquido },
      { id: 'ionexchange', label: 'Intercambio iónico', component: IntercambioIonico },
    ],
  },
  {
    id: 'titulaciones', label: 'Titulaciones',
    desc: 'Curvas de valoración ácido-base, EDTA, redox, precipitación y potenciométricas.',
    assumptions: 'pH/pM/pe exactos punto a punto con dilución · función de Gran y cuantitatividad.',
    views: [
      { id: 'titulacion', label: 'Curvas de titulación', component: Titulacion },
    ],
  },
  {
    id: 'actividad', label: 'Actividad',
    desc: 'Coeficientes γ — Debye–Hückel, Kielland, Davies o Güntelberg — fuerza iónica y pKw aparente.',
    assumptions: 'Debye–Hückel extendida (a ≈ 3 Å) válida a I ≲ 0.1 M · K′w = Kw/(γH·γOH).',
    views: [
      { id: 'actividad', label: 'Debye–Hückel', component: Actividad },
    ],
  },
];

function findHubByView(viewId: string): Hub | undefined {
  return HUBS.find((h) => h.views.some((v) => v.id === viewId));
}

function initialViewId(): string | null {
  const m = new URLSearchParams(window.location.search).get('m');
  if (m && findHubByView(m)) return m;
  return null; // no (valid) module in the URL → home
}

export default function App() {
  const { showActivityNote, setShowActivityNote } = useActivityNote();
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViewId);
  // Remember the last visited view per hub so hub tabs return where you left off.
  const [viewByHub, setViewByHub] = useState<Record<string, string>>(() => {
    const defaults = Object.fromEntries(HUBS.map((h) => [h.id, h.views[0].id]));
    const v = initialViewId();
    if (v) {
      const hub = findHubByView(v)!;
      defaults[hub.id] = v;
    }
    return defaults;
  });

  const hub = activeViewId ? findHubByView(activeViewId) : undefined;
  const view = hub?.views.find((v) => v.id === activeViewId);
  const showSubTabs = (hub?.views.length ?? 0) > 1;

  const openView = (viewId: string) => {
    const h = findHubByView(viewId);
    if (!h) return;
    setViewByHub((prev) => ({ ...prev, [h.id]: viewId }));
    setActiveViewId(viewId);
  };

  const openHub = (hubId: string) => {
    const h = HUBS.find((x) => x.id === hubId);
    if (!h) return;
    setActiveViewId(viewByHub[h.id] ?? h.views[0].id);
  };

  const goHome = () => setActiveViewId(null);

  // Sync ?m= whenever the active view changes (modules override with ?s= via their own hook).
  useEffect(() => { syncModuleUrl(activeViewId); }, [activeViewId]);

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand brand-btn" onClick={goHome} aria-label="Ir al inicio">
          <BrandLogo size={32} className="brand-logo" />
          <div className="brand-text">
            <h1>Equilibria Lab</h1>
            <span className="brand-sub">Simulador de equilibrio químico</span>
          </div>
        </button>
        <MobileNav
          sections={HUBS.map(({ id, label }) => ({ id, label }))}
          sectionId={hub?.id ?? ''}
          onSectionChange={openHub}
          tabs={(hub?.views ?? []).map(({ id, label }) => ({ id, label }))}
          tabId={activeViewId ?? ''}
          onTabChange={openView}
          showTabs={showSubTabs}
        />
        <nav className="sections desktop-only" role="tablist" aria-label="Temas">
          {HUBS.map((h) => {
            const selected = hub?.id === h.id;
            return (
              <button
                key={h.id}
                role="tab"
                type="button"
                aria-selected={selected}
                className={selected ? 'section-btn active' : 'section-btn'}
                onClick={() => openHub(h.id)}
              >
                {h.label}
              </button>
            );
          })}
        </nav>
        <ThemeToggle />
      </header>

      {hub && showSubTabs && (
        <div className="subnav desktop-only">
          <div className="subnav-tabs" role="tablist" aria-label={`Vistas de ${hub.label}`}>
            {hub.views.map((v) => {
              const selected = activeViewId === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  className={selected ? 'subnav-tab active' : 'subnav-tab'}
                  onClick={() => openView(v.id)}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          <details className="hub-assumptions">
            <summary>ⓘ Supuestos</summary>
            <p>{hub.assumptions}</p>
          </details>
        </div>
      )}

      <main className="content">
        {view ? (
          <Suspense fallback={<div className="module-loading">Cargando…</div>}>
            <view.component />
          </Suspense>
        ) : (
          <Home hubs={HUBS.map(({ id, label, desc, views }) => ({
            id, label, desc, views: views.map(({ id: vid, label: vlabel }) => ({ id: vid, label: vlabel })),
          }))} onOpenView={openView} />
        )}
      </main>

      <footer className="assumptions">
        <details className="assumptions-details">
          <summary>Supuestos y opciones</summary>
          <p className="assumptions-text">
            T = 25 °C · actividades ≈ concentraciones · K<sub>w</sub> = 10⁻¹⁴ ·
            exporta gráficas con el botón flotante sobre la gráfica
            {hub && <> · <strong>{hub.label}:</strong> {hub.assumptions}</>}
          </p>
        </details>
        <span className="footer-meta">
          {activeViewId === 'acidobase' && (
            <label className="footer-toggle">
              <input
                type="checkbox"
                checked={showActivityNote}
                onChange={(e) => setShowActivityNote(e.target.checked)}
              />
              Mostrar corrección γ
            </label>
          )}
          <span className="footer-version">v{version}</span>
        </span>
      </footer>
    </div>
  );
}
