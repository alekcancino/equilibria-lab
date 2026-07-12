# Changelog

## 0.8.0 — 2026-07-11

### Dark mode redesign: neutral charcoal (Instagram/WhatsApp-style), plus theme bugs fixed

- **Redesigned the dark palette** from a blue/navy-tinted slate (`#0F172A`) to a true-neutral charcoal (`#0A0A0B` bg, `#1A1A1C` cards, `#2E2E31` borders) — no color cast in the neutrals, flat elevation via subtle borders instead of colorful ambient glow. Removed the colorful radial-gradient washes behind the app card and content area in dark mode (`--bg-grad`, `--content-wash` are now flat). The page background behind the floating app card is now true black (`#000000`).
- **Fixed real theme bugs**, not just re-tinted: several surfaces were hardcoded to a light color regardless of theme, showing as glaring white/cream boxes in dark mode —
  - `.db-item` (database preset chips, e.g. "Cu²⁺ / en") — was `background: #fff`, always white.
  - `.plot-toolbar-btn` (the floating reset-zoom/export-PNG/export-CSV buttons on every chart) — was `rgba(255,255,255,0.94)`, always a near-opaque white square floating on the chart.
  - `.badge.ok` / `.badge.warn` (inline result/warning callouts, e.g. Pourbaix's "diagrama simplificado" note) — hardcoded light green/cream backgrounds; added a `--warn-soft` token to match the existing `--ok-soft`.
  - `.editor`, `.share-btn--copied` — same class of hardcoded light hex.
  - The topbar's glossy 1px top highlight (a light-mode-only touch) is now flat/off in dark mode via a new `--topbar-sheen` token, instead of a stray white line on a dark bar.
- Updated `Predominance2D`'s dark-mode fill-tint target and "no solution" cell color to match the new neutral `--plot-bg` (was tuned to the old navy).
- Verified end-to-end with real-render QA across Home, Complejos (chart + toolbar + preset chips), the Sillén 2D map, and Pourbaix — plus a light-mode regression check confirming zero visual change there.

## 0.7.1 — 2026-07-11

### Fix: "% formado" could show impossible values above 100 % (Complejos)

- **Complejos**: the accent metric "% formado" used ñ·100 (bjerrumNumber, the mean ligand coordination number) as if it were a percentage. For a 1:1 complex ñ is bounded to [0, 1], so that's harmless — but for an N-step ladder (e.g. Zn–NH₃, 4 steps) ñ ranges 0–4, so the UI showed values like **"312.5 %"**, which isn't physically possible. Same bug affected the coupled X–M–L branch and the "pL para 50 %" operating point.
- Fixed by computing every one of these from the free-metal fraction (`1 − α_free`) instead of ñ — always bounded to [0, 100] regardless of how many complexation steps the system has, and mathematically identical to the old formula for the common 1:1 case (verified: no regression). `lib/metrics.ts`'s `percentFormed`/`percentDissociated`/`pLForPercentFormed` (ñ-based, 1:1-only) are replaced by `percentComplexed`/`pLForPercentComplexed` (α_free-based, works for any ladder).
- Audited every other percentage-based metric in the app (titrations, ion exchange, competitive precipitation, conditional constants, acid-base/speciation fractions) for the same class of bug — all are either provably bounded by construction (normalized fractions, Langmuir-type saturation formulas, explicit clamps) or are legitimately unbounded error metrics (e.g. Gran-plot % error), not mislabeled percentages.

## 0.7.0 — 2026-07-11

### Sillén map M1/M2 comparison + side-reaction mask

- **Precipitación selectiva**: the Sillén *Mapa 2D (pH–log[M])* now respects both existing 1D-chart capabilities. When the side-reaction mask is active, the map uses the metal's masked saturation boundary and dissolved-species ladder (now including the masking ligand's own complexes, e.g. Zn(NH₃)ₖ) instead of the bare-hydroxide baseline. When the M2 comparison is active, M2's own saturation curve is overlaid as a dashed reference line — giving a direct visual of the separation window without merging two independent chemical systems into one grid.
- New `solubilityRegimeFractionsMasked()` (`lib/sideReactions.ts`) and `Predominance2D`'s new `overlayCurve` prop. 4 new unit tests.
- This completes the 2D-predominance-maps feature set: pL–pH, pL–pX, Sillén pH–log[M], dark-mode remap, CSV/PNG export, and now M1/M2 + masking.

## 0.6.2 — 2026-07-11

### CSV/PNG export for the 2D predominance maps

- All three `Predominance2D` maps (pL–pH, pL–pX, Sillén pH–log[M]) now have the same export affordances as every other chart in the app. CSV export (`gridToCSV`) writes a matrix — one column per x sample, one row per y sample (highest y first), cells hold the dominant species *name* — so the file is self-describing without the on-screen legend. PNG export serializes the live SVG, resolves the `var(--text)`/`var(--text-muted)`/`var(--plot-axis)` tokens to their computed values (a standalone SVG has no CSS cascade to resolve them against), and rasterizes at 2× via an offscreen canvas.
- `PlotToolbar`'s `onResetZoom` is now optional, so diagrams with no pan/zoom (like these maps) get PNG/CSV buttons without a meaningless "reset zoom" affordance.
- Verified end-to-end in a live page: a real button click decoded to a 96 KB PNG with all text rendering correctly (no invisible CSS-var fallback), plus 11 new unit tests for `gridToCSV`'s output shape and content.

## 0.6.1 — 2026-07-11

### Dark-mode fix for the 2D predominance maps

- The canvas-painted field in `Predominance2D` (pL–pH, pL–pX, Sillén pH–log[M]) ignored the active theme, always painting the light `SPECIES_COLORS` hexes regardless of dark mode. Fixed by reusing the same `toDarkColors()` remap already used by the 1D Plotly charts, and switching the fill's white-tint mix target to the app's dark plot-bg navy so filled regions read as the same surface family as the line charts instead of washed-out light patches. Added a dark twin for the Sillén map's solid-phase gray.

## 0.6.0 — 2026-07-11

### Sillén solubility map (pH–log[M])

- **Precipitación selectiva**: new *Mapa 2D (pH–log[M])* tab — the classic Sillén solubility diagram. Above the saturation line, the solid M(OH)ₙ(s) predominates; below it, the dissolved M/M(OH)ⱼ ladder is shown by pH alone (Ksp pins the free-ion boundary via [OH⁻], so total concentration never enters the hydrolysis ratios). Amphoteric metals (Al, Zn, Pb, Cr) show the textbook U-shaped solid region with redissolution into the anionic hydroxo-complex at high pH; simple hydroxides (Ca, Mg) show a straight boundary with a single dissolved species.
- Refactored `lib/conditional.ts`: extracted `logSaturation()` from `hydroxideSolCurve` (same formula, no behavior change — covered by a regression test) so the new map can evaluate the saturation boundary per grid cell. Added `solubilityRegimeFractions()`, feeding the same generic `predominanceGrid` engine used by the other two 2D maps.
- Scoped to the M1 baseline for v1 (not the M1/M2 comparison or the side-reaction mask, both already on the 1D `log s = f(pH)` tab).

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
