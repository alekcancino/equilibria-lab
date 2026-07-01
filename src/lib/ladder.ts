// Unified equilibrium ladder: MLⱼ ⇌ MLᵢ + (j−i)L on a p-scale.
// Una "escalera" de especies S₀…Sₙ conectadas por fronteras (constantes) en la
// escala p (pH para ácido-base, pL para complejos, pe para redox). El MISMO motor
// alimenta la distribución α, el diagrama logarítmico y el DUZP de los tres
// equilibrios — esa unidad es lo que hace la app intuitiva.

import { SPECIES_COLORS } from './database';

/**
 * Fracciones α de una escalera de 1 partícula por paso.
 * - `boundaries`: valor p de cada frontera (pKa₁…pKaₙ para ácido-base;
 *   log K₁…log Kₙ sucesivas para complejos).
 * - `ascending=true`  → el índice de especie crece al AUMENTAR p (ácido-base: pH;
 *   a mayor pH, especie más desprotonada).
 * - `ascending=false` → el índice de especie crece al DISMINUIR p (complejos: pL;
 *   a menor pL hay más ligando libre, especie más ligada).
 *
 * Trabaja en espacio logarítmico para evitar overflow. Devuelve α₀…αₙ.
 */
export function ladderFractions(p: number, boundaries: number[], ascending: boolean): number[] {
  const logTerms: number[] = [0];
  let acc = 0;
  for (let i = 0; i < boundaries.length; i++) {
    acc += ascending ? p - boundaries[i] : boundaries[i] - p;
    logTerms.push(acc);
  }
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const denom = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / denom);
}

/** log de la concentración de cada especie: log[Sᵢ] = log αᵢ + log C_total. */
export function ladderLogC(
  p: number, boundaries: number[], ascending: boolean, logCtotal: number,
): number[] {
  return ladderFractions(p, boundaries, ascending).map(
    (a) => Math.log10(Math.max(a, 1e-30)) + logCtotal,
  );
}

export interface Zone {
  label: string;
  /** índice de la especie (para color consistente con α/logC) */
  index: number;
  pStart: number;
  pEnd: number;
  color: string;
}

/** Refina la frontera entre dos especies dominantes por bisección (valor p exacto). */
function refineBoundary(
  lo: number, hi: number, a: number, b: number, boundaries: number[], ascending: boolean,
): number {
  // raíz de f(p) = α_b − α_a; f cambia de signo en [lo, hi]
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const fr = ladderFractions(mid, boundaries, ascending);
    if (fr[b] - fr[a] < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Zonas de predominio para el DUZP, calculadas por BARRIDO de α (qué especie
 * domina en cada punto) y refinadas por bisección. Robusto a constantes
 * degeneradas/cercanas: una especie que nunca domina simplemente no genera zona
 * (evita el bug de zonas invertidas de versiones previas).
 */
export function predominanceZones(
  boundaries: number[], labels: string[], pMin: number, pMax: number, ascending: boolean,
): Zone[] {
  const N = 2000;
  const zones: Zone[] = [];
  let curIdx = -1;
  let zoneStart = pMin;
  let prevP = pMin;

  const pushZone = (end: number) => {
    if (curIdx >= 0) {
      zones.push({
        label: labels[curIdx] ?? `S${curIdx}`,
        index: curIdx,
        pStart: zoneStart,
        pEnd: end,
        color: SPECIES_COLORS[curIdx % SPECIES_COLORS.length],
      });
    }
  };

  for (let i = 0; i <= N; i++) {
    const p = pMin + ((pMax - pMin) * i) / N;
    const a = ladderFractions(p, boundaries, ascending);
    const dom = a.indexOf(Math.max(...a));
    if (dom !== curIdx) {
      const edge = curIdx >= 0 ? refineBoundary(prevP, p, curIdx, dom, boundaries, ascending) : pMin;
      pushZone(edge);
      curIdx = dom;
      zoneStart = edge;
    }
    prevP = p;
  }
  pushZone(pMax);
  return zones;
}
