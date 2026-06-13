# Arquitectura de QuimEq

Estado al **2026-06-13** (v4). Documento de referencia técnica: stack, motores de
cálculo, componentes compartidos, convenciones y validación.

## Stack

- **Vite + React + TypeScript**, todo client-side (sin backend).
- **plotly.js-basic-dist-min** para gráficas. Interop CJS bajo Vite en
  `src/components/Chart.tsx` (`.default ?? fn`).
- Salida estática: `npm run build` → `dist/`.

## Estructura de carpetas

```
src/
  App.tsx              Navegación: 3 secciones × N módulos, estado de pestañas
  App.css              Todo el CSS (variables, layout, controles, DUZP, tabs)
  components/
    Chart.tsx          Wrapper de Plotly (export PNG, modebar, layout común)
    Controls.tsx       Slider, ConcSlider, Toggle, Segmented, ConstantList,
                       DbPanel, ResultCard, InfoBox, LabelField, SelectControl
    Editors.tsx        AcidSystemEditor, CoupleEditor (editor + DB colapsable)
    DiagramTabs.tsx    Pestañas DUZP / α / logC dentro de un módulo
    DUZP.tsx           Diagrama Unidimensional de Zonas de Predominio (SVG)
  lib/                 Motores de cálculo puros (sin React)
  modules/             Un archivo por módulo de la app
```

## Motores de cálculo (`src/lib/`)

| Archivo | Responsabilidad |
|---|---|
| `equilibrium.ts` | Balance de cargas exacto, `alphaFractions`, `solvePH` por bisección |
| `ladder.ts` | Motor unificado de escalera: `ladderFractions`, `ladderLogC`, `predominanceZones` (barrido + bisección, robusto a zonas degeneradas) |
| `complexation.ts` | Complejación multi-β: `complexFractions`, `bjerrumNumber`, `solvePL`, `logBetasToStepwise` |
| `redox.ts` | `peStandard` (= E°/0.05916), `peConditional`, `alphaRedox`, `redoxTitrationCurve` (balance de electrones, n₁≠n₂) |
| `solubility.ts` | `solubility` por bisección sobre log s; Kps condicional vía α del anión |
| `edta.ts` | `alphaY4`, `edtaTitrationCurve` (cuadrática del balance de masas) |
| `titration.ts` | `titrationCurve` ácido-base, `firstDerivative`, `titratableProtons` |
| `precipTitration.ts` | `precipTitrationCurve` argentométrica, indicador Mohr, presets X⁻ |
| `pourbaix.ts` | Construcción de diagramas E–pH por ley de Hess desde datos primitivos |
| `database.ts`, `redoxDatabase.ts`, `complexDatabase.ts`, `speciesNames.ts` | Datos de referencia |

### Principio del motor: modelo unificado Baeza/UNAM

Toda escalera de equilibrio se trata como `MLⱼ ⇌ MLᵢ + (j−i)L`, donde la
partícula intercambiada `L` es H⁺ (ácido-base), e⁻ (redox) o un ligando
(complejación). `ladder.ts` encapsula esto y lo comparten Ácido-base y Complejos
(con `ascending` true/false según crezca o decrezca la escala).

## Componente firma: DUZP

`DUZP.tsx` dibuja en SVG (viewBox 1000×240) las zonas de predominio coloreadas con
la paleta Okabe-Ito (colorblind-safe, en `SPECIES_COLORS`). Recibe `zones`,
`pMin/pMax`, `pLabel`, `marker?`, `caption?`. Es el diagrama central del enfoque
pedagógico UNAM.

## Patrones de UI

- **Editor primario + DB colapsable.** El usuario edita nombre libre y constantes
  con ±; la DB es un atajo opcional (`DbPanel`). Las referencias bibliográficas se
  retiraron de la UI por decisión de diseño (v4).
- **DiagramTabs** uniforme: Ácido-base, Complejos y Redox comparten el layout de
  pestañas de diagrama. Titulaciones usa `chart-tabs` para elegir el *tipo* de
  titulación.
- **Botón ↺ Restablecer** en cada módulo (cabecera del panel, `panel-header`).
- **Badge de factibilidad** (`badge ok` / `badge warn`) para veredictos
  cuantitativos (log K ≥ umbral, indicador adecuado, etc.).

## Convenciones numéricas

- **T = 25 °C**, actividades ≈ concentraciones, Kw = 10⁻¹⁴.
- **pe = E/0.05916** (Sillén/Baeza, *sin* factor n en pe°).
- α calculadas en espacio logarítmico para evitar overflow con constantes grandes.
- Solvers por bisección (típicamente 80 iteraciones).

## Validación matemática

- `alphaFractions` pasa los golden cases de EquilibriaLab a precisión doble
  (H₃PO₄ pH=0 → α₀=0.99293).
- pH validados: HAc 0.1 M → 2.88; NH₃ → 11.12; NaHCO₃ → 8.34.
- pe° MnO₄⁻ = 25.52, Fe³⁺ = 13.03; logK(Fe/MnO₄⁻) ≈ 62.
- Bugs corregidos en auditoría v4: `solvePL` valida residual físico (BUG-M1);
  cuadrática EDTA estabilizada para logK'<3 (BUG-M2). Detalle en el historial de
  git y en la memoria del proyecto.

## Bugs P0 de EquilibriaLab ya corregidos en QuimEq

- **P0-2** pe° sin factor n · **P0-3** zonas invertidas (sweep en vez de aritmética
  de fronteras) · **P0-7** estequiometría n₁≠n₂ en titulación redox.
