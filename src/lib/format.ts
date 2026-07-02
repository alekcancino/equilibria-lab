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

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/**
 * Human-readable scientific notation with Unicode superscripts, no unit.
 * 0.1 → "0.1", 1.35e-5 → "1.35×10⁻⁵", 2.4e7 → "2.4×10⁷".
 * Values in [0.001, 10000) render as plain decimals; outside that, as a×10ⁿ.
 */
export function formatSci(x: number, sig = 2): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 0.001 && abs < 1e4) return String(parseFloat(x.toPrecision(sig + 1)));
  const m = x.toExponential(sig).match(/^(-?[\d.]+)e([+-])(\d+)$/);
  if (!m) return x.toExponential(sig);
  const exp = m[3].split('').map((d) => SUP[+d]).join('');
  const sign = m[2] === '-' ? '⁻' : '';
  return `${m[1]}×10${sign}${exp}`;
}

/**
 * Formats a molar concentration avoiding JS scientific notation.
 * 0.1 → "0.1 M", 0.01 → "0.01 M", 1e-5 → "1.35×10⁻⁵ M".
 */
export function formatMolar(c: number): string {
  if (!Number.isFinite(c) || c <= 0) return '—';
  return `${formatSci(c)} M`;
}
