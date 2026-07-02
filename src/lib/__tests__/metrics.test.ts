import { describe, it, expect } from 'vitest';
import { solvePL } from '../complexation';
import {
  percentFormed, percentDissociated, percentSpeciesAtPH,
  fractionFormedExcess, condLogKAtPH, operatingPoint,
  pLForPercentFormed, pHForPercentFormed,
} from '../metrics';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// ── % formed / dissociated (Complexation) ────────────────────────────────────

describe('percentFormed / percentDissociated', () => {
  it('EQ2 Q4 — logβ=[1.3], cM=cL=0.01 → % dissociated ≈ 85 %', () => {
    const logBetas = [1.3];
    const pLeq = solvePL(0.01, 0.01, logBetas);
    // Golden value: ~85 % dissociated (equivalent to [L]free/cL).
    tol(percentDissociated(pLeq, logBetas), 85, 2);
    tol(percentFormed(pLeq, logBetas), 15, 2);
    // % formed + % dissociated = 100
    tol(percentFormed(pLeq, logBetas) + percentDissociated(pLeq, logBetas), 100, 1e-9);
  });

  it('pL for 50 % formed in a 1:1 complex equals log β₁', () => {
    tol(pLForPercentFormed([8], 50), 8, 0.1);
    tol(pLForPercentFormed([1.3], 50), 1.3, 0.1);
  });

  it('pL for 10/90 % are symmetric around log β₁ (±1 decade)', () => {
    // For 1:1, ñ = β[L]/(1+β[L]); 10 % ⇒ β[L]=1/9, 90 % ⇒ β[L]=9.
    // pL(10%) = logβ + log9, pL(90%) = logβ − log9.
    const logB = 5;
    tol(pLForPercentFormed([logB], 90), logB - Math.log10(9), 0.1);
    tol(pLForPercentFormed([logB], 10), logB + Math.log10(9), 0.1);
  });
});

// ── Acid-base species percentages ────────────────────────────────────────────

describe('percentSpeciesAtPH', () => {
  it('at pH = pKa both conjugate species are 50/50', () => {
    tol(percentSpeciesAtPH(4.76, [4.76], 0), 50, 1e-6);
    tol(percentSpeciesAtPH(4.76, [4.76], 1), 50, 1e-6);
  });

  it('polyprotic: fractions sum to 100 %', () => {
    const pKas = [2.15, 7.20, 12.35];
    const sum = [0, 1, 2, 3].reduce((s, i) => s + percentSpeciesAtPH(7.20, pKas, i), 0);
    tol(sum, 100, 1e-6);
  });
});

// ── Conditional constants (fraction formed + operating point) ─────────────────

describe('condLogKAtPH / fractionFormedExcess', () => {
  it('log K′ drops as ligand protonates (α_Y(H))', () => {
    // At very high pH α_Y(H)→1 ⇒ log K′ → log Kf.
    tol(condLogKAtPH(3.5, [6.9], 14), 3.5, 0.05);
    // At pH = pKa, α_Y(H) = 2 ⇒ log K′ = log Kf − log 2.
    tol(condLogKAtPH(3.5, [6.9], 6.9), 3.5 - Math.log10(2), 0.02);
  });

  it('fraction formed is 50 % when K′·Co = 1', () => {
    tol(fractionFormedExcess(0, 1) * 100, 50, 1e-9); // K'=1, Co=1
    tol(fractionFormedExcess(1, 0.1) * 100, 50, 1e-9); // K'=10, Co=0.1
  });

  it('P7 MgATP — logβ=3.5, pKa=6.9 → pH(10%)=3.05, pH(90%)=4.96', () => {
    // Ligand (ATP) is in large excess over Mg (limiting); model is f/(1−f)=K′(pH)·C_L.
    // The effective free-ligand concentration that reproduces EXACTLY both endpoints
    // (3.05 and 4.96) is C_L ≈ 0.25 M — both endpoints back-solve to the same value
    // (0.2495 M), confirming the excess-ligand model.
    const cL = 0.25;
    tol(pHForPercentFormed(3.5, [6.9], cL, 10), 3.05, 0.1);
    tol(pHForPercentFormed(3.5, [6.9], cL, 90), 4.96, 0.1);
    // pH(50%) lands halfway (model is symmetric in log K′).
    tol(pHForPercentFormed(3.5, [6.9], cL, 50), (3.05 + 4.96) / 2, 0.1);
  });
});

// ── Operating point (bisection) ───────────────────────────────────────────────

describe('operatingPoint', () => {
  it('solves both increasing and decreasing metrics', () => {
    // Decreasing: 100·(1 − x/10) = 50 ⇒ x = 5.
    tol(operatingPoint((x) => 100 * (1 - x / 10), 50, 0, 10), 5, 1e-6);
    // Increasing: 10·x = 50 ⇒ x = 5.
    tol(operatingPoint((x) => 10 * x, 50, 0, 10), 5, 1e-6);
  });

  it('returns NaN if target is not bracketed by [lo, hi]', () => {
    expect(Number.isNaN(operatingPoint((x) => x, 999, 0, 10))).toBe(true);
  });
});
