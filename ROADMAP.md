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
- In-app validation: each hub's cross-check citation (e.g. "cotejado con Spana/HALTAFALL y Harris") is always visible in the assumptions summary, not hidden behind an expand click; full methodology detail (see `docs/VALIDATION.md`) on expand

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

### Near-term

| Feature | Notes |
| --- | --- |
| **Minor engine↔UI parity gaps** (2026-07-10 audit — all 5 items done) | (a) γ-model choice for AcidoBase/Mezclas/Solubilidad — **done**: all three now offer D-H extendida/Davies/Güntelberg for their own pH/Ksp corrections (Kielland stays Actividad-only, it needs a per-ion size table that doesn't generalize to free-text species). (b) `separationWindow`'s quantitativity target — **done**: Competitiva now has an editable "Objetivo de cuantitatividad" slider (90–99.999 %, chips at 99/99.9/99.99 %), same treatment as Constantes Condicionales' "% formado objetivo". (c) Mohr indicator chromate concentration — **done**: Titulaciones (modo Precipitación) now exposes [CrO₄²⁻] as an editable ConcSlider when the Mohr marker is on, instead of a fixed 5 mM. (d) Craig multi-ion breakthrough — **done**: Intercambio iónico's "Columna multi-zona" now supports an optional third competing ion (D), showing 3 simultaneous breakthrough fronts instead of capping at 2. (e) acid–base titration curves at I > 0 — **done**: Titulaciones' Ácido-base sub-mode now has the same "Corrección por actividad" control (I, D-H/Davies/Güntelberg) as Mezclas, threaded through `titrationCurve`'s new optional `I`/`model` params. During QA, found that the Gran-plot Veq detector is already inaccurate for this preset even at I=0 (pre-existing, unrelated to this change — Gran's linearization assumes concentration pH, so it's worth revisiting once the module gets its own attention). |
| **Bilingual UI (Spanish / English)** | Toggle between Spanish and English for all labels, tooltips, and InfoBox content. Chemistry notation and formula strings remain language-neutral. |
| **Worked-example gallery** | Loadable, solved problems per module to speed onboarding and serve as a reference for teaching. |
| **2D predominance diagrams** | pM–pH and pL–pH maps extending the 1D DUZP to two chemical axes. |
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
