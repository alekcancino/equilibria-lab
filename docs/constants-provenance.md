# Equilibrium Constants — Provenance and Maintenance

This document explains how thermodynamic constants are selected, cited, and updated
in Equilibria Lab. Every value in the codebase should trace back to a source listed here.

---

## Source hierarchy

When sources disagree, the highest-ranked available source wins.
Deviations are documented in the **Known deviations** section below.

| Rank | Key | Full citation |
|---|---|---|
| 1 | **HYDRA/Medusa** | Puigdomenech I. (2016). *HYDRA/Medusa Chemical Equilibrium Software*. Inorganic Chemistry, KTH, Stockholm. https://www.kth.se/che/medusa |
| 2 | **NIST SRD-46** | Martell A.E., Smith R.M., Motekaitis R.J. (2004). *NIST Critical Stability Constants of Metal Complexes Database*, version 8.0. NIST Standard Reference Database 46. |
| 3 | **Harris (QCA 9)** | Harris D.C. (2015). *Quantitative Chemical Analysis*, 9th ed. W.H. Freeman. |
| 4 | **Skoog (AC 9)** | Skoog D.A., West D.M., Holler F.J., Crouch S.R. (2013). *Fundamentals of Analytical Chemistry*, 9th ed. Cengage. |

All values are thermodynamic (extrapolated to I → 0, 25 °C) unless otherwise noted.

---

## Files that contain constants

| File | Content | Reference field? |
|---|---|---|
| `src/lib/database.ts` | `ACIDS` (pKa), `SALTS` (pKsp) | ✅ per entry |
| `src/lib/complexDatabase.ts` | `COMPLEX_PRESETS` (log β) | ✅ per entry |
| `src/lib/indicatorDatabase.ts` | `EDTA_METAL_PRESETS` (log Kf, log βOH), `METAL_INDICATORS` (log K(MIn)) | ✅ per entry (EDTA); header comment (indicators) |
| `src/modules/SolubilidadSal.tsx` | Inline `PRESETS` (pKsp) | ❌ — inline only, cite in this doc |
| `src/modules/SolubilidadCondicional.tsx` | Inline `OH_PRESETS` (pKsp, log βOH) | ❌ — inline only |
| `src/lib/pourbaix.ts` | Built-in E° values for Fe/Cu/Mn/Zn/Cr | ❌ — inline, cite in this doc |

---

## Known deviations from the hierarchy

### `ACIDS`

| id | Value used | Source used | Higher-rank value | Reason kept |
|---|---|---|---|---|
| `edta` | pKa₁=2.00, pKa₂=2.69 | Harris (QCA 9) | HYDRA: 2.07, 2.75 | The two lowest pKas of EDTA are very sensitive to ionic strength and ionic medium; Harris values (2.00, 2.69) are the most widely taught and reproduced in analytical textbooks. pKa₃=6.13 and pKa₄=10.37 agree with HYDRA. |
| `ammonium` | pKa=9.25 | HYDRA | HYDRA: 9.24 | Rounded to 9.25 — universal teaching convention; no functional difference. |
| `h2s` | pKa₂=17.40 | HYDRA | Highly uncertain (13–19 in literature) | HYDRA uses 17.4; very few equilibrium calculations are sensitive to S²⁻/HS⁻ speciation since [S²⁻] ≈ 0 below pH 15. |

### `SALTS`

| id | Value used | Replaced | Notes |
|---|---|---|---|
| `caco3` | 8.48 (HYDRA) | 8.54 (Harris) | Fixed in v0.4.1. |
| `baso4` | 9.97 (HYDRA) | 9.96 (Harris) | Fixed in v0.4.1. |
| `caf2` | 10.60 (HYDRA) | 10.50 (Harris) | Fixed in v0.4.1. |
| `caox` | 8.60 (Harris) | HYDRA: 8.75 | CaC₂O₄ pKsp varies by polymorph (anhydrous vs. monohydrate). Harris gives 8.60 for the monohydrate (most common in analytical chemistry). HYDRA gives 8.75. Kept Harris until a definitive phase is specified. |
| `sulfurous` | pKa: 1.81, 6.91 (HYDRA) | 1.86, 7.17 (Harris) | Fixed in v0.4.1. "H₂SO₃" in water is largely dissolved SO₂; HYDRA more carefully treats the apparent equilibria. |
| `hocl` | pKa=7.50 (HYDRA) | 7.53 (Harris) | Fixed in v0.4.1. |
| `hno2` | pKa=3.40 (HYDRA) | 3.37 (Harris) | Fixed in v0.4.1. |
| `succinic` | pKas: 4.21, 5.64 (NIST) | 4.16, 5.61 (Harris) | Fixed in v0.4.1. |

