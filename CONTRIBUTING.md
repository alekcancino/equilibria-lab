# Contributing to Equilibria Lab

Thank you for your interest in contributing. This document covers how to set up the project locally, the codebase architecture, and contribution guidelines.

## Local development

**Requirements:** Node.js 20+ and npm.

```bash
git clone https://github.com/alekcancino/equilibria-lab.git
cd equilibria-lab
npm install
npm run dev        # dev server at http://localhost:5173
```

Other commands:

```bash
npm run build      # tsc -b && vite build → dist/
npm run test       # vitest run (all unit tests)
npm run lint       # eslint
npm run check      # lint + test + build (full CI gate)
```

Run a single test file:

```bash
npx vitest run src/lib/__tests__/engines.test.ts
```

## Architecture

Equilibria Lab is a fully client-side React + TypeScript + Vite app — no backend. All chemistry computation runs in the browser; the output is a static build deployable to Vercel or any static host.

### Module layout

| Path | Role |
|---|---|
| `src/App.tsx` | Navigation shell. Three sections (`simples`, `multiples`, `titulaciones`), each with tabs. All modules are `React.lazy`-loaded. Add a new module by appending to the `SECTIONS` constant. |
| `src/modules/` | One file per chemistry module (14 total). Each module owns its local state and calls into `src/lib/` engines, then renders via shared components. |
| `src/lib/` | Pure TypeScript calculation engines — no React. This is where all the chemistry math lives. |
| `src/components/` | Shared UI primitives: `Chart.tsx` (Plotly wrapper), `Controls.tsx` (sliders, toggles, DbPanel), `Editors.tsx`, `DUZP.tsx` (SVG predominance zone diagram), `DiagramTabs.tsx`, `PanelShell.tsx`. |
| `src/styles/tokens.css` | All CSS custom properties (palette, spacing, typography, layout). |

### Calculation engines (`src/lib/`)

| File | Responsibility |
|---|---|
| `equilibrium.ts` | `solvePH` (bisection), `alphaFractions` (log-space for numerical stability) |
| `ladder.ts` | `ladderFractions`, `ladderLogC`, `predominanceZones` — unified equilibrium ladder shared by acid–base and complexation |
| `complexation.ts` | `complexFractions`, `bjerrumNumber`, `solvePL` with global β constants |
| `conditional.ts` | `alphaH`, `alphaOH`, `condLogK`, `feasibilityWindow` (Ringbom criterion), `hydroxideSolCurve` |
| `redox.ts` | `peStandard`, `peConditional`, `alphaRedox`, `redoxTitrationCurve` (supports n₁ ≠ n₂) |
| `solubility.ts` | `solubility` by bisection over log s; conditional Ksp via anion α |
| `edta.ts` | `alphaY4`, `edtaTitrationCurve` (quadratic mass balance) |
| `titration.ts` | `titrationCurve`, `firstDerivative`, `granPlot` |
| `precipTitration.ts` | `precipTitrationCurve`, `mohrEndpointPAg` |
| `pourbaix.ts` | E–pH diagrams via Hess's law from primitive half-reaction data |
| `ionExchange.ts` | `batchIonExchange`, `isothermCurve`, `breakthroughCurve` |
| `sideReactions.ts` | Side-reaction stack for conditional constants |

**Numerical conventions:** T = 25 °C, activities ≈ concentrations, Kw = 10⁻¹⁴, pe = E/0.05916 V (no n factor in pe°), bisection solvers run ~80 iterations, α always computed in log-space.

### Adding a new module

1. Create `src/modules/MyModule.tsx` following the pattern of an existing module.
2. Add an entry to `SECTIONS` in `src/App.tsx`.
3. Add any new calculation engine functions to the appropriate `src/lib/` file (or create a new one).
4. Write unit tests in `src/lib/__tests__/`.

### UI conventions

- **Progressive complexity**: modules start with the minimal valid physical model. Adding pKa values, ligands, side reactions, or comparison systems activates the corresponding model layer automatically — no mode switch needed.
- **Panel layout**: left panel (fixed `--panel-width: 320px`) holds controls; right area holds Plotly charts. `PanelShell` wraps the panel with a reset button (↺ Restablecer / Reset) in the header.
- **DbPanel**: collapsible database shortcut inside editors. Bibliographic references are shown while preset values are unmodified.
- **Feasibility badges**: `badge ok` / `badge warn` CSS classes for quantitative verdicts (log K′ ≥ threshold, disproportionation active, etc.).

### Plotly interop

Plotly's CJS module requires the `.default ?? fn` interop pattern used in `src/components/Chart.tsx`. Do not import Plotly directly in other files — always go through `Chart.tsx`.

### Testing

Tests live in `src/lib/__tests__/`. They validate calculation engines against known chemical values (golden cases cross-checked with SPANA/HALTAFALL benchmarks). Run with `npm run test` or target a single file with `npx vitest run <path>`. Tests run in the `node` environment (no DOM).

## Contribution guidelines

- Open an issue to discuss significant changes before submitting a PR.
- Keep calculation engines pure (no React, no side effects) and add/update tests for any engine change.
- Run `npm run check` before opening a PR — it runs lint, all tests, and a production build.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`).
- One logical change per PR; include a brief description of the chemistry behind the change if it is not obvious.

## Academic references

The calculation methodology follows standard analytical equilibrium textbooks:

- Harris, D. C. *Quantitative Chemical Analysis*, 10th ed. W. H. Freeman, 2020.
- Skoog, D. A.; West, D. M.; Holler, F. J.; Crouch, S. R. *Fundamentals of Analytical Chemistry*, 9th ed. Cengage, 2014.
- Stumm, W.; Morgan, J. J. *Aquatic Chemistry*, 3rd ed. Wiley-Interscience, 1996.
- Ringbom, A. *Complexation in Analytical Chemistry*. Interscience, 1963.
- Sillén, L. G.; Martell, A. E. *Stability Constants of Metal-Ion Complexes*. Chemical Society, 1964.

The unified equilibrium ladder abstraction (acid–base, redox, and complexation treated as the same `MLⱼ ⇌ MLᵢ + (j−i)L` structure) is well-established in the teaching of chemical equilibrium and implemented in `src/lib/ladder.ts`.
