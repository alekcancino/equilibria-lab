# Roadmap

This document describes what is currently available and what is planned for future releases. For the full list of implemented modules see the [README](README.md).

Suggestions and contributions are welcome — open an [issue](https://github.com/alekcancino/equilibria-lab/issues) to discuss.

---

## Currently available

### Core equilibria

- Acid–base: α fractions, log *C*–pH diagram, predominance zone diagram, pure solution pH, aqua-acid cations (Fe³⁺, Al³⁺)
- Complexation: multi-ligand systems, Bjerrum number, α distributions, log *C* vs pL, editable per-species labels; metal side reactions as a Ringbom pX′ shift or as a rigorously coupled X–M–L two-ligand equilibrium (both mass balances solved simultaneously)
- Redox: α vs pe, spontaneous-reaction prediction, conditional pe°′
- Solubility: log *s* vs pH with conditional Ksp, common-ion effect, molecular acid/base solid solubility (pH-dependent ionization), free MmXx stoichiometry; Debye–Hückel activity corrections applied to the solver
- Activity: ionic strength, γ vs *I* with four selectable models — extended Debye–Hückel (a = 3 Å), Kielland per-ion sizes, Davies (valid to I ≈ 0.5 M), Güntelberg; corrections wired to solubility, complexation, and conditional-constant engines

### Coupled equilibria

- Pourbaix diagrams: *E*–pH for Fe, Cu, Mn, Zn, Cr and fully custom N-species / N-couples systems with auto-derived boundaries; "edit this system" seeds custom mode from any preset (lossless for hydroxide-only systems — Fe, Zn, Ni, Cr; partial for systems with a disproportionation/oxide solid — Cu, Mn, Pb — with an inline warning listing what wasn't carried over)
- Acid–base mixtures: up to four coexisting systems, each fully user-editable (free label, pKa list, z₀ incl. aqua-cations, database presets as auto-fill), any starting salt form per component, buffer capacity β = *f*(pH)
- Conditional constants: log *K*′ = *f*(pH), side reactions, masking, feasibility window (Ringbom), optional activity correction of *K*f at *I* > 0
- Selective precipitation: log *s* = *f*(pH) and log *s* = *f*(pX), separation windows, redissolution
- Competitive precipitation: two salts sharing a common cation — fractional-precipitation curves, HALTAFALL-style solid-phase selection (combination testing), separation window and residual-fraction analysis
- Conditional potential: *E*°′ = *f*(pH), disproportionation (Latimer), *E*°′ = *f*(pX)
- Liquid–liquid extraction: partition, chelates, successive extractions, preconcentration
- Ion exchange: batch equilibrium with general zA:zB charge stoichiometry (concentration-valency effect), isotherm, Craig *N*-plate multi-zone column model, breakthrough and elution curves
- Solubility vs pH: conditional solubility of salts, side-by-side system comparison, editable cation charge

### Titrations (unified module)

- Acid–base, complexometric (EDTA), redox, precipitation (argentometry, free MmXx stoichiometry), potentiometric (Gran plot); shareable links and saved systems for all 5 sub-modes

### Data and export

- Equilibrium constants database: formation constants, E° values, Ksp, pKa — sourced from Harris (*Quantitative Chemical Analysis*) and Skoog (*Analytical Chemistry*)
- CSV export with metadata headers on every chart (module, system, conditions, date)
- Shareable scenario links: full module state encoded in the URL
- Saved systems: name and persist any scenario locally (localStorage) from the "Mis sistemas" button in every module's panel — reuses the shareable-link mechanism, so it works everywhere that has one
- In-app assumptions summary: each hub's model assumptions (methodology) are shown in the assumptions summary. Source citations and cross-check/validation detail are kept out of the UI and live in `docs/VALIDATION.md` — the app surface shows methodology, not attributions

---

## Planned

### UI discoverability audit (2026-07-10) — resolved

A user-perspective pass (triggered by "no veo dónde hacer un sistema X-M-L custom" —
correct: the feature existed but was badly surfaced) found a systemic gap: capabilities
added as a mode/toggle inside an existing view didn't get surfaced anywhere outside that
view, unlike capabilities added as a brand-new tab. All 5 findings were fixed the same
day: Complejos' X–M–L toggle now opens its ligand-X editor in one click instead of two
(no more collapsed `<details>` behind a jargon toggle), the section is relabeled "Ligando
X — presets y log β" instead of the stale Ringbom-era "α_M(L)" name, the toggle itself is
now "Segundo agente complejante (X)" instead of "Reacciones parásitas del metal (X)", and
both the Complejos and Actividad home cards mention their session's new capabilities
(X–M–L, the 4 γ models). Actividad's "D-H (a=3 Å)" segmented button — which wrapped to
two lines while its siblings didn't — is now "Extendida" (one word, fits). The
Constantes-Condicionales activity toggle was reviewed and left as-is: it already has the
inline-hint + `ModelBadge`-chip treatment that makes the good examples below good; its
only gap was list position, not missing affordance.

**Good patterns to replicate for future features** (no fix needed — this is the standard
to build toward): IntercambioIonico's zA/zB and Titulación precipitación's m/x are both
(a) visible without scrolling, (b) confirmed by a `ModelBadge` chip the instant they leave
their default value, (c) explained by one inline hint sentence right below the control,
not a separate collapsed section. Any PR that unlocks a new capability inside an existing
view (not a new tab) should also touch that hub's `desc` string in `src/App.tsx` — this is
what broke for X–M–L (PR #48) and the γ models (PR #49) but was done correctly for
competitive precipitation (PR #51).

### Panel-body flex-shrink bug (2026-07-10) — resolved

The X–M–L relabel from the audit above was actually invisible and unclickable in
production — not a discoverability issue, a real rendering bug. `.panel-body` (the
scrollable sidebar container) is a flex column with `overflow-y: auto` so tall panels
scroll instead of overflowing. Any direct child with its own `overflow: hidden` — the
`Disclosure` component, `.section-collapse` (γ-model pickers), `.preset-picker` (saved
systems) — hits a CSS-spec edge case: a flex item's automatic minimum size is its
min-content size *unless* it has `overflow` other than `visible`, in which case the
automatic minimum becomes 0. Without an explicit `flex-shrink: 0`, the browser's flex
algorithm shrinks exactly those children toward 0 first whenever the panel's total
content exceeds the viewport — crushing them to ~2px (just their own border), instead of
letting `.panel-body`'s own scrollbar absorb the overflow like every other child does.
Confirmed with a real (non-JS-triggered) click: Playwright timed out because the button
was genuinely un-hit-testable at that point, not merely visually awkward. Fixed with one
rule, `.panel-body > * { flex-shrink: 0; }`, which covers every current and future
collapsible section rather than patching `.disclosure` alone.

### Visual / typography / clarity pass across all modules (2026-07-10) — resolved

The systematic pass promised after the flex-shrink fix, driven by user feedback on
Ácido-base, Especiación, Complejos and Mezclas (PR #66). Three threads, all shipped:

1. **Source citations out of the UI.** Every attribution now lives only in
   `docs/VALIDATION.md`. Removed the per-preset `Fuente: …` badge (the `RefBadge`
   component, deleted) from all 8 sites, the assumptions-summary `cotejado con …`
   cross-check line and the `constantes de Harris, Skoog, Bard 1985…` data-source list
   (the `crossCheck` field is gone from `App.tsx`), plus the strays in Actividad,
   Potencial condicional, Pourbaix, Titulación, Competitiva and Extracción. Method /
   diagram / convention eponyms (Sillén, Ringbom α, Kielland, Debye–Hückel, Davies,
   Güntelberg, Gran, Bjerrum) stay — they name the *thing*, not where a number came
   from. Data-layer `reference` fields stay as dev provenance (never rendered). The
   rule is now a standing convention: **methodology in the UI, attributions in docs.**
2. **"Concentración / variable de qué" clarity.** The auxiliary-agent concentration
   controls name the real agent (`[NH₃] libre`, `Cuánto NH₃ hay disuelto`) instead of a
   hardcoded `[L]`, propagating through every `SideReactionEditor` consumer. X is stated
   plainly as a second *dissolved* complexing agent (NH₃, citrate, en…) competing with
   L — not the solvent, since water is already baked into the log β (verified against the
   Harris/Ringbom convention). Disambiguated `Concentración del complejante Co` (read as
   cobalt → `Concentración analítica del complejante`) and the per-component mixture
   concentration (now names the component).
3. **Interaction / typography coherence.** Acid-base's stray `Avanzado` disclosure became
   a labelled section `Tipo de sistema (carga inicial z₀)` with a plain-language z₀
   explanation; all collapsibles now share one caret language (right-aligned, rotates on
   open) instead of mixing native ▸ markers with custom carets.

### 2D predominance maps (2026-07-10) — v1 shipped

The 1D DUZP extended to two chemical axes. A generic, axis-agnostic engine
(`lib/predominance2D.ts`) sweeps an (x, y) grid and records the dominant species per
cell; a matching SVG renderer (`components/Predominance2D.tsx`) paints the field to an
offscreen canvas embedded as a single `image-rendering: pixelated` `<image>` (no
per-cell DOM nodes, no color blending across boundaries) with SVG axes, legend and a
read-point crosshair on top. No Plotly dependency — `plotly.js-basic` ships no
heatmap/contour trace, and the DUZP is already custom SVG, so this stays consistent and
adds zero bundle weight. Two maps shipped:

- **Especiación del metal → Mapa 2D (pL–pH)**: the metal split across free ion,
  hydroxo-complexes and one ligand's complexes, over pH × free ligand. Uses
  `speciationFractions` (both axes independent — no mass-balance solve).
- **Complejos (modo X–M–L acoplado) → Mapa 2D (pL–pX)**: two competing ligands, over
  free L × free X, via `twoLigandFractions`. Empty-state prompts to enable the coupled
  mode when a single ligand can't define a second axis.
- **Precipitación selectiva → Mapa 2D (pH–log[M])**: the classic Sillén solubility map.
  Two distinct regimes, not a fractions-only sweep like the other two maps: above the
  saturation line (`logSaturation`, extracted from the existing `hydroxideSolCurve`) the
  solid M(OH)ₙ(s) predominates; below it, the dissolved M/M(OH)ⱼ ladder depends only on
  pH (Ksp pins the free-ion boundary via [OH⁻] alone, so total concentration never enters
  the hydrolysis ratios) — giving the textbook U-shaped region for amphoteric metals
  (Al, Zn, Pb, Cr) confirmed by real-render QA, and a straight boundary with a single
  dissolved species for simple hydroxides (Ca, Mg). New `solubilityRegimeFractions()` in
  `lib/conditional.ts` feeds the same generic `predominanceGrid` engine unchanged.
  Scoped to the M1 baseline (no side-reaction mask, no M2 overlay) for v1.

Also extended `SPECIES_COLORS` from 8 to 12 (appending four Paul-Tol muted hues + dark
twins) so a metal with ≥9 species — e.g. 4 hydroxo + 4 amino complexes — no longer
cycles back to the slot-0 color; slots 0-7 are unchanged, so every existing chart is
byte-identical.

**Dark-mode color remap (2026-07-11) — done.** The canvas-painted field ignored theme
entirely (baked-in light hexes), unlike the 1D Plotly charts which already remap via
`plotTheme.ts`. Fixed by reusing that same `toDarkColors()` mechanism — the light→dark
hex table already covers all 12 `SPECIES_COLORS` slots plus the marker pink, so
`Predominance2D` just needed to call it and switch its white-tint mix target to the
same dark navy (`#16203A`-ish) used as Plotly's dark `plot-bg`, so filled regions read
as the same "surface family" as the app's line charts instead of washed-out light
patches. Added one more `plotTheme.ts` entry for the Sillén map's solid-phase gray
(`#94A3B8`). Verified with real-render QA toggling both themes on the Al(OH)₃ U-curve.

**CSV/PNG export (2026-07-11) — done.** Every 1D chart in the app already exports both
formats via `PlotToolbar`; the 2D maps had neither. Added `gridToCSV()` (a matrix: one
column per x sample, one row per y sample — highest y first — cells hold the dominant
species *name*, not index, so the file is self-describing) and a hand-rolled SVG→PNG
path, since these maps are plain SVG (not Plotly): serialize the live `<svg>`, resolve
the finite set of `var(--text)`/`var(--text-muted)`/`var(--plot-axis)` tokens the JSX
uses to their live computed values (a standalone serialized SVG has no cascade to
resolve them against), rasterize at 2× via an offscreen canvas, and download. Made
`PlotToolbar`'s `onResetZoom` optional so these maps get PNG/CSV buttons without a
meaningless "reset zoom" affordance. Verified end-to-end: real button clicks in a live
page decoded to a 96 KB PNG (visually confirmed — all text renders, no invisible
CSS-var fallback) and unit-tested `gridToCSV` output shape/content (11 tests).

**Sillén map M1/M2 comparison + side-reaction mask (2026-07-11) — done, v2 complete.**
Two extensions, both scoped precisely rather than attempting a single merged field:

- **Side-reaction mask**: when the masking-ligand editor is active, the map now uses
  `solubilityRegimeFractionsMasked` (`lib/sideReactions.ts`) instead of the baseline
  `solubilityRegimeFractions`. The saturation boundary shifts by α_M(OH)·α_M(L) (same
  formula `hydroxideSolCurveMasked` already used for the 1D curve), and the dissolved
  ladder gains the masking ligand's own complexes via `speciationFractions` — evaluated
  at the ligand's pH-dependent free concentration (`composeAlphas` already resolves
  whichever spec mode — free/total/fixedPX — is active), so the "y only decides
  solid-vs-solution" invariant established for the whole Sillén map design still holds.
  Verified: 1 M free NH₃ makes Zn(NH₃)₃ dominate almost the entire dissolved region and
  visibly shrinks the solid U (masking raises solubility), exactly as the four new unit
  tests predict.
- **M1/M2 comparison**: rather than overlaying two full predominance fields (visually
  incoherent — M1 and M2 are independent chemical systems), M2's own saturation curve is
  drawn as a reference line on top of M1's field (`Predominance2D`'s new
  `overlayCurve` prop — clipped to the visible range, its own legend row). Reuses
  `curve2` (already computed for the 1D chart) directly, no new engine code. Gives a
  direct visual of the separation window without conflating two systems' species into
  one grid.

Verified end-to-end with real-render QA (Zn(OH)₂ + NH₃ mask + Cu(OH)₂ overlay) and a
regression check confirming the unmasked/no-M2 baseline is pixel-identical to before.

### "% formado" impossible values above 100 % (2026-07-11) — resolved

User-reported: "algo estaba al 300 % y eso no puede ser posible." Reproduced live: Complejos'
accent metric showed **312.5 %** for Zn²⁺/NH₃ (a 4-step ladder). Root cause: `% formado` was
computed as ñ·100 (bjerrumNumber, mean ligand coordination number) — a genuine percentage
only for a 1:1 complex, where ñ ∈ [0, 1]. For an N-step ladder ñ ranges 0–N, so ñ·100 isn't a
physical percentage at all; the same bug affected the coupled X–M–L branch and the "pL para
50 %" operating point. Fixed by switching every one of these to `1 − α_free` (the free-metal
fraction, always in [0, 1] regardless of ladder length) — `lib/metrics.ts`'s ñ-based
`percentFormed`/`percentDissociated`/`pLForPercentFormed` (1:1-only, and only ever called from
Complejos.tsx) are replaced by α_free-based `percentComplexed`/`pLForPercentComplexed`,
mathematically identical to the old formula for 1:1 systems (verified no regression) and
correctly bounded for any number of steps. Prompted a full audit of every other
percentage-based metric in the app (titrations, ion exchange, competitive precipitation,
conditional constants, acid-base/speciation) — all are either provably bounded by
construction (normalized fractions, Langmuir-type saturation formulas, explicit clamps) or
are legitimately unbounded error metrics (Gran-plot "% error", a deviation not a fraction),
not the same class of bug.

### Dark mode redesign: neutral charcoal, Instagram/WhatsApp-style (2026-07-11) — resolved

User-reported: "el modo oscuro se ve feo, puede ser algo mas tipo como instagram modo oscuro."
The old dark palette was a blue/navy-tinted slate (`#0F172A` base) — not a rendering bug per
se, but a visual identity mismatch with what "good dark mode" looks like in modern apps
(Instagram, WhatsApp, X): true-neutral charcoal surfaces, flat elevation via subtle borders
rather than colorful ambient glow. Redesigned `tokens.css`'s dark theme around a neutral
palette (`#0A0A0B` bg → `#1A1A1C` cards → `#2E2E31` borders, true black `#000000` page
backdrop) and removed the colorful radial-gradient washes (`--bg-grad`, `--content-wash`) that
injected blue/teal tint into what should read as neutral.

While auditing for the tint, found and fixed several **actual** theme bugs — surfaces
hardcoded to a light color regardless of theme, invisible until you actually toggled dark
mode and looked: `.db-item` (preset chips) and `.plot-toolbar-btn` (every chart's floating
toolbar) were pinned to white/near-white; `.badge.ok`/`.badge.warn` (e.g. Pourbaix's
"diagrama simplificado" note), `.editor`, `.share-btn--copied` were pinned to light green/cream
tints. Added a `--warn-soft` token (mirroring the existing `--ok-soft`) and a `--topbar-sheen`
token so the topbar's light-mode-only glossy highlight goes flat in dark instead of leaving a
stray white line. Also re-tuned `Predominance2D`'s dark fill-mix target to the new neutral
`--plot-bg` (it was tuned to the old navy). Verified end-to-end with real-render QA across
Home, Complejos, the Sillén 2D map, and Pourbaix, plus a light-mode regression check.

### Bilingual UI — Actividad module, rollout complete (2026-07-12)

Sixteenth and final module. Translated the full **Actividad** ("Activity and Debye–Hückel")
module: the 4-way γ-model picker (extended D-H, Kielland with its 15-ion size database,
Davies, Güntelberg), the "impose I" vs "by electrolyte" ionic-strength source toggle, and the
4-paragraph InfoBox comparing all four models' equations and validity ranges. A separate
translated `modelLabelsT` map was kept alongside the existing module-level `MODEL_LABELS` (used
only for `exportMetadata`, which stays Spanish) — the same "translated copy for display,
original for export" pattern used earlier for `GAMMA_MODELS` in Titulacion.

This completes the bilingual UI rollout: **all 16 modules across all 7 hubs are now fully
translated** (ES/EN), together with all shared chrome and editors. See AGENTS.md's "Language
rules" section for the final state and the one remaining deliberate exception (`HUBS.assumptions`
in App.tsx).

Verified end-to-end with real-render QA: full module in English in both the default and
Kielland/impose-I branches, no console errors, and a full Spanish-mode regression confirming
zero visual drift.

### Bilingual UI — Titulacion module (2026-07-12)

Fifteenth module, and the largest by far — the unified Titulaciones hub, with 5 independent
sub-modes each implemented as its own function component: acid-base (Gran plot, indicator
transition range, activity correction), EDTA/complexometric (direct and back-titration, shared
metallochromic-indicator helpers `IndicadorBadges`/`IndicadorChart`, side-reactions disclosure),
redox (oxidation/reduction, pe axis), precipitation (Mohr/Volhard/Fajans endpoint methods,
variable MmXx stoichiometry), and potentiometric (Nernstian glass electrode, 1st/2nd derivative
endpoint location, Gran plot). ~150 new translation keys under `titulacion.*`, reusing
`mezclas.volumeAddedLabel`/`derivativeTraceName`, `acidoBase.systemSection`/`conditionsSection`/
`gammaDH`/`gammaDavies`/`gammaGuntelberg`, `complejos.resultSection`, `redox.additionPHConditioned`,
and `condicionales.divalentMetals`/`trivalentMetals` where the wording matched exactly.

Two composed `ModelBadge` templates (acid-base and potentiometric) interpolate a titrant-kind
fragment and a system-kind fragment into one sentence — verified the EN/ES word order lines up
without reordering. Found and fixed a local-variable-shadows-`t` bug in the potentiometric
sub-component (a bisection loop's scratch variable and the E-vs-V trace array were both named
`t`, colliding with `const t = useT()`) — caught immediately by `tsc -b`, not by runtime QA.
Also caught a bare untranslated `'pKps'` literal in the precipitation sub-mode's default
ResultCardRow (Spanish anion-order notation) that needed the established `pKps → pKsp`
notational translation, matching the `SolubilidadCondicional` precedent.

Verified end-to-end with real-render QA across all 5 sub-modes in English (including the Gran
plot, indicator badges, Mohr endpoint marker, and both derivative toggles), no console errors,
and a full Spanish-mode regression on every sub-mode confirming zero visual drift.

Remaining: translate Actividad, the last module, to complete the bilingual UI rollout (16/16).

### Bilingual UI — IntercambioIonico module (2026-07-12)

Fourteenth module, second and last in the Separaciones hub — the hub is now fully bilingual.
Translated the full **IntercambioIonico** ("Ion exchange") module: the resin/application preset
hints, the binary A↔B batch equilibrium setup (charges, initial concentrations, Ksel, resin
capacity/volume, flow rate), the H⁺-competition branch (shared `SideReactionEditor` plus the
coupled EDTA-elution sub-toggle), the Craig multi-zone column branch (theoretical plates, 2nd
and 3rd competing-ion fields), all 7 diagram tabs (distribution/batch, isotherm, breakthrough,
Ksel vs loading, multi-zone, D and φ vs pH, EDTA elution 3-comp.), and a 3-paragraph InfoBox
split around two bold terms ("isotherm", "breakthrough"). Export metadata stays Spanish per the
established precedent.

Verified end-to-end with real-render QA: full module in English including every conditional
branch (H⁺ competition, EDTA elution, Craig multi-zone with 2nd and 3rd competing ions), no
console errors, and a full Spanish-mode regression confirming zero visual drift.

Remaining: translate Titulacion and Actividad, the last 2 modules, following the pattern in
`AGENTS.md`.

### Bilingual UI — ExtraccionLiquido module (2026-07-12)

Thirteenth module, first in the Separaciones hub. Translated the full **ExtraccionLiquido**
("Liquid–liquid extraction") module: the shared analyte editor (acid/neutral vs. metal-chelate
modes, acid and chelate preset chips), the 2nd-analyte comparison, the dimer/polymerization
branch, all 4 diagram tabs (log D = f(pH), %E = f(pH), multiple extractions, preconcentration),
and a 5-paragraph InfoBox. Preset compound names (e.g. "Ácido benzoico") stay Spanish per the
established database-content precedent.

Verified end-to-end with real-render QA: full module in English in both acid and metal-chelate
modes, the 2nd-analyte comparison, no console errors, and a full Spanish-mode regression
confirming zero visual change.

### Bilingual UI — PrecipitacionCompetitiva module (2026-07-12)

Twelfth module — completes the Solubilidad hub (Solubilidad, SolubilidadSal,
SolubilidadCondicional, PrecipitacionCompetitiva all translated). Translated the full
**PrecipitacionCompetitiva** ("Competitive precipitation") module: fractional precipitation of
two 1:1 salts sharing a common cation, the phase-selection-by-combination-testing result, both
diagram tabs (% precipitated, log [X] free), and the InfoBox.

Verified end-to-end with real-render QA: full module in English including the phase-detection
result card ("both salts present"), the separation-window verdict, no console errors, and a full
Spanish-mode regression confirming zero visual change.

The **Ácido-base**, **Redox** and **Solubilidad** hubs are now fully bilingual end to end.

### Bilingual UI — SolubilidadCondicional module (2026-07-12)

Eleventh module, third in the Solubilidad hub — the biggest module translated so far. Translated
the full **SolubilidadCondicional** ("Selective precipitation") module: the two-metal hydroxide
comparison with amphoteric (U-curve) support, the masking-by-auxiliary-ligand side branch
(reusing `SideReactionEditor`), the pKsp′ = f(pH) tab, the log s = f(pX) complexing-agent tab,
the 2D Sillén map (pH–log[M]) with the M2 saturation overlay, and a 3-paragraph InfoBox. Also
translated the built-in database's group labels (e.g. "M³⁺ (precipitate at acidic pH)") by
switching `OH_PRESETS`' `group` field from literal Spanish text to stable keys, translated at
the `dbItems` call site — the underlying preset formulas/pKsp values stay untouched.

Verified end-to-end with real-render QA: full module in English including the 2-metal selective
separation flow (verdict text, purity/co-precipitation results, redissolution), an amphoteric
preset (Zn(OH)₂ showing the interior U-curve minimum), no console errors, and a full
Spanish-mode regression confirming zero visual change.

### Bilingual UI — SolubilidadSal module (2026-07-12)

Tenth module, second in the Solubilidad hub. Translated the full **SolubilidadSal**
("Solubility and pH") module: the reusable salt editor (stoichiometry p/q, cation charge with
its electroneutrality hint, anion pKa ladder), the 1- or 2-system comparison, both diagram tabs
(log S = f(pH) and α distribution), and the InfoBox. Reused `solubilidad.intrinsicSolubilityModel`
/`pHConditionedModel` since the model-badge text matched the Solubilidad module exactly.

Verified end-to-end with real-render QA: full module in English with both a strong-acid-anion
salt (AgCl, showing the empty-plot "conjugate base of a strong acid" message on the α tab) and a
weak-acid-anion salt (CaCO₃, showing the real α-distribution chart), no console errors, and a
full Spanish-mode regression confirming zero visual change.

### Bilingual UI — Solubilidad module (2026-07-12)

Ninth module, first in the Solubilidad hub. Translated the full **Solubilidad** module — both
the ionic-salt (Kps) mode (stoichiometry, common-ion effect, conditional Kps via anion α, DB
presets) and the molecular acid/base solid mode (intrinsic solubility S₀, the two-branch
InfoBox formula for acid vs. base ionization).

Note on module count: earlier entries in this log undercounted the total (miscounted at "14"
instead of the actual 16 view-files across all hubs, since EspeciacionMetal wasn't listed as its
own row in `AGENTS.md`'s older "Modules (14)" table even though it's a distinct view). From here
on the "remaining" count below reflects the corrected total of 16.

Verified end-to-end with real-render QA: full module in English in both ionic and molecular
modes (including the acid/base kind toggle and its InfoBox formula switch), no console errors,
and a full Spanish-mode regression confirming zero visual change.

### Bilingual UI — Pourbaix module (2026-07-12)

Eighth module — completes the Redox hub (Redox, PotencialCondicional, Pourbaix all translated).
Translated the full **Pourbaix** module: both database-preset and fully custom (arbitrary
species/couples) modes, the species/couple editors, and the "how is this diagram built" InfoBox.

Confirmed the module's own database (`pourbaixSystems.json`, e.g. excluded-species notes like
"FeO₄²⁻ (ferrato)") correctly stays Spanish untranslated — same database-content precedent as
Complejos/EspeciacionMetal's preset descriptions.

