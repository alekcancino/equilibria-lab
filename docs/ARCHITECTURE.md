# Architecture

Technical reference for the Equilibria Lab stack, calculation engines, shared components, and numerical conventions.

## Stack

- **Vite + React + TypeScript** — fully client-side, no backend.
- **plotly.js-basic-dist-min** for charts. CJS interop under Vite handled in `src/components/Chart.tsx` (`.default ?? fn`).
- Static output: `npm run build` → `dist/`.

## Folder structure

```
src/
  App.tsx              Navigation: 3 sections × N modules, tab state
  App.css              All CSS (variables, layout, controls, predominance diagram, tabs)
  styles/
    tokens.css         Design tokens (palette, spacing, radius, shadows)
  components/
    Chart.tsx          Plotly wrapper (PNG export, modebar, shared layout)
    Controls.tsx       Slider, ConcSlider, Toggle, Segmented, ConstantList,
                       DbPanel, ResultCard, InfoBox, LabelField, SelectControl,
                       PanelSection, Disclosure, ResultChips, SystemPresetPicker
    Editors.tsx        AcidSystemEditor, CoupleEditor, SideReactionEditor
    DiagramTabs.tsx    Predominance diagram / α / logC tab layout within a module
    PredominanceDiagram.tsx  Predominance zone diagram (SVG)
  lib/                 Pure calculation engines (no React)
  modules/             One file per app module
```

## Design system

Tokens in [`src/styles/tokens.css`](../src/styles/tokens.css). Shared premium components:

- **`PanelSection`** — rounded section card with header (icon + title). Groups related controls; replaces loose `<h3>` elements.
- **`Disclosure`** — single-level accordion for advanced layers; replaces nested `<details>`.
- **`ResultChips`** — floating result chips above the chart (`.plot-area` is `position:relative`). The `accent` item uses an indigo gradient for the key value.
- **`SystemPresetPicker`** — complete-system selector (see presets below).

New tokens: `--accent-grad`, `--bg-grad`, `--glass-*`, `--radius-xl/2xl`, `--shadow-card/float`.

## Complete-system presets (`systemPresets.ts`)

`SYSTEM_PRESETS` declares full systems (Zn–EDTA–NH₃, Ni–EDTA, Ca/Mg/Cu/Fe–EDTA) that load metal + log K_f + conditions + a complete `SideReactionEditorState` in one click, **keeping all manual editing**. They reuse `defaultSideEditorState` / `sideStackFromEditor` from `sideReactions.ts`. Currently wired in the EDTA titration module. Tests: `__tests__/systemPresets.test.ts`.

## Active modules

### Section — Core equilibria

| Module | Tab | Description |
|---|---|---|
| `AcidoBase.tsx` | Ácido-base | Predominance diagram + α + logC. Polyprotic acids, amphoteric species. |
| `Complejos.tsx` | Complejos | Predominance diagram + α + Bjerrum n̄ + logC. Complexation database. |
| `Redox.tsx` | Redox | α vs pe, spontaneous-reaction prediction scale. |
| `Solubilidad.tsx` | Solubilidad | Ksp, common-ion effect. |

### Section — Coupled equilibria

| Module | Tab | Description |
|---|---|---|
| `Pourbaix.tsx` | Redox–pH (Pourbaix) | E–pH diagrams from primitive data. Custom mode with sliders. |
| `Mezclas.tsx` | Mezclas ácido-base | Mixture logC, mixture pH, buffer capacity β = f(pH). |
| `ConstantesCondicionales.tsx` | Constantes condicionales | log K′ = f(pH), α coefficients, masking, feasibility window (Ringbom). |
| `SolubilidadCondicional.tsx` | Precipitación selectiva | log s = f(pH) for M(OH)ₙ, amphoteric hydroxo-complexes, selective window. |
| `PotencialCondicional.tsx` | Potencial condicional | E°′ = f(pH), couple crossover, disproportionation (Latimer), E°′ = f(pX). |
| `ExtraccionLiquido.tsx` | Extracción líquido-líquido | Simple/acid-base partition, chelates, log D = f(pH), multiple extractions and separation factor. |
| `SolubilidadSal.tsx` | Solubilidad y pH | log S = f(pH) for salts with weak-acid anions, α distribution. |
| `Actividad.tsx` | Actividad / Debye-Hückel | Ionic strength, γ vs I (extended Debye–Hückel). |

### Section — Titrations

| Module | Tab | Description |
|---|---|---|
| `Titulacion.tsx` | Titulaciones | 5 modes: acid-base, direct/back EDTA, redox, precipitation, and potentiometric (Gran plot + derivatives). |

## Calculation engines (`src/lib/`)

