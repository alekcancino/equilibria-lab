# Related projects

A brief survey of open-source tools in the chemical equilibrium and analytical chemistry space, and how Equilibria Lab fits in.

---

## Positioning

Equilibria Lab occupies a niche that is underserved by existing tools: a **browser-based, no-install** simulator covering the full analytical chemistry workflow (acid–base, complexation, redox, solubility, conditional constants, titrations, extraction, ion exchange) in a single coherent app. Most comparable tools are Java desktop applications or Python libraries that require a local environment.

---

## Comparable tools

### Same domain — equilibrium diagrams and speciation

| Project | What it does | Platform | Source |
| --- | --- | --- | --- |
| **Spana / DataBase** | Aqueous equilibrium diagrams (DUZP, α, log *C*, pe–pH). Implements HALTAFALL. | Java desktop | [ignasi-p/eq-diagr](https://github.com/ignasi-p/eq-diagr) |
| **ChemEQL** | Thermodynamic equilibrium, titrations, adsorption, pe–pH. Maintained by Eawag. | Java desktop | [eawag-surface-waters-research/ChemEQL](https://github.com/eawag-surface-waters-research/ChemEQL) |
| **efta** | Python API: speciation, Ksp, liquid–liquid extraction, constant fitting, plots. | Python library | [arsyadmdz/efta](https://github.com/arsyadmdz/efta) |
| **PourPy** | Custom Pourbaix diagrams, published in JOSS 2024. Web app via Mercury. | Python / web | [gitlab.com/cmbm-ethz/pourbaix-diagrams](https://gitlab.com/cmbm-ethz/pourbaix-diagrams) |

### Broader scope — geochemistry and engineering

| Project | What it does | Source |
| --- | --- | --- |
| **Reaktoro** | Gibbs-energy minimization, kinetics, reactive transport, PHREEQC databases. | [reaktoro/reaktoro](https://github.com/reaktoro/reaktoro) |
| **pyEQL** | Solution chemistry, Pitzer model, speciation, PHREEQC interface. | [KingsburyLab/pyEQL](https://github.com/KingsburyLab/pyEQL) |
| **PHREEQC** | USGS standard for geochemical modeling; multiple web/Colab front-ends exist. | [USGS](https://www.usgs.gov/software/phreeqc-version-3) |

---

## Coverage comparison

Legend: **●●●** thorough · **●●○** partial · **●○○** basic · **—** not covered

### Core equilibria

| Module | Equilibria Lab | Spana | ChemEQL | efta | Reaktoro |
| --- | :---: | :---: | :---: | :---: | :---: |
| Acid–base | ●●● | ●●● | ●●● | ●●○ | ●●○ |
| Complexation | ●●● | ●●● | ●●● | ●●○ | ●●● |
| Redox | ●●● | ●●● | ●●● | ●○○ | ●●● |
| Solubility | ●●● | ●●● | ●●● | ●●● | ●●● |
| Activity / ionic strength | ●●○ | ●●○ | ●●● | ●●○ | ●●● |

### Coupled equilibria

| Module | Equilibria Lab | Spana | ChemEQL | PHREEQC | PourPy |
| --- | :---: | :---: | :---: | :---: | :---: |
| Pourbaix diagrams | ●●● | ●●● | ●●● | ●●● | ●●● |
| Acid–base mixtures | ●●● | ●●○ | ●●● | ●●● | — |
| Conditional constants | ●●● | ●●○ | ●●○ | ●●● | — |
| Selective precipitation | ●●● | ●●○ | ●●● | ●●● | ●●○ |
| Conditional potential | ●●● | ●●○ | ●●○ | ●●● | ●●○ |
| Liquid–liquid extraction | ●●● | — | — | ●●○ | — |
| Ion exchange | ●●○ | — | ●○○ | ●●● | — |
| Solubility vs pH | ●●● | ●●● | ●●● | ●●● | — |

### Titrations

| Mode | Equilibria Lab | Spana | ChemEQL |
| --- | :---: | :---: | :---: |
| Acid–base | ●●● | ●●○ | ●●● |
| Complexometric (EDTA) | ●●● | ●●○ | ●●● |
| Redox | ●●● | ●●○ | ●●○ |
| Precipitation | ●●● | ●●○ | ●●● |
| Potentiometric / Gran plot | ●●● | ●○○ | ●●○ |

---

## Numerical validation

The calculation engines have been cross-validated against Spana/HALTAFALL reference outputs. See [`VALIDATION.md`](VALIDATION.md) for the full set of golden cases and benchmark comparisons.

---

## License compatibility

If code from external projects is ever incorporated, note the following:

| Project | License | Note |
| --- | --- | --- |
| Spana (eq-diagr) | GPL-3.0 | Requires GPL-compatible licensing if code is embedded. |
| ChemEQL | MIT | Compatible with MIT. |
| efta | MIT | Compatible with MIT. |
| Reaktoro | LGPL-2.1 | Dynamic linking / use as external tool is safe. |
| PourPy | GPL-3.0+ | Same care as Spana. |

Numerical comparisons, citations, and parsing of **data** (not code) are generally unrestricted. Check the license before embedding algorithms.