Verified end-to-end with real-render QA: full module in English in both database-preset mode
and custom mode (species editor, couple editor, add/remove buttons), no console errors, and a
full Spanish-mode regression confirming zero visual change.

The **Ácido-base** and **Redox** hubs are now fully bilingual end to end.

### Bilingual UI — PotencialCondicional module (2026-07-12)

Seventh module, second in the Redox hub. Translated the full **PotencialCondicional**
("Conditional E°′") module — the most complex module translated so far: the two-couple E°′ =
f(pH) comparison, per-state complexation on couple 1 (reusing `SideReactionEditor`), the optional
3rd couple for Latimer-diagram disproportionation, the E°′ = f(pX) ligand-effect tab, the
conditional pX′ scale, the fixed-pM′ Nernst electrode section, and a 5-paragraph InfoBox.

Applied the `*Prefix`-key lesson from ConstantesCondicionales proactively this time: caught and
fixed a leading-article drop ("El **cruce**..." losing its "El ") *before* shipping, by
specifically checking every `<strong>`/`<em>`-split paragraph for a word sitting before the tag.

Verified end-to-end with real-render QA: full module in English across every conditional
section (per-state complexation disclosures, 3rd-couple Latimer branch, ligand-effect tab,
Nernst electrode section), no console errors, and a full Spanish-mode regression confirming
zero remaining text drift (including the fixed paragraph).