| File | Responsibility |
|---|---|
| `equilibrium.ts` | Exact charge balance, `alphaFractions`, `solvePH` by bisection |
| `ladder.ts` | Unified equilibrium ladder: `ladderFractions`, `ladderLogC`, `predominanceZones` (sweep + bisection, robust to degenerate zones) |
| `complexation.ts` | Multi-β complexation: `complexFractions`, `bjerrumNumber`, `solvePL`, `logBetasToStepwise` |
| `conditional.ts` | Conditional constants: `alphaH`, `alphaOH`, `alphaL`, `condLogKCurve`, `feasibilityWindow`, `hydroxideSolCurve`, `precipitationPH` |
| `redox.ts` | `peStandard`, `peConditional`, `alphaRedox`, `redoxTitrationCurve` (electron balance, n₁ ≠ n₂) |
| `solubility.ts` | `solubility` by bisection over log s; conditional Ksp via anion α |
| `edta.ts` | `alphaY4` (delegates to `conditional.ts`), `edtaTitrationCurve` (quadratic mass balance) |
| `titration.ts` | `titrationCurve` (acid-base), `firstDerivative`, `titratableProtons`, `granVeq`, `quantitativity` |
| `precipTitration.ts` | `precipTitrationCurve` (argentometric), Mohr indicator, X⁻ presets |
| `pourbaix.ts` | E–pH diagram construction by Hess's law from primitive half-reaction data |
| `metrics.ts` | Derived UI metrics: `percentFormed`, `operatingPoint`, `fractionFormedExcess`, `condLogKAtPH` |
| `activity.ts` | Extended Debye–Hückel: `activityCoefficient`, `ionicStrength`, `apparentPKw` |
| `database.ts` | Acid/base presets, `SPECIES_COLORS` (Okabe-Ito colorblind-safe palette) |
| `redoxDatabase.ts` | Redox couples with E°, n, mH, name |
| `complexDatabase.ts` | Complexation systems with global log β |
| `speciesNames.ts` | Species label generation |

### Unified equilibrium ladder

Every equilibrium ladder is treated as `MLⱼ ⇌ MLᵢ + (j−i)L`, where the exchanged particle `L` is H⁺ (acid–base), e⁻ (redox), or a ligand (complexation). `ladder.ts` encapsulates this abstraction and is shared by the acid–base and complexation modules (`ascending` true/false depending on whether the scale increases or decreases).

## Signature component: PredominanceDiagram

`PredominanceDiagram.tsx` draws predominance zones in SVG (viewBox 1000×240) using the Okabe-Ito palette (`SPECIES_COLORS`, colorblind-safe). It receives `zones`, `pMin/pMax`, `pLabel`, `marker?`, `caption?`.

## UI patterns

- **Progressive complexity by variables.** The initial state is the minimal valid physical model. Adding constants, components, side reactions, or comparison systems expands the model automatically; the UI shows the inferred model without asking the user to classify it redundantly.
- **`ModelBadge`.** All modules declare the inferred base model and show only the active additional layers as labels (protonation, hydrolysis, comparison, indicator, derivative, etc.).
- **Secondary layers off by default.** Markers, derivatives, indicators, comparisons, and auxiliary lines are activated explicitly when needed; they do not clutter the initial view.
- **Primary editor + collapsible database.** Users edit free labels and constants with ±; the database is an optional shortcut (`DbPanel`). Bibliographic references are shown as long as preset values have not been edited.
- **Uniform `DiagramTabs`** across acid-base, complexation, redox, and coupled-equilibria modules.
- **↺ Reset button** in every module header (`panel-header`).
- **Feasibility badge** (`badge ok` / `badge warn`) for quantitative verdicts (log K′ ≥ threshold, disproportionation active, suitable indicator, etc.).

## Numerical conventions

- **T = 25 °C**, activities ≈ concentrations, Kw = 10⁻¹⁴.
- **pe = E / 0.05916 V** (Sillén convention, *without* factor n in pe°).
- α computed in log-space to avoid overflow with large constants.
- Bisection solvers (~80 iterations typical).

## Mathematical validation

See [`VALIDATION.md`](VALIDATION.md) for congruence with Spana/HALTAFALL, constant conversions, planned benchmarks, and engine limits.

See [`RELATED-PROJECTS.md`](RELATED-PROJECTS.md) for the open-source ecosystem comparison.

**Summary of validated golden cases:**

- `alphaFractions` passes golden cases at double precision (H₃PO₄ pH = 0 → α₀ = 0.99293).
- Validated pH: HAc 0.1 M → 2.88; NH₃ → 11.12; NaHCO₃ → 8.34.
- pe°: MnO₄⁻ = 25.52, Fe³⁺ = 13.03; log K(Fe/MnO₄⁻) ≈ 62.
- Ca–EDTA: log K′f(pH 10) ≈ 10.2; feasibility window pH 7.5–12 (threshold 8).
- Fe³⁺/Ni²⁺ selective precipitation: window pH ≈ 3–9 with log S threshold = −5.
- E°′(MnO₄⁻/Mn²⁺) at pH 0 = +1.51 V → at pH 14 ≈ +0.68 V (slope −59.2·8/5 mV/pH).
- Cu⁺ disproportionation: E°′(Cu²⁺/Cu⁺) > E°′(Cu⁺/Cu⁰) → disproportionates → confirmed in module.
