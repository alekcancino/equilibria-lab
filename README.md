# Equilibria Lab

**Interactive web simulator for chemical equilibrium** — live plots, sliders, and numerical prediction across acid–base, complexation, redox, solubility, titrations, and coupled equilibria. Fully client-side; no backend or account required.

**Simulador web interactivo de equilibrio químico** — gráficas en tiempo real, controles deslizantes y predicción numérica para sistemas ácido-base, complejación, redox, solubilidad, titulaciones y equilibrios acoplados. Sin backend ni cuenta de usuario.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-equilibria--lab.vercel.app-6366f1)](https://equilibria-lab.vercel.app)

---

## Demo

**[equilibria-lab.vercel.app](https://equilibria-lab.vercel.app)** — open in any browser, no install required.

---

## Modules

### Core equilibria · Equilibrios fundamentales

| Module | Description |
| --- | --- |
| **Acid–base** | Predominance zone diagram (DUZP), α fractions, log *C*–pH diagram (Sillén), and solution pH for editable HₙA / BHₙ⁺ systems. |
| **Complexation** | Multi-ligand systems: DUZP, α distributions, Bjerrum number *n̄*, log *C* vs pL. |
| **Redox** | α distribution vs pe, spontaneous-reaction prediction scale, editable redox couples, log *K* of the cell reaction. |
| **Solubility** | log *s* vs pH with conditional Ksp, editable basic anions, and common-ion effect. |
| **Activity** | Ionic strength, γ vs *I* (extended Debye–Hückel), and model limitations. |

### Coupled equilibria · Equilibrios acoplados

| Module | Description |
| --- | --- |
| **Pourbaix** | Generic Mⁿ⁺/M/M(OH)ₙ model and *E*–pH diagrams for Fe, Cu, Mn, Zn, Cr. |
| **Acid–base mixtures** | Up to four coexisting systems (e.g. NaHCO₃, NH₄Cl): global pH, dominant species, mixture titration. |
| **Conditional constants** | log *K*′ = *f*(pH), α coefficients, side reactions, masking, and feasibility window. |
| **Selective precipitation** | log *s* = *f*(pH) and log *s* = *f*(pX), purity, redissolution, and separation windows. |
| **Conditional potential** | *E*°′ = *f*(pH), disproportionation, *E*°′ = *f*(pX) by complexation. |
| **Liquid–liquid extraction** | Partition, chelates, successive extractions, polymerization, and preconcentration. |
| **Ion exchange** | Selectivity coefficient, batch equilibrium, isotherm, and ideal-model column breakthrough. |
| **Solubility vs pH** | Conditional solubility of salts and side-by-side system comparison. |

### Titrations · Titulaciones

One unified module with five modes:

- **Acid–base** — acid or base titrant, exact charge balance.
- **Complexometric** — metal + EDTA or EDTA + metal, conditional K′f, optimal pH.
- **Redox** — analyte oxidation/reduction, electron balance, conditional pe°′.
- **Precipitation** — argentometry Ag⁺ + X⁻, pAg / pX curves, Mohr endpoint.
- **Potentiometric** — glass electrode, derivatives, and Gran plot.

---

## Design principles

**The user always defines the system.** Every module provides a primary editor (free labels, adjustable constants) and a collapsible database as a shortcut. A reset button restores defaults on every module.

**The UI grows with system complexity.** Adding pKa values, ligands, side reactions, or comparison systems activates the corresponding model layer automatically — no need to select a theory category first.

**Figure first.** The plot is the hero of each module. Key numeric outputs surface in a metrics row immediately below the chart — readable from a classroom projector.

---

## Calculation engine

- pH by **exact charge balance** (bisection), with α computed in log-space for numerical stability.
- Redox with **pe = *E* / 0.05916 V** and electron balance.
- Complexation with global β constants, Bjerrum number, and free-ligand pL from mass balance.
- Default assumptions: *T* = 25 °C, activities ≈ concentrations, *K*w = 10⁻¹⁴.
- Constants from Harris (2020), Skoog et al. (2014), Stumm & Morgan (1996), and Bard & Faulkner (1985).

---

## Local development

```bash
git clone https://github.com/alekcancino/equilibria-lab.git
cd equilibria-lab
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # static build in dist/
npm run test     # unit tests (vitest)
npm run check    # lint + test + build
```

**Stack:** Vite · React · TypeScript · Plotly (basic dist). Static build — deployable to Vercel, GitHub Pages, or any static host.

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details and contribution guidelines.

---

## Documentation

| File | Contents |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, architecture, contribution workflow, academic references. |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Detailed technical reference for the stack and engines. |
| [docs/VALIDACION-Y-CONGRUENCIA.md](docs/VALIDACION-Y-CONGRUENCIA.md) | Numerical validation and benchmark comparisons (SPANA/HALTAFALL). |
| [docs/PROYECTOS-RELACIONADOS-Y-ROADMAP.md](docs/PROYECTOS-RELACIONADOS-Y-ROADMAP.md) | Related open-source tools, module matrix, and roadmap. |
| [CHANGELOG.md](CHANGELOG.md) | Version history. |

---

## License

[MIT](LICENSE) — free to use, study, modify, and distribute.
