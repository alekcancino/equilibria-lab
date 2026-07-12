import type { ReactNode } from 'react';
import { useT } from '../hooks/useT';

interface HomeView { id: string; label: string }
interface HomeHub { id: string; label: string; desc: string; views: HomeView[] }

/**
 * Minimal stroke sketches of each hub's signature diagram, drawn with theme
 * tokens so they adapt to light/dark. viewBox 100×60, no text.
 */
const SKETCHES: Record<string, ReactNode> = {
  acidobase: (
    <>
      <path d="M6 8 C 38 8, 44 52, 76 52" />
      <path d="M6 52 C 38 52, 44 8, 76 8" className="sk-alt" />
      <line x1="41" y1="6" x2="41" y2="54" className="sk-guide" />
    </>
  ),
  complejos: (
    <>
      <path d="M4 50 C 16 50, 18 12, 28 12 C 38 12, 40 50, 50 50" />
      <path d="M28 50 C 40 50, 42 18, 52 18 C 62 18, 64 50, 74 50" className="sk-alt" />
      <path d="M52 50 C 66 50, 70 24, 96 22" />
    </>
  ),
  redox: (
    <>
      <line x1="8" y1="16" x2="60" y2="16" />
      <line x1="34" y1="34" x2="88" y2="34" className="sk-alt" />
      <line x1="20" y1="52" x2="72" y2="52" />
      <line x1="48" y1="8" x2="48" y2="58" className="sk-guide" />
    </>
  ),
  solubilidad: (
    <>
      <path d="M8 10 C 30 46, 44 52, 54 52 C 68 52, 80 40, 92 14" />
      <line x1="8" y1="56" x2="92" y2="56" className="sk-guide" />
    </>
  ),
  separaciones: (
    <>
      <line x1="6" y1="30" x2="94" y2="30" className="sk-guide" />
      <path d="M8 52 C 30 52, 40 12, 62 10 C 74 9, 84 10, 92 12" />
      <path d="M8 12 C 30 12, 40 48, 62 50 C 74 51, 84 50, 92 48" className="sk-alt" />
    </>
  ),
  titulaciones: (
    <>
      <path d="M6 50 C 30 48, 40 46, 46 40 C 50 34, 50 24, 54 18 C 60 10, 78 8, 94 8" />
      <line x1="50" y1="6" x2="50" y2="56" className="sk-guide" />
    </>
  ),
  actividad: (
    <>
      <path d="M8 10 C 20 26, 50 34, 92 38" />
      <path d="M8 10 C 18 36, 44 48, 92 52" className="sk-alt" />
      <line x1="8" y1="10" x2="92" y2="10" className="sk-guide" />
    </>
  ),
};

/** Landing screen: one card per hub. Shown when the URL carries no ?m=. */
export default function Home({
  hubs, onOpenView,
}: {
  hubs: HomeHub[];
  onOpenView: (viewId: string) => void;
}) {
  const t = useT();
  return (
    <div className="home">
      <div className="home-intro">
        <h2>{t('home.title')}</h2>
        <p>{t('home.intro')}</p>
      </div>
      <div className="home-grid">
        {hubs.map((h) => (
          <article key={h.id} className="home-card">
            <button
              type="button"
              className="home-card-main"
              onClick={() => onOpenView(h.views[0].id)}
            >
              <svg className="home-sketch" viewBox="0 0 100 60" aria-hidden="true">
                {SKETCHES[h.id]}
              </svg>
              <h3>{h.label}</h3>
              <p>{h.desc}</p>
            </button>
            {h.views.length > 1 && (
              <div className="home-card-views">
                {h.views.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="home-view-chip"
                    onClick={() => onOpenView(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
