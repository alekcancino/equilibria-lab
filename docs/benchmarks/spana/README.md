# Spana benchmark suite (planned)

Reserved directory for golden files exported from Spana
([eq-diagr](https://github.com/ignasi-p/eq-diagr)) used in regression tests for Equilibria Lab.

Status: **pending** (Phase 1 — see [ROADMAP.md](../../../ROADMAP.md)).

## Planned test cases

| ID | Spana source | App module | Expected output |
|----|--------------|------------|-----------------|
| `frac-02` | `Examples/02-Fraction diagram` | Acid-base | α vs pH |
| `logc-04` | `Examples/04-Log conc diagr` | Acid-base | log C vs pH |
| `predom-09` | `Examples/09-Predom Cd-NTA` | Complexation | DUZP zone boundaries |
| `pourbaix-10` | `Examples/10-Poubaix diag Cu` | Pourbaix | E vs pH slopes |
| `titr-13` | `Examples/13-Titration acetic acid` | Titration | pH vs V curve |
| `hac-ph` | `13-Titration acetic acid.dat` | equilibrium | pH of 0.01 M solution |

## Converting Spana constants → pKa

For species formed with OH⁻ as the second component:

```
pKa = pKw(Spana) − log K_formation
```

Example (acetic acid): `14.002 − 9.245 = 4.757` (app uses 4.76).

## Generating golden files

1. Install Java and Spana (see [Spana releases](https://github.com/ignasi-p/eq-diagr/releases)).
2. Open each `.plt` file in Spana, compute, export the data table as CSV.
3. Save here as `{id}.csv` with columns documented in the benchmark PR.

## Tests

Tests will live in `src/lib/__tests__/spana-benchmark.test.ts` (to be created),
comparing tolerances documented in [`VALIDATION.md`](../../VALIDATION.md).