### Bilingual UI — Redox module (2026-07-12)

Sixth module, first in the Redox hub. Translated the full **Redox** module (prediction between
two redox couples: DUZP, α distribution vs pe, and the prediction scale) plus the shared
`CoupleEditor` component (also used by PotencialCondicional) — its own strings now render in the
active language everywhere, matching the `SideReactionEditor` pattern from the Complejos hub.

Handled a genuine EN/ES word-order mismatch in the "how to read the prediction scale" paragraph:
Spanish places "pe°′" *before* the emphasized comparison word ("par con pe°′ **mayor**"), while
natural English places it *after* ("the couple with the **higher** pe°′"). Rather than force a
single shared prefix/em/mid/em/suffix template to match both languages' word order (impossible
without per-language reordering), each language's `<em>`-wrapped key carries its own "pe°′"
placement (`higherEm`: es "mayor" / en "higher pe°′") so both read grammatically.

Verified end-to-end with real-render QA: full module in English across all three diagram tabs,
a mixed-rollout regression check on PotencialCondicional (still Spanish, but the shared
`CoupleEditor` renders in English inside it, no console errors), and a full Spanish-mode
regression confirming zero visual change.

### Bilingual UI — Mezclas module (2026-07-12)

Fifth module, second in the Ácido-base hub. Translated the full **Mezclas** (multicomponent
mixtures) module: the up-to-4-row system editor (each row reusing `AcidSystemEditor`, already
translated), the "Starting form" salt-selection dropdown with its nitrate/chloride/sodium-salt
suffix logic, the mixture titration section, the activity-correction details block (reusing
`acidoBase.gammaDH/gammaDavies/gammaGuntelberg` for the D-H/Davies/Güntelberg picker exactly like
the Ácido-base pilot), both diagram tabs (titration curve, buffer capacity β) and the "what can I
simulate here" InfoBox.

Reused keys wherever the text was identical to Ácido-base/Complejos (`complejos.resultSection`,
`complejos.ionicStrengthLabel`, `acidoBase.activityCorrection`, the three γ-model labels) instead
of duplicating them. Kept the CSV export's Spanish "Sistema sin nombre" fallback separate from
the UI-facing translated "Unnamed system" fallback — same function, two different literal
strings passed in depending on caller, matching the established export-stays-Spanish rule.

Verified end-to-end with real-render QA: full module in English including the titration section
(toggling on the strong-acid titrant), the activity-correction block, and a full Spanish-mode
regression confirming zero visual change.

### Bilingual UI — ConstantesCondicionales module (2026-07-12)

Fourth module. Translated the full **ConstantesCondicionales** ("Conditional K′", Ringbom's
conditional constant module) — metal/ligand panel, the multi-primary-reaction and second-metal
comparison sections, the parameters panel (quantitativity threshold, activity correction), the
result panel, both diagram tabs (log K′ = f(pH), α coefficients) and the "Ringbom's conditional
constant" InfoBox.

Found and fixed a real jargon issue while cross-checking against the literature: "reacciones
parásitas" was about to become "parasitic reactions" — the correct standard English term
(Ringbom, and matching this app's own `alphaY` glossary entry) is **side reactions** (side
reaction coefficients α), so that's what shipped instead.

QA also caught a real regression bug of my own making: splitting a `<strong>`-wrapped sentence
into separate bold/body translation keys silently dropped the leading article ("La " before
"banda azul") from both languages, breaking the Spanish text. Fixed by adding a dedicated
`*Prefix` key per language (empty for English, since "The blue band" needs the article but "Side
reactions" reads fine without one) — documented as a checklist item in `AGENTS.md` so future
translations catch this before shipping, not after.

Verified end-to-end with real-render QA: full module in English across both diagram tabs, the
multi-reaction and second-metal-comparison branches, no console errors, and a full Spanish-mode
regression (including the fixed paragraph) confirming zero remaining text drift.

### Bilingual UI — EspeciacionMetal module (2026-07-12)

Third module. Translated the full **EspeciacionMetal** ("Speciation vs pH") module: metal +
hydrolysis panel, auxiliary-ligand and second-agent disclosures, species-names editor, the
reading panel (including the multi-`<sub>` "no physical solution" hint), all 4 diagram tabs
(α distribution, DUZP, log C, 2D map) and the "how to read" InfoBox.

Reused translation keys wherever the Spanish text was identical to Complejos/SideReactionEditor
(`complejos.metalLabel`, `complejos.cmLabel`, `complejos.clLabel`, `complejos.dominantSpecies`,
`complejos.xLigandTitle`, `complejos.xIsAgentBold`, `complejos.tabAlpha/tabDUZP/tabLogC`,
`sideReactionEditor.conjugateAcidPrefix`, etc.) instead of duplicating them under a new
namespace — only added `especiacion.*` keys for text that actually differs (e.g. the "second
agent" hints use different wording than Complejos' coupled-mode hints even though the concept is
the same). Chemistry terms cross-checked against the literature: "speciation" (Stumm & Morgan),
"mononuclear"/"polynuclear species" (Cotton & Wilkinson) — confirmed standard usage.

Verified end-to-end with real-render QA: full module in English across all 4 tabs and both the
auxiliary-ligand and second-agent disclosures (bold formatting on the map2d-empty hint verified
via HTML dump), no console errors, and a full Spanish-mode regression confirming zero visual
change (database-driven preset descriptions in `SPECIATION_PRESETS` correctly stay Spanish,
same as Complejos' database examples).

### Bilingual UI — Complejos + SideReactionEditor (2026-07-11)

Second module after the Ácido-base pilot. Translated the full **Complejos** module (system,
conditions, result, all 6 diagram tabs, the "how to read" InfoBox, both Ringbom pX′ and coupled
X–M–L side-reaction modes) and the shared `SideReactionEditor` component (used by Complejos,
EspeciacionMetal, ConstantesCondicionales, PotencialCondicional, SolubilidadCondicional,
Titulacion, IntercambioIonico) — the editor's own strings now render in the active language
everywhere it's used, even inside modules whose own JSX is still Spanish.

Chemistry terminology was cross-checked against the literature before translating: "Bjerrum
formation function"/"mean ligand number" (n̄), "conditional constant" (Ringbom's term, distinct
from "apparent constant" used for ionic-strength correction elsewhere), "auxiliary complexing
agent" for masking agents — all confirmed standard usage, no changes needed there. Also did a
second pass on the Ácido-base pilot's English strings per a direct ask to double-check jargon:
tightened a few phrasings ("pH stretch" → "pH range", "boundaries sit at" → "with boundaries at",
"the real pH" → "the actual pH", one awkward `z0Hint` clause) — no incorrect terms found, just
style polish.

Verified end-to-end with real-render QA: full Complejos module in English across all diagram
tabs and both side-reaction modes (including the `<strong>`-formatted map2d-empty hint and the
X-branch clarification hints), a mixed-rollout regression check on EspeciacionMetal (its own
Spanish JSX unchanged, but the shared `SideReactionEditor` renders in English inside it, with no
console errors), and a full Spanish-mode regression confirming zero visual change.

### Bilingual UI — infrastructure + Ácido-base pilot (2026-07-11)

Scoped deliberately (see `AGENTS.md` "Language rules" for the full pattern): rather than
translate ~11k lines of JSX across 14 modules in one pass, shipped the **infrastructure** plus
**one fully-translated pilot** to validate the pattern before continuing module by module.

- `src/i18n/translations.ts`: a flat, fully-typed `{key: {es, en}}` dictionary — every key
  requires both languages in the same object literal, so a missing translation is a compile
  error, not a silent fallback.
- `useLanguage()`/`LanguageToggle` (`src/hooks/useLanguage.ts`, `src/components/LanguageToggle.tsx`):
  mirrors the existing `useTheme()`/`ThemeToggle` pattern exactly (localStorage persistence, a
  custom event, an inline pre-hydration `<script>` in `index.html` so the toggle survives a
  fresh page load without a flash-of-wrong-language). `useT()` (`src/hooks/useT.ts`) resolves
  a key to the current language, with `{token}` interpolation for the handful of strings that
  embed an already-translated word (e.g. "{role} weak" for acid/base classification).
- **Translated:** shared chrome (nav, footer, panel/share/save-system buttons, mobile nav),
  `Controls.tsx`'s generic defaults (`ModelBadge`, `DbPanel`, `SystemPresetPicker`,
  `ConstantList`, `HelpTip`), all ~29 `lib/glossary.ts` tooltip entries, `AcidSystemEditor`
  (shared by Ácido-base/Mezclas/Titulación), and the full **Ácido-base** module.
- **Not yet translated:** every other module's own JSX (Complejos, Redox, Solubilidad, etc.)
  and database-driven preset descriptions — these stay hardcoded Spanish regardless of the
  toggle. This is the expected, documented state of an incremental rollout, not a bug: e.g.
  opening Mezclas in English shows its shared `AcidSystemEditor` in English (translated
  infrastructure) with the rest of the module still in Spanish (not yet its turn).
- Chemistry notation, formulas, and user-entered free-text labels are never translated
  (language-neutral by design, independent of rollout progress).

Verified end-to-end with real-render QA: full Ácido-base module in English (title, panel
sections, InfoBox prose, result cards, diagram tabs, glossary tooltips), a real regression
check confirming the untranslated Complejos/Mezclas modules still render correctly in Spanish
alongside translated shared chrome (no broken layout, no console errors), and a full
Spanish-mode regression check confirming zero visual change from before this feature.

Remaining: translate the other modules one at a time (own PR per module or small batch),
following the pattern documented in `AGENTS.md` — see the Complejos entry above for the next
one shipped.

### Selected-scope deep validation pass (2026-07-16) — complete

The second exhaustive textbook pass is closed for its **selected six-work scope** (Baeza/García,
Scholz/Kahlert, Kahlert/Scholz, Burgot, Vera and Sanjuán): 1,175 substantive sections, 458 worked
examples/cases and six end-of-chapter problems were classified and selectively reproduced against
the current engines. **Five of the eleven AChem PDFs were out of R2 scope** (Harris, Christian and
the three Charlot volumes); their evidence remains representative R1 sampling only. The deduplicated
backlog therefore remains 43 items (`R2-ENGINE-01`…`41`, one testability item and one terminology
item). Internal source inconsistencies were isolated from app defects; no scientific engine or UI
code was changed during the audit itself.

### R2 correctness foundations (2026-07-16) — complete

Implemented the first dependency block from the textbook audit: additive side-reaction
polynomials, stoichiometric conditional constants with distinct reactant/product coefficients,
explicit prepared/final acid-base titration forms, direction-aware Gran extrapolation and
quantitativity, the corrected proton ratio and charge exponent for ion exchange, and a pure
shared buffer-capacity engine. The acid-base titration UI now exposes the prepared and final
ladder forms; EDTA output and glossary text distinguish the free fraction `fY` from reciprocal
`αY`. Direct regressions cover every audit golden for this block, and the full 288-test suite
passes.

### R2 multianalyte titration layer (2026-07-16) — complete

