import { describe, it, expect } from 'vitest';
import { solvePL } from '../complexation';
import {
  percentFormed, percentDissociated, percentSpeciesAtPH,
  fractionFormedExcess, condLogKAtPH, operatingPoint,
  pLForPercentFormed, pHForPercentFormed,
} from '../metrics';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// ── % formado / disociado (Complejos) ────────────────────────────────────────

describe('percentFormed / percentDissociated', () => {
  it('EQ2 Q4 — logβ=[1.3], cM=cL=0.01 → % disociado ≈ 85 %', () => {
    const logBetas = [1.3];
    const pLeq = solvePL(0.01, 0.01, logBetas);
    // Golden registrado: ~85 % disociado (equivalente a [L]libre/cL).
    tol(percentDissociated(pLeq, logBetas), 85, 2);
    tol(percentFormed(pLeq, logBetas), 15, 2);
    // % formado + % disociado = 100
    tol(percentFormed(pLeq, logBetas) + percentDissociated(pLeq, logBetas), 100, 1e-9);
  });

  it('pL para 50 % en un complejo 1:1 es log β₁', () => {
    tol(pLForPercentFormed([8], 50), 8, 0.1);
    tol(pLForPercentFormed([1.3], 50), 1.3, 0.1);
  });

  it('pL para 10/90 % son simétricos alrededor de log β₁ (±1 década)', () => {
    // Para 1:1, ñ = β[L]/(1+β[L]); 10 % ⇒ β[L]=1/9, 90 % ⇒ β[L]=9.
    // pL(10%) = logβ + log9, pL(90%) = logβ − log9.
    const logB = 5;
    tol(pLForPercentFormed([logB], 90), logB - Math.log10(9), 0.1);
    tol(pLForPercentFormed([logB], 10), logB + Math.log10(9), 0.1);
  });
});

// ── % de especie ácido-base ──────────────────────────────────────────────────

describe('percentSpeciesAtPH', () => {
  it('a pH = pKa las dos especies conjugadas son 50/50', () => {
    tol(percentSpeciesAtPH(4.76, [4.76], 0), 50, 1e-6);
    tol(percentSpeciesAtPH(4.76, [4.76], 1), 50, 1e-6);
  });

  it('poliprótico: las fracciones suman 100 %', () => {
    const pKas = [2.15, 7.20, 12.35];
    const sum = [0, 1, 2, 3].reduce((s, i) => s + percentSpeciesAtPH(7.20, pKas, i), 0);
    tol(sum, 100, 1e-6);
  });
});

// ── Constantes condicionales (fracción formada + punto de operación) ──────────

describe('condLogKAtPH / fractionFormedExcess', () => {
  it('log K′ cae al protonarse el ligante (α_Y(H))', () => {
    // A pH muy alto α_Y(H)→1 ⇒ log K′ → log Kf.
    tol(condLogKAtPH(3.5, [6.9], 14), 3.5, 0.05);
    // A pH = pKa, α_Y(H) = 2 ⇒ log K′ = log Kf − log 2.
    tol(condLogKAtPH(3.5, [6.9], 6.9), 3.5 - Math.log10(2), 0.02);
  });

  it('fracción formada es 50 % cuando K′·Co = 1', () => {
    tol(fractionFormedExcess(0, 1) * 100, 50, 1e-9); // K'=1, Co=1
    tol(fractionFormedExcess(1, 0.1) * 100, 50, 1e-9); // K'=10, Co=0.1
  });

  it('P7 MgATP — logβ=3.5, pKa=6.9 → pH(10%)=3.05, pH(90%)=4.96', () => {
    // El ligando (ATP) está en gran exceso frente al Mg (limitante); el modelo
    // es f/(1−f)=K'(pH)·C_L. La concentración de ligando libre efectiva que
    // reproduce EXACTAMENTE los dos extremos registrados en la bitácora
    // (3.05 y 4.96) es C_L ≈ 0.25 M — ambos extremos retro-resuelven al mismo
    // valor (0.2495 M), lo que confirma el modelo de ligando en exceso.
    const cL = 0.25;
    tol(pHForPercentFormed(3.5, [6.9], cL, 10), 3.05, 0.1);
    tol(pHForPercentFormed(3.5, [6.9], cL, 90), 4.96, 0.1);
    // pH(50%) queda a mitad de camino (modelo simétrico en log K′).
    tol(pHForPercentFormed(3.5, [6.9], cL, 50), (3.05 + 4.96) / 2, 0.1);
  });
});

// ── Punto de operación (bisección) ───────────────────────────────────────────

describe('operatingPoint', () => {
  it('resuelve métricas crecientes y decrecientes', () => {
    // Decreciente: 100·(1 − x/10) = 50 ⇒ x = 5.
    tol(operatingPoint((x) => 100 * (1 - x / 10), 50, 0, 10), 5, 1e-6);
    // Creciente: 10·x = 50 ⇒ x = 5.
    tol(operatingPoint((x) => 10 * x, 50, 0, 10), 5, 1e-6);
  });

  it('devuelve NaN si el objetivo no está acotado por [lo, hi]', () => {
    expect(Number.isNaN(operatingPoint((x) => x, 999, 0, 10))).toBe(true);
  });
});
