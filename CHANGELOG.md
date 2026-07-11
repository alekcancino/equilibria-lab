# Changelog

## 0.5.0 — 2026-07-10

### 2D predominance maps

- New diagram type extending the 1D DUZP to two chemical axes. A generic engine (`lib/predominance2D.ts`) sweeps an (x, y) grid and picks the dominant species per cell; a custom SVG renderer (`components/Predominance2D.tsx`) paints the field to an offscreen canvas embedded as a single pixelated `<image>` (no per-cell DOM, no color blending across boundaries), with SVG axes, a species legend and a read-point crosshair. No Plotly dependency (basic bundle has no heatmap/contour), zero added bundle weight.
- **Especiación del metal**: new *Mapa 2D (pL–pH)* tab — metal / hydroxo / ligand predominance over pH × free ligand.
- **Complejos** (coupled X–M–L mode): new *Mapa 2D (pL–pX)* tab — two competing ligands over free L × free X; empty-state when a single ligand can't define a second axis.
- Extended the species palette from 8 to 12 colors (four Paul-Tol muted hues + dark twins) so metals with ≥9 species (e.g. 4 hydroxo + 4 amino complexes) stop cycling back to the first color. Slots 0–7 unchanged — every existing chart is identical.

## 0.4.1 — 2026-07-10

### Visual / typography / clarity pass (all modules)

- **Source citations removed from the UI**: the per-preset "Fuente: …" badge and the assumptions-summary cross-check/data-source lines ("cotejado con …", "constantes de Harris, Skoog, Bard 1985…") no longer render. Attributions live in `docs/VALIDATION.md` only. Method/diagram/convention names (Sillén, Ringbom α, Kielland, Debye–Hückel, Davies, Güntelberg, Gran, Bjerrum) stay — they're vocabulary, not sources.
- **Auxiliary-agent clarity**: concentration controls now name the actual agent ("[NH₃] libre", "Cuánto NH₃ hay disuelto") instead of a hardcoded "[L]". X is stated plainly as a second dissolved complexing agent (NH₃, citrate, en…) that competes with L — not the solvent (water is baked into the log β).
- **Acid-base "Avanzado"** replaced by a labelled section "Tipo de sistema (carga inicial z₀)" with a plain-language explanation of z₀.
- **Consistent collapsibles**: database and sub-section disclosures use one caret language (right-aligned, rotates on open) instead of mixing native ▸ markers with custom carets.
- **Clearer labels**: "Concentración del complejante Co" → "Concentración analítica del complejante (exceso sobre el metal)"; per-component mixture concentration now names the component.

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
