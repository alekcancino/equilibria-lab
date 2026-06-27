# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b && vite build → dist/
npm run test     # vitest run (all unit tests)
npm run lint     # eslint
npm run check    # lint + test + build (full CI gate)
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/engines.test.ts
```

## Architecture

**Equilibria Lab** is a fully client-side React + TypeScript + Vite app (no backend). All chemistry computation runs in the browser; the output is a static build deployable to Vercel or any static host.

### Module layout

- **`src/App.tsx`** — navigation shell. Three sections (`simples`, `multiples`, `titulaciones`), each with tabs. All modules are `React.lazy`-loaded. Sections and tabs are declared in the `SECTIONS` constant — add a new module by appending there.
- **`src/modules/`** — one file per chemistry module (14 modules). Each module owns its local state (sliders, constants, toggles) and calls into `src/lib/` engines to compute results, then renders via shared components.
- **`src/lib/`** — pure TypeScript calculation engines, no React. This is where all the chemistry math lives.
- **`src/components/`** — shared UI primitives: `Chart.tsx` (Plotly wrapper), `Controls.tsx` (sliders, toggles, DbPanel), `Editors.tsx` (AcidSystemEditor / CoupleEditor), `DUZP.tsx` (SVG predominance zone diagram), `DiagramTabs.tsx`, `PanelShell.tsx`.
- **`src/styles/tokens.css`** — all CSS custom properties (palette, spacing, typography, layout). The accent color is indigo (`#6366F1`). The colorblind-safe species palette (Okabe-Ito) lives in `src/lib/database.ts` as `SPECIES_COLORS`.

### Calculation engines (`src/lib/`)

The engines follow the Baeza/UNAM unified ladder model: acid-base, redox, and complexation all share the same `MLⱼ ⇌ MLᵢ + (j−i)L` abstraction implemented in `ladder.ts`.

| File | Responsibility |
|---|---|
| `equilibrium.ts` | `solvePH` (bisection), `alphaFractions` (log-space for stability) |
| `ladder.ts` | `ladderFractions`, `ladderLogC`, `predominanceZones` — shared by AcidoBase and Complejos |
| `complexation.ts` | `complexFractions`, `bjerrumNumber`, `solvePL` with global β constants |
| `conditional.ts` | `alphaH`, `alphaOH`, `condLogK`, `feasibilityWindow` (Ringbom), `hydroxideSolCurve` |
| `redox.ts` | `peStandard`, `peConditional`, `alphaRedox`, `redoxTitrationCurve` (supports n₁≠n₂) |
| `solubility.ts` | `solubility` by bisection over log s; conditional Ksp via anion α |
| `edta.ts` | `alphaY4`, `edtaTitrationCurve` (quadratic mass balance) |
| `titration.ts` | `titrationCurve`, `firstDerivative`, `granPlot` |
| `precipTitration.ts` | `precipTitrationCurve`, `mohrEndpointPAg` |
| `pourbaix.ts` | E–pH diagrams via Hess's law from primitive data |
| `ionExchange.ts` | `batchIonExchange`, `isothermCurve`, `breakthroughCurve` |
| `sideReactions.ts` | Side reaction stack for conditional constants |

Numerical conventions: T = 25 °C, activities ≈ concentrations, Kw = 10⁻¹⁴, **pe = E/0.05916** (no n factor in pe°), bisection solvers run ~80 iterations, α always computed in log-space.

### UI conventions

- **Progressive complexity**: modules start with the minimal valid physical model; adding pKa values, ligands, side reactions, or comparisons automatically activates the matching model layer — no mode switch needed.
- **Panel layout**: left panel (fixed `--panel-width: 320px`) holds controls; right area holds Plotly charts. `PanelShell` wraps the panel with a reset button (`↺ Restablecer`) in the header.
- **DbPanel**: collapsible database shortcut inside editors. Bibliographic references show while preset values are unmodified.
- **Feasibility badges**: `badge ok` / `badge warn` classes for quantitative verdicts (log K' ≥ threshold, disproportionation active, etc.).

### Testing

Tests live in `src/lib/__tests__/`. They validate calculation engines against known chemical values (golden cases from EquilibriaLab, Spana/HALTAFALL benchmarks). Test with `npm run test` or a single file with `npx vitest run <path>`. Tests run in `node` environment (no DOM).

### Plotly interop

Plotly's CJS module requires the `.default ?? fn` interop pattern used in `src/components/Chart.tsx`. Do not import Plotly directly in other files — go through `Chart.tsx`.

## Docs

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — detailed technical reference for the stack and engines
- [`docs/VALIDACION-Y-CONGRUENCIA.md`](docs/VALIDACION-Y-CONGRUENCIA.md) — numerical validation, known bugs fixed, benchmark comparisons
- [`docs/EXAMENES-QAIII-2025-2.md`](docs/EXAMENES-QAIII-2025-2.md) — coverage mapping against UNAM QA III exams
- [`design/DESIGN-SYSTEM.md`](design/DESIGN-SYSTEM.md) — visual design reference (Distill.pub / TED aesthetic)
