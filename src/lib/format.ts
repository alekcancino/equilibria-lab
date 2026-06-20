/** Formato legible para ticks de ejes (pH, pe, pL, E°, …). */
export function formatAxisLabel(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const int = Math.round(v);
  if (Math.abs(v - int) < 0.05) return String(int);
  const one = Math.round(v * 10) / 10;
  if (Math.abs(v - one) < 0.005) return one.toFixed(1);
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Rango simétrico redondeado para ejes pe / pL con márgenes. */
export function paddedAxisRange(min: number, max: number, pad: number): [number, number] {
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}
