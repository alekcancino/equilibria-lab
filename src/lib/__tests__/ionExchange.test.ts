import { describe, expect, it } from 'vitest';
import { craigBreakthrough, breakthroughCurve } from '../ionExchange';

describe('craigBreakthrough', () => {
  const base = { resinCapacity: 2, resinVolume: 0.05, points: 200 };

  it('returns empty result when no active ions', () => {
    const result = craigBreakthrough({ ...base, ions: [], nPlates: 10 });
    expect(result.bv).toHaveLength(0);
    expect(result.cRatios).toHaveLength(0);
  });

  it('returns empty result when all c0 = 0', () => {
    const result = craigBreakthrough({
      ...base,
      ions: [{ label: 'A', c0: 0, kSel: 2.4 }],
      nPlates: 10,
    });
    expect(result.bv).toHaveLength(0);
  });

  it('single ion: BV range covers 2.5 × BV_break', () => {
    const c0 = 0.005;
    // For single ion: kCSum = kSel * c0, bvBreak = kSel * cap / (kSel * c0) = cap / c0
    const bvBreak = base.resinCapacity / c0;  // 400
    const result = craigBreakthrough({
      ...base,
      ions: [{ label: 'A', c0, kSel: 2.4 }],
      nPlates: 10,
    });
    expect(result.bv.at(-1)).toBeCloseTo(bvBreak * 2.5, 0);
  });

  it('single ion: C/C0 = 0.5 at BV_break', () => {
    const c0 = 0.005;
    const bvBreak = base.resinCapacity / c0;  // 400 (single-ion formula)
    const result = craigBreakthrough({
      ...base,
      ions: [{ label: 'A', c0, kSel: 2.4 }],
      nPlates: 10,
    });
    const midIdx = result.bv.findIndex((bv) => bv >= bvBreak);
    expect(result.cRatios[0][midIdx]).toBeCloseTo(0.5, 2);
  });

  it('more plates → narrower front (smaller ΔBV from 10% to 90%)', () => {
    const ions = [{ label: 'A', c0: 0.005, kSel: 2.4 }];
    const r5 = craigBreakthrough({ ...base, ions, nPlates: 5 });
    const r50 = craigBreakthrough({ ...base, ions, nPlates: 50 });

    const width = (curves: number[][], bv: number[]) => {
      const c = curves[0];
      const i10 = c.findIndex((v) => v >= 0.1);
      const i90 = c.findIndex((v) => v >= 0.9);
      return bv[i90] - bv[i10];
    };
    const w5 = width(r5.cRatios, r5.bv);
    const w50 = width(r50.cRatios, r50.bv);
    expect(w50).toBeLessThan(w5);
    // Craig theory: σ ∝ 1/√N → width ratio ≈ √(50/5) = 3.16
    expect(w5 / w50).toBeGreaterThan(2.5);
  });

  it('two ions: less-preferred ion breaks through first (lower BV)', () => {
    // kSel_A = 5 (strongly retained), kSel_C = 1.2 (weakly retained)
    const ions = [
      { label: 'A', c0: 0.005, kSel: 5 },
      { label: 'C', c0: 0.005, kSel: 1.2 },
    ];
    const result = craigBreakthrough({ ...base, ions, nPlates: 20 });

    // Competitive formula: kCSum = (5+1.2)*0.005 = 0.031
    const kCSum = (5 + 1.2) * 0.005;
    const bvBreakA = (5 * base.resinCapacity) / kCSum;   // ~323 BV
    const bvBreakC = (1.2 * base.resinCapacity) / kCSum; // ~77 BV

    expect(bvBreakA).toBeGreaterThan(bvBreakC); // A breaks through later

    // At BV ≈ bvBreakC, ion C should be near 50%; ion A still near 0
    // (discretization: nearest grid point may be ±1 step from exact bvBreakC)
    const idxC = result.bv.findIndex((bv) => bv >= bvBreakC);
    expect(result.cRatios[0][idxC]).toBeLessThan(0.1);  // ion A still near 0
    expect(result.cRatios[1][idxC]).toBeGreaterThan(0.45); // ion C crosses 50%
    expect(result.cRatios[1][idxC]).toBeLessThan(0.70);  // but not fully saturated

    // At BV = bvBreakA, ion A is at ~50%; ion C is fully saturated
    const idxA = result.bv.findIndex((bv) => bv >= bvBreakA);
    expect(result.cRatios[0][idxA]).toBeCloseTo(0.5, 1);
    expect(result.cRatios[1][idxA]).toBeGreaterThan(0.99);
  });

  it('matches existing breakthroughCurve BV_break position for single ion', () => {
    const cA0 = 0.005;
    const selectivity = 2.4;
    const resinCapacity = 2;
    const resinVolume = 0.05;

    // existing formula: bvBreak = resinCapacity / cA0 = 400
    const existing = breakthroughCurve({ cA0, selectivityAB: selectivity, resinCapacity, resinVolume, flowRate: 0.05 });
    // Craig single-ion reduces to same: bvBreak = K·cap / (K·c0) = cap/c0 = 400
    const craig = craigBreakthrough({
      ions: [{ label: 'A', c0: cA0, kSel: selectivity }],
      resinCapacity,
      resinVolume,
      nPlates: 1,
    });

    const findHalf = (bv: number[], c: number[]) => bv[c.findIndex((v) => v >= 0.5)];
    const bvExisting = findHalf(existing.bedVolumes, existing.cRatio);
    const bvCraig = findHalf(craig.bv, craig.cRatios[0]);

    // Both should land near cap/c0 = 400 BV (grid discretization allows ±20 BV)
    expect(bvCraig).toBeGreaterThan(395);
    expect(bvCraig).toBeLessThan(415);
    expect(bvExisting).toBeGreaterThan(395);
    expect(bvExisting).toBeLessThan(420);
  });
});