### `EDTA_METAL_PRESETS` — `logKf`

| id | Value used | Replaced | Notes |
|---|---|---|---|
| `mg` | 8.69 (HYDRA) | 8.64 (Harris) | Fixed in v0.4.1. |
| `mn` | 13.87 (HYDRA) | 13.81 (Harris) | Fixed in v0.4.1. |
| `ni` | 18.62 (HYDRA) | 18.56 (Harris) | Fixed in v0.4.1. |
| `hg` | 21.80 (HYDRA) | 21.70 (Harris) | Fixed in v0.4.1. |

### `EDTA_METAL_PRESETS` — `logBetasOH`

| id | Value used | Notes |
|---|---|---|
| `al` | [9.01, 17.97, 26.0, 32.4] (HYDRA) | Previous values [9.01, 17.09, 23.40, 27.68] were from an older source. Fixed in v0.4.1. |
| `pb` | [6.29, 10.88, 13.94, 15.50] (HYDRA) | Extended from β₁–β₂ to β₁–β₄. Fixed in v0.4.1. |
| `hg` | [10.60, 21.83] (HYDRA) | Added β₂. Fixed in v0.4.1. |
| `cd` | [3.9, 7.65, 8.70] (HYDRA) | Extended from β₁–β₂ to β₁–β₃. Fixed in v0.4.1. |
| `ni` | [4.97, 8.55, 11.33] (HYDRA) | Added β₃. Fixed in v0.4.1. |
| `zn` | [4.40, 11.30, 13.10, 15.10] (HYDRA) | Previous values [5.04, 10.43, 13.7, 15.2] were from Harris. HYDRA values used from v0.4.1. |

---

## How to update a constant

1. Find the entry in the relevant file (see table above).
2. Look up the HYDRA value first at https://www.kth.se/che/medusa (download the
   `medusa_constants.pdf` or use the online HYDRA tool).
3. If HYDRA has no value, check NIST SRD-46.
4. Update the value and the `reference` field.
5. If you are changing an existing value (not adding new), add a row to **Known deviations**.
6. Run `npm run check` — if any test fails because a hardcoded expected value changed,
   update the test to use the corrected constant and note it in the PR description.
7. Do NOT update the constant to match a test — the test is wrong if it uses an old value.

## How to add a new constant

1. Find the HYDRA value, or NIST, or Harris (in that order).
2. Add the entry to the appropriate file with `reference` set.
3. No documentation needed in this file unless the value deviates from the hierarchy.

---

## SolubilidadSal inline presets (no `reference` field)

These are in `src/modules/SolubilidadSal.tsx` and share pKsp values with `SALTS`
where applicable. Sources are all HYDRA/Medusa unless noted:

| id | pKsp | Notes |
|---|---|---|
| caco3 | 8.48 | HYDRA |
| mgco3 | 7.46 | HYDRA |
| caf2 | 10.60 | HYDRA — corrected from 10.40 in v0.4.1 |
| ca3po4 | 28.92 | Harris |
| mg3po4 | 23.28 | Harris |
| ag3po4 | 17.55 | Harris |
| ag2cro4 | 11.89 | Harris |
| baso4 | 9.97 | HYDRA |
| pbso4 | 7.79 | HYDRA |
| agcl | 9.74 | HYDRA |
| agbr | 12.30 | HYDRA |
| agi | 16.08 | HYDRA |
| pbco3 | 13.13 | HYDRA |
| pbcro4 | 13.75 | HYDRA |
| srco3 | 9.60 | HYDRA |
| srso4 | 6.49 | HYDRA |

> **TODO**: Consolidate SolubilidadSal PRESETS into `SALTS` (database.ts) to avoid
> duplication and drift. Blocked on adding a `color` field to `SaltPreset`.

---

## Inline E° values (Pourbaix module)

Documented in `docs/VALIDATION.md`. Source is HYDRA/Medusa for all built-in presets.
