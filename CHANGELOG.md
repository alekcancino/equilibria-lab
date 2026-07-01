# Changelog

## 0.4.0 — 2026-07-01

### UX fixes and scientific improvements

- **Ion exchange**: percentage display precision fixed (0 % → 0.5 %)
- **Activity / Pourbaix**: concentration values now use readable notation (1.35×10⁻⁵ M instead of raw scientific)
- **Solubility vs pH**: minimum solubility in result row now formatted the same way
- **Pourbaix**: module now opens with the Fe–H₂O diagram by default instead of a blank canvas
- **Subnav**: scrollable on narrow screens with hidden scrollbar
- **Acid–base mixtures**: default tab is now Buffer capacity (β) instead of the empty titration panel
- **Redox**: default diagram tab is now Distribution α
- **Complexometric titration**: added "minimum optimal pH" metric (first pH where log K′(pH) ≥ 8)

### Repository cleanup

- Added `CONTRIBUTING.md` with full dev setup, architecture reference, and academic bibliography
- Added `LICENSE` (MIT)
- Removed internal tooling files from version control
- Neutralized source-specific attribution in code comments and docs

## 0.3.0 — 2026-06-20

### Correcciones críticas

- K′ EDTA unificada con αM(OH) y `condLogK` en `edta.ts` (alineada con Constantes condicionales e indicadores).
- InfoBox EDTA corregido; token CSS `--bg-alt` definido.

### UX y accesibilidad

- Marcador vertical de pH en Solubilidad; botón Restablecer en Mezclas.
- Pourbaix: cursor pH/E, ResultCard de predominio, modo custom por defecto.
- Complejos: pestaña Equilibrio (pL) visible; PotencialCondicional oculta tab pX si toggle apagado.
- ARIA en navegación principal y DiagramTabs; `:focus-visible`; panel móvil 58vh.
- Reordenado DbPanel en Constantes condicionales (editor antes de presets).

### Motores y robustez

- `constants.ts` con PKW, KW, NERNST_S compartidos.
- Bracket checks en `solvePH`, `solubility`, `solvePe`; ventana contigua en `feasibilityWindow`.
- Curva redox incluye v=0; scope 1:1 documentado en precipitación.

### Nuevos módulos (MVP)

- **Intercambio iónico**: Ksel, lote, isoterma, breakthrough en columna.
- **Actividad / Debye-Hückel**: γ vs fuerza iónica; toggle informativo global.

### Ampliaciones

- Precipitación selectiva: log s=f(pX), pureza, redisolución en curvas U.
- Extracción: polimerización en fase orgánica y curva de preconcentración.
- Titulación: selector móvil; aviso cuando solvePH no converge.

### Calidad

- 65+ tests unitarios; smoke de presets; golden Pourbaix Cu.
- Plotly lazy-loaded en chunk separado.
- Documentación sincronizada (COBERTURA, ROADMAP, AUDITORIA, README).

## 0.2.x — 2026-06 (commits locales previos)

- Higiene: `npm run check`, eliminación de código huérfano, presets unificados.
- Tests ampliados (54→60) y lazy-load de Plotly.
- Mejoras de modelo detectado, titulaciones fuertes, referencias visibles.

## 0.0.0 — estado inicial

- Versión placeholder en `package.json` antes del versionado semver.
