import { lazy, Suspense, useState, useEffect, type ComponentType } from 'react';
import { version } from '../package.json';
import BrandLogo from './components/BrandLogo';
import MobileNav from './components/MobileNav';
import Home from './components/Home';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import { useActivityNote } from './context/ActivityContext';
import { useT } from './hooks/useT';
import type { TKey } from './i18n/translations';
import { handleTabKeyDown } from './lib/tabKeyboard';
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

function pushModuleUrl(viewId: string | null) {
  const current = new URLSearchParams(window.location.search).get('m');
  if (current === viewId) return;
  const url = viewId === null
    ? window.location.pathname
    : `${window.location.pathname}?m=${encodeURIComponent(viewId)}`;
  window.history.pushState(null, '', url);
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

interface View { id: string; labelKey: TKey; component: ComponentType }

export interface HubMeta {
  id: string;
  labelKey: TKey;
  /** One-line description shown on the home card. */
  descKey: TKey;
  /** Hub-specific model assumptions (methodology only; source citations live in docs). */
  assumptionsKey: TKey;
}

interface Hub extends HubMeta { views: View[] }

// View ids are the historical ?m= module ids so every shared link keeps working.
const HUBS: Hub[] = [
  {
    id: 'acidobase', labelKey: 'hub.acidobase.label',
    descKey: 'hub.acidobase.desc',
    assumptionsKey: 'hub.acidobase.assumptions',
    views: [
      { id: 'acidobase', labelKey: 'view.acidobase.label', component: AcidoBase },
      { id: 'mezclas', labelKey: 'view.mezclas.label', component: Mezclas },
    ],
  },
  {
    id: 'complejos', labelKey: 'hub.complejos.label',
    descKey: 'hub.complejos.desc',
    assumptionsKey: 'hub.complejos.assumptions',
    views: [
      { id: 'complejos', labelKey: 'view.complejos.label', component: Complejos },
      { id: 'especiacion', labelKey: 'view.especiacion.label', component: EspeciacionMetal },
      { id: 'condicionalesedta', labelKey: 'view.condicionalesedta.label', component: ConstantesCondicionales },
    ],
  },
  {
    id: 'redox', labelKey: 'hub.redox.label',
    descKey: 'hub.redox.desc',
    assumptionsKey: 'hub.redox.assumptions',
    views: [
      { id: 'redox', labelKey: 'view.redox.label', component: Redox },
      { id: 'potencialcond', labelKey: 'view.potencialcond.label', component: PotencialCondicional },
      { id: 'pourbaix', labelKey: 'view.pourbaix.label', component: Pourbaix },
    ],
  },
  {
    id: 'solubilidad', labelKey: 'hub.solubilidad.label',
    descKey: 'hub.solubilidad.desc',
    assumptionsKey: 'hub.solubilidad.assumptions',
    views: [
      { id: 'solubilidad', labelKey: 'view.solubilidad.label', component: Solubilidad },
      { id: 'solsal', labelKey: 'view.solsal.label', component: SolubilidadSal },
      { id: 'solcond', labelKey: 'view.solcond.label', component: SolubilidadCondicional },
      { id: 'solcomp', labelKey: 'view.solcomp.label', component: PrecipitacionCompetitiva },
    ],
  },
  {
    id: 'separaciones', labelKey: 'hub.separaciones.label',
    descKey: 'hub.separaciones.desc',
    assumptionsKey: 'hub.separaciones.assumptions',
    views: [
      { id: 'extraccion', labelKey: 'view.extraccion.label', component: ExtraccionLiquido },
      { id: 'ionexchange', labelKey: 'view.ionexchange.label', component: IntercambioIonico },
    ],
  },
  {
    id: 'titulaciones', labelKey: 'hub.titulaciones.label',
    descKey: 'hub.titulaciones.desc',
    assumptionsKey: 'hub.titulaciones.assumptions',
    views: [
      { id: 'titulacion', labelKey: 'view.titulacion.label', component: Titulacion },
    ],
  },
  {
    id: 'actividad', labelKey: 'hub.actividad.label',
    descKey: 'hub.actividad.desc',
    assumptionsKey: 'hub.actividad.assumptions',
    views: [
      { id: 'actividad', labelKey: 'view.actividad.label', component: Actividad },
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
  const t = useT();
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
    pushModuleUrl(viewId);
    setViewByHub((prev) => ({ ...prev, [h.id]: viewId }));
    setActiveViewId(viewId);
  };

  const openHub = (hubId: string) => {
    const h = HUBS.find((x) => x.id === hubId);
    if (!h) return;
    openView(viewByHub[h.id] ?? h.views[0].id);
  };

  const goHome = () => {
    pushModuleUrl(null);
    setActiveViewId(null);
  };

  // Sync ?m= whenever the active view changes (modules override with ?s= via their own hook).
  useEffect(() => { syncModuleUrl(activeViewId); }, [activeViewId]);

  useEffect(() => {
    const restoreFromHistory = () => {
      const nextView = initialViewId();
      setActiveViewId(nextView);
      if (nextView) {
        const nextHub = findHubByView(nextView);
        if (nextHub) {
          setViewByHub((prev) => ({ ...prev, [nextHub.id]: nextView }));
        }
      }
    };
    window.addEventListener('popstate', restoreFromHistory);
    return () => window.removeEventListener('popstate', restoreFromHistory);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand brand-btn" onClick={goHome} aria-label={t('chrome.goHome')}>
          <BrandLogo size={32} className="brand-logo" />
          <div className="brand-text">
            <h1>Equilibria Lab</h1>
            <span className="brand-sub">{t('chrome.tagline')}</span>
          </div>
        </button>
        <MobileNav
          sections={HUBS.map(({ id, labelKey }) => ({ id, label: t(labelKey) }))}
          sectionId={hub?.id ?? ''}
          onSectionChange={openHub}
          tabs={(hub?.views ?? []).map(({ id, labelKey }) => ({ id, label: t(labelKey) }))}
          tabId={activeViewId ?? ''}
          onTabChange={openView}
          showTabs={showSubTabs}
        />
        <nav className="sections desktop-only" role="tablist" aria-label={t('chrome.topics')}>
          {HUBS.map((h, index) => {
            const selected = hub?.id === h.id;
            const tabIndex = hub ? (selected ? 0 : -1) : (index === 0 ? 0 : -1);
            return (
              <button
                key={h.id}
                role="tab"
                type="button"
                aria-selected={selected}
                tabIndex={tabIndex}
                className={selected ? 'section-btn active' : 'section-btn'}
                onClick={() => openHub(h.id)}
                onKeyDown={handleTabKeyDown}
              >
                {t(h.labelKey)}
              </button>
            );
          })}
        </nav>
        <LanguageToggle />
        <ThemeToggle />
      </header>

      {hub && showSubTabs && (
        <div className="subnav desktop-only">
          <div className="subnav-tabs" role="tablist" aria-label={`${t('chrome.viewsOf')} ${t(hub.labelKey)}`}>
            {hub.views.map((v) => {
              const selected = activeViewId === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className={selected ? 'subnav-tab active' : 'subnav-tab'}
                  onClick={() => openView(v.id)}
                  onKeyDown={handleTabKeyDown}
                >
                  {t(v.labelKey)}
                </button>
              );
            })}
          </div>
          <details className="hub-assumptions">
            <summary>{t('chrome.assumptionsShort')}</summary>
            <p>{t(hub.assumptionsKey)}</p>
          </details>
        </div>
      )}

      <main className="content">
        {view ? (
          <Suspense fallback={<div className="module-loading">{t('chrome.loading')}</div>}>
            <view.component />
          </Suspense>
        ) : (
          <Home hubs={HUBS.map(({ id, labelKey, descKey, views }) => ({
            id, label: t(labelKey), desc: t(descKey),
            views: views.map(({ id: vid, labelKey: vLabelKey }) => ({ id: vid, label: t(vLabelKey) })),
          }))} onOpenView={openView} />
        )}
      </main>

      <footer className="assumptions">
        <details className="assumptions-details">
          <summary>{t('chrome.assumptionsLong')}</summary>
          <p className="assumptions-text">
            {t('chrome.assumptionsBase1')}<sub>w</sub>{t('chrome.assumptionsBase2')}
            {hub && <> · <strong>{t(hub.labelKey)}:</strong> {t(hub.assumptionsKey)}</>}
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
              {t('chrome.showActivityCorrection')}
            </label>
          )}
          <span className="footer-version">v{version}</span>
        </span>
      </footer>
    </div>
  );
}
