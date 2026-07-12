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

### Bilingual UI — Pourbaix module (2026-07-12) — in progress

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

Remaining: translate the other 6 modules one at a time, following the pattern in `AGENTS.md`.

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

### Near-term

| Feature | Notes |
| --- | --- |
| **Minor engine↔UI parity gaps** (2026-07-10 audit — all 5 items done) | (a) γ-model choice for AcidoBase/Mezclas/Solubilidad — **done**: all three now offer D-H extendida/Davies/Güntelberg for their own pH/Ksp corrections (Kielland stays Actividad-only, it needs a per-ion size table that doesn't generalize to free-text species). (b) `separationWindow`'s quantitativity target — **done**: Competitiva now has an editable "Objetivo de cuantitatividad" slider (90–99.999 %, chips at 99/99.9/99.99 %), same treatment as Constantes Condicionales' "% formado objetivo". (c) Mohr indicator chromate concentration — **done**: Titulaciones (modo Precipitación) now exposes [CrO₄²⁻] as an editable ConcSlider when the Mohr marker is on, instead of a fixed 5 mM. (d) Craig multi-ion breakthrough — **done**: Intercambio iónico's "Columna multi-zona" now supports an optional third competing ion (D), showing 3 simultaneous breakthrough fronts instead of capping at 2. (e) acid–base titration curves at I > 0 — **done**: Titulaciones' Ácido-base sub-mode now has the same "Corrección por actividad" control (I, D-H/Davies/Güntelberg) as Mezclas, threaded through `titrationCurve`'s new optional `I`/`model` params. During QA, found that the Gran-plot Veq detector is already inaccurate for this preset even at I=0 (pre-existing, unrelated to this change — Gran's linearization assumes concentration pH, so it's worth revisiting once the module gets its own attention). |
| **Bilingual UI (Spanish / English)** | 🔶 In progress — infrastructure + 8 modules shipped, Ácido-base and Redox hubs fully bilingual (see resolved sections above). Remaining: translate the other 6 modules one at a time. |
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