Added shared-ligand competitive EDTA titration for multiple metals, global-electron-balance redox
titration for multiple analytes, continuous pre-neutralized acid-base starting compositions, and
potentiometric signals driven by the exact EDTA free-species curve. Acid-base states can now carry
independent side-reaction coefficients, feed their shifted pKa′ values into the exact balance and
display a pKa′ sweep versus the buffered complexant variable. The implementation includes
bilingual controls and seven new audit goldens;
all 295 tests, lint, TypeScript and the production build pass. Interactive browser QA could not run
because this session exposed no browser backend.

### R2 coupled-phase titration layer (2026-07-16) — complete

Completed the general finite M_mA_x acid-base/precipitation balance and propagated it to volumetric
titration, precipitation-specific Gran fitting and solid-phase buffer capacity. Molecular solids
now support arbitrary protonation ladders, self-consistent saturation pH and competing molecular/
ionic phases. The acid-base titration UI can switch among aqueous, precipitating, biphasic and
finite-resin media without changing the formal equivalence definition. Shared engines conserve
mass, charge, phase inventories and resin capacity; all R2-20 through R2-27 acceptance goldens pass.
The focused audit file contains **52** regressions and the complete suite contains **332** tests; lint,
TypeScript and the production build pass.

### R2 thermodynamics, generalized diagrams and analytical signals (2026-07-16) — partial

Implemented the remaining R2-28 through R2-41 findings in both calculation engines and visible UI.
PR **#95** (2026-07-16) landed the first remediation pass; see Near-term rows below for what remains.
The rest of this block stands as shipped scope:

- Solvent-aware acid–base state now shares autoprotolysis, neutrality, acidity domain, lionium/
  lyate labels and temperature-dependent Nernst slope. Water at 25 °C remains the exact legacy
  preset; DMF and ethanol demonstrate leveling/differentiation without forcing aqueous limits.
- Explicit ionization/ion-pair dissociation, standard-transfer free energies and microscopic
  acid–base state networks are available in Activity and Acid–base, including glycine macroconstant,
  tautomerization and isoelectric-point outputs.
- The metal-speciation map now supports conditional pL′, analytical metal concentration, mixed
  hydroxo–ligand species, a solid phase and joint feasibility constraints. The custom Pourbaix view
  adds a phase-aware N-state reaction-graph classifier with pX and Hess cycle-closure diagnostics.
- Conditional precipitation titration now derives Ksp′, free-ion activities and the electrode signal
  from one state. Solid-solution coprecipitation supports ideal/regular lattice activities, finite
  mass conservation and miscibility-gap detection.
- Titration UI now exposes conserved back-titration inventories, quantitative endpoint volume,
  Fabs/Frel, absorbance, conductivity, exact stoichiometric conversion targets and polynuclear redox
  corrections instead of leaving these as disconnected formulas or heuristic badges.

New pure engines: `thermodynamicState.ts`, `ionPairing.ts`, `acidBaseMicrostates.ts`,
`conditionalPhaseMap.ts`, `multisystemFeasibility.ts`, `generalizedRedoxDiagram.ts`,
`conditionalPrecipSensor.ts`, `solidSolution.ts`, `titrationProtocols.ts`, `endpointError.ts`,
`titrationObservables.ts`, `stoichiometricQuantitativity.ts` and `polynuclearRedox.ts`.
The focused audit suite contains **52** direct regressions; the complete gate passes 332 tests across
18 files plus ESLint, TypeScript and the production build. Most R2 engine findings are implemented;
**R2-11** and **R2-38** were partially remediated in #95 and closed further in follow-up PRs;
**R2-32** closed in follow-up PRs; no open R2 engine items remain from the audit remediation backlog.

### Full bilingual product UI audit (2026-07-16–17) — code and live-render lanes complete

This audit treats the interface as a product for two audiences: a learner who knows the basic
chemistry and should understand what to do next, and an experienced user who already knows the
model and needs fast, precise access to its full parameter space. The review covers the home and
global shell, all 16 modules, all five titration modes, Spanish and English presentation, light and
dark themes, desktop/mobile structure, accessibility semantics, scientific legibility and
engine-to-UI parity.

The code/architecture lane and a representative exhaustive browser lane are complete. The live
pass covered Home, all 16 modules, all five titration modes, Spanish and English, 1440×900 desktop,
390×844 mobile, keyboard interaction, state-bearing reloads, one dark-theme chart family and
advanced custom states. Fifty-two screenshots were retained as local QA evidence. No UI
corrections were made during this audit.

#### Executive verdict

The visual language is coherent and materially stronger than the pre-redesign app: the shell,
section cards, model badges, metric header, chart cards and bilingual translation hook establish a
recognizable product. The main remaining problem is no longer visual styling in isolation. It is
**information architecture**: recently added expert capabilities are technically present but often
compete with the basic workflow at the same visual level. A learner can obtain an answer, but is
not consistently taught why that answer matters or which next control to change; an expert can
reach most features, but must remember where they are hidden and scan long sidebars to do so.

The remediation should therefore preserve the current design system and reorganize the product
around a three-level progression in every module:

1. **Start** — choose a goal or load a representative system; show the minimum inputs.
2. **Understand** — expose the operating point, dominant chemistry and one plain-language reading
   of the graph.
3. **Extend** — reveal conditional reactions, competing phases, alternate signals and diagnostics
   without making them disappear from expert workflows.

#### Priority scale and global findings

| ID | Priority | Finding | Evidence / impact | Acceptance criterion |
| --- | --- | --- | --- | --- |
| **UX-G01** | P0 | Numeric fields can silently leave the advertised model domain. | `NumberField` receives no `min`/`max`; a typed value can exceed the paired slider while the range thumb merely clamps visually. This can make the displayed control and the calculation disagree and can run equations outside their validated range. | Every numeric input has an explicit policy: hard bound with inline validation, or intentional expert override with a visible out-of-domain warning. The field, slider, calculation and serialized state always agree. |
| **UX-G02** | P1 | English is not end-to-end English. | Hub assumptions, plot toolbar labels, the diagram tablist label and the chart-loading fallback remain Spanish. Human-readable database names, groups, preset descriptions and redox caveats also appear in Spanish inside English workflows. | All visible and assistive UI prose follows the selected language. Formulas, species labels and user-entered names remain language-neutral. Database records separate chemistry data from localized presentation text. |
| **UX-G03** | P1 | Shared controls are visually labelled but not programmatically named. | Range and numeric inputs are adjacent to `<span>` labels rather than associated `<label>`/`aria-labelledby` elements; several custom selects and segmented controls have the same issue. | Every input has an accessible name, units and help/error association; a screen-reader pass can identify control purpose and current value without relying on visual proximity. |
| **UX-G04** | P1 | Mobile variables sheet is not a complete modal interaction. | The closed sheet remains mounted with focusable descendants, has `aria-hidden` but no inert state, focus trap, Escape handling or focus return. | Opening moves focus into the sheet; Tab stays inside; Escape/close returns focus to the Variables button; closed content cannot receive focus; background is inert. |
| **UX-G05** | P1 | Tab patterns are incomplete for keyboard users. | Global topic tabs and `DiagramTabs` expose tab roles but do not implement arrow-key navigation. The titration mode tabs lack the same semantic contract. | All tablists implement Left/Right/Home/End, roving `tabIndex`, correct panels and focus-visible states, or use a simpler button-group pattern without partial ARIA. |
| **UX-G06** | P1 | The product lacks an explicit beginner-to-expert path. | Home is organized by chemistry taxonomy only; modules open directly into variables and charts; optional expert layers often sit beside the core inputs. | Home offers goal-based entry and worked examples; every module identifies a recommended starting workflow and groups expert layers under clearly labelled, searchable disclosures. Expert controls remain reachable in at most two actions. |
| **UX-G07** | P1 | Important results are duplicated rather than prioritized. | Most modules render a long sidebar `ResultCard` and repeat a subset in the metric header. Large states can produce many wrapped metrics, especially on mobile. | One decision-oriented result summary is primary; detailed diagnostics live in a secondary expandable area. Duplicate values are removed unless the second placement serves a distinct workflow. |
| **UX-G08** | P1 | Small-height and intermediate-width layouts are at risk of clipping. | Mobile charts enforce at least 55 vh/320 px while the fixed shell, tabs, metric rows and footer share a `100dvh` app with hidden overflow. Desktop switches to mobile navigation only at 800 px although seven topic pills plus brand/actions require substantially more width. **Render-check.** | Verify 360×640, 390×844, phone landscape, 768/820/1024 px and 200% zoom. No chart, toolbar, metric or navigation control is clipped; the shell chooses compact navigation before collision. |
| **UX-G09** | P1 | Scientific chart reading relies too heavily on color and hover. | Many multi-species traces differ only by color; Plotly hover is the only exact readout; 2D maps and prediction bands do not share one consistent read-point pattern. | Series remain distinguishable without color alone; each chart supports keyboard/touch-accessible read values or a synchronized operating-point table; legends and units remain visible at narrow widths. |
| **UX-G10** | P1 | Model validity is explained inconsistently and too late. | Activity models are plotted to `I = 2` even where their documented validity is much lower; related modules allow `I = 0.5` with extended Debye–Hückel selected. Limits live mainly in hints or assumptions, not at the operating point. | Invalid/approximate regions are shaded or warned inline; selecting a model updates the recommended range; exported scenarios preserve the warning state. |
| **UX-G11** | P2 | Error states are often separated from the control that caused them. | Failed roots and incompatible coupled systems commonly become `—`, an empty plot or a paragraph in the results section after the user has scrolled away from the input. | Errors identify the offending variable, appear next to it, preserve the last valid visualization where safe and suggest a concrete recovery action. |
| **UX-G12** | P2 | Help coverage is uneven. | Some advanced modules expose dozens of variables with only two to four glossary triggers; Redox relies entirely on help inside the nested couple editor. | Every non-obvious symbol has one concise definition, units, valid range and effect on the result. Repeated notation uses the same glossary entry everywhere. |
| **UX-G13** | P2 | Chart and panel typography becomes too dense for teaching use. | Many explanatory labels and metric keys are 11–12 px; long formulas and multi-line results must fit a fixed 320 px panel. **Render-check.** | Body/help text remains readable at 100% and 200% zoom; long formulas wrap or move to a dedicated equation block; critical labels are not reduced below the design-system reading size. |
| **UX-G14** | P2 | Icon and disclosure language is not fully consistent. | Emoji section icons, native `<details>`, custom `Disclosure`, collapsible `PanelSection` and bespoke inline buttons coexist. | Establish one disclosure hierarchy and one icon set; interactive affordances have consistent hit areas, caret motion, focus styling and accessible labels. |
| **UX-G15** | P3 | Collapsing the desktop sidebar animates `width`. | The deterministic UI detector flagged `transition: width` in `App.css`, which can trigger layout work while Plotly is resizing. | Use a transform/grid-based reveal or verify that chart resizing remains smooth on representative hardware; reduced motion remains respected. |
| **UX-G16** | P1 | Browser Back/Forward does not represent in-app navigation. | Topic/module changes use only `history.replaceState`, and App registers no `popstate` listener. A user cannot return to the previous module with Back, and forward navigation cannot restore app state. | Use deliberate history entries for user navigation, keep debounced parameter edits replace-only, and synchronize App state on `popstate`; add Home → module → submodule → Back/Forward tests. |
| **UX-G17** | P2 | Save/share failures are silent. | Clipboard and localStorage operations are best-effort; a storage-full/private-mode write can appear saved in the current UI but disappear after reload, and no persistent error is shown. | Confirm durable save before success feedback; report clipboard/storage failure with a recoverable action; test private mode, denied clipboard and quota exhaustion. |
| **UX-G18** | P2 | The chart payload needs an explicit performance budget. | The verified production build emits a 1.079 MB minified Plotly chunk (358 kB gzip) plus a 343 kB main chunk. Plotly is lazy-loaded, but first-chart latency is part of every module's core experience, especially on mobile. | Measure cold first-chart render on a mid-range phone, keep the shell interactive during load, localize the loading state and set regression budgets for JS transfer and interaction latency. |
| **UX-G19** | P2 | Bilingual completeness has no automated regression gate. | The 334-test suite passes, but no test scans shared chrome/module surfaces for untranslated Spanish literals or verifies representative ES/EN render output. Current leaks are therefore invisible to CI. | Add dictionary completeness/type checks, a source allowlist for notation/export metadata, and representative rendered assertions for shared chrome plus every module in both languages. |

#### Global product and learning architecture

