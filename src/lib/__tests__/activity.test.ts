import { describe, it, expect } from 'vitest';
import {
  activityCoefficient, apparentPKw, correctedLogBetas, gammaDavies, gammaGuntelberg,
  logActivityCoefficient, ION_SIZES,
} from '../activity';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// γ Debye-Hückel at fixed I — golden values from EQ2 Q1.
describe('activityCoefficient — γ(z) at fixed I (EQ2 Q1)', () => {
  it('I=0.2 → γ(1)=0.70, γ(2)=0.24, γ(3)=0.04 (±0.02 in log γ)', () => {
    const I = 0.2;
    const g1 = activityCoefficient(1, I);
    const g2 = activityCoefficient(2, I);
    const g3 = activityCoefficient(3, I);
    tol(Math.log10(g1), Math.log10(0.70), 0.02);
    tol(Math.log10(g2), Math.log10(0.24), 0.02);
    // z=3: the reference text uses A=0.5 rounded; the engine uses a more precise A,
    // and the z²=9 factor amplifies the difference (~0.025 in log γ). The engine is
    // correct; the honest tolerance for z=3 is ±0.03.
    tol(Math.log10(g3), Math.log10(0.04), 0.03);
  });

  it('all three charges read at the SAME I (no c=I/z² workaround)', () => {
    const I = 0.2;
    // Changing z does not alter I: each γ uses the same imposed ionic strength.
    expect(activityCoefficient(1, I)).toBeGreaterThan(activityCoefficient(2, I));
    expect(activityCoefficient(2, I)).toBeGreaterThan(activityCoefficient(3, I));
  });
});

// Davies equation goldens, hand-derived from log γ = −0.51 z² (√I/(1+√I) − 0.3 I).
describe('gammaDavies', () => {
  it('z=1: γ(I=0.1)=0.781, γ(I=0.5)=0.733 — usable where fixed-a D-H fails', () => {
    tol(gammaDavies(1, 0.1), 0.781, 0.001);
    tol(gammaDavies(1, 0.5), 0.733, 0.001);
  });

  it('z=2 a I=0.1 → γ=0.372', () => {
    tol(gammaDavies(2, 0.1), 0.372, 0.001);
  });

  it('I=0 → γ=1 exacto', () => {
    expect(gammaDavies(2, 0)).toBe(1);
  });
});

// Güntelberg convention (A=0.5, B·a=1) — resolves QA H-1: courses using this
// form report γ=0.241 for z=2 at I=0.2, not the extended-D-H(a=3) 0.233.
describe('gammaGuntelberg (QA H-1)', () => {
  it('z=2, I=0.2 → γ=0.241 (la convención del curso, no un error del motor)', () => {
    tol(gammaGuntelberg(2, 0.2), 0.241, 0.001);
  });
});

// Kielland per-ion sizes (Harris table 8-1): γ(H⁺, a=9) and γ(Ca²⁺, a=6) at I=0.1.
describe('ION_SIZES (Kielland)', () => {
  it('γ(H⁺, a=9 Å, I=0.1) ≈ 0.83; γ(Ca²⁺, a=6 Å, I=0.1) ≈ 0.405 (Harris)', () => {
    const h = ION_SIZES.find((x) => x.label === 'H⁺')!;
    tol(activityCoefficient(h.z, 0.1, h.a), 0.83, 0.01);
    const ca = ION_SIZES.find((x) => x.label.startsWith('Ca²⁺'))!;
    tol(activityCoefficient(ca.z, 0.1, ca.a), 0.405, 0.01);
  });
});

// log β′ = log β° + log γ_M + i·log γ_L − log γ_MLᵢ (concentration-basis constants).
describe('correctedLogBetas', () => {
  it('Ca²⁺ + Y⁴⁻ → CaY²⁻ (log Kf 10.65, I=0.1): la corrección neta es +log γ(4) — γ(2) se cancela', () => {
    // z(MY) = 2 − 4 = −2, so log K′ = 10.65 + logγ(2) + logγ(4) − logγ(2) = 10.65 + logγ(4).
    const kPrime = correctedLogBetas([10.65], 2, -4, 0.1)[0];
    tol(kPrime, 10.65 + logActivityCoefficient(4, 0.1), 1e-12);
    // γ < 1 → the concentration-basis K′ is SMALLER (≈ 8.68): net charge builds up.
    tol(kPrime, 8.68, 0.01);
  });

  it('ligando neutro (zL=0): corrección exactamente cero a cualquier I', () => {
    expect(correctedLogBetas([8, 14], 2, 0, 0.5)).toEqual([8, 14]);
  });

  it('I=0 devuelve las β ideales sin tocar', () => {
    expect(correctedLogBetas([4.04, 7.47], 2, -1, 0)).toEqual([4.04, 7.47]);
  });

  it('complejo neutro ML₂ (M²⁺ + 2L⁻): β′ < β° — formar un neutro desde iones se desfavorece a I>0', () => {
    // z(ML₂) = 0 → γ_ML = 1, so log β′₂ = log β₂ + log γ(2) + 2·log γ(1).
    const [, b2] = correctedLogBetas([5, 10], 2, -1, 0.1);
    expect(b2).toBeLessThan(10);
    tol(b2, 10 + logActivityCoefficient(2, 0.1) + 2 * logActivityCoefficient(1, 0.1), 1e-12);
  });
});

// Harris, QCA 8th ed., §7-3 "pH of Water Containing a Salt" (p.169):
// 0.10 M KCl, γ(H⁺, size 900 pm)=0.83, γ(OH⁻, size 350 pm)=0.76 at I=0.10 M
// → [H⁺]=[OH⁻]=1.26×10⁻⁷ M (Kw/(γH·γOH), NOT Kw·γH·γOH).
describe('apparentPKw (Harris §7-3)', () => {
  it('pKw′ decreases (K′w grows) as γ < 1 — not the other way round', () => {
    const gH = activityCoefficient(1, 0.10, 9);
    const gOH = activityCoefficient(1, 0.10, 3.5);
    tol(gH, 0.83, 0.01);
    tol(gOH, 0.76, 0.01);
    const pKwPrime = apparentPKw(gH, gOH);
    expect(pKwPrime).toBeLessThan(14); // K′w = Kw/(γH·γOH) > Kw since γ < 1
    const x = Math.pow(10, -pKwPrime / 2); // [H⁺]=[OH⁻]=x since production is 1:1
    tol(x, 1.26e-7, 0.05e-7);
  });
});
