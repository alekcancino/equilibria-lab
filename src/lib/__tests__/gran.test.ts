import { describe, it, expect } from 'vitest';
import { titrationCurve, granVeq, quantitativity, granPlot } from '../titration';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// ── Gran extrapolation + quantitativity ──────────────────────────────────────

describe('granVeq — Gran linear extrapolation', () => {
  const curve = titrationCurve({
    analyte: { z0: 0, pKas: [], kind: 'strong-acid' },
    titrantIsAcid: false, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40,
  });

  it('0.1 M strong acid / 25 mL with 0.1 M NaOH → Veq(Gran) = 25.0 mL', () => {
    tol(granVeq(curve.volumes, curve.pHs, 25), 25.0, 0.1);
  });

  it('the Gran line (F₁) crosses zero at Veq', () => {
    const { v1, F1 } = granPlot(curve.volumes, curve.pHs, 25);
    const before = F1[v1.findIndex((v) => v >= 12.5)];
    const at = F1[v1.findIndex((v) => v >= 25)];
    expect(before).toBeGreaterThan(at);
    tol(at, 0, 1e-3);
  });
});

describe('quantitativity', () => {
  it('strong acid is quantitative: q% ≥ 99.9 %', () => {
    // At the EP of a strong acid, [H⁺] = 1e-7; diluted Co = 0.05 M.
    const q = quantitativity(1e-7, 0.05);
    expect(q).toBeGreaterThanOrEqual(99.9);
  });

  it('q% = 50 % when ε = Co/2', () => {
    tol(quantitativity(0.5, 1), 50, 1e-9);
  });
});
