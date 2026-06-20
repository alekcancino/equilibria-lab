import { describe, expect, it } from 'vitest';
import { formatAxisLabel, paddedAxisRange } from '../format';

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
