# Roadmap

This document describes what is currently available and what is planned for future releases. For the full list of implemented modules see the [README](README.md).

Suggestions and contributions are welcome — open an [issue](https://github.com/alekcancino/equilibria-lab/issues) to discuss.

---

## Currently available

### Core equilibria
- Acid–base: α fractions, log *C*–pH diagram, predominance zone diagram (DUZP), pure solution pH
- Complexation: multi-ligand systems, Bjerrum number, α distributions, log *C* vs pL
- Redox: α vs pe, spontaneous-reaction prediction, conditional pe°′
- Solubility: log *s* vs pH with conditional Ksp, common-ion effect
- Activity: ionic strength, γ vs *I* (extended Debye–Hückel)

### Coupled equilibria
- Pourbaix diagrams: *E*–pH for Fe, Cu, Mn, Zn, Cr and generic M/M(OH)ₙ systems
- Acid–base mixtures: up to four coexisting systems, buffer capacity β = *f*(pH)
- Conditional constants: log *K*′ = *f*(pH), side reactions, masking, feasibility window (Ringbom)
- Selective precipitation: log *s* = *f*(pH) and log *s* = *f*(pX), separation windows, redissolution
- Conditional potential: *E*°′ = *f*(pH), disproportionation (Latimer), *E*°′ = *f*(pX)
- Liquid–liquid extraction: partition, chelates, successive extractions, preconcentration
- Ion exchange: batch equilibrium, isotherm, ideal-model column breakthrough
- Solubility vs pH: conditional solubility of salts, side-by-side system comparison

### Titrations (unified module)
- Acid–base, complexometric (EDTA), redox, precipitation (argentometry), potentiometric (Gran plot)

---

## Planned

### Near-term

| Feature | Notes |
| --- | --- |
| **Activity correction in engines** | Apply Debye–Hückel γ corrections to solvePH, solubility, and conditional constants. Currently the activity module is informational only. |
| **Ion exchange: column with multiple zones** | Extend breakthrough curve beyond the ideal single-front model. |
| **Arbitrary Pourbaix systems** | Allow fully custom species and half-reactions beyond the built-in presets. |
| **CSV / report export** | Export current chart data and computed values as a downloadable CSV or PDF summary. |

### Medium-term

| Feature | Notes |
| --- | --- |
| **Non-aqueous solvents** | Leveling effect, acidity scales in amphiprotic solvents. |
| **2D predominance diagrams** | pM–pH and pL–pH maps extending the 1D DUZP. |
| **Competitive precipitation** | Simultaneous solubility of multiple solids sharing a common ion. |
| **Step-by-step titration animation** | Visual playback of the titration curve point by point. |

### Long-term / exploratory

| Feature | Notes |
| --- | --- |
| **Pitzer model** | Activity corrections for high ionic strength (I > 0.5 M). |
| **Surface adsorption** | Constant capacitance model (CCM), diffuse-layer model. |
| **PHREEQC bridge** | Offline batch validation against PHREEQC as an oracle (not a runtime dependency). |
| **Reactive kinetics** | One slow reaction + fast equilibrium system. |

---

## How to contribute

1. Check if an [issue](https://github.com/alekcancino/equilibria-lab/issues) already exists for the feature.
2. If not, open one describing the chemistry and the expected UI behavior.
3. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup.
