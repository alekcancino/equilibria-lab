import { useState } from 'react';
import AcidoBase from './modules/AcidoBase';
import Titulacion from './modules/Titulacion';
import Solubilidad from './modules/Solubilidad';
import Redox from './modules/Redox';
import Pourbaix from './modules/Pourbaix';
import Mezclas from './modules/Mezclas';
import './App.css';

const MODULES = [
  { id: 'acidobase', label: 'Ácido-base', icon: '◔', component: AcidoBase },
  { id: 'titulacion', label: 'Titulaciones', icon: '⚗', component: Titulacion },
  { id: 'mezclas', label: 'Mezclas', icon: '⊕', component: Mezclas },
  { id: 'solubilidad', label: 'Solubilidad', icon: '◆', component: Solubilidad },
  { id: 'redox', label: 'Redox', icon: '⇄', component: Redox },
  { id: 'pourbaix', label: 'Pourbaix', icon: '▦', component: Pourbaix },
];

export default function App() {
  const [active, setActive] = useState('acidobase');
  const ActiveModule = MODULES.find((m) => m.id === active)!.component;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">⚖</span>
          <h1>QuimEq</h1>
          <span className="brand-sub">Laboratorio de Equilibrio Químico</span>
        </div>
        <nav className="tabs">
          {MODULES.map((m) => (
            <button
              key={m.id}
              className={active === m.id ? 'tab active' : 'tab'}
              onClick={() => setActive(m.id)}
            >
              <span className="tab-icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="content">
        <ActiveModule />
      </main>
      <footer className="assumptions">
        Supuestos: T = 25 °C · actividades ≈ concentraciones · Kw = 10⁻¹⁴ ·
        constantes de Harris, Skoog, Bard 1985 y Stumm &amp; Morgan 1996 ·
        exporta cualquier gráfica a PNG con el botón 📷 del menú de la gráfica
      </footer>
    </div>
  );
}
