import { describe, it, expect } from 'vitest';
import { predominanceGrid, speciesInGrid, axisValue } from '../predominance2D';

describe('axisValue', () => {
  it('interpolates endpoints and midpoint', () => {
    expect(axisValue([0, 14], 3, 0)).toBe(0);
    expect(axisValue([0, 14], 3, 1)).toBe(7);
    expect(axisValue([0, 14], 3, 2)).toBe(14);
  });
  it('degenerate n returns the low end', () => {
    expect(axisValue([2, 9], 1, 0)).toBe(2);
  });
});

describe('predominanceGrid', () => {
  // A trivial 2-species system where species 1 wins iff x + y > 0, species 0 otherwise.
  const fracAt = (x: number, y: number): number[] => {
    const s1 = x + y > 0 ? 1 : 0;
    return s1 === 1 ? [0, 1] : [1, 0];
  };

  it('records the dominant index per cell and the winning fraction', () => {
    const g = predominanceGrid(fracAt, [-1, 1], [-1, 1], 3, 3);
    expect(g.nx).toBe(3);
    expect(g.ny).toBe(3);
    // corner (x=-1, y=-1) → species 0; corner (x=1, y=1) → species 1.
    expect(g.dominant[0][0]).toBe(0);
    expect(g.dominant[2][2]).toBe(1);
    expect(g.frac[2][2]).toBe(1);
  });

  it('resolves ties to the lower index (left-to-right ladder convention)', () => {
    const tie = (): number[] => [0.5, 0.5];
    const g = predominanceGrid(tie, [0, 1], [0, 1], 2, 2);
    expect(g.dominant.every((row) => row.every((v) => v === 0))).toBe(true);
  });

  it('marks NaN fractions as −1 (no physical solution)', () => {
    const bad = (): number[] => [NaN, NaN];
    const g = predominanceGrid(bad, [0, 1], [0, 1], 2, 2);
    expect(g.dominant[0][0]).toBe(-1);
    expect(Number.isNaN(g.frac[0][0])).toBe(true);
  });
});

describe('speciesInGrid', () => {
  it('lists only the species that actually appear, ascending, skipping −1', () => {
    const fracAt = (x: number): number[] => (x < 0 ? [0, 1, 0] : [0, 0, 1]);
    const g = predominanceGrid(fracAt, [-1, 1], [0, 1], 4, 2);
    // species 1 (x<0) and species 2 (x>0) appear; species 0 never wins.
    expect(speciesInGrid(g)).toEqual([1, 2]);
  });
});