| ID | Priority | Finding | Acceptance criterion |
| --- | --- | --- | --- |
| **UX-P01** | P1 | Home asks which equilibrium to study, but not what problem the user is trying to solve. | Add goal-oriented routes such as “predict pH”, “choose a separation pH”, “select an indicator” and “build a custom system”; show the destination module before opening it. |
| **UX-P02** | P1 | There is no canonical worked-example entry point despite the engine breadth. | Ship the planned example gallery with one basic and one advanced loadable scenario per module, a short expected observation and reset-safe state. |
| **UX-P03** | P1 | Related modules overlap without explaining which one to use. | Add contextual handoffs: Mixtures → unified acid–base titration; Solubility → salt/conditional/competitive variants; Redox → conditional potential/Pourbaix; each handoff states what capability is added. |
| **UX-P04** | P2 | “Assumptions” is duplicated in subnav and footer and is hidden differently on mobile. | Provide one responsive assumptions surface with model, validity and active corrections summarized at the point of use. |
| **UX-P05** | P2 | Save/share/reset are visually compact but lack scenario context. | The save menu shows module + active sub-mode, confirms overwrite/delete, and share feedback states that all current variables were captured. |
| **UX-P06** | P2 | Exports are implementation-oriented rather than language-aware product artifacts. | Keep chemistry metadata stable, but localize toolbar/status UI and document whether CSV headers are intentionally canonical or localized; do not mix languages inside one export. |

#### Module-by-module findings

##### Acid–base

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-AB01** | P1 | The glycine microstate model is presented as a peer of the basic acid system. Mark it as an advanced, topology-specific workflow; collapse it by default and load a named glycine example so four microscopic constants are not mistaken for generic pKa inputs. |
| **UX-AB02** | P1 | Add a synchronized arbitrary-pH read point with species fractions and charge, not only the calculated pure-solution pH and Plotly hover. This is the bridge from “see the curve” to “solve the exercise”. |
| **UX-AB03** | P1 | Localize the hardcoded `Fracción α` y-axis and preset presentation in English. |
| **UX-AB04** | P2 | The shared solvent/temperature engine is exposed only in acid–base titration. Either expose the same thermodynamic-state selector here and in Mixtures, or state explicitly that these views are aqueous/25 °C and link to the advanced titration workflow. |

##### Acid–base mixtures

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-MX01** | P1 | The default chart is buffer capacity while the primary novice question is the mixture pH and composition; the titration tab is initially an empty state. Start with a mixture operating-point/speciation view, then offer buffer capacity and titration as extensions. |
| **UX-MX02** | P1 | Up to four full `AcidSystemEditor` instances create a very long sidebar. Use compact component summaries with one expanded editor at a time and preserve quick comparison of concentration/prepared form. |
| **UX-MX03** | P1 | The derivative is normalized onto the 0–14 pH axis, which visually implies shared units. Give it a separate axis/panel or label it explicitly as normalized. |
| **UX-MX04** | P2 | Clarify that this quick titration view is less complete than the unified titration module and provide a one-click “continue in Titrations” handoff with compatible state. |

##### Complexation

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-CX01** | P1 | Promote the three real workflows—single ligand, Ringbom conditional scale and coupled X–M–L—to a clearly named mode selector with one-sentence consequences. The current “second agent” control still requires prior conceptual knowledge. |
| **UX-CX02** | P1 | Add operating-point help for pL/pX, free versus analytical ligand and Bjerrum number; the current glossary coverage is too sparse for the number of symbols shown. |
| **UX-CX03** | P2 | Support chart click/keyboard readout that updates the pL/pX operating point and the result summary. Keep mass-balance and activity corrections in an Advanced group. |

##### Metal speciation

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-MS01** | P1 | Conditional pL′, solid phase and joint feasibility are powerful but appear as nested toggles inside the main metal editor. Separate “aqueous speciation” from “phase/feasibility map” workflows and summarize active constraints above the chart. |
| **UX-MS02** | P1 | Failed free-ligand balances should highlight the responsible totals/constants next to their inputs instead of explaining the failure only below the result block. |
| **UX-MS03** | P2 | Localize preset groups/descriptions and distinguish analytical totals from the free pL/pX values returned by the solver in every result label. |

##### Conditional constants

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-CC01** | P1 | The primary section mixes M–Y identity, all side reactions, multiple reactions, evaluation pH, concentration and formation target. Keep identity + Kf + pH visible; group side reactions, competing reactions and target analysis into named advanced tasks. |
| **UX-CC02** | P1 | The same percentage control is used for “negligible” (0.1%) and “formed/masked” (99.9%) goals, while the log-K threshold is separate. Make the question explicit—formation, masking or titration sharpness—and derive the relevant criterion. |
| **UX-CC03** | P2 | The “optimal pH” result must state which constraints and target produced it, and distinguish mathematical maximum K′ from an experimentally feasible operating window. |

##### Redox

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-RX01** | P0 | “Spontaneous reaction” currently shows only the selected oxidant plus reductant, not a balanced reaction or products. Render the complete direction, stoichiometric coefficients, electrons cancelled and log K so the UI cannot be mistaken for a solved equation when it is only a reactant pair. |
| **UX-RX02** | P1 | Add an arbitrary pe/E operating point with all four fractions and a clear E↔pe conversion. Hover alone is insufficient for exercise solving. |
| **UX-RX03** | P1 | Localize database caveats and keep them attached to both the selected couple and any result they qualify. |
| **UX-RX04** | P2 | Expose temperature where the engine supports a variable Nernst slope, or label this module unambiguously as 25 °C. |

##### Conditional potential

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-PC01** | P1 | This is the highest-density non-titration module: pH dependence, per-state complexation, intrinsic polynomials, a third Latimer couple, pX diagrams, a second ligand and an electrode calculator share one sidebar. Split them into task-level views with shared couple state. |
| **UX-PC02** | P1 | Replace expert-only entry labels such as “intrinsic polynomial” with a plain-language question plus the formal term; keep coefficient editors behind Advanced. |
| **UX-PC03** | P2 | The electrode section repeats its title as its toggle label. Use an action label, and move diagram-specific controls next to the diagram/tab they affect. |

##### Pourbaix

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-PB01** | P1 | The custom species/couple editor uses tiny unlabeled × controls, inline styles and dense rows that do not match shared controls. Rebuild it with labelled remove actions, consistent field groups and row-level validation. |
| **UX-PB02** | P1 | Let users click/tap the diagram to set pH/E and read the stable region; preserve sliders for precision and keyboard access. |
| **UX-PB03** | P2 | Before converting a preset to custom mode, state what will and will not transfer. Graph connectivity, Hess-cycle and pool-conservation diagnostics need plain-language remediation beside the offending edge/node. |

##### General solubility

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-SO01** | P0 | Molecular-solid mode renders both a standalone first-pKa slider and a full pKa list controlling the same value. Remove the duplicate and use one ladder editor. |
| **UX-SO02** | P1 | Ionic salts and molecular acid/base solids are distinct mental models. Keep the mode switch, but change the title, equation preview, presets and result vocabulary as one coherent package when the mode changes. |
| **UX-SO03** | P1 | Show which phase limits solubility and why at the selected pH, especially when a competing ionic phase is enabled. |
| **UX-SO04** | P1 | Apply the global activity-model validity warning here; a typed ionic strength outside the selected model's domain cannot pass silently. |

##### Salt solubility versus pH

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-SS01** | P1 | Explain when to use this view instead of General solubility or Selective precipitation; current names are too similar for a learner. |
| **UX-SS02** | P1 | The long symbolic molar-solubility formula is placed in a 320 px result row. Move it to a readable equation block and keep the result card numerical. |
| **UX-SS03** | P2 | Collapse the finite coupled-balance layer by default, describe its conservation inputs and review whether gamma-model selection should match the other solubility modules. |

##### Selective / conditional precipitation

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-SP01** | P1 | Break the current long panel into “single solid”, “compare/select”, “plan stages” and “complexant pX” workflows. Solid solution and three-metal staging should not compete visually with the default hydroxide curve. |
| **UX-SP02** | P1 | The result card can expand to many rows of thresholds, purity, redissolution, stage recoveries, shared pool and miscibility. Lead with one decision—recommended window/stage—and move diagnostics into grouped details. |
| **UX-SP03** | P1 | The stage planner should expose a complete editable third candidate (including hydrolysis/side-reaction terms), add/remove stages and report mass conservation and per-stream purity, not only recovery strings. |
| **UX-SP04** | P2 | Explain ideal versus regular solid solutions, interaction parameter and miscibility-gap result before exposing the slider. |

##### Competitive precipitation

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-CP01** | P2 | This is the strongest focused advanced flow and should be used as a structural baseline. Add an explicit reaction/stoichiometry summary and a synchronized operating-point cursor for the added common ion. |
| **UX-CP02** | P2 | Present the quantitativity target as a decision sentence (“Can salt A reach 99.9% before B starts?”), then show the p-ion window and residual contamination. |

##### Liquid–liquid extraction

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-EX01** | P0 | For polyprotic analytes, the neutral form is changed through a tiny `+1` button embedded in hint text. Replace it with an explicit species selector showing charge/formula and the consequence for D. |
| **UX-EX02** | P1 | The sequential planner is fixed to three stages although the engine accepts a stage array. Support add/remove/reorder, explicit continued/collected phase, stream labels, purity, recovery and conservation error. |
| **UX-EX03** | P1 | Separate one extraction, repeated identical extractions, preconcentration and routed multi-stage extraction as progressive tasks; their controls currently share one Conditions section. |
| **UX-EX04** | P2 | Move dimerization and conditional chelate coefficients into model-specific Advanced groups and explain why they change the plotted distribution ratio. |

##### Ion exchange

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-IX01** | P0 | Router/share identity mismatch: App registers `ionexchange`, while the module serializes and saves `ionex`. A shared or reloaded state can fall back to Home. Use one canonical ID and add reload/share/save regression tests. |
| **UX-IX02** | P1 | The engine accepts charge magnitudes for cationic or anionic exchange, but the UI consistently says “cation A/B” and offers only positive-charge semantics. Expose resin mode and ion sign/role, or explicitly scope the UI to cation exchange. |
| **UX-IX03** | P1 | EDTA elution is hardcoded to NiY and Ni inventory even when the user has renamed ion A. Generalize labels/parameters to the selected ion or present it as a named Ni example that intentionally replaces the system. |
| **UX-IX04** | P1 | Batch capacity in eq/L resin and proton-competition inputs in meq/g + resin mass appear in adjacent workflows without a conversion/relationship. Separate the models and state their conserved quantity and units. |
| **UX-IX05** | P2 | Localize resin/application preset names in English and clarify which controls affect batch equilibrium, isotherm, breakthrough and multi-zone column charts. |

##### Titrations — shared shell

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-TG01** | P1 | The five modes are chemistry categories only. Add a one-line purpose/result under each mode (pH endpoint, pM/indicator, E/pe, precipitation endpoint, sensor calibration) and preserve the active mode in save/share labels. |
| **UX-TG02** | P1 | Use a consistent section order across modes: reaction → amounts → detection → advanced chemistry → decision/result. Current mode-specific ordering and labels drift. |
| **UX-TG03** | P1 | Alternative absorbance/conductivity traces need units, editable species coefficients with chemical labels and a statement of the simplifying signal model; `A` or `κ` alone is insufficient. |

##### Titration — acid–base

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-TA01** | P1 | Water/solvent, temperature, three mutually exclusive coupled media, activity, initial mixtures, conditional pKas, alternate signals and back titration overwhelm the default path. Keep analyte/titrant/amounts/indicator visible and place the rest in named advanced workflows. |
| **UX-TA02** | P1 | Replace the three coupling checkboxes with one mutually exclusive medium selector (aqueous, precipitating, biphasic, resin) so the UI matches the state invariant already enforced in code. |
| **UX-TA03** | P1 | Explain the distinction among exact equivalence, Gran estimate and visual endpoint before showing three error metrics; make the selected primary answer explicit. |

##### Titration — EDTA

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-TE01** | P1 | Separate direct/back titration, competitive second metal, side reactions, indicator selection and potentiometric signal into progressive tasks. The mode is powerful but requires scanning multiple open cards to understand which curve is active. |
| **UX-TE02** | P1 | Localize metallochromic indicator names/notes and attach blocking/interference warnings to the chosen metal/pH decision, not only as database prose. |
| **UX-TE03** | P2 | Make free fraction `fY`, reciprocal `alphaY`, conditional K′ and pM′/pY′ relationships visible in one compact calculation trail. |

##### Titration — redox

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-TR01** | P1 | Multiple analytes, conditional state networks, polynuclear correction, alternative signals and indicator error need a workflow selector and an active-model summary above the plot. |
| **UX-TR02** | P1 | Render the balanced titration reaction and the limiting log K, including unequal electron stoichiometry, before presenting the curve. |
| **UX-TR03** | P2 | Present E and pe as switchable representations of one signal and state the reference electrode/temperature wherever E is shown. |

##### Titration — precipitation

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-TP01** | P1 | “Visualization” mixes p-cation axis, Mohr indicator, derivative and a conditional electrochemical sensor. Split chart display from endpoint method and sensor model. |
| **UX-TP02** | P1 | Keep the general MmXx stoichiometry visible, but explain when Mohr is unavailable and why rather than conditionally removing it without a persistent scope note. |
| **UX-TP03** | P2 | Show exact equivalence, indicator endpoint and relative error as one comparison instead of isolated result rows. |

##### Titration — potentiometric

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-TV01** | P1 | First and second derivatives are scaled into the potential plot's range, which can imply physical shared units. Use separate axes/panels with actual units. |
| **UX-TV02** | P1 | The glass-electrode slope is fixed at 25 °C while temperature is exposed in other analytical-signal workflows. Add temperature or make the fixed assumption explicit beside Kref. |
| **UX-TV03** | P2 | Distinguish calibration parameters from chemistry inputs and explain when derivative zero crossing or Gran is the preferred endpoint estimate. |

