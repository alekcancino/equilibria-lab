/** Human-readable format for axis ticks (pH, pe, pL, E°, …). */
export function formatAxisLabel(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const int = Math.round(v);
  if (Math.abs(v - int) < 0.05) return String(int);
  const one = Math.round(v * 10) / 10;
  if (Math.abs(v - one) < 0.005) return one.toFixed(1);
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Rounded symmetric range for pe / pL axes with margins. */
export function paddedAxisRange(min: number, max: number, pad: number): [number, number] {
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

/**
 * Formats a molar concentration avoiding JS scientific notation.
 * 0.1 → "0.1 M", 0.01 → "0.01 M", 1e-5 → "1.35×10⁻⁵ M".
 */
export function formatMolar(c: number): string {
  if (!Number.isFinite(c) || c <= 0) return '—';
  if (c >= 0.001) return `${parseFloat(c.toPrecision(3))} M`;
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const m = c.toExponential(2).match(/^([\d.]+)e([+-])(\d+)$/);
  if (!m) return `${c.toExponential(2)} M`;
  const exp = m[3].split('').map(d => SUP[+d]).join('');
  const sign = m[2] === '-' ? '⁻' : '';
  return `${m[1]}×10${sign}${exp} M`;
}
