# Roadmap

This document describes what is currently available and what is planned for future releases. For the full list of implemented modules see the [README](README.md).

Suggestions and contributions are welcome — open an [issue](https://github.com/alekcancino/equilibria-lab/issues) to discuss.

---

## Currently available

### Core equilibria

- Acid–base: α fractions, log *C*–pH diagram, predominance zone diagram (DUZP), pure solution pH, aqua-acid cations (Fe³⁺, Al³⁺)
- Complexation: multi-ligand systems, Bjerrum number, α distributions, log *C* vs pL, editable per-species labels
- Redox: α vs pe, spontaneous-reaction prediction, conditional pe°′
- Solubility: log *s* vs pH with conditional Ksp, common-ion effect, molecular acid/base solid solubility (pH-dependent ionization), free MmXx stoichiometry; Debye–Hückel activity corrections applied to the solver
- Activity: ionic strength, γ vs *I* (extended Debye–Hückel); corrections wired to solubility, complexation, and conditional-constant engines

### Coupled equilibria

- Pourbaix diagrams: *E*–pH for Fe, Cu, Mn, Zn, Cr and fully custom N-species / N-couples systems with auto-derived boundaries; "edit this system" seeds custom mode from any preset (lossless for hydroxide-only systems — Fe, Zn, Ni, Cr; partial for systems with a disproportionation/oxide solid — Cu, Mn, Pb — with an inline warning listing what wasn't carried over)
- Acid–base mixtures: up to four coexisting systems, each fully user-editable (free label, pKa list, z₀ incl. aqua-cations, database presets as auto-fill), any starting salt form per component, buffer capacity β = *f*(pH)
- Conditional constants: log *K*′ = *f*(pH), side reactions, masking, feasibility window (Ringbom)
- Selective precipitation: log *s* = *f*(pH) and log *s* = *f*(pX), separation windows, redissolution
- Conditional potential: *E*°′ = *f*(pH), disproportionation (Latimer), *E*°′ = *f*(pX)
- Liquid–liquid extraction: partition, chelates, successive extractions, preconcentration
- Ion exchange: batch equilibrium, isotherm, Craig *N*-plate multi-zone column model, breakthrough and elution curves
- Solubility vs pH: conditional solubility of salts, side-by-side system comparison, editable cation charge

### Titrations (unified module)

- Acid–base, complexometric (EDTA), redox, precipitation (argentometry), potentiometric (Gran plot)

### Data and export

- Equilibrium constants database: formation constants, E° values, Ksp, pKa — sourced from Harris (*Quantitative Chemical Analysis*) and Skoog (*Analytical Chemistry*)
- CSV export with metadata headers on every chart (module, system, conditions, date)
- Shareable scenario links: full module state encoded in the URL
- Saved systems: name and persist any scenario locally (localStorage) from the "Mis sistemas" button in every module's panel — reuses the shareable-link mechanism, so it works everywhere that has one (all modules except Titulaciones, see Planned)

---

## Planned

### Near-term

| Feature | Notes |
| --- | --- |
| **Bilingual UI (Spanish / English)** | Toggle between Spanish and English for all labels, tooltips, and InfoBox content. Chemistry notation and formula strings remain language-neutral. |
| **In-app validation and assumptions** | Surface each module's simplifying assumptions and its cross-check status (validated against Spana/HALTAFALL) directly in the UI, so results are auditable at a glance. |
| **Worked-example gallery** | Loadable, solved problems per module to speed onboarding and serve as a reference for teaching. |
| **2D predominance diagrams** | pM–pH and pL–pH maps extending the 1D DUZP to two chemical axes. |
| **Competitive precipitation** | Simultaneous solubility of multiple solids sharing a common ion; separation-window analysis. |
| **Migrate constants data to Medusa/HYDRA + NIST SRD-46** | Data breadth, not methodology: replace the current Harris/Skoog textbook constants with Medusa/HYDRA and NIST SRD-46 as the primary source, per-entry provenance citations. The calculation engines and chemistry methodology stay textbook-based (Harris, Skoog, Stumm & Morgan, Ringbom, Sillén) regardless of where the numeric constants come from — this only changes the *data*, not how it's used. Constants are facts, not copyrightable code, so this is independent of any tool's license. |
| **Precipitation titration stoichiometry** | The precipitation-titration engine is fixed to 1:1 analyte:titrant; support MmXx ratios. |
| **Shareable links + saved systems for Titulaciones** | The titration module's 5 sub-modes have no `useShareEffect` wiring today, so they get neither share links nor "Mis sistemas" (which piggybacks on the share-link URL). |

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