##### Activity

| ID | Priority | Finding and required change |
| --- | --- | --- |
| **UX-AC01** | P0 | Gamma curves extend to `I = 2` for models whose useful domain is much lower. Shade invalid/approximate regions, adjust the axis by model and prevent a clean-looking extrapolation from being read as validated chemistry. |
| **UX-AC02** | P1 | Reference pH changes the `a_H` metric but not the main gamma chart, with no strong explanation of that dependency. Group it with an explicit activity calculation or remove it from the default conditions. |
| **UX-AC03** | P1 | Ion pairing exposes pKi and pKd without naming the molecular species, ion pair or free ions. Add an editable reaction scheme and connect each constant to the plotted bars. |
| **UX-AC04** | P2 | The transfer-free-energy/cycle utilities in the engine are not surfaced. Add an advanced thermodynamic-cycle view or keep them explicitly internal; do not imply the current ion-pair panel exposes the entire engine. |

#### Live-render audit results (2026-07-17)

The browser pass confirms that the engine breadth is reachable from the interface: arbitrary
Pourbaix species/couples, auxiliary-ligand masking, second-metal comparison, staged selective
precipitation and every titration mode all recalculated without runtime errors. The dark Pourbaix
view remained coherent, every module opened in both languages, and no document-level horizontal
overflow appeared at 390×844. The console remained free of runtime errors across the complete
navigation pass.

The beginner and expert outcomes are nevertheless different. An expert can reach most of the
calculation engine, but long sidebars and weak task grouping make discovery depend on prior
knowledge. A learner can change inputs and receive results, but the product does not consistently
explain which variable to try next, why a graph changed, or how to recover from an invalid value.
The three-level **Start → Understand → Extend** structure above remains the target architecture.

The live pass produced ten reproducible defects. The IDs below are the canonical implementation
backlog; each acceptance criterion must be verified in both languages where presentation is
involved.

| QA ID | Priority | Confirmed defect | Reproduction / affected surfaces | Acceptance criterion |
| --- | --- | --- | --- | --- |
| **QA-UI-01** | P0 | Direct numeric entry can bypass the paired slider and modeled domain. | In Acid–base, enter pKa `99`: the field remains 99, the slider stops at 35 and pH/speciation/transition results update without warning. Confirms **UX-G01**. | Centralize numeric normalization and validation. Field, slider, serialized state and engine input must agree; an intentional expert override must show a persistent out-of-domain warning. Add boundary, paste, blur, Enter and reload tests. |
| **QA-UI-02** | P1 | Browser Back exits the application instead of restoring the prior module. | Fresh Home → Acid–base → Complexes → Back reaches `about:blank`; reproduced three times. Confirms **UX-G16**. | User navigation creates history entries, parameter edits remain replace-only, and `popstate` restores Home/module/submode/state. Add Back/Forward integration coverage. |
| **QA-UI-03** | P1 | English mode still contains Spanish learning and assistive content. | Acid database groups/descriptions, module assumptions, Complexes presets and chart-toolbar accessible labels remain Spanish. Confirms **UX-G02** and **UX-G19**. | Localize all human-readable presets, assumptions, loading/status and assistive labels; keep formulas/species neutral; add an automated bilingual literal/completeness gate. |
| **QA-UI-04** | P0 | The Acid–base predominance diagram is unreadable at phone scale. | At 390×844 the diagram is a 308×140 SVG centered in a much larger card; species, pKa and axis glyphs render at roughly 8–10 px. Confirms the mobile risk in **UX-G08/UX-G13**. | Give the diagram a responsive mobile layout, readable type and labels, useful use of card height and a 200% zoom check at 360×640 and 390×844. |
| **QA-UI-05** | P1 | Floating mobile controls obscure chart legends, labels and data. | Variables and reset/export controls overlap charts in Activity, Complexes, Redox, Pourbaix, Ion exchange and titration. | Reserve chart safe areas or move tools into a non-overlapping mobile toolbar; verify all chart families with long legends and both languages. |
| **QA-UI-06** | P1 | Horizontal mobile tab strips conceal options without an affordance. | Titration clips Acid–base at the left and Potentiometric at the right; Extraction and Ion exchange hide later analytical views. | Keep the active item fully visible and provide scroll snapping plus a visible continuation cue, arrows or an alternate compact selector. Test touch, keyboard and programmatic mode changes. |
| **QA-UI-07** | P1 | The mobile Variables modal has an incomplete focus lifecycle. | Opening leaves focus on the background trigger; Shift+Tab escapes and Escape does not close. Confirms **UX-G04**. | Move focus inside, trap Tab, make background inert, close on Escape and restore focus to the trigger. Add keyboard tests for open, close and route change. |
| **QA-UI-08** | P1 | ARIA tablists do not implement arrow-key navigation. | ArrowRight changes neither focus nor selection in diagram or top-level topic tabs. Confirms **UX-G05**. | Implement roving focus with Left/Right/Home/End and associated panels, or replace partial tab semantics with an appropriate button group. |
| **QA-UI-09** | P1 | Long English module titles collapse beside header actions. | In the 320 px desktop panel, “Liquid–liquid extraction” is squeezed into a column approximately 49 px wide; Acid–base also wraps to three lines. | Give title and actions separate responsive rows or priorities; titles must remain readable without shrinking action hit areas in both languages. |
| **QA-UI-10** | P0 | Ion exchange state/share URLs cannot be restored. | The module opens as `m=ionexchange`, serializes as `m=ionex&s=…`, then reloads to Home and loses the scenario; reproduced twice. Confirms **UX-IX01**. | Use one canonical route/state ID, migrate or reject legacy aliases deliberately, and add save/share/reload tests that assert the complete scenario after a fresh load. |

Audit baseline score: **86/100** — three high-severity defects, seven medium-severity defects and no
console failures. The score is retained as the pre-remediation baseline; the implementation pass
below closes the three P0 defects and the reproduced portions of the seven P1 defects.

The follow-up regression matrix must extend the representative pass to 360×640, phone landscape,
768/820/1024 px, 200% zoom, all chart families in dark mode, empty/error states, denied clipboard,
storage failure and a complete keyboard-only save/share/export path. These are coverage extensions,
not substitutes for the confirmed defects above.

Deterministic gate re-run on 2026-07-17: ESLint passed, all **334** Vitest tests passed,
TypeScript passed and the production build completed. The local server returned HTTP 200.

#### Recommended implementation sequence

1. **Live P0 defects:** QA-UI-01, QA-UI-04 and QA-UI-10, with shared-control and route regression
   tests before module-specific polish.
2. **Accessibility, navigation and bilingual integrity:** QA-UI-02, QA-UI-03, QA-UI-07 and
   QA-UI-08, then the remaining UX-G02 through UX-G05 acceptance work.
3. **Responsive shell and chart hierarchy:** QA-UI-05, QA-UI-06 and QA-UI-09 together with
   UX-G07 through UX-G09 and the extended viewport matrix.
4. **Scientific trust beyond the reproduced defects:** UX-RX01, UX-SO01, UX-EX01 and UX-AC01.
5. **Progressive disclosure system:** one shared Basic/Advanced/task pattern, piloted in Conditional
   potential, Selective precipitation and acid–base titration before rolling across modules.
6. **Learning layer and engine parity:** goal-based Home, worked examples, cross-module handoffs,
   operating-point readers and the remaining advanced engine surfaces.

#### Confirmed UI remediation implemented (2026-07-17)

The browser-confirmed backlog above has now been implemented as one shared-system pass rather than
as module-specific patches. The product keeps its existing indigo/slate visual identity while
correcting scientific trust, navigation, accessibility, bilingual presentation and responsive
chart behavior.

| QA ID | Status | Implementation and verification |
| --- | --- | --- |
| **QA-UI-01** | ✅ Closed | Shared numeric fields now carry native bounds, keep invalid drafts out of the calculation, show a bilingual inline range message and clamp on Enter/blur. A pKa of `99` remains visibly invalid while the engine stays at 4.76, then normalizes field and slider together to 35. |
| **QA-UI-02** | ✅ Closed | Module changes create browser history entries, parameter serialization remains replace-only and `popstate` restores Home/modules. Home → Acid–base → Complexes → Back → Back now restores Acid–base and Home; Forward is supported. |
| **QA-UI-03** | 🟡 Reproduced surfaces closed | Hub assumptions, chart loading/toolbar labels, Acid–base database names/groups/descriptions and the ethylenediamine preset group are bilingual. The systematic database-wide CI gate in **UX-G19** remains separate follow-up work. |
| **QA-UI-04** | ✅ Closed | Mobile predominance diagrams use a readable 720 px scientific canvas inside a compact 260 px horizontal viewport with a localized “Swipe to explore” affordance. Labels are no longer scaled to 8–10 px. |
| **QA-UI-05** | ✅ Closed | Chart controls now occupy a dedicated toolbar row. Mobile reserves a safe zone for the Variables action, and Plotly is allowed to shrink inside the card rather than overflow behind the footer/FAB. |
| **QA-UI-06** | ✅ Closed | Mobile diagram/titration strips use scroll snapping, visible overflow treatment and active-tab scrolling. The centered-row negative-overflow bug was removed; a restored Potentiometric mode scrolls fully into view. |
| **QA-UI-07** | ✅ Closed | The Variables sheet becomes inert while closed, focuses its close control when opened, traps Tab/Shift+Tab, closes on Escape, inerts the surrounding application and restores focus to Variables. |
| **QA-UI-08** | ✅ Closed | Topic, submodule, diagram and titration tablists now implement roving focus plus Left/Right/Home/End automatic activation. |
| **QA-UI-09** | ✅ Closed | Module title and actions use separate header rows. “Liquid–liquid extraction” receives the full 287 px panel width and the actions remain readable beneath it. |
| **QA-UI-10** | ✅ Closed | Ion exchange now uses canonical `ionexchange` identity for routing, state serialization and saved systems. A generated `?m=ionexchange&s=…` URL survives a fresh reload with the scenario intact. |

Verification: `npm run check` passes ESLint, all **334** Vitest tests, TypeScript and the production
build. A live browser regression visited all 16 module routes with zero console errors and repeated
the numeric-boundary, state reload, Back/Forward, keyboard-tab, mobile-modal, mobile chart,
predominance and titration-strip scenarios. The remaining roadmap items are the broader product
architecture work identified by the static audit, especially **Start → Understand → Extend**,
database-wide localization, goal-based Home and consistent operating-point readers.

#### Shared module grammar and interaction polish (2026-07-17) — implemented

The first architecture pass now turns the audit's **Start → Understand → Extend** direction into a
shared, visible interaction pattern without removing expert controls. It was implemented at the
component level and then verified in every module rather than restyling individual screens in
isolation.

| Scope | Implementation and current status |
| --- | --- |
| **Module orientation (UX-G06)** | All 16 module routes and all five titration modes now open with a bilingual model orientation: one always-visible scientific objective and one compact “How to use this model” disclosure organized as **Define → Interpret → Extend**. The copy distinguishes overlapping views by their actual independent variable and purpose—for example, Complexation equilibrium is an M–L model over pL, while Metal speciation predicts hydrolysis/ligand fractions over pH. Goal-based Home routes and worked-example narratives remain separate product follow-ups, so UX-G06 is materially advanced but not fully closed. |
| **Core versus optional hierarchy (UX-G14, UX-AB01)** | `PanelSection` is now reserved for the core model stages; optional layers use one `Disclosure` component with a shared chevron, focus treatment and ARIA-controlled body. Acid–base microstates, ion pairing, mixture titration, second-analyte extraction, conditional-solubility pX, conditional-potential pX and the electrode calculator activate from their disclosure header in one action. Native activity-correction details now use the same summary class. Emoji section icons and JavaScript-generated uppercase headings were removed. |
| **Results and reading order (UX-G07)** | Plot-level metrics remain the primary decision summary; sidebar cards are explicitly titled **Detailed results / Resultados detallados** and use a quieter compact treatment. Section titles use sentence case and the same typography in both languages. This resolves the visual duplication ambiguity, while module-specific removal of every repeated metric remains an incremental content pass. |
| **Complexes family consistency** | Complexation and Metal speciation now share the same header, orientation, System section, preset/disclosure surfaces, detailed-result treatment and chart chrome. Their copy deliberately preserves the scientific distinction: pL-driven formation/Bjerrum analysis versus pH-driven hydrolysis and operating-point speciation. The Metal speciation title was shortened to avoid artificial wrapping in the 320 px panel. |
| **Preset and custom editors (UX-PB01)** | Database panels and full-system presets now share border, surface, caret, text hierarchy and interaction states. Pourbaix's arbitrary species/couple editor was rebuilt with shared label fields, selects and segmented controls; every row has a named remove action, neutral sentence-case type label and consistent add controls. The former tiny unlabeled × buttons, hardcoded category colors, native inputs and inline card styling are gone. UX-PB01 is closed. |
| **Responsive interaction (UX-G08, UX-G14)** | The mobile variables sheet now explicitly overrides the 320 px desktop panel width and occupies the full viewport. Close, header actions, chart toolbar, tabs, disclosures, preset chips and Home destination chips use mobile touch targets; the sheet retains its focus trap/inert lifecycle. The bug was confirmed at 375 px (sheet width 320 px before, 375 px after). The broader 360×640/landscape/200% zoom matrix in UX-G08 remains follow-up coverage. |
| **Motion, focus and semantics (UX-G14, UX-G15)** | The layout-triggering `transition: width` was removed from sidebar collapse, closing UX-G15. Buttons, summaries, inputs, selects and textareas share a visible focus rule and disabled state. Module guides, collapsible sections and disclosures expose `aria-expanded` plus `aria-controls`; all visible buttons in the route matrix have an accessible name. Help icons retain a small visual footprint with an expanded 44 px hit area. |
| **Scientific notation and terminology** | Solubility notation now follows the established language convention consistently: Spanish uses Kps/pKps and English uses Ksp/pKsp, including the dynamic General solubility title, conditional-solubility tab/presets, solid-phase feasibility and precipitation controls. UI prose stays bilingual; species/formulas remain language-neutral. |

