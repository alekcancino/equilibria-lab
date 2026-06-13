// Generador canónico de nombres de especies con sub/superíndices Unicode.
// Evita los bugs de nomenclatura de la versión anterior (auditoría P0-8/P0-9:
// "A4⁻", "CH₃COOH⁻", "MNH₃2"): cargas correctas, dígitos como subíndices.

const SUB: Record<string, string> = {
  0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉',
};
const SUP: Record<string, string> = {
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
};

export function subscript(n: number): string {
  return String(n).split('').map((d) => SUB[d] ?? d).join('');
}

/** Carga con signo en superíndice: +2 → "²⁺", −1 → "⁻", 0 → "". */
export function chargeSuperscript(z: number): string {
  if (z === 0) return '';
  const mag = Math.abs(z);
  const sign = z > 0 ? '⁺' : '⁻';
  return (mag === 1 ? '' : String(mag).split('').map((d) => SUP[d] ?? d).join('')) + sign;
}

/**
 * Etiquetas genéricas para un sistema HnA con carga z0 en la forma más
 * protonada: H₃A, H₂A⁻, HA²⁻, A³⁻ (o BH⁺/B si z0 > 0 con base "B").
 * i = protones perdidos (0 = totalmente protonada).
 */
export function genericSpeciesLabels(nProtons: number, z0: number, core = 'A'): string[] {
  const labels: string[] = [];
  for (let i = 0; i <= nProtons; i++) {
    const hLeft = nProtons - i;
    const charge = z0 - i;
    const hPart = hLeft === 0 ? '' : hLeft === 1 ? 'H' : `H${subscript(hLeft)}`;
    labels.push(`${hPart}${core}${chargeSuperscript(charge)}`);
  }
  return labels;
}
