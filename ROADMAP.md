# Roadmap

This document describes what is currently available and what is planned for future releases. For the full list of implemented modules see the [README](README.md).

Suggestions and contributions are welcome — open an [issue](https://github.com/alekcancino/equilibria-lab/issues) to discuss.

---

## Currently available

### Core equilibria

- Acid–base: α fractions, log *C*–pH diagram, predominance zone diagram (DUZP), pure solution pH, aqua-acid cations (Fe³⁺, Al³⁺)
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

### Near-term

| Feature | Notes |
| --- | --- |
| **Minor engine↔UI parity gaps** (2026-07-10 audit — all 5 items done) | (a) γ-model choice for AcidoBase/Mezclas/Solubilidad — **done**: all three now offer D-H extendida/Davies/Güntelberg for their own pH/Ksp corrections (Kielland stays Actividad-only, it needs a per-ion size table that doesn't generalize to free-text species). (b) `separationWindow`'s quantitativity target — **done**: Competitiva now has an editable "Objetivo de cuantitatividad" slider (90–99.999 %, chips at 99/99.9/99.99 %), same treatment as Constantes Condicionales' "% formado objetivo". (c) Mohr indicator chromate concentration — **done**: Titulaciones (modo Precipitación) now exposes [CrO₄²⁻] as an editable ConcSlider when the Mohr marker is on, instead of a fixed 5 mM. (d) Craig multi-ion breakthrough — **done**: Intercambio iónico's "Columna multi-zona" now supports an optional third competing ion (D), showing 3 simultaneous breakthrough fronts instead of capping at 2. (e) acid–base titration curves at I > 0 — **done**: Titulaciones' Ácido-base sub-mode now has the same "Corrección por actividad" control (I, D-H/Davies/Güntelberg) as Mezclas, threaded through `titrationCurve`'s new optional `I`/`model` params. During QA, found that the Gran-plot Veq detector is already inaccurate for this preset even at I=0 (pre-existing, unrelated to this change — Gran's linearization assumes concentration pH, so it's worth revisiting once the module gets its own attention). |
| **Bilingual UI (Spanish / English)** | Toggle between Spanish and English for all labels, tooltips, and InfoBox content. Chemistry notation and formula strings remain language-neutral. |
| **Worked-example gallery** | Loadable, solved problems per module to speed onboarding and serve as a reference for teaching. |
| **2D predominance diagrams** | ✅ Done — pL–pH, pL–pX and pH–log[M] (Sillén) maps, dark-mode remap, CSV/PNG export, and the Sillén map's M1/M2 comparison + side-reaction mask all shipped (see resolved section above). |
| **Migrate constants data to Medusa/HYDRA + NIST SRD-46** | Data breadth, not methodology: replace the current Harris/Skoog textbook constants with Medusa/HYDRA and NIST SRD-46 as the primary source, per-entry provenance citations. The calculation engines and chemistry methodology stay textbook-based (Harris, Skoog, Stumm & Morgan, Ringbom, Sillén) regardless of where the numeric constants come from — this only changes the *data*, not how it's used. Constants are facts, not copyrightable code, so this is independent of any tool's license. |

### Medium-term

| Feature | Notes |
| --- | --- |
| **Step-by-step titration animation** | Visual playback of the titration curve point by point, with species fractions updated in sync. |
| **Non-aqueous solvents** | Leveling effect, acidity scales in amphiprotic solvents (MeOH, AN, DMSO). |
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
