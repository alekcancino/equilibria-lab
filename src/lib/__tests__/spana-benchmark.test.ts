// Golden-value regression tests sourced directly from Spana's own bundled
// example .dat files (github.com/ignasi-p/eq-diagr, Examples/13-Titration
// acetic acid.dat) — see docs/benchmarks/spana/README.md for the full
// provenance and which other example cases remain out of scope (and why).
//
// These are NOT parsed from Spana's rendered .plt output (that file is a
// proprietary device-coordinate vector format, not a values table — turning
// its pixel coordinates back into chemistry would need its axis-calibration
// transform reverse-engineered, a real risk of silently wrong "goldens").
// Instead: the .dat file's own plain-text component/formation-constant
// declarations are converted to a pKa via the documented
// pKa = pKw(Spana) − log K_formation relation, then the resulting system
// (0.01 M acetic acid, pKa 4.76 — matching the value Harris and this app's
// own database.ts already use) is solved independently by hand and compared
// against the app's engines.

import { describe, it, expect } from 'vitest';
import { solvePH } from '../equilibrium';
import { titrationCurve } from '../titration';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// Examples/13-Titration acetic acid.dat: CH3COOH (T=0.01), OH- titrant.
// CH3COO- formation log K = 9.245 vs components (CH3COOH, OH-); Spana's own
// pKw = 14.002 → pKa = 14.002 − 9.245 = 4.757 ≈ 4.76 (Harris; database.ts).
const PKA_HAC = 4.76;

describe('Spana benchmark: hac-ph (Examples/13-Titration acetic acid.dat, T=0.01)', () => {
  it('pH de 0.01 M HAc puro ≈ 3.389 (cuadrática del ácido débil, derivada a mano)', () => {
    // x² + Ka·x − Ka·C = 0, Ka = 10^-4.76, C = 0.01 → x = 4.0827e-4 M.
    const pH = solvePH([{ c: 0.01, z0: 0, pKas: [PKA_HAC] }]);
    tol(pH, 3.389, 0.01);
  });
});

describe('Spana benchmark: titr-13 (Examples/13-Titration acetic acid.dat)', () => {
  it('curva completa: pH inicial, semiequivalencia (=pKa) y equivalencia (hidrólisis del acetato)', () => {
    const curve = titrationCurve({
      analyte: { z0: 0, pKas: [PKA_HAC] },
      titrantIsAcid: false,
      cAnalyte: 0.01, vAnalyte: 25, cTitrant: 0.01, vMax: 50, points: 1000,
    });
    tol(curve.equivalenceVolumes[0], 25, 0.01);

    // v = 0: mismo caso que hac-ph.
    tol(curve.pHs[0], 3.389, 0.01);

    // v = Veq/2 (12.5 mL): Henderson-Hasselbalch, pH = pKa exacto.
    const iHalf = curve.volumes.findIndex((v) => Math.abs(v - 12.5) < 1e-9);
    expect(iHalf).toBeGreaterThan(-1);
    tol(curve.pHs[iHalf], PKA_HAC, 0.01);

    // v = Veq (25 mL): solo acetato 0.005 M (diluido a 50 mL) — hidrólisis
    // de base débil, [H+] = √(Ka·Kw/C) = √(10^-4.76·10^-14/0.005) → pH 8.230.
    const iEq = curve.volumes.findIndex((v) => Math.abs(v - 25) < 1e-9);
    expect(iEq).toBeGreaterThan(-1);
    tol(curve.pHs[iEq], 8.230, 0.02);
  });
});
