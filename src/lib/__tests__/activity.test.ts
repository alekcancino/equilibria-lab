import { describe, it, expect } from 'vitest';
import { activityCoefficient } from '../activity';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// γ Debye-Hückel a I fija — golden EQ2 Q1 (spec issue #4 · C2).
describe('activityCoefficient — γ(z) a I fija (EQ2 Q1)', () => {
  it('I=0.2 → γ(1)=0.70, γ(2)=0.24, γ(3)=0.04 (±0.02 en log γ)', () => {
    const I = 0.2;
    const g1 = activityCoefficient(1, I);
    const g2 = activityCoefficient(2, I);
    const g3 = activityCoefficient(3, I);
    tol(Math.log10(g1), Math.log10(0.70), 0.02);
    tol(Math.log10(g2), Math.log10(0.24), 0.02);
    // z=3: el texto usa A=0.5 redondeado; la app usa un A más preciso, y el
    // factor z²=9 amplifica la diferencia (~0.025 en log γ). El motor es correcto;
    // la tolerancia honesta para z=3 es ±0.03.
    tol(Math.log10(g3), Math.log10(0.04), 0.03);
  });

  it('las tres cargas se leen a la MISMA I (no hay workaround c=I/z²)', () => {
    const I = 0.2;
    // Cambiar z no altera I: cada γ usa la misma fuerza iónica impuesta.
    expect(activityCoefficient(1, I)).toBeGreaterThan(activityCoefficient(2, I));
    expect(activityCoefficient(2, I)).toBeGreaterThan(activityCoefficient(3, I));
  });
});
