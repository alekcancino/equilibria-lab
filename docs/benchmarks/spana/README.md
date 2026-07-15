# Spana benchmark suite

Regression tests cross-checked against Spana's own bundled example systems
([eq-diagr](https://github.com/ignasi-p/eq-diagr)) — see
[`../../../src/lib/__tests__/spana-benchmark.test.ts`](../../../src/lib/__tests__/spana-benchmark.test.ts).

**No files from the eq-diagr repository are copied into this one.** eq-diagr
is GPL-3.0 (see its `LICENSE`), incompatible with this project's MIT license
— same reasoning as the GeoGebra decision in `AGENTS.md`. Each case below
only *cites* a `.dat` example file's component list and formation constants
(published facts, not copyrightable expression, same footing as citing a
Harris or Skoog constant) and re-derives the expected result independently
by hand; nothing from Spana's own numeric output or plotted curves (the
`.plt` files, a proprietary device-coordinate vector format) is used or
reproduced.

## Implemented (Phase 1a)

| ID | Spana source | App engine | What's checked |
|----|--------------|------------|-----------------|
| `hac-ph` | `Examples/13-Titration acetic acid.dat` | `equilibrium.ts` (`solvePH`) | pH of 0.01 M acetic acid, hand-derived from the weak-acid quadratic |
| `titr-13` | `Examples/13-Titration acetic acid.dat` | `titration.ts` (`titrationCurve`) | Full titration: initial pH, half-equivalence (= pKa), equivalence (acetate hydrolysis) |

Both convert the `.dat` file's `CH3COO-` formation constant (log K = 9.245,
relative to components CH3COOH/OH⁻) via `pKa = pKw(Spana) − log K = 14.002 −
9.245 = 4.757` ≈ 4.76 — the same value Harris reports and this app's own
`database.ts` already uses for the `acetic` preset, which is itself a
cross-check that the conversion is right.

## Deferred (documented reason, not silently dropped)

| ID | Spana source | Why not yet |
|----|--------------|-------------|
| `frac-02` | `02-Fraction diagram` (Fe³⁺/OH⁻/Cl⁻) | Includes polynuclear species (Fe₂(OH)₂⁴⁺, Fe₃(OH)₄⁵⁺) — out of scope per `VALIDATION.md`'s "Where not to expect 1:1 agreement" |
| `logc-04` | `04-Log conc diagr` (Ca/Ce/CO₃, fixed CO₂ pressure) | Polynuclear Ce hydrolysis + multiple competing solid phases + gas-fixed partial pressure — no clean single-engine match |
| `predom-09` | `09-Predom Cd-NTA` | This is a 2D (pH × pNTA) predominance map — the app's predominance diagram is 1D; needs the separate "2D predominance diagrams" roadmap item first |
| `pourbaix-10` | `10-Poubaix diag Cu` | The app already ships a built-in Cu Pourbaix preset from its own literature source; comparing against this file's constants first needs confirming both use compatible data (else a mismatch wouldn't mean either is wrong, just differently sourced) — a discrete follow-up, not attempted here |

## Converting Spana constants → pKa

For species formed with OH⁻ as the second component:

```
pKa = pKw(Spana) − log K_formation
```

## Tests

`src/lib/__tests__/spana-benchmark.test.ts` — tolerances documented inline,
typically ±0.01–0.02 pH units (hand-derivation precision, not a rounding
allowance for a wrong engine value).
