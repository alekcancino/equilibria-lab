# Mathematical validation and Spana congruence

Reference document on the numerical soundness of the **Equilibria Lab** calculation engine
and its alignment with the classical analytical chemistry tradition — in particular
**Spana / HALTAFALL** ([ignasi-p/eq-diagr](https://github.com/ignasi-p/eq-diagr)),
the academic successor to Medusa/Hydra (KTH) and a parallel lineage to **ChemEQL** (Eawag).

---

## Verdict

The Equilibria Lab engine is **mathematically congruent** with Spana for textbook analytical
chemistry (α fractions, pH by charge balance, pe per Sillén, conditional constants per Ringbom,
Ksp with acid anion, classical Pourbaix, modular titrations).

**It is not the same software:** Spana solves coupled systems globally (HALTAFALL: competing
solids, redox, adsorption, Davies/SIT activity). Equilibria Lab uses **modular engines** with
explicit assumptions (activities ≈ concentrations by default, no surface adsorption).

For teaching from Harris / Skoog / Stumm & Morgan, the app is coherent and, in UX,
superior to Spana/ChemEQL. Divergence appears in advanced geochemistry or systems with
many simultaneous solid phases.

---

## Shared conventions

| Quantity | Equilibria Lab | Spana / HALTAFALL |
|----------|----------------|-------------------|
| Temperature | 25 °C | 25 °C (configurable in Spana) |
| pK_w | 14.0 → K_w = 10⁻¹⁴ | 14.002 in Medusa databases |
| pe | pe = E / 0.05916 V (Sillén, **without** factor n in pe°) | Same (see output EC: Eh = −500 mV → pe = −8.4526) |
| α acid-base | Ka product / normalization (log-space) | Equivalent via formation constants |
| K′ conditional | log K′ = log K − Σ log α (Ringbom) | Same criterion in coupled systems |
| Solver | Bisection (~80 iter.) | HALTAFALL (global iteration) |

Typical numerical difference from pK_w: ΔpH ≈ 0.001 at neutral (negligible in teaching).

---

## Converting Spana constants → pKa

Spana stores **log K of formation** from components (H⁺, OH⁻, metal, ligand…), not direct pKa values.

Example — acetic acid (`Examples/13-Titration acetic acid.dat`):

```text
CH3COO-  ,  9.245  ,  1  ,  1    ← CH3COOH + OH⁻ → CH3COO⁻
OH-      , -14.002
```

Conversion:

```
pKa = pKw − log K = 14.002 − 9.245 = 4.757
```

Equilibria Lab uses pKa = **4.76** → ΔpH ≈ 0.001 in 0.01 M solution.

---

## Numerical cross-checks (2026-06)

Cross-references between engine formulas (`src/lib/`), unit tests
(`src/lib/__tests__/engines.test.ts`), and Spana data.

| Case | Equilibria Lab | Spana / reference | Δ |
|------|----------------|-------------------|---|
| HAc 0.01 M, Spana pKa (4.757) | pH 3.388 | Same charge balance | — |
| HAc 0.01 M, app pKa (4.76) | pH 3.389 | — | 0.001 pH |
| H₃PO₄, pH = 0, α₀ | 0.99297 | Golden doc 0.99293 | 4×10⁻⁵ |
| MnO₄⁻, Δpe°′ pH 0→7 | 11.20 | (8/5)·7 | — |
| AgCl ideal, log s | −4.870 | ½ pKsp (9.74) | — |
| pe from Eh = −500 mV | −8.4525 | Fe.out HALTAFALL −8.4526 | 10⁻⁴ |
| Fe(OH)₃/Fe²⁺, E°′ (log C = 0) | 0.948 V | Pourbaix audited | test ±0.02 V |
| Ca–EDTA, log K′f pH 10 | ≈ 10.2 | Ringbom | test ±0.2 |

Run tests:

```bash
npm test
```

---

## Congruence by module

| Module | Spana congruence | Notes |
|--------|------------------|-------|
| Acid-base (DUZP, α, log C) | **High** | Same fraction formalism |
| Complexation (Bjerrum, log C vs pL) | **High** | Equivalent global β |
| Redox (α vs pe) | **High** | Shared pe convention |
| Solubility / solubility vs pH | **High** (ideal) | Spana adds γ and multiple solids |
| Activity | **Medium** | Extended D-H vs Davies/SIT in Spana |
| Pourbaix | **High** (presets) | Spana more general for custom systems |
| Acid-base mixtures | **High** | Multi-component charge balance |
| Conditional constants | **High** | Ringbom explicit in the engine |
| Conditional potential | **High** | Conditional Nernst |
| Selective precipitation | **Medium** | Spana selects solid phase globally |
| Titrations (5 modes) | **High–medium** | Spana titrates with full equilibrium |
| L-L extraction / ion exchange | **Low in Spana** | Own modules (Spana barely covers these) |

---

## Where **not** to expect 1:1 agreement

1. **Integrated activity** — Spana corrects γ throughout equilibrium; the app uses ideal unless the Activity module or a future global toggle is active.
2. **Competitive precipitation** — HALTAFALL tests solid combinations (e.g. magnetite + Fe(cr) in `EC/tests/Davies_eqn/Fe.out`).
3. **Surface adsorption** — ChemEQL/Spana support it; Equilibria Lab does not (roadmap).
4. **Different databases** — Medusa/Wateq vs Harris/Skoog: same physics, different numbers for the same species.
5. **Temperature ≠ 25 °C** — Spana supports variable T; the app fixes 25 °C.

---

## Planned Spana benchmark suite (Phase 1)

Regression suite to implement by reading cases from
`~/Documents/Eq-Diagr/Examples/` (or copies in `docs/benchmarks/spana/`):

| Spana file | Equilibria Lab module | Quantity to compare |
|------------|----------------------|---------------------|
| `02-Fraction diagram.plt` | Acid-base | α vs pH |
| `04-Log conc diagr.plt` | Acid-base | log C vs pH |
| `09-Predom Cd-NTA.plt` | Complexation | DUZP zones |
| `10-Poubaix diag Cu.plt` | Pourbaix | E–pH slopes |
| `13-Titration acetic acid.plt` | Titration | pH vs V curve |
| `01-Make your 1st diagram.plt` | Solubility + Fe | log C (constant conversion from .dat) |

Requirement: Java + `EC.jar` or Spana-exported outputs as golden CSV files.

---

## Common bibliographic lineage

- **HALTAFALL** — Ingri et al., *Talanta* 14, 1261 (1967); Spana's engine.
- **SOLGASWATER** — Eriksson, *Anal. Chim. Acta* 112, 375 (1979); diagram concepts.
- **MICROQL / ChemEQL** — Westall; Müller (Eawag); broad aqueous equilibrium.
- **Ringbom** — Conditional constants; implemented in `conditional.ts`.
- **Sillén** — pe convention, unified ladder; `ladder.ts`, `redox.ts`.

---

## Internal references

- Engine architecture: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- Open-source ecosystem: [`docs/RELATED-PROJECTS.md`](RELATED-PROJECTS.md)
- Source: `src/lib/equilibrium.ts`, `ladder.ts`, `conditional.ts`, `redox.ts`