Live verification covered Home, all 16 routes, all five titration modes, Complexation/Speciation
side-by-side, Pourbaix custom mode, English/light desktop and Spanish/dark mobile. At 1440×900 every
route had exactly one module orientation, zero unnamed visible buttons, zero document-level
horizontal overflow and zero console errors. At 375×812 every route used a full-width variables
sheet; a focused touch-target audit covered all previously undersized summaries, toolbar actions,
preset chips and mode controls. The deterministic UI detector reports no remaining findings.

#### Second-pass UI convergence and scientific minimalism (2026-07-17) — implemented

The follow-up pass removed the remaining visual and interaction drift that was still visible after
the shared module grammar landed. The governing rule is now that elevation communicates a true
overlay; normal scientific content uses flat surfaces, restrained borders and the data as its main
hierarchy.

| Scope | Implementation and verification |
| --- | --- |
| **Scientific canvas and visual hierarchy** | The application now uses the full viewport instead of a framed floating card. The top bar, chart shells, predominance/2D/redox diagrams, plot metrics and Home destinations use flat surfaces and borders rather than ambient gradients, oversized radii and floating shadows. Plot metrics use the UI typeface at a compact scale instead of a hero-number treatment. Popovers, the mobile sheet and other true overlays retain elevation. |
| **Complexes family workflow** | Complexation now follows the same progressive structure as Metal speciation. System identity and analytical concentrations remain in the core path; activity correction and conditional/coupled equilibria are separate disclosures. The Ringbom/coupled treatment selector and its dependent editors live inside the advanced layer, while the model badge continues to expose every active assumption. This aligns the interaction grammar without pretending that a pL equilibrium model and a pH speciation model are the same calculation. |
| **Disclosure and button vocabulary** | Module guides, optional layers, database/system presets, didactic explanations and nested editor sections now share one right-aligned CSS chevron, open-state rotation, focus treatment and mobile hit-area policy. Every JSX button declares `type="button"`, preventing future accidental form submission when editors are composed into forms. The desktop panel handle is now 44 px wide. |
| **Dense editor cleanup** | Static inline layout/style fragments were removed from the complexation, activity, extraction, conditional-constant, conditional-potential, solubility, ion-exchange, Pourbaix and titration surfaces. Repeated control spacing, quick options, preset rows, chart captions, indicator cards, analyte editors and advanced bodies now use shared semantic classes. Dynamic scientific colors, plot dimensions and tooltip coordinates remain intentionally data-driven inline values. |
| **Extraction accessibility and international notation** | The analyte name/formula label is explicitly associated with its text field and is announced correctly in the accessibility tree. Preset selection uses the formula as the editable default (`I₂`, `HQ`, `Cu(Ox)₂`, etc.), avoiding a Spanish name leaking into English while preserving formulas as international scientific notation. The neutral-form stepper has a bilingual accessible name. |
| **Titration bilingual integrity** | Generic acid/base systems initialize and reset in the active language and remain localized when the language changes unless the user supplied a custom label. The five visual-indicator names are bilingual in the selector; transition ranges and chemistry data remain unchanged. All five titration modes were rechecked for their own title, objective and chart flow. |
| **Responsive and runtime matrix** | All 16 routes were exercised at 360×640, 375×812, 720×450, 768×1024 and 1440×900. Every route had one module guide, zero unnamed buttons, no document-level horizontal overflow and a full-width mobile variables sheet. English/light and Spanish/dark were inspected, including the Complexation activity layer, Metal speciation sheet, Extraction editor, Home and dense titration modes. The console remained free of runtime warnings/errors. |

This pass closes the remaining shared-pattern inconsistency in the Complexes family and the
reproduced bilingual/accessibility leaks above. Product additions such as goal-based Home routes,
worked examples, chart click-to-read operating points, model-validity bands and full database-wide
localization remain explicit feature work under their existing UX IDs; they should build on this
grammar rather than introduce another surface pattern.

#### Export, dark-theme and scientific-trust remediation (2026-07-17) — implemented

The next live dogfooding pass focused on the small interactions that determine whether the product
feels dependable: chart files must actually arrive, every icon must explain itself, inactive charts
must offer the activation action where the user is looking, and scientific models must disclose
where their equations stop being trustworthy.

| Scope | Implementation and verification |
| --- | --- |
| **Unified chart export and PNG repair** | The former reset/PNG/CSV icon trio is now two named actions: **Reset view** and **Export**. Export opens one origin-aware 180 ms popover with **Chart image (PNG 2×)** and **Chart data (CSV + metadata)**. It supports outside click, Escape with focus restoration, ArrowUp/ArrowDown/Home/End navigation, disabled/busy states, an inline bilingual failure message and reduced motion. Plotly PNGs no longer put multi-megabyte data URLs directly on an anchor: the data URL is converted to a binary Blob and downloaded through a short-lived object URL. Native 2D maps use `canvas.toBlob` through the same path. CSV keeps the existing metadata format. Browser QA confirmed both actions close successfully with no console error; the PNG binary conversion has a regression test. |
| **Dark-theme accent roles** | Dark mode no longer asks one translucent violet to represent selection, guidance and solid controls. It now has separate accessible tokens for accent text (`#A5ACFF`), stronger selected surfaces, and a WCAG-safe solid control fill (`#5B5FDE` with white text). Active diagram tabs, model classification and segmented controls therefore retain hierarchy against the neutral charcoal canvas. A hardcoded `white` color mix in model chips was replaced with the live surface token. Light mode keeps the same indigo identity. |
| **Activation at the point of need** | Mixtures still opens on the useful buffer-capacity chart, while its Titration empty state now contains **Show titration curve** and creates the curve in one click. The Complexation pL–pX map and Metal-speciation pL–pH map now offer **Enable coupled equilibrium** / **Add auxiliary ligand** directly inside their explanatory empty states and open the dependent editor state automatically. Informational empty states that cannot be “enabled” (strong-acid anion alpha and missing indicator data) remain explanatory rather than pretending to be actions. |
| **UX-RX01 — balanced redox result** | ✅ Closed. The Redox result now combines the stronger-oxidant reduction and weaker-reductant oxidation, renders reactants **and products**, scales every coefficient, cancels shared H⁺/H₂O/e⁻ terms and reports the electron count. A related engine defect was fixed at the same time: reaction `log K` now uses the least common multiple of the two electron counts, not `n₁·n₂`, which overcounted equal non-unit half-reactions. The correction is shared by Redox, Conditional potential and redox titration; Fe/Ce, MnO₄⁻/Fe²⁺ and equal-2e⁻ cases have regression coverage. |
| **UX-SO01 — one molecular pKa ladder** | ✅ Closed. Molecular-solid solubility no longer renders a standalone first-pKa slider plus a second pKa list for the same state. One `ConstantList` owns all pKas, solubility, saturation, export metadata and the selected solid-form index. The obsolete scalar `pKa` state and monoprotic fallback path were removed. |
| **UX-EX01 — explicit extractable species** | ✅ Closed. The polyprotic extraction editor replaces the tiny `+1` hint control with a labeled select. Options show α index, generic molecular form (`H₂A`, `HA`, `A`) and protonation position; the explanation shows the resulting charge ladder, identifies the selected `z = 0` species and states the exact consequence `D = Kd·αᵢ`. Removing pKas also clamps the selection to a physical ladder state. |
| **UX-AC01 / UX-G10 — model validity at the operating point** | ✅ Closed for Activity. Extended Debye–Hückel, Kielland and Güntelberg use a recommended `I ≤ 0.1 M`; Davies uses `I ≤ 0.5 M`. The selected model changes the plotted domain, model badge and inline operating-point status. Past the limit the chart switches to dotted curves, shades and labels the extrapolation region, and warns that the number is not a validated prediction. The axis expands if the user deliberately evaluates a higher I, so the operating marker is never silently off-chart. |

Verification covered English/light desktop and Spanish/dark mobile. The export popover fits at
390×844 with zero document overflow, focuses its first option, traverses options by arrow keys and
returns focus to Export on Escape. Live checks exercised the Mixtures and both 2D-map activation
buttons, the molecular-solid editor, the 8-hydroxyquinoline neutral-species selector, the complete
Fe/Ce redox equation, the Activity validity boundary and an out-of-range warning. A final 16-route
desktop matrix reported one module guide, zero unnamed visible buttons, zero horizontal overflow
and zero console errors on every route. The deterministic suite now contains **338 tests**.
`npm run check` passes ESLint, all tests, TypeScript and the production Vite build.

#### UI/UX audit follow-up (2026-07-18) — implemented

