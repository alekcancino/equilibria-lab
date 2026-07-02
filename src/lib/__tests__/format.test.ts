import { describe, expect, it } from 'vitest';
import { formatAxisLabel, formatMolar, formatSci, paddedAxisRange } from '../format';

describe('formatAxisLabel', () => {
  it('redondea extremos feos de pe', () => {
    expect(formatAxisLabel(5.032454361054768)).toBe('5');
    expect(formatAxisLabel(37.0736984448952)).toBe('37.07');
    expect(formatAxisLabel(13.03)).toBe('13');
    expect(formatAxisLabel(38)).toBe('38');
  });
});

describe('paddedAxisRange', () => {
  it('expande con márgenes enteros', () => {
    expect(paddedAxisRange(13.03, 29.07, 8)).toEqual([5, 38]);
  });
});

describe('formatSci', () => {
  it('usa superíndices Unicode, no notación "e"', () => {
    expect(formatSci(1.35e-5)).toBe('1.35×10⁻⁵');
    expect(formatSci(2.4e7)).toBe('2.40×10⁷');
    expect(formatSci(0)).toBe('0');
  });
  it('deja decimales normales en el rango legible', () => {
    expect(formatSci(0.1)).toBe('0.1');
    expect(formatSci(7.2)).toBe('7.2');
  });
  it('respeta el no-finito', () => {
    expect(formatSci(NaN)).toBe('—');
  });
});

describe('formatMolar', () => {
  it('agrega unidad M y notación científica', () => {
    expect(formatMolar(1.35e-5)).toBe('1.35×10⁻⁵ M');
    expect(formatMolar(0.1)).toBe('0.1 M');
  });
  it('devuelve — para valores inválidos', () => {
    expect(formatMolar(0)).toBe('—');
    expect(formatMolar(-1)).toBe('—');
  });
});