Third-pass audit reconciled stale **UX-G\*** / **QA-UI-\*** rows against code at `8c5b30b`
(PR #99) and closed the remaining shared-control and progressive-disclosure gaps identified
in the audit plan. Full report: [`docs/UI-UX-AUDIT.md`](docs/UI-UX-AUDIT.md).

| Wave | Scope | Status |
| --- | --- | --- |
| **Wave 1** | `Segmented` radiogroup + arrow-key navigation; Share/Saved-systems failure feedback (**UX-G03**, **UX-G17**); i18n leaks (**UX-AB03**, extraction dimer label, Gran volume label). | ✅ |
| **Wave 2** | Acid–base titration coupled medium: one **Segmented** selector (aqueous / precipitation / biphasic / resin) instead of three exclusive toggles (**UX-TA01/02** partial). | ✅ |
| **Wave 3** | Conditional solubility workflow selector: single / compare / stages / pX with gated panel sections (**UX-SP01/02** partial). | ✅ |
| **Wave 4** | Persistent chart readout strip under Plotly charts (**UX-G09** partial). | ✅ |

Live `/browse` verification (1440×900 and 390×844) covered Home, Ácido-base, Titulación,
Solubilidad condicional, Pourbaix, Extracción and Actividad with zero console errors on fresh
loads. Screenshots are stored locally under `docs/testing/ui-audit-2026-07-18/`.

Remaining open product work unchanged: goal-based Home (**UX-P01**), worked examples
(**UX-P02**), database-wide EN (**UX-G02**), bilingual CI gate (**UX-G19**), arbitrary-pH
operating-point readers (**UX-AB02**), extended viewport matrix (**UX-G08**).

#### Fourth-pass audit remediation (2026-07-18) — implemented

The live/code audit in `docs/UI-UX-AUDIT.md` (fourth pass) identified five P1 release
blockers. All five are now closed on branch `feat/ux-audit-waves` (PR #100):

| ID | Fix |
| --- | --- |
| **UIA-01** | Home topic tabs: first tab is focusable when no hub is active (`tabIndex` roving entry). |
| **UIA-02** | All ten hand-built `.segmented` groups replaced with shared `Segmented`/`NumberSegmented`; Kielland ion select uses `aria-labelledby`. |
| **UIA-03** | Light theme `--accent-text` (#4338CA) for selected nav/diagram copy on soft surfaces (AA). |
| **UIA-04** | Plot annotation `#fff` surfaces and `#7f8c8d` ink remapped in `plotTheme.ts`; crossing label uses theme-safe ink. |
| **UIA-05** | Mobile Plotly legends move above the plot with content-aware top margin; compact segmented groups stay horizontal in the Variables sheet. |

#### Fourth-pass audit P2/P3 remediation (2026-07-18) — implemented

PR #101 (`fix/ux-audit-p2-p3`) closes the remaining fourth-pass backlog:

| ID | Fix |
| --- | --- |
| **UIA-06** | `Chart`, `PredominanceDiagram`, `Predominance2D` and `RedoxPredictionScale` expose bilingual `role="img"` summaries. |
| **UIA-07** | Top-bar language control is now an ES/EN segmented toggle with the active language visibly selected. |
| **UIA-08** | `Segmented` auto-applies compact layout when all labels are ≤12 characters (≤4 options). |
| **UIA-09** | Home intro clarifies **14 engines / 16 guided workflows**. |
| **UIA-10** | Module titles normalized to en-dash typography (`ácido–base`, `líquido–líquido`, `Debye–Hückel`). |

#### Fourth-pass UI/UX quality audit (2026-07-18) — closed

An independent audit of `8c5b30b` plus the current uncommitted remediation worktree covered
all 16 routes at 1440×900, 375×812 and
320×568, representative Spanish/English and light/dark states, keyboard flows, live PNG/CSV
activation, contrast pairs and the current production bundle. The application scored **15/20
(Good)**: no P0 blockers, five P1 release issues, three P2 follow-ups and two P3 polish items.
The complete evidence, WCAG mapping and acceptance guidance live in
[`docs/UI-UX-AUDIT.md`](docs/UI-UX-AUDIT.md).

| ID | Priority | Confirmed finding and required change |
| --- | --- | --- |
| **UIA-01** | P1 | Home's seven desktop topic tabs all use `tabIndex=-1` when no hub is active, leaving global topic navigation without a keyboard entry point. Use navigation semantics or a valid roving-focus target and add Home keyboard coverage. |
| **UIA-02** | P1 | Ten inline `.segmented` groups bypass the accessible shared component, and the Kielland ion-size select has no programmatic label. Replace lookalikes with shared labeled controls and block regressions. |
| **UIA-03** | P1 | Light selected-state accent text is below AA (`3.995:1` on the soft accent surface; `4.467:1` on white). Separate text and decorative accent roles. |
| **UIA-04** | P1 | Conditional potential leaves a literal white crossing annotation in dark mode; remapped text reaches only `2.564:1`. Theme annotation surfaces and test both modes. |
| **UIA-05** | P1 | At 375 px, Plotly legend/title collisions are measurable in Complexes, Competitive precipitation and Activity. Make legend placement and bottom margin content-aware. |
| **UIA-06** | P2 | Plotly and custom SVG diagrams do not provide a complete immediate non-visual alternative. Add bilingual summaries, SVG titles/descriptions and structured key data. |
| **UIA-07** | P2 | The language pill shows the current language while its accessible label describes the destination, making bare `ES`/`EN` ambiguous. Use a selected two-state control or one action convention. |
| **UIA-08** | P2 | Mobile stacks every segmented control vertically, including compact numeric and two-option groups. Preserve horizontal 44 px targets for short options and stack only verbose groups. |
| **UIA-09** | P3 | Home says 14 engines while the product presents 16 workflow destinations. Clarify the distinction or adopt one canonical inventory count. |
| **UIA-10** | P3 | Bilingual prose mixes hyphen-minus and en dash in acid–base, liquid–liquid and Debye–Hückel constructions. Normalize display typography through a short notation style guide. |

Positive regression results are equally explicit: all routes loaded with zero console errors;
none overflowed the document at any tested width; the Variables sheet passed focus-trap, Escape,
background-inert and focus-return checks; and the unified Export menu passed pointer and keyboard
activation for both PNG and CSV. These behaviors are the baseline to preserve while closing
**UIA-01…10**.

The PNG statement above records the 2026-07-18 run only. The fifth pass below reproduced a real
raster-export failure on current `main`; it supersedes that historical result.

#### Fifth-pass UI/UX quality audit (2026-07-22) — implemented

A clean-state follow-up on `main` at `dd9e4c0` rechecked the fourth-pass remediations in code and
through the live application. The matrix covered all 16 routes at 1440×900, 375×812 and 320×568,
plus short-height probes at 360×640 and 375×667; it included ES/EN, light/dark, keyboard flows,
contrast measurement, chart collision geometry and live PNG/CSV activation. The remediation raises
the current score to **19/20** and closes all **two P1** and **four P2** items. Full evidence and
acceptance guidance:
[`docs/UI-UX-AUDIT.md`](docs/UI-UX-AUDIT.md).

| ID | Priority | Confirmed finding and required change |
| --- | --- | --- |
| **UIA-R2-01** | P1 | ✅ Plotly's font family is serialized without invalid nested quotes. The full toolbar flow produced a 75,589-byte PNG with the correct binary signature; Activity, Complexes, Conditional potential and Competitive precipitation pass live export. |
| **UIA-R2-02** | P1 | ✅ Mobile chart regions scroll instead of compressing; direct charts keep 480 px, short-height tabbed charts keep 360 px, and legend columns/margins follow visible content. All 16 routes pass at 320×568 with no measured collisions or document overflow. |
| **UIA-R2-03** | P2 | ✅ The shared Chart generates bilingual series endpoints and meaningful interior maxima/minima, excluding hidden, gap and non-numeric data while preserving module overrides. |
| **UIA-R2-04** | P2 | ✅ Mobile number fields, ranges, selects, toggles, compact segments and saved-system actions expose 44 px targets without making the visual slider track heavier. |
| **UIA-R2-05** | P2 | ✅ Saved systems has a persistent label, example placeholder, contextual remove names, language-aware dates, invalid-date hardening and immediate Undo after deletion. |
| **UIA-R2-06** | P2 | ✅ Topic/subview groups use navigation landmarks and `aria-current="page"`; roving Arrow/Home/End behavior remains, while genuine chart tabs keep tab semantics. |

Verified closures to preserve: UIA-01 through UIA-10 and UIA-R2-01 through UIA-R2-06. All 16
routes remain free of console errors and document-level horizontal overflow at the tested widths.
The 320/375 px chart collisions are closed; selected-state contrast reaches 7.07:1 in light mode,
the dark crossing annotation reaches 10.57:1, the Variables sheet retains its
focus/inert/Escape behavior, all inspected mobile variable controls reach 44 px, and the inspected
ES/EN chrome contains no reproduced cross-language leaks.

#### Sixth-pass UI/UX quality audit (2026-07-23) — implemented

A live `/browse` pass on `main` at `21993e5` re-checked all 16 routes for control inventory,
unlabeled radiogroups and touch-target gaps, then closed six actionable items. Full evidence:
[`docs/UI-UX-AUDIT.md`](docs/UI-UX-AUDIT.md).

| ID | Priority | Confirmed finding and required change |
| --- | --- | --- |
| **UIA-R3-01** | P1 | ✅ Every `Segmented` / `NumberSegmented` radiogroup in audited modules exposes an `aria-label`; zero unlabeled groups on the mobile re-check routes. |
| **UIA-R3-02** | P1 | ✅ Mixture remove buttons are named and meet 44 px on mobile. |
| **UIA-R3-03** | P1 | ✅ Redox, Pourbaix, Conditional potential, Conditional constants and Metal speciation no longer duplicate plot-primary metrics in the sidebar. |
| **UIA-R3-04** | P2 | ✅ Hub assumptions live only in the footer; subnav duplicate removed (**UX-P04** partial). |
| **UIA-R3-05** | P2 | ✅ Language toggle, empty-plot CTAs and database tiles reach 44 px on mobile. |
| **UIA-R3-06** | P2 | ✅ Constant-list remove buttons use `aria-label`, not `title` alone. |
| **UIA-R3-09** | P1 | ✅ Variables-panel slider rows no longer clip labels/values on the 320 px sidebar. |
| **UIA-R3-10** | P2 | ✅ Mobile variables sheet uses 85 vh with scroll padding and a bottom inset affordance. |
| **UIA-R3-11** | P2 | ✅ Constant-list sliders keep minimum track width; sidebar result lines wrap; disclosures no longer clip inline errors. |
| **UIA-R3-12** | P1 | ✅ Desktop 1440×900 pass: panel control headers stack at the fixed 320 px width (not only below 800 px viewport). |

| **UIA-R3-13** | P1 | ✅ Panel collapsibles (segmented, sliders, toggles, mask sections) readable at 320 px on desktop and mobile. |

Deferred: **UIA-R3-08** (export/database i18n policy, **UX-G02** / **UX-P06**).

| **UIA-R3-07** | P2 | ✅ Remaining modules no longer duplicate plot-primary metrics in sidebar cards (**UX-G07**). |

### Near-term

| Feature | Notes |
| --- | --- |
| **Conditional side-reaction coefficient corrections (R2 audit)** | ✅ Done — mutually exclusive branches add, product coefficients enter the numerator, and arbitrary stoichiometric exponents are supported by the shared conditional-constant engine. |
| **Acid–base titration direction and starting-composition corrections (R2 audit)** | ✅ Done — explicit pure/continuous starting compositions, formal equivalences outside pH 0–14, direction-aware Gran and q% are shipped. |
| **Ion-exchange proton-competition direction correction (R2 audit)** | ✅ Done — corrected resin/bulk proton ratio, explicit charge exponent, D/φ and three-compartment elution revalidated. |
| **Minor engine↔UI parity gaps** (2026-07-10 audit — all 5 items done) | (a) γ-model choice for AcidoBase/Mezclas/Solubilidad — **done**: all three now offer D-H extendida/Davies/Güntelberg for their own pH/Ksp corrections (Kielland stays Actividad-only, it needs a per-ion size table that doesn't generalize to free-text species). (b) `separationWindow`'s quantitativity target — **done**: Competitiva now has an editable "Objetivo de cuantitatividad" slider (90–99.999 %, chips at 99/99.9/99.99 %), same treatment as Constantes Condicionales' "% formado objetivo". (c) Mohr indicator chromate concentration — **done**: Titulaciones (modo Precipitación) now exposes [CrO₄²⁻] as an editable ConcSlider when the Mohr marker is on, instead of a fixed 5 mM. (d) Craig multi-ion breakthrough — **done**: Intercambio iónico's "Columna multi-zona" now supports an optional third competing ion (D), showing 3 simultaneous breakthrough fronts instead of capping at 2. (e) acid–base titration curves at I > 0 — **done**: Titulaciones' Ácido-base sub-mode now has the same "Corrección por actividad" control (I, D-H/Davies/Güntelberg) as Mezclas, threaded through `titrationCurve`'s new optional `I`/`model` params. During QA, found that the Gran-plot Veq detector is already inaccurate for this preset even at I=0 (pre-existing, unrelated to this change — Gran's linearization assumes concentration pH, so it's worth revisiting once the module gets its own attention). |
| **Bilingual UI (Spanish / English)** | Core module rollout and the reproduced **QA-UI-03** leaks are fixed: assumptions, chart toolbar/loading labels, Acid–base database presentation and the Complexes ethylenediamine group now follow the selected language. Database-wide localization and the automated regression gate in **UX-G19** remain open. |
| **R2 remediation — multi-salt precipitation stages (R2-11)** | ✅ Closed — `sequentialSharedPrecipitation` evaluates a conserved precipitant pool at user-editable stage pH values; Solubilidad condicional exposes per-stage recovery. |
| **R2 remediation — phase-aware generalized redox (R2-32)** | ✅ Closed — pool-conserving `redoxPoolFractions`, per-node `poolStoich`, concentration-dependent solid stability via shared `logActivity`, and pool error surfaced in Pourbaix. |
| **R2 remediation — quantitative endpoint errors (R2-38)** | ✅ Closed — dilution-aware acid–base (#95) plus complexometric, Mohr precipitation and redox indicator endpoint errors via shared `endpointFromCurve`. |
| **R2 remediation — titration observables (R2-39)** | ✅ Closed — absorbance and conductometry in Titulación (ácido-base, EDTA, redox) follow each sub-mode's shared curve; ε and molar λ are editable in the UI. |
| **Worked-example gallery** | Loadable, solved problems per module to speed onboarding and serve as a reference for teaching. |
| **2D predominance diagrams** | ✅ Done — pL–pH, pL–pX and pH–log[M] (Sillén) maps, dark-mode remap, CSV/PNG export, and the Sillén map's M1/M2 comparison + side-reaction mask all shipped (see resolved section above). |
| **Migrate constants data to Medusa/HYDRA + NIST SRD-46** | Data breadth, not methodology: replace the current Harris/Skoog textbook constants with Medusa/HYDRA and NIST SRD-46 as the primary source, per-entry provenance citations. The calculation engines and chemistry methodology stay textbook-based (Harris, Skoog, Stumm & Morgan, Ringbom, Sillén) regardless of where the numeric constants come from — this only changes the *data*, not how it's used. Constants are facts, not copyrightable code, so this is independent of any tool's license. |

### Medium-term

| Feature | Notes |
| --- | --- |
| **Step-by-step titration animation** | Visual playback of the titration curve point by point, with species fractions updated in sync. |
| **Pitzer model** | Activity corrections valid at high ionic strength (I > 0.5 M), extending Debye–Hückel. |

### Long-term / exploratory

| Feature | Notes |
| --- | --- |
| **Surface adsorption** | Constant capacitance model (CCM), diffuse-layer model for mineral-surface equilibria. |
| **PHREEQC bridge** | Offline batch validation against PHREEQC as an oracle (not a runtime dependency). |
| **Reactive kinetics** | One slow reaction coupled to a fast equilibrium system. |
| **Richer 2D interactivity** | Evaluate Plotly `contour`/`heatmap` or a lightweight D3/canvas layer (both MIT/BSD-compatible) for 2D predominance maps and Pourbaix diagrams. GeoGebra was considered but ruled out: its GPL-3.0 licensing is incompatible with this project's MIT license. |

---

## How to contribute

1. Check if an [issue](https://github.com/alekcancino/equilibria-lab/issues) already exists for the feature.
2. If not, open one describing the chemistry and the expected UI behavior.
3. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup.
